import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import {
  isNotificationRead,
  notificationService,
  type NotificationFormData,
  type NotificationId,
  type NotificationItem,
  type NotificationQueryParams,
} from '../services/notificationService';

export type NotificationScope = 'all' | 'mine';

export type UseNotificationsOptions = {
  /** `all` calls the Admin endpoint; `mine` calls the current-user endpoint. */
  scope?: NotificationScope;
  /** Query parameters are forwarded to the selected list endpoint. */
  params?: NotificationQueryParams;
  /** Set to false when the caller wants to trigger the first load manually. */
  autoLoad?: boolean;
};

export type UseNotificationsResult = {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error?: string;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: NotificationId) => Promise<void>;
  deleteNotification: (id: NotificationId) => Promise<void>;
  createNotification: (data: NotificationFormData) => Promise<NotificationItem>;
  updateNotification: (id: NotificationId, data: NotificationFormData) => Promise<NotificationItem>;
  clearError: () => void;
};

const DEFAULT_PAGE_SIZE = 20;

/** Provides a stable query key when callers create a params object inline. */
const stringifyParams = (params: NotificationQueryParams) => JSON.stringify(params);

/** Replaces an item in a list without introducing duplicate IDs. */
const replaceNotification = (items: NotificationItem[], replacement: NotificationItem) => {
  const index = items.findIndex((item) => item.notificationId === replacement.notificationId);

  if (index < 0) {
    return [replacement, ...items];
  }

  return items.map((item, itemIndex) => (itemIndex === index ? replacement : item));
};

/** Removes an item by ID while preserving the original array when it is absent. */
const removeNotification = (items: NotificationItem[], id: NotificationId) => {
  const nextItems = items.filter((item) => String(item.notificationId) !== String(id));
  return nextItems.length === items.length ? items : nextItems;
};

/** Merges a newly loaded page after the current page while replacing duplicate IDs. */
const appendNotifications = (current: NotificationItem[], next: NotificationItem[]) => {
  const merged = [...current];

  next.forEach((item) => {
    const index = merged.findIndex((currentItem) => currentItem.notificationId === item.notificationId);

    if (index < 0) {
      merged.push(item);
    } else {
      merged[index] = item;
    }
  });

  return merged;
};

/** Manages notification data, unread state, mutations, and paginated loading. */
export const useNotifications = ({
  scope = 'mine',
  params = {},
  autoLoad = true,
}: UseNotificationsOptions = {}): UseNotificationsResult => {
  const paramsKey = stringifyParams(params);
  const stableParams = useMemo<NotificationQueryParams>(
    () => JSON.parse(paramsKey) as NotificationQueryParams,
    [paramsKey],
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const requestIdRef = useRef(0);

  /** Fetches one page and either replaces or appends the current list. */
  const fetchPage = useCallback(async (page: number, append: boolean) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const requestParams: NotificationQueryParams = {
      ...stableParams,
      page,
      size: stableParams.size ?? DEFAULT_PAGE_SIZE,
    };

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(undefined);

    try {
      const result = scope === 'all'
        ? await notificationService.getAllNotifications(requestParams)
        : await notificationService.getMyNotifications(requestParams);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setNotifications((current) => {
        if (!append) {
          return result.items;
        }

        return appendNotifications(current, result.items);
      });
      setCurrentPage(result.page);
      setTotal(result.total);
      setHasMore(result.hasNext);
      setUnreadCount((current) => {
        if (result.unreadCount !== undefined) {
          return result.unreadCount;
        }

        return append
          ? current + result.items.filter((item) => !isNotificationRead(item)).length
          : result.items.filter((item) => !isNotificationRead(item)).length;
      });
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setError(getApiErrorMessage(requestError, 'Unable to load notifications.'));
      }

      throw requestError;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [scope, stableParams]);

  /** Reloads the first page and resets pagination. */
  const refresh = useCallback(async () => {
    await fetchPage(1, false);
  }, [fetchPage]);

  /** Loads the next page when the selected endpoint reports more results. */
  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    await fetchPage(currentPage + 1, true);
  }, [currentPage, fetchPage, hasMore, isLoading, isLoadingMore]);

  /** Marks one item read optimistically and restores it if the API call fails. */
  const markAsRead = useCallback(async (id: NotificationId) => {
    const previous = notifications;
    const target = previous.find((item) => String(item.notificationId) === String(id));

    if (!target || isNotificationRead(target)) {
      return;
    }

    const optimistic = { ...target, isRead: true, status: 'read', readAt: new Date().toISOString() };
    setNotifications((current) => replaceNotification(current, optimistic));
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const updated = await notificationService.markAsRead(id);

      if (updated && updated.notificationId !== 0) {
        setNotifications((current) => replaceNotification(current, updated));
      }
    } catch (requestError) {
      setNotifications(previous);
      setUnreadCount(previous.filter((item) => !isNotificationRead(item)).length);
      setError(getApiErrorMessage(requestError, 'Could not mark notification as read.'));
      throw requestError;
    }
  }, [notifications]);

  /** Removes one item optimistically and restores it when deletion fails. */
  const deleteNotification = useCallback(async (id: NotificationId) => {
    const previous = notifications;
    const target = previous.find((item) => String(item.notificationId) === String(id));
    const next = removeNotification(previous, id);

    if (next === previous) {
      return;
    }

    setNotifications(next);
    setTotal((value) => Math.max(0, value - 1));
    if (target && !isNotificationRead(target)) {
      setUnreadCount((value) => Math.max(0, value - 1));
    }

    try {
      await notificationService.deleteNotification(id);
    } catch (requestError) {
      setNotifications(previous);
      setTotal((value) => value + 1);
      setUnreadCount(previous.filter((item) => !isNotificationRead(item)).length);
      setError(getApiErrorMessage(requestError, 'Could not delete notification.'));
      throw requestError;
    }
  }, [notifications]);

  /** Creates an item and refreshes the list so server ordering and totals stay authoritative. */
  const createNotification = useCallback(async (data: NotificationFormData) => {
    try {
      const created = await notificationService.createNotification(data);
      await refresh();
      return created;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not create notification.'));
      throw requestError;
    }
  }, [refresh]);

  /** Updates an item and refreshes the list to include the server's final representation. */
  const updateNotification = useCallback(async (id: NotificationId, data: NotificationFormData) => {
    try {
      const updated = await notificationService.updateNotification(id, data);
      await refresh();
      return updated;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not update notification.'));
      throw requestError;
    }
  }, [refresh]);

  /** Clears the latest request error shown by the consumer. */
  const clearError = useCallback(() => setError(undefined), []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refresh().catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [autoLoad, paramsKey, refresh]);

  return {
    notifications,
    unreadCount,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    deleteNotification,
    createNotification,
    updateNotification,
    clearError,
  };
};

import { apiClient, getApiErrorMessage, unwrapApiData, unwrapApiList } from './apiClient';
import type { AxiosResponse } from 'axios';

export type NotificationId = number | string;

export type NotificationItem = {
  notificationId: number;
  userId?: number;
  title: string;
  message: string;
  type?: string;
  status?: string;
  isRead?: boolean;
  refId?: number;
  refType?: string;
  userFullName?: string;
  userRoleType?: string;
  createdAt?: string;
  readAt?: string;
};

export type NotificationFormData = {
  title: string;
  message: string;
  type: string;
  refId?: number;
  refType?: string;
  isRead: boolean;
};

/** Parameters accepted by the list endpoints. Unknown backend filters can be passed through as well. */
export type NotificationQueryParams = {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  type?: string;
  status?: string;
  isRead?: boolean;
  userId?: number | string;
  [key: string]: string | number | boolean | undefined;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
  unreadCount?: number;
};

type RawNotification = Record<string, unknown>;

/** Converts an unknown API value to text without leaking null/undefined into the UI. */
const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

/** Converts an unknown API value to a finite number. */
const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

/** Converts common boolean representations returned by different API serializers. */
const asBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return fallback;
};

/** Checks whether a value can be safely read as an object record. */
const isRecord = (value: unknown): value is RawNotification => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

/** Maps one backend notification shape to the stable shape consumed by React components. */
export const mapNotification = (raw: RawNotification): NotificationItem => ({
  notificationId: asNumber(raw.notificationId ?? raw.notificationID ?? raw.notification_id ?? raw.id),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  title: asString(raw.title, 'Notification'),
  message: asString(raw.message ?? raw.content ?? raw.detail),
  type: raw.type === undefined ? undefined : asString(raw.type),
  status: raw.status === undefined ? undefined : asString(raw.status),
  isRead: raw.isRead === undefined && raw.is_read === undefined
    ? undefined
    : asBoolean(raw.isRead ?? raw.is_read),
  refId: raw.refId === undefined && raw.ref_id === undefined
    ? undefined
    : asNumber(raw.refId ?? raw.ref_id),
  refType: raw.refType === undefined && raw.ref_type === undefined
    ? undefined
    : asString(raw.refType ?? raw.ref_type),
  userFullName: raw.userFullName === undefined ? undefined : asString(raw.userFullName),
  userRoleType: raw.userRoleType === undefined ? undefined : asString(raw.userRoleType),
  createdAt: raw.createdAt === undefined ? undefined : asString(raw.createdAt),
  readAt: raw.readAt === undefined ? undefined : asString(raw.readAt),
});

/** Determines read state from either the explicit flag or a status/read timestamp. */
export const isNotificationRead = (item: NotificationItem) => {
  if (item.isRead !== undefined) {
    return item.isRead;
  }

  const status = item.status?.toLowerCase();
  return status === 'read' || Boolean(item.readAt);
};

/** Finds the object containing pagination metadata in common Spring/REST response envelopes. */
const findPageMetadata = (value: unknown): RawNotification => {
  if (!isRecord(value)) {
    return {};
  }

  if (Array.isArray(value.content) || Array.isArray(value.items)) {
    return value;
  }

  for (const key of ['data', 'result', 'payload', 'response']) {
    const nested = value[key];

    if (isRecord(nested)) {
      const metadata = findPageMetadata(nested);

      if (Object.keys(metadata).length > 0) {
        return metadata;
      }
    }
  }

  return value;
};

/** Parses a list response while retaining pagination and server-provided unread counts. */
const mapNotificationPage = (
  response: AxiosResponse,
  requestedParams: NotificationQueryParams = {},
): NotificationListResponse => {
  const items = unwrapApiList<RawNotification>(response).map(mapNotification);
  const metadata = findPageMetadata(response.data);
  const page = asNumber(metadata.page ?? metadata.currentPage ?? metadata.number, asNumber(requestedParams.page, 1));
  const size = asNumber(
    metadata.size ?? metadata.pageSize ?? metadata.limit,
    asNumber(requestedParams.size, items.length || 1),
  );
  const total = asNumber(metadata.totalElements ?? metadata.total ?? metadata.count, items.length);
  const hasNextValue = metadata.hasNext ?? metadata.hasMore ?? metadata.next;
  const hasNext = hasNextValue === undefined ? page * size < total : asBoolean(hasNextValue);
  const unreadCountValue = metadata.unreadCount ?? metadata.unread;

  return {
    items,
    page,
    size,
    total,
    hasNext,
    unreadCount: unreadCountValue === undefined ? undefined : asNumber(unreadCountValue),
  };
};

/** Removes empty optional fields before Axios serializes a mutation payload. */
const cleanFormData = (data: NotificationFormData) => ({
  title: data.title.trim(),
  message: data.message.trim(),
  type: data.type.trim(),
  refId: data.refId === undefined ? undefined : Number(data.refId),
  refType: data.refType?.trim() || undefined,
  isRead: data.isRead,
});

/** Normalizes an API failure into an Error with a useful user-facing message. */
const withNotificationError = async <T>(operation: string, request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    const message = getApiErrorMessage(error, `${operation} failed.`);

    if (error instanceof Error) {
      error.message = message;
      throw error;
    }

    throw new Error(message, { cause: error });
  }
};

export const notificationService = {
  /** Gets every notification for an Admin, including optional filters and pagination. */
  async getAllNotifications(params: NotificationQueryParams = {}): Promise<NotificationListResponse> {
    return withNotificationError('Loading notifications', async () => {
      const response = await apiClient.get('/api/notifications/get-all', { params });
      return mapNotificationPage(response, params);
    });
  },

  /** Gets notifications belonging to the authenticated user. */
  async getMyNotifications(params: NotificationQueryParams = {}): Promise<NotificationListResponse> {
    return withNotificationError('Loading your notifications', async () => {
      const response = await apiClient.get('/api/notifications/my-notifications', { params });
      return mapNotificationPage(response, params);
    });
  },

  /** Backwards-compatible list helper returning only the current user's items. */
  async getNotifications(params: NotificationQueryParams = {}): Promise<NotificationItem[]> {
    const result = await this.getMyNotifications(params);
    return result.items;
  },

  /** Gets one notification by its identifier. */
  async getNotificationById(id: NotificationId): Promise<NotificationItem> {
    return withNotificationError('Loading notification', async () => {
      const response = await apiClient.get(`/api/notifications/get-by-id/${id}`);
      const data = unwrapApiData<unknown>(response);
      return mapNotification(isRecord(data) ? data : {});
    });
  },

  /** Creates a notification using the normalized form payload. */
  async createNotification(data: NotificationFormData): Promise<NotificationItem> {
    return withNotificationError('Creating notification', async () => {
      const response = await apiClient.post('/api/notifications/create', cleanFormData(data));
      const result = unwrapApiData<unknown>(response);
      return mapNotification(isRecord(result) ? result : {});
    });
  },

  /** Updates a notification by its identifier. */
  async updateNotification(id: NotificationId, data: NotificationFormData): Promise<NotificationItem> {
    return withNotificationError('Updating notification', async () => {
      const response = await apiClient.put(`/api/notifications/update/${id}`, cleanFormData(data));
      const result = unwrapApiData<unknown>(response);
      return mapNotification(isRecord(result) ? result : {});
    });
  },

  /** Marks a notification as read using the API's PUT endpoint. */
  async markAsRead(id: NotificationId): Promise<NotificationItem | undefined> {
    return withNotificationError('Marking notification as read', async () => {
      const response = await apiClient.put(`/api/notifications/mark-read/${id}`);
      const data = unwrapApiData<unknown>(response);
      return isRecord(data) ? mapNotification(data) : undefined;
    });
  },

  /** Deletes a notification by its identifier. */
  async deleteNotification(id: NotificationId): Promise<void> {
    return withNotificationError('Deleting notification', async () => {
      await apiClient.delete(`/api/notifications/delete/${id}`);
    });
  },
};

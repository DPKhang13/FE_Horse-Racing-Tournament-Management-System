import { apiClient, unwrapApiList } from './apiClient';

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

type RawNotification = Record<string, unknown>;

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const asBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return fallback;
};

const mapNotification = (raw: RawNotification): NotificationItem => ({
  notificationId: asNumber(raw.notificationId ?? raw.id),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  title: asString(raw.title, 'Notification'),
  message: asString(raw.message ?? raw.content ?? raw.detail),
  type: raw.type ? asString(raw.type) : undefined,
  status: raw.status ? asString(raw.status) : asBoolean(raw.isRead) ? 'read' : 'unread',
  isRead: raw.isRead === undefined ? undefined : asBoolean(raw.isRead),
  refId: raw.refId === undefined ? undefined : asNumber(raw.refId),
  refType: raw.refType ? asString(raw.refType) : undefined,
  userFullName: raw.userFullName ? asString(raw.userFullName) : undefined,
  userRoleType: raw.userRoleType ? asString(raw.userRoleType) : undefined,
  createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
  readAt: raw.readAt ? asString(raw.readAt) : undefined,
});

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await apiClient.get('/api/notifications/get-all');
    return unwrapApiList<RawNotification>(response).map(mapNotification);
  },

  async createNotification(data: NotificationFormData): Promise<NotificationItem> {
    const response = await apiClient.post('/api/notifications/create', {
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type.trim(),
      refId: data.refId ? Number(data.refId) : undefined,
      refType: data.refType?.trim() || undefined,
      isRead: data.isRead,
      createdAt: new Date().toISOString(),
    });
    return mapNotification(response.data?.data ?? response.data);
  },

  async updateNotification(id: number | string, data: NotificationFormData): Promise<NotificationItem> {
    const response = await apiClient.put(`/api/notifications/update/${id}`, {
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type.trim(),
      refId: data.refId ? Number(data.refId) : undefined,
      refType: data.refType?.trim() || undefined,
      isRead: data.isRead,
    });
    return mapNotification(response.data?.data ?? response.data);
  },

  async markAsRead(id: number | string): Promise<NotificationItem> {
    const response = await apiClient.put(`/api/notifications/mark-read/${id}`);
    return mapNotification(response.data?.data ?? response.data);
  },

  async deleteNotification(id: number | string): Promise<void> {
    await apiClient.delete(`/api/notifications/delete/${id}`);
  },
};

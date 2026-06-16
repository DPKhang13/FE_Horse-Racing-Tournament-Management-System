import { apiClient, unwrapApiList } from './apiClient';

export type NotificationItem = {
  notificationId: number;
  userId?: number;
  title: string;
  message: string;
  type?: string;
  status?: string;
  createdAt?: string;
  readAt?: string;
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

const mapNotification = (raw: RawNotification): NotificationItem => ({
  notificationId: asNumber(raw.notificationId ?? raw.id),
  userId: raw.userId === undefined ? undefined : asNumber(raw.userId),
  title: asString(raw.title, 'Notification'),
  message: asString(raw.message ?? raw.content ?? raw.detail),
  type: raw.type ? asString(raw.type) : undefined,
  status: raw.status ? asString(raw.status) : undefined,
  createdAt: raw.createdAt ? asString(raw.createdAt) : undefined,
  readAt: raw.readAt ? asString(raw.readAt) : undefined,
});

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await apiClient.get('/api/notifications/get-all');
    return unwrapApiList<RawNotification>(response).map(mapNotification);
  },
};

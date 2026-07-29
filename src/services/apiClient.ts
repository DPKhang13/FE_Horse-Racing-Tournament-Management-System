import axios, { type AxiosResponse } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const ACCESS_TOKEN_KEY = 'htms_access_token';
export const REFRESH_TOKEN_KEY = 'htms_refresh_token';
export const CURRENT_USER_KEY = 'htms_current_user';

export const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setSessionStorage = ({
  accessToken,
  refreshToken,
  user,
}: {
  accessToken: string;
  refreshToken?: string;
  user?: unknown;
}) => {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (user) {
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  window.dispatchEvent(new Event('auth-changed'));
};

export const clearSessionStorage = () => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
  window.dispatchEvent(new Event('auth-changed'));
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const MESSAGE_KEYS = new Set([
  'message',
  'messages',
  'error',
  'errormessage',
  'detail',
  'details',
  'title',
  'summary',
  'reason',
  'defaultmessage',
]);
const FIELD_ERROR_KEYS = new Set(['errors', 'validationerrors', 'fielderrors', 'violations']);
const NESTED_MESSAGE_KEYS = new Set(['data', 'result', 'payload', 'response']);
const FIELD_NAME_KEYS = new Set(['field', 'fieldname', 'property', 'propertypath', 'path']);

type ApiMessageContext = 'payload' | 'message' | 'field';

type ApiMessageCollector = {
  messages: string[];
  seenMessages: Set<string>;
  visitedObjects: WeakSet<object>;
};

const normalizeMessageKey = (key: string) => key.replace(/[\s_-]/g, '').toLowerCase();

const addApiMessage = (collector: ApiMessageCollector, value: string, fieldPath: string[]) => {
  const text = value.trim();

  if (!text) {
    return;
  }

  const message = fieldPath.length > 0 ? `${fieldPath.join('.')}: ${text}` : text;
  const dedupeKey = message.replace(/\s+/g, ' ').toLowerCase();

  if (collector.seenMessages.has(dedupeKey)) {
    return;
  }

  collector.seenMessages.add(dedupeKey);
  collector.messages.push(message);
};

const collectApiMessages = (
  value: unknown,
  collector: ApiMessageCollector,
  context: ApiMessageContext,
  fieldPath: string[] = [],
) => {
  if (typeof value === 'string') {
    addApiMessage(collector, value, context === 'field' || fieldPath.length > 0 ? fieldPath : []);
    return;
  }

  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectApiMessages(item, collector, context, fieldPath));
    return;
  }

  if (value instanceof Error) {
    addApiMessage(collector, value.message, fieldPath);
    return;
  }

  if (typeof value !== 'object' || collector.visitedObjects.has(value)) {
    return;
  }

  collector.visitedObjects.add(value);
  const entries = Object.entries(value as Record<string, unknown>);

  if (context === 'field') {
    const explicitFieldName = entries.find(([key, nestedValue]) =>
      FIELD_NAME_KEYS.has(normalizeMessageKey(key)) && typeof nestedValue === 'string'
    )?.[1] as string | undefined;
    const messageEntries = entries.filter(([key]) => MESSAGE_KEYS.has(normalizeMessageKey(key)));

    if (messageEntries.length > 0) {
      const messagePath = explicitFieldName ? [...fieldPath, explicitFieldName] : fieldPath;
      messageEntries.forEach(([, nestedValue]) => {
        collectApiMessages(nestedValue, collector, 'message', messagePath);
      });
      entries.forEach(([key, nestedValue]) => {
        const normalizedKey = normalizeMessageKey(key);

        if (FIELD_ERROR_KEYS.has(normalizedKey)) {
          collectApiMessages(nestedValue, collector, 'field', messagePath);
        } else if (NESTED_MESSAGE_KEYS.has(normalizedKey)) {
          collectApiMessages(nestedValue, collector, 'message', messagePath);
        }
      });
      return;
    }

    entries.forEach(([key, nestedValue]) => {
      const normalizedKey = normalizeMessageKey(key);

      if (FIELD_ERROR_KEYS.has(normalizedKey)) {
        collectApiMessages(nestedValue, collector, 'field', fieldPath);
      } else if (NESTED_MESSAGE_KEYS.has(normalizedKey)) {
        collectApiMessages(nestedValue, collector, 'message', fieldPath);
      } else if (!FIELD_NAME_KEYS.has(normalizedKey)) {
        collectApiMessages(nestedValue, collector, 'field', [...fieldPath, key]);
      }
    });
    return;
  }

  let foundStructuredKey = false;

  entries.forEach(([key, nestedValue]) => {
    const normalizedKey = normalizeMessageKey(key);

    if (MESSAGE_KEYS.has(normalizedKey)) {
      foundStructuredKey = true;
      collectApiMessages(nestedValue, collector, 'message', fieldPath);
    } else if (FIELD_ERROR_KEYS.has(normalizedKey)) {
      foundStructuredKey = true;
      collectApiMessages(nestedValue, collector, 'field');
    } else if (NESTED_MESSAGE_KEYS.has(normalizedKey)) {
      foundStructuredKey = true;
      collectApiMessages(nestedValue, collector, 'payload', fieldPath);
    }
  });

  if (context === 'message' && !foundStructuredKey) {
    entries.forEach(([key, nestedValue]) => {
      collectApiMessages(nestedValue, collector, 'field', [...fieldPath, key]);
    });
  }
};

export const getApiMessages = (value: unknown): string[] => {
  const collector: ApiMessageCollector = {
    messages: [],
    seenMessages: new Set<string>(),
    visitedObjects: new WeakSet<object>(),
  };

  collectApiMessages(value, collector, 'payload');
  return collector.messages;
};

export const getApiResponseMessage = (response: unknown, fallback = '') => {
  const messages = getApiMessages(response);
  return messages.length > 0 ? messages.join('\n') : fallback;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed.') => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessages = getApiMessages(error.response?.data);

    if (serverMessages.length > 0) {
      return serverMessages.join('\n');
    }

    if (status) {
      return `Request failed with status ${status}.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  const messages = getApiMessages(error);

  if (messages.length > 0) {
    return messages.join('\n');
  }

  return fallback;
};

export const unwrapApiData = <T>(response: AxiosResponse): T => {
  const payload = response.data;

  if (payload && typeof payload === 'object') {
    if ('data' in payload) {
      return payload.data as T;
    }

    if ('result' in payload) {
      return payload.result as T;
    }
  }

  return payload as T;
};

export const unwrapApiList = <T>(response: AxiosResponse): T[] => {
  const data = unwrapApiData<unknown>(response);

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const objectData = data as Record<string, unknown>;

    if (Array.isArray(objectData.data)) {
      return objectData.data as T[];
    }

    if (Array.isArray(objectData.content)) {
      return objectData.content as T[];
    }

    if (Array.isArray(objectData.items)) {
      return objectData.items as T[];
    }
  }

  return [];
};

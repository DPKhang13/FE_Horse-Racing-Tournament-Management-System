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

export const publicApiClient = axios.create({
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

const findMessageValue = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(findMessageValue).filter(Boolean).join(', ') || null;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const messageKeys = ['message', 'error', 'detail', 'title'];

    for (const key of messageKeys) {
      const message = findMessageValue(objectValue[key]);

      if (message) {
        return message;
      }
    }

    if (objectValue.errors && typeof objectValue.errors === 'object') {
      const errorMessages = Object.entries(objectValue.errors as Record<string, unknown>)
        .map(([field, fieldError]) => {
          const message = findMessageValue(fieldError);
          return message ? `${field}: ${message}` : null;
        })
        .filter(Boolean)
        .join(', ');

      if (errorMessages) {
        return errorMessages;
      }
    }
  }

  return null;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed.') => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = findMessageValue(error.response?.data);

    if (serverMessage) {
      return serverMessage;
    }

    if (status) {
      return `Request failed with status ${status}.`;
    }
  }

  if (error instanceof Error) {
    return error.message;
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

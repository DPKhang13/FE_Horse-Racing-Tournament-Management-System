export type ToastTone = 'success' | 'error' | 'info';

export type ToastPayload = {
  tone: ToastTone;
  text: string;
};

type ToastListener = (payload: ToastPayload) => void;

const listeners = new Set<ToastListener>();
const pendingQueue: ToastPayload[] = [];

export const showToast = (payload: ToastPayload) => {
  if (!payload.text.trim()) {
    return;
  }

  if (listeners.size === 0) {
    pendingQueue.push(payload);
    return;
  }

  listeners.forEach((listener) => listener(payload));
};

export const subscribeToToast = (listener: ToastListener) => {
  listeners.add(listener);

  while (pendingQueue.length > 0) {
    const nextPayload = pendingQueue.shift();

    if (nextPayload) {
      listener(nextPayload);
    }
  }

  return () => {
    listeners.delete(listener);
  };
};

import { useEffect, useRef } from 'react';
import { showToast, type ToastPayload } from '../utils/toast';

export const useToastNotifications = (items: Array<ToastPayload | null | undefined>) => {
  const lastShownRef = useRef<string[]>([]);

  useEffect(() => {
    items.forEach((item, index) => {
      const text = item?.text?.trim();

      if (!text) {
        lastShownRef.current[index] = '';
        return;
      }

      const signature = `${item?.tone ?? 'info'}:${text}`;

      if (lastShownRef.current[index] === signature) {
        return;
      }

      lastShownRef.current[index] = signature;
      showToast({ tone: item?.tone ?? 'info', text });
    });
  }, [items]);
};

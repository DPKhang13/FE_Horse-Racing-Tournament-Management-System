import { useEffect, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { subscribeToToast, type ToastPayload, type ToastTone } from '../utils/toast';

type ToastItem = ToastPayload & {
  id: number;
};

const toneStyles: Record<ToastTone, string> = {
  success: 'border-secondary/35 bg-surface-container-low/95 text-on-surface shadow-[0_20px_60px_rgba(0,0,0,0.28)]',
  error: 'border-error/35 bg-[#22131a]/95 text-on-surface shadow-[0_20px_60px_rgba(0,0,0,0.34)]',
  info: 'border-primary/30 bg-surface-container-low/95 text-on-surface shadow-[0_20px_60px_rgba(0,0,0,0.28)]',
};

const toneIcon: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const ToastViewport = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let nextId = 1;

    const unsubscribe = subscribeToToast((detail) => {
      if (!detail.text.trim()) {
        return;
      }

      const toastId = nextId++;
      setToasts((current) => [...current, { id: toastId, ...detail }]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toastId));
      }, detail.tone === 'error' ? 5200 : 3800);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl transition-all duration-300 ${toneStyles[toast.tone]}`}
          >
            <div className="mt-0.5 shrink-0 text-primary">
              <Icon className={`h-5 w-5 ${toast.tone === 'error' ? 'text-error' : toast.tone === 'success' ? 'text-secondary' : 'text-primary'}`} />
            </div>
            <p className="min-w-0 flex-1 text-sm font-semibold leading-6">{toast.text}</p>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded-full p-1 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastViewport;

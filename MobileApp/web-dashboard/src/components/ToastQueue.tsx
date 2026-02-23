import React, { useEffect } from 'react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface ToastQueueProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
  dismissLabel?: string;
}

const COLORS: Record<ToastData['type'], string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-white',
};

const ICONS: Record<ToastData['type'], string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  warning:
    'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
};

const SingleToast: React.FC<{
  toast: ToastData;
  onRemove: (id: string) => void;
  dismissLabel: string;
}> = ({ toast, onRemove, dismissLabel }) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`animate-slide-in flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${COLORS[toast.type]}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[toast.type]} />
      </svg>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 shrink-0 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
        aria-label={dismissLabel}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

const ToastQueue: React.FC<ToastQueueProps> = ({ toasts, onRemove, dismissLabel = 'Dismiss' }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {toasts.slice(-3).map((toast) => (
        <SingleToast key={toast.id} toast={toast} onRemove={onRemove} dismissLabel={dismissLabel} />
      ))}
    </div>
  );
};

export default ToastQueue;

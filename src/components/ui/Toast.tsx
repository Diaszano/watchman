import { create } from 'zustand';
import type { ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
  icon?: ReactNode;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type?: ToastType, durationMs?: number) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info', durationMs = 2800) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const ToastContainer = () => {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm"
    >
      {toasts.map((toast) => {
        const typeBorder =
          toast.type === 'success'
            ? 'border-[var(--success)]/40 text-[var(--success)]'
            : toast.type === 'error'
              ? 'border-[var(--danger)]/40 text-[var(--danger)]'
              : toast.type === 'warning'
                ? 'border-[var(--warning)]/40 text-[var(--warning)]'
                : 'border-[var(--accent)]/40 text-[var(--accent)]';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${typeBorder} bg-[var(--surface-elevated)]/95 backdrop-blur-md shadow-lg text-xs font-medium text-[var(--text-primary)] transition-all animate-in fade-in slide-in-from-bottom-2`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
}

interface ToastState {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (t) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...t, id };
    set((state) => {
      const updated = [newToast, ...state.toasts].slice(0, 5); // Keep max 5
      return { toasts: updated };
    });
    
    // Auto-dismiss
    const duration = t.duration ?? 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, duration);
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

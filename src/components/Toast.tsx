import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastType } from '@/state/useToastStore';
import { CheckIcon, AlertIcon, InfoIcon, CloseIcon } from '@/components/icons';

const typeIcons: Record<ToastType, JSX.Element> = {
  success: <CheckIcon className="text-green-400" />,
  error: <AlertIcon className="text-red-400" />,
  info: <InfoIcon className="text-blue-400" />,
  warning: <AlertIcon className="text-yellow-400" />,
};

const typeBorders: Record<ToastType, string> = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-yellow-500/30',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none absolute right-4 top-14 z-50 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-space-850 p-3 shadow-panel ${typeBorders[toast.type]}`}
          >
            <div className="mt-0.5 shrink-0">{typeIcons[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{toast.title}</div>
              {toast.description && (
                <div className="mt-1 text-xs text-space-300 line-clamp-2">
                  {toast.description}
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="mt-0.5 shrink-0 rounded p-1 text-space-400 hover:bg-space-700 hover:text-white"
            >
              <CloseIcon width={14} height={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

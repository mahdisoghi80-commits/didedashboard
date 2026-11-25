import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const iconMap = {
            success: <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />,
            info: <Info className="w-4 h-4 text-[#A59CF7] shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />,
            error: <XCircle className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" />,
          };

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              role="status"
              className="pointer-events-auto bg-[#1E1E24] text-white rounded-2xl px-4 py-3.5 shadow-[0_16px_40px_-10px_rgba(28,28,36,0.45)] flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {iconMap[toast.variant]}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                  {toast.description && (
                    <p className="text-xs text-slate-300/80 mt-0.5 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="بستن اعلان"
                className="text-slate-400 hover:text-white p-1 rounded-full transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

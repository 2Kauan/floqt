import { useToastStore } from '../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed z-[9999] bottom-20 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-md flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-destructive shrink-0" />,
          info: <Info className="w-5 h-5 text-accent shrink-0" />,
        };

        const borderColors = {
          success: 'border-success/40 bg-surface shadow-xl',
          error: 'border-destructive/40 bg-surface shadow-xl',
          info: 'border-accent/40 bg-surface shadow-xl',
        };

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 bg-surface text-ink rounded-xl shadow-2xl border ${
              borderColors[toast.type]
            } animate-spring-pop`}
          >
            <div className="flex items-center gap-3">
              {icons[toast.type]}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dispensar aviso"
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-bg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

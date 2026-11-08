import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useToast, ToastType } from '../contexts/ToastContext';

const ICONS: Record<ToastType, { icon: typeof Info; tone: string }> = {
  success: { icon: CheckCircle, tone: 'text-success' },
  error: { icon: AlertCircle, tone: 'text-danger' },
  warning: { icon: AlertTriangle, tone: 'text-accent' },
  info: { icon: Info, tone: 'text-muted' },
};

/** Toasts appear above the phone tab bar, bottom right on wide screens. */
export function Toasts() {
  const { toasts, removeToast } = useToast();
  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="fixed z-[100] inset-x-3 bottom-20 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const { icon: Icon, tone } = ICONS[t.type];
        return (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'}
            className="panel shadow-pop p-3 pl-4 flex items-start gap-3 pointer-events-auto animate-[fade_.15s_ease-out]">
            <Icon size={18} className={`${tone} mt-0.5 shrink-0`} />
            <p className="flex-1 text-sm">{t.message}</p>
            <button type="button" className="icon-btn h-7 w-7 -my-0.5" aria-label="Dismiss" onClick={() => removeToast(t.id)}><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** A centred modal dialog, rendered at the document root. */
export function Dialog({ open, onClose, title, description, children, footer, width = 'max-w-md' }: Props) {
  useEscapeKey(onClose, open);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]');
    (first ?? panel.current)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/55 animate-[fade_.15s_ease-out]" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`relative w-full ${width} bg-surface border border-line rounded-t-2xl sm:rounded-2xl shadow-pop outline-none max-h-[90dvh] flex flex-col`}>
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
          <button type="button" className="icon-btn -mr-2 -mt-1" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

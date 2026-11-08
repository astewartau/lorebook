import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** right: a panel from the right on wide screens; left: from the left. Both are full-screen on phones. */
  side?: 'right' | 'left';
  width?: string;
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** A dialog that slides in from the side (full screen on phones). */
export function Sheet({ open, onClose, title, side = 'right', width = 'sm:w-[440px]', hideTitle, children, footer }: Props) {
  useEscapeKey(onClose, open);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 animate-[fade_.15s_ease-out]" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`absolute inset-y-0 ${side === 'right' ? 'right-0' : 'left-0'} w-full ${width} bg-bg shadow-pop flex flex-col outline-none`}>
        <div className={`flex items-center gap-3 h-14 px-4 border-b border-line shrink-0 ${hideTitle ? 'sm:border-0' : ''}`}>
          <h2 className={`font-semibold flex-1 truncate ${hideTitle ? 'sr-only' : ''}`}>{title}</h2>
          {hideTitle && <span className="flex-1" />}
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line p-3 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

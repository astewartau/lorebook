import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/** A panel rising from the bottom of the screen (the builder's deck on phones). Focuses itself, not its first field. */
export function BottomSheet({ open, onClose, title, header, children }: {
  open: boolean; onClose: () => void; title: string; header?: ReactNode; children: ReactNode;
}) {
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
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/55 animate-[fade_.15s_ease-out]" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className="relative w-full max-h-[90dvh] bg-bg border-t border-line rounded-t-2xl shadow-pop flex flex-col outline-none pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 h-14 px-4 border-b border-line shrink-0">
          <div className="flex-1 min-w-0">{header ?? <h2 className="font-semibold truncate">{title}</h2>}</div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

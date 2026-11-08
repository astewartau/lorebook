import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface MenuProps {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: 'left' | 'right';
  children: (close: () => void) => ReactNode;
}

/** A button that opens a popover; closes on outside click, Escape or choosing an item. */
export function Menu({ label, trigger, triggerClassName = 'icon-btn', align = 'right', children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useEscapeKey(close, open);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        className={triggerClassName} onClick={() => setOpen(o => !o)}>
        {trigger}
      </button>
      {open && (
        <div role="menu"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 min-w-56 panel shadow-pop p-1.5 z-50`}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onClick, children, danger }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-md text-sm text-left hover:bg-surface-2 ${danger ? 'text-danger' : ''}`}>
      {children}
    </button>
  );
}

export const MenuSeparator = () => <div className="my-1 h-px bg-line" />;

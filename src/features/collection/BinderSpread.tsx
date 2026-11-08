import { ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clamp, dotWindow, pagesInSpread, paginate, spreadCount, spreadOfPage } from './binderLayout';

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Pages shown side by side: two on tablets and up, one on phones. */
export function usePagesPerSpread(): number {
  return useMediaQuery('(min-width: 768px)') ? 2 : 1;
}

interface Props<T> {
  items: readonly T[];
  itemKey: (item: T) => string | number;
  renderPocket: (item: T, index: number) => ReactNode;
  /** The first page of the spread to show (0-based). */
  page: number;
  onPage: (page: number) => void;
  label: string;
  /** Turn pages with the arrow keys (off while something else wants them). */
  keyboard?: boolean;
  /** Space taken above and below the binder, so a spread fits the window. */
  chrome?: string;
}

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable);
};

/**
 * A binder: 3×3 pockets per page, two-page spreads on wide screens and one
 * page on phones. Arrow keys, swipes, the arrows and the page dots turn pages.
 */
export function BinderSpread<T>({ items, itemKey, renderPocket, page, onPage, label, keyboard = true, chrome = '15rem' }: Props<T>) {
  const perSpread = usePagesPerSpread();
  const pages = paginate(items);
  const spreads = spreadCount(pages.length, perSpread);
  const spread = clamp(spreadOfPage(page, perSpread), 0, spreads - 1);
  const shown = pagesInSpread(spread, perSpread, pages.length);
  const sheet = useRef<HTMLDivElement>(null);
  const last = useRef(spread);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = (s: number) => onPage(clamp(s, 0, spreads - 1) * perSpread);

  // A short slide in the direction of travel.
  useEffect(() => {
    const dir = Math.sign(spread - last.current);
    last.current = spread;
    if (!dir || !sheet.current?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sheet.current.animate(
      [{ opacity: 0.2, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 180, easing: 'ease-out' },
    );
  }, [spread]);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || document.querySelector('[aria-modal="true"]')) return;
      const to = e.key === 'ArrowLeft' || e.key === 'PageUp' ? spread - 1
        : e.key === 'ArrowRight' || e.key === 'PageDown' ? spread + 1
          : e.key === 'Home' ? 0 : e.key === 'End' ? spreads - 1 : null;
      if (to === null) return;
      e.preventDefault();
      onPage(clamp(to, 0, spreads - 1) * perSpread);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [keyboard, spread, spreads, perSpread, onPage]);

  const first = shown[0] + 1;
  const lastPage = shown[shown.length - 1] + 1;
  const where = shown.length > 1 ? `Pages ${first}–${lastPage}` : `Page ${first}`;
  const ratio = perSpread === 2 ? 1.3 : 0.68;

  return (
    <section aria-label={label} aria-roledescription="binder">
      <div className="mx-auto" style={{ maxWidth: `min(100%, calc((100dvh - ${chrome}) * ${ratio}))` }}>
        <div
          ref={sheet}
          className="rounded-2xl bg-surface-2 border border-line p-2.5 sm:p-4 shadow-card select-none"
          onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={e => {
            const t = touch.current;
            touch.current = null;
            if (!t) return;
            const dx = e.changedTouches[0].clientX - t.x;
            const dy = e.changedTouches[0].clientY - t.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(spread + (dx < 0 ? 1 : -1));
          }}
        >
          <div className={`grid gap-3 sm:gap-0 ${perSpread === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {Array.from({ length: perSpread }, (_, slot) => {
              const p = shown[slot];
              const pockets = p === undefined ? null : pages[p];
              return (
                <div key={slot} className={`${perSpread === 2 ? (slot === 0 ? 'sm:pr-4' : 'sm:pl-4 sm:border-l border-line') : ''}`}>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5" role="list" aria-label={p === undefined ? 'Blank page' : `Page ${p + 1}`}>
                    {Array.from({ length: 9 }, (_, i) => {
                      const item = pockets?.[i] ?? null;
                      const index = (p ?? 0) * 9 + i;
                      return (
                        <div key={item === null ? `empty-${i}` : itemKey(item)} role="listitem"
                          className="relative aspect-card rounded-[4.6%/3.3%] bg-bg/60 ring-1 ring-inset ring-line">
                          {item !== null && renderPocket(item, index)}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-center text-xs text-muted tabular-nums">{p === undefined ? '' : p + 1}</div>
                </div>
              );
            })}
          </div>
        </div>

        <nav aria-label="Binder pages" className="mt-3 flex items-center justify-between gap-2">
          <button type="button" className="icon-btn shrink-0" aria-label="Previous page" disabled={spread === 0} onClick={() => go(spread - 1)}>
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center min-w-0 overflow-hidden">
            {dotWindow(spreads, spread, perSpread === 2 ? 13 : 9).map((s, i) => s === null ? (
              <span key={`gap-${i}`} className="w-5 text-center text-muted text-xs" aria-hidden>…</span>
            ) : (
              <button key={s} type="button" onClick={() => go(s)} aria-current={s === spread ? 'page' : undefined}
                aria-label={perSpread === 2 ? `Pages ${s * 2 + 1}–${Math.min(pages.length, s * 2 + 2)}` : `Page ${s + 1}`}
                className="h-9 w-6 sm:w-7 inline-flex items-center justify-center group">
                <span className={`block rounded-full transition-all ${s === spread ? 'h-2.5 w-2.5 bg-accent-fill' : 'h-2 w-2 bg-surface-3 group-hover:bg-muted'}`} />
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn shrink-0" aria-label="Next page" disabled={spread >= spreads - 1} onClick={() => go(spread + 1)}>
            <ChevronRight size={22} />
          </button>
        </nav>
        <p className="text-center text-xs text-muted tabular-nums" aria-live="polite">{where} of {pages.length}</p>
      </div>
    </section>
  );
}

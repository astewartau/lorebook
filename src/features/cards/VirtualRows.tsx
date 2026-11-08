import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface Row {
  key: string;
  height: number;
}

interface Props<R extends Row> {
  rows: R[];
  render: (row: R) => ReactNode;
  /** Extra screens of rows rendered above and below the viewport. */
  overscan?: number;
}

/**
 * Renders only the rows near the viewport, scrolling with the window. Rows
 * have known heights (card rows, group headers), so no measuring is needed.
 */
export function VirtualRows<R extends Row>({ rows, render, overscan = 1 }: Props<R>) {
  const ref = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ top: 0, bottom: 2000 });

  const offsets = useMemo(() => {
    const out = new Array<number>(rows.length + 1);
    out[0] = 0;
    for (let i = 0; i < rows.length; i++) out[i + 1] = out[i] + rows[i].height;
    return out;
  }, [rows]);

  const measure = useRef(() => {});
  measure.current = () => {
    const el = ref.current;
    if (!el) return;
    const top = -el.getBoundingClientRect().top;
    const h = window.innerHeight;
    const next = { top: Math.max(0, top - h * overscan), bottom: top + h * (1 + overscan) };
    // Re-render only when the window moves by a good part of a screen.
    setRange(r => (Math.abs(r.top - next.top) < h / 4 && Math.abs(r.bottom - next.bottom) < h / 4 ? r : next));
  };

  useLayoutEffect(() => measure.current(), [offsets]);

  useEffect(() => {
    let frame = 0;
    const on = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure.current(); });
    };
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // First row ending after range.top, by binary search.
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] <= range.top) lo = mid + 1;
    else hi = mid;
  }
  const visible: ReactNode[] = [];
  for (let i = lo; i < rows.length && offsets[i] < range.bottom; i++) {
    visible.push(
      <div key={rows[i].key} style={{ position: 'absolute', top: offsets[i], left: 0, right: 0, height: rows[i].height }}>
        {render(rows[i])}
      </div>
    );
  }

  return <div ref={ref} style={{ position: 'relative', height: offsets[rows.length] }}>{visible}</div>;
}

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

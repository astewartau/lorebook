// Binder pages: 3×3 pockets per page, shown one page at a time on phones and
// as two-page spreads on wider screens.

export const POCKETS_PER_PAGE = 9;

/** Splits items into pages of pockets; the last page is padded with empty pockets. Always at least one page. */
export function paginate<T>(items: readonly T[], perPage = POCKETS_PER_PAGE): (T | null)[][] {
  const pages: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  if (pages.length === 0) pages.push([]);
  const last = pages[pages.length - 1];
  while (last.length < perPage) last.push(null);
  return pages;
}

export function spreadCount(pageCount: number, pagesPerSpread: number): number {
  return Math.max(1, Math.ceil(pageCount / pagesPerSpread));
}

/** The spread that shows a page. */
export function spreadOfPage(page: number, pagesPerSpread: number): number {
  return Math.floor(Math.max(0, page) / pagesPerSpread);
}

/** The page holding the item at this index. */
export function pageOfItem(index: number, perPage = POCKETS_PER_PAGE): number {
  return Math.floor(Math.max(0, index) / perPage);
}

/** Page numbers (0-based) shown in a spread; the last spread may have fewer. */
export function pagesInSpread(spread: number, pagesPerSpread: number, pageCount: number): number[] {
  const out: number[] = [];
  for (let p = spread * pagesPerSpread; p < Math.min(pageCount, (spread + 1) * pagesPerSpread); p++) out.push(p);
  return out;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Which of a long run of page dots to show: all of them when few, otherwise
 * the first, the last and a window around the current one, with null for gaps.
 */
export function dotWindow(count: number, current: number, max = 9): (number | null)[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const w = max - 4;
  const start = clamp(current - Math.floor(w / 2), 1, count - 1 - w);
  const end = start + w - 1;
  const out: (number | null)[] = [0];
  if (start > 1) out.push(null);
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 2) out.push(null);
  out.push(count - 1);
  return out;
}

import type { LorcanaCard } from '../../types';

/** Cards whose full name contains every word typed, in card order. */
export function matchCards(cards: LorcanaCard[], query: string, limit: number): LorcanaCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out: LorcanaCard[] = [];
  for (const c of cards) {
    const name = c.fullName.toLowerCase();
    if (words.every(w => name.includes(w))) {
      out.push(c);
      if (out.length >= limit) break;
    }
  }
  return out;
}

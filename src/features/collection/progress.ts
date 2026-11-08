// Collection numbers: per-set completion, playsets, rarity breakdowns and
// headline stats. Pure functions over cards and quantities.

import type { CollectionCardEntry, LorcanaCard } from '../../types';
import { RARITIES } from '../cards/browserState';

export type Quantity = (cardId: number) => { normal: number; foil: number; total: number };

export const PLAYSET = 4;

/** Copies that make a playset of this card: 4, or fewer for cards limited to fewer per deck. */
export function playsetSize(card: LorcanaCard): number {
  const max = card.maxCopiesInDeck;
  return typeof max === 'number' && max > 0 ? Math.min(PLAYSET, max) : PLAYSET;
}

/** The numbered cards of a set, in card-number order. Promos share numbers with set cards, so they are left out. */
export function setCards(all: LorcanaCard[], setCode: string): LorcanaCard[] {
  return all
    .filter(c => c.setCode === setCode && !c.promoGrouping)
    .sort((a, b) => a.number - b.number || a.id - b.id);
}

export interface RarityCount {
  rarity: string;
  total: number;
  owned: number;
}

export interface SetProgress {
  total: number;
  /** Cards with at least one copy. */
  owned: number;
  /** Cards with a full playset. */
  playsets: number;
  copies: number;
  foils: number;
  rarities: RarityCount[];
}

const rarityRank = (r: string) => {
  const i = (RARITIES as readonly string[]).indexOf(r);
  return i === -1 ? 99 : i;
};

export function setProgress(cards: LorcanaCard[], qty: Quantity): SetProgress {
  const byRarity = new Map<string, RarityCount>();
  let owned = 0;
  let playsets = 0;
  let copies = 0;
  let foils = 0;
  for (const c of cards) {
    const q = qty(c.id);
    const r = byRarity.get(c.rarity) ?? { rarity: c.rarity, total: 0, owned: 0 };
    r.total++;
    if (q.total > 0) {
      owned++;
      r.owned++;
    }
    if (q.total >= playsetSize(c)) playsets++;
    copies += q.total;
    foils += q.foil;
    byRarity.set(c.rarity, r);
  }
  const rarities = Array.from(byRarity.values()).sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));
  return { total: cards.length, owned, playsets, copies, foils, rarities };
}

/** Whole fraction as a percentage, rounding down so 99.9% never shows as 100%. */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.floor((part / whole) * 100);
}

export interface CollectionStats {
  unique: number;
  copies: number;
  foils: number;
  playsets: number;
}

export function collectionStats(entries: CollectionCardEntry[], cardsById: ReadonlyMap<number, LorcanaCard>): CollectionStats {
  let unique = 0;
  let copies = 0;
  let foils = 0;
  let playsets = 0;
  for (const e of entries) {
    const total = e.quantityNormal + e.quantityFoil;
    if (total <= 0) continue;
    unique++;
    copies += total;
    foils += e.quantityFoil;
    const card = cardsById.get(e.cardId);
    if (total >= (card ? playsetSize(card) : PLAYSET)) playsets++;
  }
  return { unique, copies, foils, playsets };
}

export interface SetInfo {
  code: string;
  name: string;
  number: number;
  type?: string;
  releaseDate?: string | null;
}

/** Sets that have cards, main sets newest first, then other products (Illumineer's Quest) newest first. */
export function listSets(sets: Record<string, Omit<SetInfo, 'code'>>, all: LorcanaCard[]): SetInfo[] {
  const withCards = new Set<string>();
  for (const c of all) if (!c.promoGrouping) withCards.add(c.setCode);
  return Object.entries(sets)
    .filter(([code]) => withCards.has(code))
    .map(([code, s]) => ({ code, ...s }))
    .sort((a, b) => {
      const ae = a.type !== 'quest' ? 0 : 1;
      const be = b.type !== 'quest' ? 0 : 1;
      return ae - be || b.number - a.number;
    });
}

/** The logo shipped for numbered main sets (1–13), or null. */
export function setLogo(code: string): string | null {
  const n = Number(code);
  if (!Number.isInteger(n) || n < 1 || n > 13) return null;
  return `/imgs/set${String(n).padStart(2, '0')}-logo.png`;
}

export type OwnedFilter = 'all' | 'owned' | 'missing' | 'foil' | 'short';

export function filterOwned(cards: LorcanaCard[], f: OwnedFilter, qty: Quantity): LorcanaCard[] {
  switch (f) {
    case 'all': return cards;
    case 'owned': return cards.filter(c => qty(c.id).total > 0);
    case 'missing': return cards.filter(c => qty(c.id).total === 0);
    case 'foil': return cards.filter(c => qty(c.id).foil > 0);
    case 'short': return cards.filter(c => qty(c.id).total < playsetSize(c));
  }
}

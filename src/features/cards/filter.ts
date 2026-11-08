import type { LorcanaCard } from '../../types';
import { matchesSmartSearch } from '../../utils/smartSearch';
import { inksOf } from '../../utils/deckValidation';
import { BrowserState, COST_MAX_CHIP, Group, RARITIES, SortField } from './browserState';

export type Quantity = (cardId: number) => { normal: number; foil: number; total: number };

/** Owned copies of every printing sharing this full name. */
export type NameQuantity = (fullName: string) => number;

// Facets: filter groups whose options show live counts.
export type Facet = 'inks' | 'costs' | 'types' | 'rarities' | 'sets' | 'stories' | 'subtypes';
const FACETS: Facet[] = ['inks', 'costs', 'types', 'rarities', 'sets', 'stories', 'subtypes'];

const costKey = (cost: number) => String(Math.min(cost, COST_MAX_CHIP));

function facetKeys(facet: Facet, c: LorcanaCard): string[] {
  switch (facet) {
    case 'inks': return inksOf(c);
    case 'costs': return [costKey(c.cost)];
    case 'types': return [c.type];
    case 'rarities': return [c.rarity];
    case 'sets': return [c.setCode];
    case 'stories': return c.story ? [c.story] : [];
    case 'subtypes': return c.subtypes ?? [];
  }
}

function matchesInks(c: LorcanaCard, s: BrowserState): boolean {
  const inks = inksOf(c);
  if (s.inkMode === 'dual' && inks.length < 2) return false;
  if (s.inks.length === 0) return true;
  // Cards with no ink (Illumineer's Quest) only appear with no ink chosen.
  if (inks.length === 0) return false;
  return s.inkMode === 'only'
    ? inks.every(i => (s.inks as string[]).includes(i))
    : inks.some(i => (s.inks as string[]).includes(i));
}

function matchesFacet(facet: Facet, c: LorcanaCard, s: BrowserState): boolean {
  switch (facet) {
    case 'inks': return matchesInks(c, s);
    case 'costs': return s.costs.length === 0 || s.costs.some(k => (k >= COST_MAX_CHIP ? c.cost >= k : c.cost === k));
    case 'types': return s.types.length === 0 || s.types.includes(c.type);
    case 'rarities': return s.rarities.length === 0 || s.rarities.includes(c.rarity);
    case 'sets': return s.sets.length === 0 || s.sets.includes(c.setCode);
    case 'stories': return s.stories.length === 0 || (!!c.story && s.stories.includes(c.story));
    case 'subtypes': return s.subtypes.length === 0 || (c.subtypes ?? []).some(t => s.subtypes.includes(t));
  }
}

/** Everything except the facets: format, search, inkable, ownership. */
function matchesBase(c: LorcanaCard, s: BrowserState, qty: Quantity, nameQty: NameQuantity): boolean {
  if (s.format === 'core' ? !c.legal.core : !c.legal.infinity) return false;
  if (s.inkable === 'yes' && !c.inkwell) return false;
  if (s.inkable === 'no' && c.inkwell) return false;
  if (s.owned !== 'any') {
    const owned = qty(c.id).total;
    if (s.owned === 'owned' && owned === 0) return false;
    if (s.owned === 'missing' && owned > 0) return false;
    // Playsets count every printing of the name, like deck building does.
    if (s.owned === 'playset' && nameQty(c.fullName) < 4) return false;
    if (s.owned === 'short' && nameQty(c.fullName) >= 4) return false;
  }
  return matchesSmartSearch(c, s.q);
}

export interface FilterResult {
  cards: LorcanaCard[];
  /** Per facet, option -> number of cards matching every other filter. */
  counts: Record<Facet, Record<string, number>>;
}

/**
 * Filters cards and counts each facet's options in one pass: a card failing
 * no facet counts everywhere, failing exactly one counts only in that facet,
 * failing more counts nowhere.
 */
export function filterCards(all: LorcanaCard[], s: BrowserState, qty: Quantity, nameQty: NameQuantity): FilterResult {
  const counts = Object.fromEntries(FACETS.map(f => [f, {}])) as FilterResult['counts'];
  const add = (f: Facet, c: LorcanaCard) => {
    for (const k of facetKeys(f, c)) counts[f][k] = (counts[f][k] ?? 0) + 1;
  };
  const cards: LorcanaCard[] = [];
  for (const c of all) {
    if (!matchesBase(c, s, qty, nameQty)) continue;
    let failed: Facet | null = null;
    let failures = 0;
    for (const f of FACETS) {
      if (!matchesFacet(f, c, s)) {
        failed = f;
        if (++failures > 1) break;
      }
    }
    if (failures === 0) {
      cards.push(c);
      FACETS.forEach(f => add(f, c));
    } else if (failures === 1) {
      add(failed!, c);
    }
  }
  return { cards, counts };
}

const rarityRank = (r: string) => {
  const i = (RARITIES as readonly string[]).indexOf(r);
  return i === -1 ? 99 : i;
};
const setRank = (code: string) => {
  const n = parseInt(code, 10);
  return Number.isNaN(n) ? 1000 + code.charCodeAt(0) : n;
};

const compareBy: Record<SortField, (a: LorcanaCard, b: LorcanaCard, qty: Quantity) => number> = {
  set: (a, b) => setRank(a.setCode) - setRank(b.setCode) || (a.number ?? 0) - (b.number ?? 0),
  name: (a, b) => a.fullName.localeCompare(b.fullName),
  cost: (a, b) => a.cost - b.cost,
  ink: (a, b) => a.color.localeCompare(b.color),
  rarity: (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity),
  type: (a, b) => a.type.localeCompare(b.type),
  owned: (a, b, qty) => qty(a.id).total - qty(b.id).total,
};

export function sortCards(cards: LorcanaCard[], field: SortField, dir: 'asc' | 'desc', qty: Quantity): LorcanaCard[] {
  const sign = dir === 'asc' ? 1 : -1;
  // Newest set first still lists each set from #1 up.
  const primary = field === 'set' ? (a: LorcanaCard, b: LorcanaCard) => setRank(a.setCode) - setRank(b.setCode) : compareBy[field];
  // Ties fall back to set order, then name, so the order is stable.
  return [...cards].sort((a, b) =>
    sign * primary(a, b, qty) || compareBy.set(a, b, qty) || compareBy.name(a, b, qty));
}

export interface CardGroup {
  key: string;
  label: string;
  cards: LorcanaCard[];
}

export function groupCards(cards: LorcanaCard[], group: Group, setName: (code: string) => string): CardGroup[] {
  if (group === 'none') return [{ key: 'all', label: '', cards }];
  const keyOf = (c: LorcanaCard): string => {
    switch (group) {
      case 'set': return c.setCode;
      case 'ink': return c.color || 'No ink';
      case 'cost': return costKey(c.cost);
      case 'type': return c.type;
      case 'rarity': return c.rarity;
    }
  };
  const groups = new Map<string, LorcanaCard[]>();
  for (const c of cards) {
    const k = keyOf(c);
    const list = groups.get(k);
    if (list) list.push(c);
    else groups.set(k, [c]);
  }
  return Array.from(groups, ([key, list]) => ({
    key,
    label: group === 'set' ? setName(key)
      : group === 'cost' ? (Number(key) >= COST_MAX_CHIP ? `Cost ${key}+` : `Cost ${key}`)
      : key.replace('-', ' / '),
    cards: list,
  }));
}

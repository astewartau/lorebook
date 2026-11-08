// Pure deck logic: statistics, grouping, ownership, export and the deck list's
// search and sort. Card lookups are id -> card maps (useCardData().cardsById).

import type { Deck, DeckCardEntry, LorcanaCard } from '../../types';
import { inksOf, maxCopiesFor, validateDeck } from '../../utils/deckValidation';
import { DECK_RULES } from '../../constants';

export type CardMap = ReadonlyMap<number, LorcanaCard>;

export const INK_ORDER = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'] as const;

export interface DeckLine {
  card: LorcanaCard;
  quantity: number;
}

export const totalCards = (cards: DeckCardEntry[]) => cards.reduce((n, c) => n + c.quantity, 0);

/** Deck entries with their cards; unknown ids are dropped. */
export function deckLines(cards: DeckCardEntry[], byId: CardMap): DeckLine[] {
  const out: DeckLine[] = [];
  for (const e of cards) {
    const card = byId.get(e.cardId);
    if (card && e.quantity > 0) out.push({ card, quantity: e.quantity });
  }
  return out;
}

/** The inks a deck uses, in the game's order. */
export function deckInks(cards: DeckCardEntry[], byId: CardMap): string[] {
  const set = new Set<string>();
  for (const e of cards) {
    const card = byId.get(e.cardId);
    if (card) inksOf(card).forEach(i => set.add(i));
  }
  return INK_ORDER.filter(i => set.has(i));
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export type CardKind = 'Character' | 'Action' | 'Song' | 'Item' | 'Location';
export const KIND_ORDER: CardKind[] = ['Character', 'Action', 'Song', 'Item', 'Location'];
export const KIND_LABEL: Record<CardKind, string> = {
  Character: 'Characters', Action: 'Actions', Song: 'Songs', Item: 'Items', Location: 'Locations',
};

/** Songs are actions, but deck lists show them on their own. */
export function kindOf(card: LorcanaCard): CardKind {
  if (card.type === 'Song' || (card.type === 'Action' && card.subtypes?.includes('Song'))) return 'Song';
  return (KIND_ORDER as string[]).includes(card.type) ? (card.type as CardKind) : 'Action';
}

export const byCostThenName = (a: DeckLine, b: DeckLine) =>
  a.card.cost - b.card.cost || a.card.fullName.localeCompare(b.card.fullName) || a.card.id - b.card.id;

export interface DeckGroup {
  kind: CardKind;
  label: string;
  count: number;
  lines: DeckLine[];
}

/** Lines grouped by card type (songs apart), each sorted by cost then name. */
export function groupByKind(lines: DeckLine[]): DeckGroup[] {
  const groups = new Map<CardKind, DeckLine[]>();
  for (const l of lines) {
    const k = kindOf(l.card);
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return KIND_ORDER.filter(k => groups.has(k)).map(kind => {
    const ls = groups.get(kind)!.sort(byCostThenName);
    return { kind, label: KIND_LABEL[kind], count: ls.reduce((n, l) => n + l.quantity, 0), lines: ls };
  });
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/** The cost curve's last bar counts this cost and above. */
export const CURVE_MAX = 7;

export interface DeckStats {
  total: number;
  unique: number;
  /** Copies at each cost 0..CURVE_MAX (the last is "7+"), split by inkable. */
  curve: { cost: number; inkable: number; uninkable: number }[];
  /** Copies per ink; a dual-ink card counts for both. */
  inks: { ink: string; count: number }[];
  kinds: { kind: CardKind; label: string; count: number }[];
  inkable: number;
  averageCost: number;
}

export function deckStats(lines: DeckLine[]): DeckStats {
  const curve = Array.from({ length: CURVE_MAX + 1 }, (_, cost) => ({ cost, inkable: 0, uninkable: 0 }));
  const inks = new Map<string, number>();
  const kinds = new Map<CardKind, number>();
  let total = 0;
  let inkable = 0;
  let costSum = 0;
  for (const { card, quantity } of lines) {
    total += quantity;
    costSum += card.cost * quantity;
    const bar = curve[Math.min(Math.max(card.cost, 0), CURVE_MAX)];
    if (card.inkwell) {
      bar.inkable += quantity;
      inkable += quantity;
    } else {
      bar.uninkable += quantity;
    }
    for (const ink of inksOf(card)) inks.set(ink, (inks.get(ink) ?? 0) + quantity);
    const k = kindOf(card);
    kinds.set(k, (kinds.get(k) ?? 0) + quantity);
  }
  return {
    total,
    unique: lines.length,
    curve,
    inks: INK_ORDER.filter(i => inks.has(i)).map(ink => ({ ink, count: inks.get(ink)! })),
    kinds: KIND_ORDER.filter(k => kinds.has(k)).map(kind => ({ kind, label: KIND_LABEL[kind], count: kinds.get(kind)! })),
    inkable,
    averageCost: total ? Math.round((costSum / total) * 10) / 10 : 0,
  };
}

// ---------------------------------------------------------------------------
// Legality
// ---------------------------------------------------------------------------

export type DeckStatus = 'core' | 'infinity' | 'incomplete' | 'invalid' | 'empty';

export interface DeckCheck {
  status: DeckStatus;
  /** Short badge text. */
  label: string;
  errors: string[];
  warnings: string[];
}

export function checkDeck(deck: Pick<Deck, 'cards'>, byId: CardMap): DeckCheck {
  const total = totalCards(deck.cards);
  if (total === 0) return { status: 'empty', label: 'Empty', errors: [], warnings: [] };
  const v = validateDeck(deck as Deck, byId);
  // A short deck with nothing else wrong is a deck in progress, not a broken one.
  const otherErrors = v.errors.filter(e => !e.startsWith('Deck needs'));
  if (v.coreLegal) return { status: 'core', label: 'Core legal', errors: [], warnings: v.warnings };
  if (v.isValid) return { status: 'infinity', label: 'Infinity', errors: [], warnings: v.warnings };
  if (otherErrors.length === 0) {
    return { status: 'incomplete', label: `${total}/${DECK_RULES.MIN_CARDS}`, errors: v.errors, warnings: v.warnings };
  }
  return { status: 'invalid', label: 'Not legal', errors: v.errors, warnings: v.warnings };
}

/** True if any card in the deck is not legal in Core. */
export function hasNonCoreCards(cards: DeckCardEntry[], byId: CardMap): boolean {
  return cards.some(e => {
    const c = byId.get(e.cardId);
    return !!c && !c.legal.core;
  });
}

// ---------------------------------------------------------------------------
// Copies by name, limits and ownership
// ---------------------------------------------------------------------------

/** Copies in the deck per full name (all printings together). */
export function countsByName(cards: DeckCardEntry[], byId: CardMap): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of cards) {
    const name = byId.get(e.cardId)?.fullName;
    if (name) m.set(name, (m.get(name) ?? 0) + e.quantity);
  }
  return m;
}

export interface NeedLine {
  fullName: string;
  card: LorcanaCard;
  needed: number;
  owned: number;
  missing: number;
}

/** What the deck needs per full name against what you own of any printing. */
export function ownershipNeeds(lines: DeckLine[], nameQuantity: (fullName: string) => number): NeedLine[] {
  const byName = new Map<string, { card: LorcanaCard; needed: number }>();
  for (const { card, quantity } of lines) {
    const cur = byName.get(card.fullName);
    byName.set(card.fullName, { card: cur?.card ?? card, needed: (cur?.needed ?? 0) + quantity });
  }
  return Array.from(byName, ([fullName, { card, needed }]) => {
    const owned = nameQuantity(fullName);
    return { fullName, card, needed, owned, missing: Math.max(0, needed - owned) };
  });
}

export function missingSummary(needs: NeedLine[]) {
  const short = needs.filter(n => n.missing > 0).sort((a, b) => a.card.cost - b.card.cost || a.fullName.localeCompare(b.fullName));
  return { lines: short, copies: short.reduce((n, l) => n + l.missing, 0) };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** "4 Name - Version" per line, grouped by type and cost; one line per full name. */
export function deckToText(lines: DeckLine[]): string {
  const out: string[] = [];
  for (const g of groupByKind(lines)) {
    const merged = new Map<string, number>();
    for (const l of g.lines) merged.set(l.card.fullName, (merged.get(l.card.fullName) ?? 0) + l.quantity);
    merged.forEach((n, name) => out.push(`${n} ${name}`));
  }
  return out.join('\n');
}

/** Lorebook's own JSON format, read back by parseLorebookJSON. */
export function deckToJson(deck: Pick<Deck, 'name' | 'description' | 'tags' | 'cards'>, byId: CardMap) {
  return {
    name: deck.name,
    description: deck.description ?? '',
    tags: deck.tags ?? [],
    cards: deck.cards.map(e => {
      const c = byId.get(e.cardId);
      return { id: e.cardId, quantity: e.quantity, ...(c ? { name: c.fullName, set: c.setCode, number: c.number } : {}) };
    }),
  };
}

export function deckToCsv(lines: DeckLine[]): string {
  const rows: (string | number)[][] = [['Quantity', 'Name', 'Version', 'Set', 'Number', 'Ink', 'Cost', 'Type', 'Rarity']];
  for (const g of groupByKind(lines)) {
    for (const { card: c, quantity } of g.lines) rows.push([quantity, c.name, c.version ?? '', c.setCode, c.number, c.color, c.cost, c.type, c.rarity]);
  }
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export const fileSafe = (name: string) => name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'deck';

// ---------------------------------------------------------------------------
// Deck art
// ---------------------------------------------------------------------------

/** The card whose art stands for the deck: its chosen art, else its first character by cost. */
export function deckArtCard(deck: Pick<Deck, 'cards' | 'avatar'>, byId: CardMap): LorcanaCard | undefined {
  if (deck.avatar && byId.get(deck.avatar.cardId)) return byId.get(deck.avatar.cardId);
  const lines = deckLines(deck.cards, byId);
  if (!lines.length) return undefined;
  const groups = groupByKind(lines);
  // Highest-cost character tends to be the deck's star.
  const chars = groups.find(g => g.kind === 'Character')?.lines;
  if (chars?.length) return [...chars].sort((a, b) => b.quantity - a.quantity || b.card.cost - a.card.cost)[0].card;
  return groups[0].lines[0].card;
}

// ---------------------------------------------------------------------------
// Your decks: search, filters, sort
// ---------------------------------------------------------------------------

export type DeckSort = 'updated' | 'created' | 'name' | 'size';

export interface DeckListFilter {
  q: string;
  inks: string[];
  tags: string[];
  sort: DeckSort;
}

export function filterDecks(decks: Deck[], f: DeckListFilter, byId: CardMap): Deck[] {
  const q = f.q.trim().toLowerCase();
  const out = decks.filter(d => {
    if (q && !(d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.tags?.some(t => t.includes(q)))) return false;
    if (f.tags.length && !f.tags.every(t => d.tags?.includes(t))) return false;
    if (f.inks.length) {
      const inks = deckInks(d.cards, byId);
      if (!f.inks.every(i => inks.includes(i))) return false;
    }
    return true;
  });
  const cmp: Record<DeckSort, (a: Deck, b: Deck) => number> = {
    updated: (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    created: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    name: (a, b) => a.name.localeCompare(b.name),
    size: (a, b) => totalCards(b.cards) - totalCards(a.cards),
  };
  return out.sort((a, b) => cmp[f.sort](a, b) || a.name.localeCompare(b.name));
}

export function allTags(decks: Deck[]): string[] {
  const s = new Set<string>();
  decks.forEach(d => d.tags?.forEach(t => s.add(t)));
  return Array.from(s).sort();
}

/** "Copy of X", or "X (2)" style names that don't clash. */
export function copyName(name: string, existing: string[]): string {
  const base = `${name} (copy)`.slice(0, 100);
  if (!existing.includes(base)) return base;
  for (let i = 2; ; i++) {
    const n = `${name} (copy ${i})`.slice(0, 100);
    if (!existing.includes(n)) return n;
  }
}

/** Remaining copies you may add by name, given the limit. */
export function roomFor(card: LorcanaCard, inDeckByName: number): number {
  return maxCopiesFor(card) - inDeckByName;
}

export function relativeDate(d: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)} h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

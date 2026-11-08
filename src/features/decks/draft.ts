// Edits to a deck's card list. Pure, so the builder, the "add to deck" control
// and their tests share one set of rules.

import type { DeckCardEntry, LorcanaCard } from '../../types';
import { maxCopiesFor } from '../../utils/deckValidation';
import type { CardMap } from './deckLogic';

export type DraftAction =
  | { type: 'add'; cardId: number; count?: number }
  | { type: 'remove'; cardId: number; count?: number }
  | { type: 'set'; cardId: number; quantity: number }
  | { type: 'replace'; cards: DeckCardEntry[] };

/** Copies of this card's full name already in the deck. */
function namedCount(cards: DeckCardEntry[], byId: CardMap, card: LorcanaCard): number {
  let n = 0;
  for (const e of cards) if (byId.get(e.cardId)?.fullName === card.fullName) n += e.quantity;
  return n;
}

/** How many more copies of this card the deck may take. */
export function canAddCount(cards: DeckCardEntry[], byId: CardMap, cardId: number): number {
  const card = byId.get(cardId);
  if (!card) return 0;
  return Math.max(0, maxCopiesFor(card) - namedCount(cards, byId, card));
}

function withQuantity(cards: DeckCardEntry[], cardId: number, quantity: number): DeckCardEntry[] {
  const i = cards.findIndex(c => c.cardId === cardId);
  if (quantity <= 0) return i < 0 ? cards : cards.filter(c => c.cardId !== cardId);
  if (i < 0) return [...cards, { cardId, quantity }];
  if (cards[i].quantity === quantity) return cards;
  const next = cards.slice();
  next[i] = { cardId, quantity };
  return next;
}

/** Applies an edit, keeping every full name within its copy limit. Returns the same array if nothing changed. */
export function applyDraft(cards: DeckCardEntry[], action: DraftAction, byId: CardMap): DeckCardEntry[] {
  switch (action.type) {
    case 'replace':
      return action.cards.filter(c => c.quantity > 0);
    case 'add': {
      const n = Math.min(action.count ?? 1, canAddCount(cards, byId, action.cardId));
      if (n <= 0) return cards;
      const cur = cards.find(c => c.cardId === action.cardId)?.quantity ?? 0;
      return withQuantity(cards, action.cardId, cur + n);
    }
    case 'remove': {
      const cur = cards.find(c => c.cardId === action.cardId)?.quantity ?? 0;
      if (cur === 0) return cards;
      return withQuantity(cards, action.cardId, cur - (action.count ?? 1));
    }
    case 'set': {
      const cur = cards.find(c => c.cardId === action.cardId)?.quantity ?? 0;
      const target = Math.max(0, Math.floor(action.quantity));
      const allowed = target > cur ? cur + Math.min(target - cur, canAddCount(cards, byId, action.cardId)) : target;
      return withQuantity(cards, action.cardId, allowed);
    }
  }
}

/** Order-insensitive equality of two card lists. */
export function sameCards(a: DeckCardEntry[], b: DeckCardEntry[]): boolean {
  const norm = (l: DeckCardEntry[]) => l.filter(c => c.quantity > 0).map(c => `${c.cardId}:${c.quantity}`).sort().join(',');
  return norm(a) === norm(b);
}

/** Adds per-card deltas to a list (for edits made against an older copy). */
export function applyDeltas(cards: DeckCardEntry[], deltas: ReadonlyMap<number, number>, byId: CardMap): DeckCardEntry[] {
  let out = cards;
  deltas.forEach((d, cardId) => {
    if (d > 0) out = applyDraft(out, { type: 'add', cardId, count: d }, byId);
    else if (d < 0) out = applyDraft(out, { type: 'remove', cardId, count: -d }, byId);
  });
  return out;
}

/** The entry to take one copy from when removing a card by name: this printing first, else another printing. */
export function removeTarget(cards: DeckCardEntry[], byId: CardMap, card: LorcanaCard): number | undefined {
  if (cards.some(c => c.cardId === card.id && c.quantity > 0)) return card.id;
  return cards.find(c => c.quantity > 0 && byId.get(c.cardId)?.fullName === card.fullName)?.cardId;
}

/** Copies in the deck sharing this card's full name. */
export function copiesOfName(cards: DeckCardEntry[], byId: CardMap, card: LorcanaCard): number {
  return namedCount(cards, byId, card);
}

// Editing a custom binder's ordered card list. Every function returns a new list.

import type { BinderCardEntry } from '../../types';

export const MAX_BINDER_QUANTITY = 99;

/** Moves the item at `from` so it ends up at index `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = Math.min(Math.max(0, to), list.length - 1);
  if (from === target) return [...list];
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(target, 0, item);
  return out;
}

/** Adds a copy, appending the card if it isn't in the binder yet. */
export function addCard(list: readonly BinderCardEntry[], cardId: number): BinderCardEntry[] {
  const i = list.findIndex(e => e.cardId === cardId);
  if (i === -1) return [...list, { cardId, quantity: 1 }];
  return setQuantity(list, cardId, list[i].quantity + 1);
}

/** Sets a card's quantity (capped at 99); zero or less removes it. */
export function setQuantity(list: readonly BinderCardEntry[], cardId: number, quantity: number): BinderCardEntry[] {
  if (quantity <= 0) return removeCard(list, cardId);
  const q = Math.min(MAX_BINDER_QUANTITY, Math.floor(quantity));
  return list.map(e => (e.cardId === cardId ? { ...e, quantity: q } : e));
}

export function removeCard(list: readonly BinderCardEntry[], cardId: number): BinderCardEntry[] {
  return list.filter(e => e.cardId !== cardId);
}

/** Whether two card lists are the same, in order. */
export function sameCards(a: readonly BinderCardEntry[], b: readonly BinderCardEntry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.cardId === b[i].cardId && e.quantity === b[i].quantity);
}

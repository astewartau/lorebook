// What a deck tile shows: its inks, card count and a card for the banner.

import type { Deck, LorcanaCard } from '../../types';

const INK_ORDER = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];

export interface DeckSummary {
  inks: string[];
  cardCount: number;
  /** The deck's chosen picture, else its most-played card (highest cost breaks ties). */
  bannerCardId?: number;
}

export function summariseDeck(deck: Pick<Deck, 'cards' | 'avatar'>, getCard: (id: number) => LorcanaCard | undefined): DeckSummary {
  const inks = new Set<string>();
  let cardCount = 0;
  let best: { id: number; quantity: number; cost: number } | undefined;
  for (const entry of deck.cards) {
    cardCount += entry.quantity;
    const card = getCard(entry.cardId);
    if (!card) continue;
    (card.colors ?? (card.color ? card.color.split('-') : [])).forEach(i => inks.add(i));
    const cost = card.cost ?? 0;
    if (!best || entry.quantity > best.quantity || (entry.quantity === best.quantity && cost > best.cost)) {
      best = { id: card.id, quantity: entry.quantity, cost };
    }
  }
  const avatarId = deck.avatar?.cardId;
  return {
    inks: [...inks].sort((x, y) => INK_ORDER.indexOf(x) - INK_ORDER.indexOf(y)),
    cardCount,
    bannerCardId: avatarId !== undefined && getCard(avatarId) ? avatarId : best?.id,
  };
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

import { describe, expect, it } from 'vitest';
import type { LorcanaCard } from '../../types';
import { plural, summariseDeck } from './deckSummary';

const card = (id: number, color: string, cost: number) => ({ id, color, cost } as unknown as LorcanaCard);
const cards = new Map([card(1, 'Sapphire', 2), card(2, 'Amber', 5), card(3, 'Amber-Steel', 3)].map(c => [c.id, c]));
const getCard = (id: number) => cards.get(id);

describe('summariseDeck', () => {
  it('counts cards, orders inks and picks the most-played card', () => {
    const s = summariseDeck({ cards: [{ cardId: 1, quantity: 4 }, { cardId: 2, quantity: 4 }, { cardId: 3, quantity: 2 }, { cardId: 99, quantity: 1 }] }, getCard);
    expect(s.cardCount).toBe(11);
    expect(s.inks).toEqual(['Amber', 'Sapphire', 'Steel']);
    expect(s.bannerCardId).toBe(2); // ties go to the higher cost
  });

  it('prefers the chosen picture', () => {
    const s = summariseDeck({ cards: [{ cardId: 1, quantity: 4 }], avatar: { cardId: 3, cropData: { x: 0, y: 0, scale: 1 } } }, getCard);
    expect(s.bannerCardId).toBe(3);
  });

  it('handles an empty deck', () => {
    expect(summariseDeck({ cards: [] }, getCard)).toEqual({ inks: [], cardCount: 0, bannerCardId: undefined });
  });
});

describe('plural', () => {
  it('pluralises', () => {
    expect(plural(1, 'deck')).toBe('1 deck');
    expect(plural(3, 'deck')).toBe('3 decks');
  });
});

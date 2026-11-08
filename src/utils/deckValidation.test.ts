import { describe, expect, it } from 'vitest';
import { card } from '../test/cards';
import { Deck, LorcanaCard } from '../types';
import { copiesByName, maxCopiesFor, validateDeck } from './deckValidation';

const deck = (entries: [LorcanaCard, number][]): Deck => ({
  id: 'd', name: 'Test', createdAt: new Date(), updatedAt: new Date(),
  cards: entries.map(([c, quantity]) => ({ cardId: c.id, quantity })),
});

// Fifteen distinct Amber cards, four of each: a legal 60-card deck.
const filler = Array.from({ length: 15 }, () => card());

describe('validateDeck', () => {
  it('accepts a 60-card, one-ink deck', () => {
    const v = validateDeck(deck(filler.map(c => [c, 4])), filler);
    expect(v.errors).toEqual([]);
    expect(v.isValid).toBe(true);
    expect(v.coreLegal).toBe(true);
  });

  it('needs 60 cards', () => {
    const v = validateDeck(deck(filler.slice(0, 14).map(c => [c, 4])), filler);
    expect(v.errors[0]).toMatch(/needs 4 more/);
  });

  it('counts copies across printings with the same full name', () => {
    const a = card({ name: 'Elsa', version: 'Snow Queen' });
    const b = card({ name: 'Elsa', version: 'Snow Queen', setCode: '9' });
    const cards = [...filler, a, b];
    const v = validateDeck(deck([...filler.slice(1).map((c): [LorcanaCard, number] => [c, 4]), [a, 3], [b, 3]]), cards);
    expect(v.errors).toEqual(['"Elsa - Snow Queen" exceeds its 4-copy limit (6 copies)']);
    expect(copiesByName(deck([[a, 3], [b, 3]]).cards, cards, 'Elsa - Snow Queen')).toBe(6);
  });

  it('follows maxCopiesInDeck: a number, or null for any number', () => {
    const slipper = card({ name: 'The Glass Slipper', version: undefined, fullName: 'The Glass Slipper', maxCopiesInDeck: 2 });
    const microbots = card({ name: 'Microbots', fullName: 'Microbots', maxCopiesInDeck: null });
    expect(maxCopiesFor(slipper)).toBe(2);
    expect(maxCopiesFor(microbots)).toBe(Infinity);
    expect(maxCopiesFor(filler[0])).toBe(4);
    const v = validateDeck(deck([[microbots, 60]]), [microbots]);
    expect(v.isValid).toBe(true);
  });

  it('allows two inks, counting dual-ink cards as both', () => {
    const steel = card({ color: 'Steel' });
    const dual = card({ color: 'Amber-Steel', colors: ['Amber', 'Steel'] });
    const ruby = card({ color: 'Ruby' });
    const base = filler.slice(0, 13).map((c): [LorcanaCard, number] => [c, 4]);
    expect(validateDeck(deck([...base, [steel, 4], [dual, 4]]), [...filler, steel, dual]).isValid).toBe(true);
    const three = validateDeck(deck([...base, [dual, 4], [ruby, 4]]), [...filler, dual, ruby]);
    expect(three.errors).toEqual(['Deck has more than 2 inks (Amber, Ruby, Steel)']);
  });

  it('reports cards that are not legal in Core', () => {
    const old = card({ legal: { core: false, infinity: true } });
    const v = validateDeck(deck([...filler.slice(1).map((c): [LorcanaCard, number] => [c, 4]), [old, 4]]), [...filler, old]);
    expect(v.isValid).toBe(true);
    expect(v.coreLegal).toBe(false);
    expect(v.notCoreLegal).toEqual([old.fullName]);
  });

  it('flags cards missing from the database', () => {
    const v = validateDeck({ ...deck(filler.map(c => [c, 4])), cards: [...deck(filler.map(c => [c, 4])).cards, { cardId: 999999, quantity: 1 }] }, filler);
    expect(v.errors).toContain('Deck contains 1 card not in the card database');
  });
});

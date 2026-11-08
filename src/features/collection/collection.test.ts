import { describe, expect, it } from 'vitest';
import { card } from '../../test/cards';
import type { LorcanaCard } from '../../types';
import { collectionStats, filterOwned, listSets, percent, playsetSize, setCards, setLogo, setProgress } from './progress';
import { clamp, dotWindow, pageOfItem, pagesInSpread, paginate, spreadCount, spreadOfPage } from './binderLayout';
import { addCard, moveItem, removeCard, sameCards, setQuantity } from './binderCards';
import { parseLorebookJSON } from './importFile';

const quantities = (m: Record<number, [number, number]>) => (id: number) => {
  const [normal, foil] = m[id] ?? [0, 0];
  return { normal, foil, total: normal + foil };
};

describe('set progress', () => {
  const a = card({ id: 101, setCode: '2', number: 3, rarity: 'Common' });
  const b = card({ id: 102, setCode: '2', number: 1, rarity: 'Rare' });
  const c = card({ id: 103, setCode: '2', number: 2, rarity: 'Common' });
  const promo = card({ id: 104, setCode: '2', number: 1, rarity: 'Special', promoGrouping: 'P1' });
  const other = card({ id: 105, setCode: '3', number: 1 });
  const all = [a, b, c, promo, other];

  it('lists a set in number order without promos', () => {
    expect(setCards(all, '2').map(x => x.id)).toEqual([102, 103, 101]);
  });

  it('counts owned cards, playsets, copies, foils and rarities', () => {
    const p = setProgress(setCards(all, '2'), quantities({ 101: [4, 0], 102: [0, 1], 104: [9, 9] }));
    expect(p).toMatchObject({ total: 3, owned: 2, playsets: 1, copies: 5, foils: 1 });
    expect(p.rarities).toEqual([
      { rarity: 'Common', total: 2, owned: 1 },
      { rarity: 'Rare', total: 1, owned: 1 },
    ]);
  });

  it('caps a playset at the deck limit', () => {
    expect(playsetSize(card())).toBe(4);
    expect(playsetSize(card({ maxCopiesInDeck: 2 }))).toBe(2);
    expect(playsetSize(card({ maxCopiesInDeck: null }))).toBe(4);
  });

  it('never rounds an incomplete set up to 100%', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(0, 0)).toBe(0);
    expect(percent(5, 5)).toBe(100);
  });

  it('filters by ownership', () => {
    const q = quantities({ 101: [1, 0], 102: [0, 2] });
    const cards = [a, b, c];
    expect(filterOwned(cards, 'owned', q).map(x => x.id)).toEqual([101, 102]);
    expect(filterOwned(cards, 'missing', q).map(x => x.id)).toEqual([103]);
    expect(filterOwned(cards, 'foil', q).map(x => x.id)).toEqual([102]);
    expect(filterOwned(cards, 'short', q)).toHaveLength(3);
    expect(filterOwned(cards, 'all', q)).toBe(cards);
  });
});

describe('collection stats', () => {
  it('counts unique cards, copies, foils and playsets', () => {
    const limited = card({ id: 201, maxCopiesInDeck: 1 });
    const byId = new Map<number, LorcanaCard>([[201, limited]]);
    expect(collectionStats([
      { cardId: 201, quantityNormal: 1, quantityFoil: 0 },
      { cardId: 202, quantityNormal: 3, quantityFoil: 2 },
      { cardId: 203, quantityNormal: 0, quantityFoil: 0 },
    ], byId)).toEqual({ unique: 2, copies: 6, foils: 2, playsets: 2 });
  });
});

describe('set list', () => {
  it('shows sets with cards, newest first, quests last', () => {
    const sets = {
      '1': { name: 'One', number: 1, type: 'expansion' },
      '2': { name: 'Two', number: 2, type: 'expansion' },
      '3': { name: 'Future', number: 3, type: 'expansion' },
      Q1: { name: 'Quest', number: 1, type: 'quest' },
    };
    const cards = [card({ setCode: '1' }), card({ setCode: '2' }), card({ setCode: 'Q1' }), card({ setCode: '3', promoGrouping: 'P1' })];
    expect(listSets(sets, cards).map(s => s.code)).toEqual(['2', '1', 'Q1']);
  });

  it('has logos for sets 1 to 13 only', () => {
    expect(setLogo('1')).toBe('/imgs/set01-logo.png');
    expect(setLogo('13')).toBe('/imgs/set13-logo.png');
    expect(setLogo('14')).toBeNull();
    expect(setLogo('Q1')).toBeNull();
  });
});

describe('binder layout', () => {
  it('pads the last page with empty pockets', () => {
    const pages = paginate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pages).toHaveLength(2);
    expect(pages[1]).toEqual([10, null, null, null, null, null, null, null, null]);
    expect(paginate([])).toEqual([[null, null, null, null, null, null, null, null, null]]);
  });

  it('groups pages into spreads', () => {
    expect(spreadCount(5, 2)).toBe(3);
    expect(spreadCount(0, 2)).toBe(1);
    expect(spreadOfPage(3, 2)).toBe(1);
    expect(spreadOfPage(3, 1)).toBe(3);
    expect(pagesInSpread(2, 2, 5)).toEqual([4]);
    expect(pagesInSpread(0, 2, 5)).toEqual([0, 1]);
    expect(pageOfItem(9)).toBe(1);
    expect(clamp(7, 0, 3)).toBe(3);
  });

  it('shortens long runs of page dots', () => {
    expect(dotWindow(5, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(dotWindow(30, 0)).toEqual([0, 1, 2, 3, 4, 5, null, 29]);
    expect(dotWindow(30, 15)).toEqual([0, null, 13, 14, 15, 16, 17, null, 29]);
    expect(dotWindow(30, 29)).toEqual([0, null, 24, 25, 26, 27, 28, 29]);
  });
});

describe('custom binder edits', () => {
  const list = [{ cardId: 1, quantity: 1 }, { cardId: 2, quantity: 2 }, { cardId: 3, quantity: 1 }];

  it('moves cards', () => {
    expect(moveItem(list, 0, 2).map(e => e.cardId)).toEqual([2, 3, 1]);
    expect(moveItem(list, 2, 0).map(e => e.cardId)).toEqual([3, 1, 2]);
    expect(moveItem(list, 1, 99).map(e => e.cardId)).toEqual([1, 3, 2]);
    expect(moveItem(list, 5, 0)).toEqual(list);
  });

  it('adds, changes and removes cards', () => {
    expect(addCard(list, 4).at(-1)).toEqual({ cardId: 4, quantity: 1 });
    expect(addCard(list, 2)[1]).toEqual({ cardId: 2, quantity: 3 });
    expect(setQuantity(list, 1, 150)[0].quantity).toBe(99);
    expect(setQuantity(list, 1, 0).map(e => e.cardId)).toEqual([2, 3]);
    expect(removeCard(list, 3)).toHaveLength(2);
    expect(sameCards(list, [...list])).toBe(true);
    expect(sameCards(list, moveItem(list, 0, 1))).toBe(false);
  });
});

describe('Lorebook JSON import', () => {
  const known = new Map<number, LorcanaCard>([[1, card({ id: 1 })], [2, card({ id: 2 })]]);

  it('reads quantities, merges repeats and reports unknown cards', () => {
    const text = JSON.stringify({ version: '2.0', cards: [
      { cardId: 1, normal: 2, foil: 1 }, { cardId: 1, normal: 1 }, { cardId: 2, normal: 0, foil: 0 }, { cardId: 999, normal: 1 },
    ] });
    expect(parseLorebookJSON(text, known)).toEqual({
      entries: [{ cardId: 1, quantityNormal: 3, quantityFoil: 1 }],
      failed: ['Card #999'],
      copies: 4,
      foils: 1,
    });
  });

  it('rejects other files', () => {
    expect(() => parseLorebookJSON('{"decks":[]}', known)).toThrow();
    expect(() => parseLorebookJSON('not json', known)).toThrow();
  });
});

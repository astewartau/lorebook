import { describe, expect, it } from 'vitest';
import { card } from '../../test/cards';
import { applyDeltas, applyDraft, canAddCount, copiesOfName, removeTarget, sameCards } from './draft';

const a = card({ id: 1, name: 'A', version: 'One' });
const aPromo = card({ id: 2, name: 'A', version: 'One' });
const free = card({ id: 3, name: 'Dalmatian', version: 'Puppy', maxCopiesInDeck: 99 });
const any = card({ id: 4, name: 'Any', version: 'Number', maxCopiesInDeck: null });
const byId = new Map([a, aPromo, free, any].map(c => [c.id, c]));

describe('applyDraft', () => {
  it('adds up to the limit across printings', () => {
    let cards = applyDraft([], { type: 'add', cardId: 1, count: 3 }, byId);
    expect(cards).toEqual([{ cardId: 1, quantity: 3 }]);
    cards = applyDraft(cards, { type: 'add', cardId: 2, count: 3 }, byId);
    expect(cards).toEqual([{ cardId: 1, quantity: 3 }, { cardId: 2, quantity: 1 }]);
    expect(canAddCount(cards, byId, 1)).toBe(0);
    expect(applyDraft(cards, { type: 'add', cardId: 1 }, byId)).toBe(cards);
  });

  it('removes and drops empty entries', () => {
    const cards = [{ cardId: 1, quantity: 1 }];
    expect(applyDraft(cards, { type: 'remove', cardId: 1 }, byId)).toEqual([]);
    expect(applyDraft(cards, { type: 'remove', cardId: 9 }, byId)).toBe(cards);
  });

  it('sets a quantity within the limit', () => {
    expect(applyDraft([], { type: 'set', cardId: 1, quantity: 9 }, byId)).toEqual([{ cardId: 1, quantity: 4 }]);
    expect(applyDraft([{ cardId: 1, quantity: 4 }], { type: 'set', cardId: 1, quantity: 2 }, byId)).toEqual([{ cardId: 1, quantity: 2 }]);
    expect(applyDraft([{ cardId: 1, quantity: 4 }], { type: 'set', cardId: 1, quantity: 0 }, byId)).toEqual([]);
  });

  it('honours raised and removed limits', () => {
    expect(applyDraft([], { type: 'add', cardId: 3, count: 20 }, byId)).toEqual([{ cardId: 3, quantity: 20 }]);
    expect(applyDraft([], { type: 'add', cardId: 4, count: 60 }, byId)).toEqual([{ cardId: 4, quantity: 60 }]);
  });

  it('ignores unknown cards', () => {
    expect(applyDraft([], { type: 'add', cardId: 77 }, byId)).toEqual([]);
  });
});

describe('helpers', () => {
  it('compares lists ignoring order and zeros', () => {
    expect(sameCards([{ cardId: 1, quantity: 2 }, { cardId: 2, quantity: 1 }], [{ cardId: 2, quantity: 1 }, { cardId: 1, quantity: 2 }, { cardId: 3, quantity: 0 }])).toBe(true);
    expect(sameCards([{ cardId: 1, quantity: 2 }], [{ cardId: 1, quantity: 3 }])).toBe(false);
  });

  it('replays deltas onto a newer list', () => {
    const fresh = [{ cardId: 1, quantity: 3 }];
    expect(applyDeltas(fresh, new Map([[1, 2], [3, 1]]), byId)).toEqual([{ cardId: 1, quantity: 4 }, { cardId: 3, quantity: 1 }]);
    expect(applyDeltas(fresh, new Map([[1, -5]]), byId)).toEqual([]);
  });
});

describe('removeTarget', () => {
  it('prefers this printing, then another of the same name', () => {
    expect(removeTarget([{ cardId: 1, quantity: 1 }, { cardId: 2, quantity: 1 }], byId, aPromo)).toBe(2);
    expect(removeTarget([{ cardId: 1, quantity: 1 }], byId, aPromo)).toBe(1);
    expect(removeTarget([{ cardId: 3, quantity: 1 }], byId, aPromo)).toBeUndefined();
    expect(copiesOfName([{ cardId: 1, quantity: 1 }, { cardId: 2, quantity: 2 }], byId, a)).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { card } from '../test/cards';
import { findCardByName, parseLorebookJSON, parseTTSDeck, parseTextDeck } from './deckImport';

const friends = card({ id: 10, name: 'Friends on the Other Side', version: undefined, fullName: 'Friends on the Other Side', type: 'Action', setCode: '1', rarity: 'Common' });
const friendsEnchanted = card({ id: 11, name: 'Friends on the Other Side', version: undefined, fullName: 'Friends on the Other Side', type: 'Action', setCode: '1', rarity: 'Enchanted' });
const elsaOld = card({ id: 20, name: 'Elsa', version: 'Snow Queen', setCode: '1', rarity: 'Rare' });
const elsaNew = card({ id: 21, name: 'Elsa', version: 'Snow Queen', setCode: '9', rarity: 'Rare' });
const gaston = card({ id: 30, name: 'Gaston', version: "Baritone Bully", fullName: "Gaston - Baritone Bully" });
const cards = [friends, friendsEnchanted, elsaOld, elsaNew, gaston];

describe('findCardByName', () => {
  it('prefers regular rarities, then the newest set', () => {
    expect(findCardByName(cards, 'Friends on the Other Side')?.id).toBe(10);
    expect(findCardByName(cards, 'elsa - snow queen')?.id).toBe(21);
  });

  it('ignores case, apostrophes and punctuation', () => {
    expect(findCardByName(cards, "GASTON — BARITONE BULLY")?.id).toBe(30);
    expect(findCardByName(cards, 'gaston - baritone bully!')?.id).toBe(30);
  });
});

describe('parseTextDeck', () => {
  it('reads "N name" and "Nx name" lines, merging repeats', () => {
    const r = parseTextDeck('4 Elsa - Snow Queen\n2x Friends on the Other Side\n\n1 elsa - snow queen\nnot a line', cards);
    expect(r.deck?.cards).toEqual([{ cardId: 21, quantity: 5 }, { cardId: 10, quantity: 2 }]);
    expect(r.warnings).toEqual(['Invalid format: "not a line"']);
  });

  it('reports unknown cards and fails with none found', () => {
    const r = parseTextDeck('4 Nobody - Nowhere', cards);
    expect(r.deck).toBeNull();
    expect(r.warnings[0]).toBe('Card not found: "Nobody - Nowhere"');
  });
});

describe('parseTTSDeck', () => {
  it('counts one object per copy', () => {
    const json = { ObjectStates: [{ Nickname: 'Frozen Aggro', ContainedObjects: [
      { Nickname: 'Elsa - Snow Queen' }, { Nickname: 'Elsa - Snow Queen' }, { Nickname: 'Gaston - Baritone Bully' },
    ] }] };
    const r = parseTTSDeck(json, cards);
    expect(r.deck?.name).toBe('Frozen Aggro');
    expect(r.deck?.cards).toEqual([{ cardId: 21, quantity: 2 }, { cardId: 30, quantity: 1 }]);
  });

  it('rejects other JSON', () => {
    expect(parseTTSDeck({ cards: [] }, cards).deck).toBeNull();
  });
});

describe('parseLorebookJSON', () => {
  it('round-trips the export format', () => {
    const r = parseLorebookJSON({ name: 'Mine', cards: [{ id: 10, name: 'x', quantity: 3 }, { cardId: 21, quantity: 2 }, { name: 'no id' }] });
    expect(r.deck).toEqual({ name: 'Mine', description: undefined, cards: [{ cardId: 10, quantity: 3 }, { cardId: 21, quantity: 2 }] });
    expect(r.warnings).toEqual(['Invalid card entry: missing ID']);
  });
});

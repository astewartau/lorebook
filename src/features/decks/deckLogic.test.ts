import { describe, expect, it } from 'vitest';
import { card } from '../../test/cards';
import type { Deck, LorcanaCard } from '../../types';
import {
  checkDeck, copyName, deckArtCard, deckInks, deckLines, deckStats, deckToCsv, deckToJson, deckToText,
  filterDecks, groupByKind, kindOf, missingSummary, ownershipNeeds,
} from './deckLogic';
import { parseLorebookJSON, parseTextDeck } from '../../utils/deckImport';

const elsa = card({ id: 101, name: 'Elsa', version: 'Snow Queen', color: 'Amethyst', cost: 4, type: 'Character' });
const elsaPromo = card({ id: 102, name: 'Elsa', version: 'Snow Queen', color: 'Amethyst', cost: 4, type: 'Character' });
const song = card({ id: 103, name: 'Let It Go', version: '', fullName: 'Let It Go', color: 'Amethyst', cost: 5, type: 'Action', subtypes: ['Song'], inkwell: false });
const action = card({ id: 104, name: 'Dragon Fire', version: '', fullName: 'Dragon Fire', color: 'Ruby', cost: 5, type: 'Action' });
const item = card({ id: 105, name: 'Lantern', version: '', fullName: 'Lantern', color: 'Ruby', cost: 2, type: 'Item' });
const big = card({ id: 106, name: 'Maui', version: 'Demigod', color: 'Ruby', cost: 9, type: 'Character', legal: { core: false, infinity: true } });
const dual = card({ id: 107, name: 'Dual', version: 'Both', color: 'Amethyst-Ruby', cost: 1, type: 'Location' });
const all: LorcanaCard[] = [elsa, elsaPromo, song, action, item, big, dual];
const byId = new Map(all.map(c => [c.id, c]));

const deck = (cards: Deck['cards'], over: Partial<Deck> = {}): Deck => ({
  id: 'd', name: 'Deck', cards, tags: [], createdAt: new Date(2026, 0, 1), updatedAt: new Date(2026, 0, 2), ...over,
});

describe('grouping', () => {
  it('puts songs apart from actions and sorts by cost then name', () => {
    expect(kindOf(song)).toBe('Song');
    expect(kindOf(action)).toBe('Action');
    const groups = groupByKind(deckLines([{ cardId: 106, quantity: 1 }, { cardId: 101, quantity: 2 }, { cardId: 103, quantity: 1 }, { cardId: 104, quantity: 1 }], byId));
    expect(groups.map(g => g.kind)).toEqual(['Character', 'Action', 'Song']);
    expect(groups[0].lines.map(l => l.card.id)).toEqual([101, 106]);
    expect(groups[0].count).toBe(3);
  });

  it('drops unknown cards', () => {
    expect(deckLines([{ cardId: 999, quantity: 4 }], byId)).toEqual([]);
  });
});

describe('stats', () => {
  it('builds the curve with a 7+ bar, inks and inkable counts', () => {
    const s = deckStats(deckLines([
      { cardId: 101, quantity: 4 }, { cardId: 103, quantity: 2 }, { cardId: 106, quantity: 1 }, { cardId: 107, quantity: 1 },
    ], byId));
    expect(s.total).toBe(8);
    expect(s.curve[4]).toEqual({ cost: 4, inkable: 4, uninkable: 0 });
    expect(s.curve[5]).toEqual({ cost: 5, inkable: 0, uninkable: 2 });
    expect(s.curve[7].inkable).toBe(1);
    expect(s.inkable).toBe(6);
    expect(s.inks).toEqual([{ ink: 'Amethyst', count: 7 }, { ink: 'Ruby', count: 2 }]);
    expect(s.averageCost).toBe(4.5);
  });

  it('lists inks in the game order', () => {
    expect(deckInks([{ cardId: 105, quantity: 1 }, { cardId: 101, quantity: 1 }], byId)).toEqual(['Amethyst', 'Ruby']);
  });
});

describe('checkDeck', () => {
  it('calls a short but otherwise fine deck incomplete', () => {
    expect(checkDeck(deck([{ cardId: 101, quantity: 4 }]), byId)).toMatchObject({ status: 'incomplete', label: '4/60' });
  });
  it('flags too many copies across printings', () => {
    expect(checkDeck(deck([{ cardId: 101, quantity: 3 }, { cardId: 102, quantity: 2 }]), byId).status).toBe('invalid');
  });
  it('is empty with no cards', () => {
    expect(checkDeck(deck([]), byId).status).toBe('empty');
  });
  it('tells Core from Infinity', () => {
    const many = Array.from({ length: 15 }, (_, i) => card({ id: 500 + i, color: 'Amber' }));
    const map = new Map([...all, ...many].map(c => [c.id, c]));
    const cards = many.map(c => ({ cardId: c.id, quantity: 4 }));
    expect(checkDeck(deck(cards), map).status).toBe('core');
    const withMaui = [...cards, { cardId: 106, quantity: 1 }];
    // Ruby + Amber is still two inks.
    expect(checkDeck(deck(withMaui), map).status).toBe('infinity');
  });
});

describe('ownership', () => {
  it('counts every printing by full name', () => {
    const needs = ownershipNeeds(deckLines([{ cardId: 101, quantity: 2 }, { cardId: 102, quantity: 2 }, { cardId: 104, quantity: 3 }], byId),
      name => (name === 'Elsa - Snow Queen' ? 3 : 0));
    const elsaNeed = needs.find(n => n.fullName === 'Elsa - Snow Queen')!;
    expect(elsaNeed).toMatchObject({ needed: 4, owned: 3, missing: 1 });
    const m = missingSummary(needs);
    expect(m.copies).toBe(4);
    expect(m.lines.map(l => l.fullName)).toEqual(['Elsa - Snow Queen', 'Dragon Fire']);
  });
});

describe('export', () => {
  const cards = [{ cardId: 101, quantity: 2 }, { cardId: 102, quantity: 2 }, { cardId: 103, quantity: 1 }];

  it('writes one text line per full name and reads back', () => {
    const text = deckToText(deckLines(cards, byId));
    expect(text).toBe('4 Elsa - Snow Queen\n1 Let It Go');
    const parsed = parseTextDeck(text, all);
    expect(parsed.deck?.cards.reduce((n, c) => n + c.quantity, 0)).toBe(5);
  });

  it('writes JSON that the importer reads', () => {
    const json = deckToJson({ name: 'Frozen', description: 'Cold', tags: ['a'], cards }, byId);
    const back = parseLorebookJSON(JSON.parse(JSON.stringify(json)));
    expect(back.deck).toMatchObject({ name: 'Frozen', description: 'Cold', cards });
  });

  it('quotes CSV values', () => {
    const csv = deckToCsv(deckLines([{ cardId: 101, quantity: 2 }], byId));
    expect(csv.split('\n')[1]).toBe('"2","Elsa","Snow Queen","1","101","Amethyst","4","Character","Common"');
  });
});

describe('deck list', () => {
  const a = deck([{ cardId: 101, quantity: 1 }], { id: 'a', name: 'Alpha', tags: ['aggro'], updatedAt: new Date(2026, 1, 1) });
  const b = deck([{ cardId: 104, quantity: 3 }], { id: 'b', name: 'Bravo', tags: ['control'], updatedAt: new Date(2026, 2, 1) });

  it('filters by ink, tag and text and sorts', () => {
    const base = { q: '', inks: [], tags: [], sort: 'updated' as const };
    expect(filterDecks([a, b], base, byId).map(d => d.id)).toEqual(['b', 'a']);
    expect(filterDecks([a, b], { ...base, sort: 'name' }, byId).map(d => d.id)).toEqual(['a', 'b']);
    expect(filterDecks([a, b], { ...base, sort: 'size' }, byId).map(d => d.id)).toEqual(['b', 'a']);
    expect(filterDecks([a, b], { ...base, inks: ['Ruby'] }, byId).map(d => d.id)).toEqual(['b']);
    expect(filterDecks([a, b], { ...base, tags: ['aggro'] }, byId).map(d => d.id)).toEqual(['a']);
    expect(filterDecks([a, b], { ...base, q: 'brav' }, byId).map(d => d.id)).toEqual(['b']);
  });

  it('names copies without clashing', () => {
    expect(copyName('X', [])).toBe('X (copy)');
    expect(copyName('X', ['X (copy)'])).toBe('X (copy 2)');
  });

  it('picks the chosen art, else the most-played character', () => {
    expect(deckArtCard(deck([{ cardId: 106, quantity: 1 }, { cardId: 101, quantity: 3 }]), byId)?.id).toBe(101);
    expect(deckArtCard(deck([{ cardId: 101, quantity: 3 }], { avatar: { cardId: 105, cropData: { x: 1, y: 1, scale: 1 } } }), byId)?.id).toBe(105);
    expect(deckArtCard(deck([]), byId)).toBeUndefined();
  });
});

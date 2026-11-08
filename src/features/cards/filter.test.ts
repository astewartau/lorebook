import { describe, expect, it } from 'vitest';
import { card } from '../../test/cards';
import { DEFAULT_STATE, BrowserState, activeFilterCount, parseState, serializeState } from './browserState';
import { filterCards, groupCards, sortCards } from './filter';

const none = () => ({ normal: 0, foil: 0, total: 0 });
const noName = () => 0;
const state = (over: Partial<BrowserState>): BrowserState => ({ ...DEFAULT_STATE, format: 'infinity', ...over });

const amber = card({ name: 'Amber One', color: 'Amber', cost: 1, type: 'Character', setCode: '2', number: 5 });
const steel = card({ name: 'Steel Two', color: 'Steel', cost: 2, type: 'Action', setCode: '1', number: 9 });
const dual = card({ name: 'Dual Three', color: 'Amber-Steel', colors: ['Amber', 'Steel'], cost: 9, setCode: '10', number: 1 });
const big = card({ name: 'Big Four', color: 'Ruby', cost: 12, setCode: '11', inkwell: false, legal: { core: false, infinity: true } });
const all = [amber, steel, dual, big];
const ids = (s: Partial<BrowserState>) => filterCards(all, state(s), none, noName).cards.map(c => c.id);

describe('browser state URL codec', () => {
  it('round-trips and omits defaults', () => {
    const s = state({ q: 'elsa', inks: ['Amber', 'Steel'], costs: [3, 9], owned: 'missing', view: 'list' });
    const params = serializeState(s);
    expect(params.toString()).toBe('q=elsa&format=infinity&ink=Amber&ink=Steel&cost=3&cost=9&owned=missing&view=list');
    expect(parseState(params)).toEqual(s);
    expect(serializeState(DEFAULT_STATE).toString()).toBe('');
  });

  it('ignores invalid values', () => {
    expect(parseState(new URLSearchParams('ink=Purple&cost=x&sort=bogus&format=modern'))).toEqual(DEFAULT_STATE);
  });

  it('counts only filters the user set', () => {
    expect(activeFilterCount(DEFAULT_STATE)).toBe(0);
    expect(activeFilterCount(state({ q: 'x', inks: ['Amber'], owned: 'owned', view: 'list' }))).toBe(2);
  });
});

describe('filterCards', () => {
  it('uses each card\'s format legality', () => {
    expect(filterCards(all, { ...DEFAULT_STATE }, none, noName).cards).toHaveLength(3);
  });

  it('matches inks: any, only within, dual only', () => {
    expect(ids({ inks: ['Amber'] })).toEqual([amber.id, dual.id]);
    expect(ids({ inks: ['Amber'], inkMode: 'only' })).toEqual([amber.id]);
    expect(ids({ inks: ['Amber', 'Steel'], inkMode: 'only' })).toEqual([amber.id, steel.id, dual.id]);
    expect(ids({ inkMode: 'dual' })).toEqual([dual.id]);
  });

  it('treats the top cost chip as "or more"', () => {
    expect(ids({ costs: [9] })).toEqual([dual.id, big.id]);
  });

  it('filters by inkable and ownership', () => {
    expect(ids({ inkable: 'no' })).toEqual([big.id]);
    const qty = (id: number) => ({ normal: id === steel.id ? 4 : 0, foil: 0, total: id === steel.id ? 4 : 0 });
    const byName = (n: string) => (n === steel.fullName ? 4 : 0);
    expect(filterCards(all, state({ owned: 'owned' }), qty, byName).cards).toEqual([steel]);
    expect(filterCards(all, state({ owned: 'short' }), qty, byName).cards).toHaveLength(3);
  });

  it('counts facet options over cards matching the other filters', () => {
    const { counts } = filterCards(all, state({ inks: ['Steel'], types: ['Action'] }), none, noName);
    expect(counts.inks).toEqual({ Steel: 1 });          // type filter applies
    expect(counts.types).toEqual({ Action: 1, Character: 1 }); // ink filter applies
  });
});

describe('sortCards and groupCards', () => {
  it('sorts by set then number, and stably by other fields', () => {
    expect(sortCards(all, 'set', 'asc', none).map(c => c.id)).toEqual([steel.id, amber.id, dual.id, big.id]);
    expect(sortCards(all, 'cost', 'desc', none)[0]).toBe(big);
  });

  it('groups with readable labels', () => {
    const groups = groupCards(sortCards(all, 'cost', 'asc', none), 'cost', c => c);
    expect(groups.map(g => g.label)).toEqual(['Cost 1', 'Cost 2', 'Cost 9+']);
  });
});

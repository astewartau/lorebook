import { describe, expect, it } from 'vitest';
import { card } from '../test/cards';
import { computeContextualFilterOptions, filterCards } from './cardFiltering';
import { getDefaultFilters } from './filterDefaults';
import { FilterOptions } from '../types';

const none = () => ({ normal: 0, foil: 0, total: 0 });
const cards = [
  card({ color: 'Amber', type: 'Character', cost: 1 }),
  card({ color: 'Amber', type: 'Action', cost: 2 }),
  card({ color: 'Steel', type: 'Character', cost: 2 }),
  card({ color: 'Steel', type: 'Item', cost: 5, legal: { core: false, infinity: true } }),
];
const filters = (over: Partial<FilterOptions>): FilterOptions => ({ ...getDefaultFilters(), legality: 'infinity', ...over });

describe('filterCards', () => {
  it('uses each card\'s Core legality', () => {
    expect(filterCards(cards, '', filters({ legality: 'core' }), new Set(), none)).toHaveLength(3);
  });
});

describe('computeContextualFilterOptions', () => {
  it('counts each category over cards passing every other filter', () => {
    const o = computeContextualFilterOptions(cards, '', filters({ colors: ['Amber'], types: ['Character'] }), none);
    // Colors: ignore the color filter, keep type = Character.
    expect(o.colorCounts).toEqual({ Amber: 1, Steel: 1 });
    // Types: ignore the type filter, keep color = Amber.
    expect(o.typeCounts).toEqual({ Character: 1, Action: 1 });
    // Costs: both filters apply.
    expect(o.costCounts).toEqual({ 1: 1 });
  });
});

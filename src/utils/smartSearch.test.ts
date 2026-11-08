import { describe, expect, it } from 'vitest';
import { card } from '../test/cards';
import { matchesSmartSearch, parseSearchQuery } from './smartSearch';

const elsa = card({
  name: 'Elsa', version: 'Snow Queen', cost: 4, type: 'Character', color: 'Amethyst', story: 'Frozen',
  subtypes: ['Storyborn', 'Hero', 'Queen'], inkwell: true, strength: 2, willpower: 4, lore: 2,
  abilities: [{ type: 'keyword', keyword: 'Evasive', fullText: 'Evasive' }],
  fullText: "Evasive\nFREEZE Exert chosen opposing character.",
});
const action = card({ name: 'Fire the Cannons!', type: 'Action', cost: 1, color: 'Steel', inkwell: false, fullText: 'Deal 2 damage to chosen character.' });

describe('parseSearchQuery', () => {
  it('splits fields, operators, quoted values and words', () => {
    expect(parseSearchQuery('cost>=3 name:"snow queen" frozen')).toEqual([
      { type: 'field', field: 'cost', operator: '>=', value: '3' },
      { type: 'field', field: 'name', operator: ':', value: 'snow queen' },
      { type: 'text', value: 'frozen' },
    ]);
  });

  it('treats an unfinished field as text', () => {
    expect(parseSearchQuery('name:e')).toEqual([{ type: 'text', value: 'name:e' }]);
  });
});

describe('matchesSmartSearch', () => {
  const cases: [string, boolean, boolean][] = [
    ['', true, true],
    ['elsa', true, false],
    ['ELSA snow', true, false],
    ['evasive', true, false],
    ['opposing character', true, false],
    ['cost:4', true, false],
    ['cost<2', false, true],
    ['cost>=1 cost<=4', true, true],
    ['type:action', false, true],
    ['ink:steel', false, true],
    ['inkable:no', false, true],
    ['story:frozen', true, false],
    ['subtype:queen', true, false],
    ['name!=elsa', false, true],
    ['ability:evasive', true, false],
    ['damage', false, true],
    ['nosuchfield:x', false, false],
  ];
  it.each(cases)('%s', (query, matchesElsa, matchesAction) => {
    expect(matchesSmartSearch(elsa, query)).toBe(matchesElsa);
    expect(matchesSmartSearch(action, query)).toBe(matchesAction);
  });
});

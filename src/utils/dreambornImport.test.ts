import { describe, expect, it, vi } from 'vitest';
import { card } from '../test/cards';
import { importDreambornCollection, parseDreambornCSV } from './dreambornImport';

const ariel = card({ id: 1, name: 'Ariel', version: 'On Human Legs', setCode: '1', number: 1 });
const promo = card({ id: 2, name: 'Ariel', version: 'On Human Legs', setCode: '1', number: 1, promoGrouping: 'P1' });
const stitch = card({ id: 3, name: 'Stitch', version: 'Rock Star', setCode: '1', number: 23 });
const cards = [ariel, promo, stitch];

const header = 'Set Number,Card Number,Variant,Count,Name,Color,Rarity,Inkable,Cost';
const csv = (...rows: string[]) => [header, ...rows].join('\r\n');

describe('Dreamborn import', () => {
  it('parses comma separated rows and skips zero counts', () => {
    const rows = parseDreambornCSV(csv(
      '001,1,normal,2,Ariel - On Human Legs,Amber,Uncommon,TRUE,4',
      '001,23,normal,0,Stitch - Rock Star,Amber,Rare,TRUE,6',
    ));
    expect(rows).toHaveLength(1);
    expect(rows[0]['Card Number']).toBe('1');
  });

  it('reads quoted fields with commas', () => {
    const rows = parseDreambornCSV(csv('001,23,normal,1,"Stitch, the Rock Star",Amber,Rare,TRUE,6'));
    expect(rows[0].Name).toBe('Stitch, the Rock Star');
  });

  it('combines normal and foil rows, and matches promos by group', () => {
    const { importedCards, failedCards } = importDreambornCollection(csv(
      '001,1,normal,2,Ariel - On Human Legs,Amber,Uncommon,TRUE,4',
      '001,1,foil,1,Ariel - On Human Legs,Amber,Uncommon,TRUE,4',
      'P1,1,foil,1,Ariel - On Human Legs,Amber,Promo,TRUE,4',
    ), cards);
    expect(failedCards).toEqual([]);
    const byId = Object.fromEntries(importedCards.map(c => [c.card.id, [c.normalQuantity, c.foilQuantity]]));
    expect(byId).toEqual({ 1: [2, 1], 2: [0, 1] });
  });

  it('falls back to the name, and reports cards it cannot find', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { importedCards, failedCards } = importDreambornCollection(csv(
      '001,999,normal,1,Stitch - Rock Star,Amber,Rare,TRUE,6',
      '001,998,normal,1,Nobody - Nowhere,Amber,Rare,TRUE,6',
    ), cards);
    expect(importedCards.map(c => c.card.id)).toEqual([3]);
    expect(failedCards.map(c => c.name)).toEqual(['Nobody - Nowhere']);
  });
});

import { describe, expect, it } from 'vitest';
import type { LorcanaCard } from '../../types';
import { matchCards } from './cardSearch';

const cards = ['Stitch - Rock Star', 'Stitch - New Dog', 'Elsa - Snow Queen'].map((fullName, id) => ({ id, fullName }) as LorcanaCard);

describe('matchCards', () => {
  it('matches every word, in any order, up to the limit', () => {
    expect(matchCards(cards, 'star stitch', 10).map(c => c.id)).toEqual([0]);
    expect(matchCards(cards, 'STITCH', 1).map(c => c.id)).toEqual([0]);
    expect(matchCards(cards, '   ', 10)).toEqual([]);
  });
});

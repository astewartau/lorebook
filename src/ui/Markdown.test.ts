import { describe, expect, it } from 'vitest';
import { card } from '../test/cards';
import { linkCardNames } from './Markdown';

describe('linkCardNames', () => {
  const elsa = card({ id: 7, name: 'Elsa', version: 'Snow Queen' });
  it('links known card names and leaves unknown ones', () => {
    expect(linkCardNames('Play [[elsa - snow queen]] then [[Nobody]].', [elsa]))
      .toBe('Play [elsa - snow queen](card:7) then [[Nobody]].');
  });
});

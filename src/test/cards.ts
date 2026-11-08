import { LorcanaCard } from '../types';

let nextId = 1;

/** A made-up card; override what a test cares about. */
export function card(over: Partial<LorcanaCard> = {}): LorcanaCard {
  const id = over.id ?? nextId++;
  const name = over.name ?? `Card ${id}`;
  const version = over.version ?? 'Test';
  return {
    id,
    name,
    version,
    fullName: over.fullName ?? `${name} - ${version}`,
    setCode: '1',
    number: id,
    rarity: 'Common',
    color: 'Amber',
    cost: 1,
    type: 'Character',
    inkwell: true,
    images: { full: '', thumbnail: '' },
    legal: { core: true, infinity: true },
    ...over,
  };
}

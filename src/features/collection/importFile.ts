// Reading collection files before they replace the collection.

import type { CollectionCardEntry, LorcanaCard } from '../../types';

export interface Parsed {
  entries: CollectionCardEntry[];
  failed: string[];
  copies: number;
  foils: number;
}

export function parseLorebookJSON(text: string, cardsById: ReadonlyMap<number, LorcanaCard>): Parsed {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.cards)) throw new Error('This isn’t a Lorebook collection export.');
  const merged = new Map<number, CollectionCardEntry>();
  const failed: string[] = [];
  for (const c of data.cards as { cardId?: number; normal?: number; foil?: number }[]) {
    const id = Number(c.cardId);
    const normal = Math.max(0, Math.floor(Number(c.normal) || 0));
    const foil = Math.max(0, Math.floor(Number(c.foil) || 0));
    if (!normal && !foil) continue;
    if (!cardsById.has(id)) {
      failed.push(`Card #${c.cardId}`);
      continue;
    }
    const e = merged.get(id) ?? { cardId: id, quantityNormal: 0, quantityFoil: 0 };
    e.quantityNormal += normal;
    e.quantityFoil += foil;
    merged.set(id, e);
  }
  return summarise(Array.from(merged.values()), failed);
}

export function summarise(entries: CollectionCardEntry[], failed: string[]): Parsed {
  let copies = 0;
  let foils = 0;
  for (const e of entries) {
    copies += e.quantityNormal + e.quantityFoil;
    foils += e.quantityFoil;
  }
  return { entries, failed, copies, foils };
}

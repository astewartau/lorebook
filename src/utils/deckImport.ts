// Deck import formats: plain text lists ("4 Elsa - Snow Queen"),
// Tabletop Simulator / Dreamborn JSON, and Lorebook's own JSON export.

import { LorcanaCard } from '../types';

export interface ParsedDeck {
  name: string;
  description?: string;
  cards: Array<{ cardId: number; quantity: number }>;
}

export interface ParseResult {
  deck: ParsedDeck | null;
  warnings: string[];
}

/** Lowercase, without apostrophes or punctuation other than hyphens. */
export const normalizeCardName = (name: string): string =>
  name.toLowerCase().replace(/['’]/g, '').replace(/[–—]/g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();

// Regular printings first, then the newest set, then the lowest number.
const RARITY_PRIORITY: Record<string, number> = {
  Common: 1, Uncommon: 2, Rare: 3, 'Super Rare': 4, Legendary: 5,
  Enchanted: 100, Epic: 101, Iconic: 102, Promo: 103,
};

/** The printing to use when a name matches several. */
export function selectBestCard(candidates: LorcanaCard[]): LorcanaCard | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) =>
    (RARITY_PRIORITY[a.rarity] ?? 50) - (RARITY_PRIORITY[b.rarity] ?? 50)
    || (parseInt(b.setCode) || 0) - (parseInt(a.setCode) || 0)
    || (a.number ?? 0) - (b.number ?? 0)
    || a.id - b.id
  )[0];
}

const indexes = new WeakMap<LorcanaCard[], Map<string, LorcanaCard[]>>();

/** Finds a card by full name or name, ignoring case and punctuation. */
export function findCardByName(cards: LorcanaCard[], name: string): LorcanaCard | null {
  let index = indexes.get(cards);
  if (!index) {
    index = new Map();
    for (const c of cards) {
      for (const key of new Set([normalizeCardName(c.fullName), normalizeCardName(c.name)])) {
        const list = index.get(key);
        if (list) list.push(c);
        else index.set(key, [c]);
      }
    }
    indexes.set(cards, index);
  }
  return selectBestCard(index.get(normalizeCardName(name)) ?? []);
}

const defaultName = () => `Imported Deck ${new Date().toLocaleDateString()}`;

function collect(entries: Iterable<[string, number]>, cards: LorcanaCard[], warnings: string[]) {
  const quantities = new Map<number, number>();
  for (const [name, quantity] of entries) {
    const card = findCardByName(cards, name);
    if (card) quantities.set(card.id, (quantities.get(card.id) ?? 0) + quantity);
    else warnings.push(`Card not found: "${name}"`);
  }
  return Array.from(quantities, ([cardId, quantity]) => ({ cardId, quantity }));
}

/** "3 Friends on the Other Side" or "3x Friends on the Other Side", one card per line. */
export function parseTextDeck(text: string, cards: LorcanaCard[]): ParseResult {
  const warnings: string[] = [];
  const entries: [string, number][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!match) {
      warnings.push(`Invalid format: "${line}"`);
      continue;
    }
    entries.push([match[2].trim(), parseInt(match[1])]);
  }
  const deckCards = collect(entries, cards, warnings);
  if (deckCards.length === 0) return { deck: null, warnings: [...warnings, 'No valid cards found in the text format'] };
  return { deck: { name: defaultName(), description: 'Imported from text format', cards: deckCards }, warnings };
}

/** Tabletop Simulator saved objects, as exported by Dreamborn: one contained object per copy. */
export function parseTTSDeck(json: any, cards: LorcanaCard[]): ParseResult {
  const contained = json?.ObjectStates?.[0]?.ContainedObjects;
  if (!Array.isArray(contained)) return { deck: null, warnings: ['Invalid TTS/Dreamborn JSON format'] };
  const counts = new Map<string, number>();
  for (const obj of contained) {
    if (obj?.Nickname) counts.set(obj.Nickname, (counts.get(obj.Nickname) ?? 0) + 1);
  }
  const warnings: string[] = [];
  const deckCards = collect(counts, cards, warnings);
  if (deckCards.length === 0) return { deck: null, warnings: [...warnings, 'No valid cards found in the JSON'] };
  return {
    deck: { name: json.ObjectStates[0].Nickname || defaultName(), description: 'Imported from TTS/Dreamborn', cards: deckCards },
    warnings,
  };
}

/** Lorebook's export: { name, description, cards: [{ id, quantity }] }. */
export function parseLorebookJSON(json: any): ParseResult {
  if (!Array.isArray(json?.cards)) return { deck: null, warnings: ['Not a standard Lorebook JSON format'] };
  const warnings: string[] = [];
  const valid = json.cards.filter((c: any) => {
    if (!c?.id && !c?.cardId) {
      warnings.push('Invalid card entry: missing ID');
      return false;
    }
    return true;
  });
  if (valid.length === 0) return { deck: null, warnings: [...warnings, 'No valid cards in JSON'] };
  return {
    deck: {
      name: json.name || defaultName(),
      description: json.description,
      cards: valid.map((c: any) => ({ cardId: c.id || c.cardId, quantity: c.quantity || 1 })),
    },
    warnings,
  };
}

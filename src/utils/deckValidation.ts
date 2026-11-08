import { Deck, DeckCardEntry, LorcanaCard } from '../types';
import { DECK_RULES } from '../constants';

export interface DeckValidationResult {
  isValid: boolean;
  /** Valid and every card is legal in Core. */
  coreLegal: boolean;
  /** Full names of cards that are not legal in Core. */
  notCoreLegal: string[];
  errors: string[];
  warnings: string[];
}

type CardLookup = ReadonlyMap<number, LorcanaCard>;

const lookups = new WeakMap<LorcanaCard[], CardLookup>();

/** Accepts the card list or an id map; maps for arrays are built once and cached. */
export function toLookup(cards: LorcanaCard[] | CardLookup): CardLookup {
  if (!Array.isArray(cards)) return cards as CardLookup;
  let map = lookups.get(cards);
  if (!map) {
    map = new Map(cards.map(c => [c.id, c]));
    lookups.set(cards, map);
  }
  return map;
}

/** Copies of a card allowed in a deck, counted across every printing with the same full name. */
export function maxCopiesFor(card: LorcanaCard): number {
  if (card.maxCopiesInDeck === null) return Infinity;
  return card.maxCopiesInDeck ?? DECK_RULES.MAX_COPIES_PER_CARD;
}

/** Copies in the deck sharing this full name (all printings, sets and promos). */
export function copiesByName(entries: DeckCardEntry[], cards: LorcanaCard[] | CardLookup, fullName: string): number {
  const lookup = toLookup(cards);
  let n = 0;
  for (const e of entries) if (lookup.get(e.cardId)?.fullName === fullName) n += e.quantity;
  return n;
}

export const inksOf = (card: LorcanaCard): string[] =>
  card.colors ?? (card.color ? card.color.split('-') : []);

export const validateDeck = (deck: Deck, allCards: LorcanaCard[] | CardLookup): DeckValidationResult => {
  const lookup = toLookup(allCards);
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  if (totalCards < DECK_RULES.MIN_CARDS) {
    errors.push(`Deck needs ${DECK_RULES.MIN_CARDS - totalCards} more cards (currently ${totalCards}/${DECK_RULES.MIN_CARDS} minimum)`);
  }

  if (deck.cards.some(c => c.quantity <= 0)) {
    errors.push('Deck contains cards with invalid quantities');
  }

  const byName = new Map<string, { card: LorcanaCard; count: number }>();
  const unknown: number[] = [];
  const inks = new Set<string>();
  const notCore = new Set<string>();
  let inkwellCount = 0;

  for (const entry of deck.cards) {
    const card = lookup.get(entry.cardId);
    if (!card) {
      unknown.push(entry.cardId);
      continue;
    }
    const named = byName.get(card.fullName);
    byName.set(card.fullName, { card, count: (named?.count ?? 0) + entry.quantity });
    inksOf(card).forEach(ink => inks.add(ink));
    if (!card.legal.core) notCore.add(card.fullName);
    if (card.inkwell) inkwellCount += entry.quantity;
  }

  if (unknown.length) {
    errors.push(`Deck contains ${unknown.length} card${unknown.length === 1 ? '' : 's'} not in the card database`);
  }

  byName.forEach(({ card, count }, fullName) => {
    const max = maxCopiesFor(card);
    if (count > max) errors.push(`"${fullName}" exceeds its ${max}-copy limit (${count} copies)`);
  });

  // Dual-ink cards count as both inks, so this also covers them.
  if (inks.size > 2) {
    errors.push(`Deck has more than 2 inks (${Array.from(inks).sort().join(', ')})`);
  }

  if (notCore.size && errors.length === 0) {
    warnings.push(`Not legal in Core: ${notCore.size} card${notCore.size === 1 ? '' : 's'} (Infinity only)`);
  }

  if (totalCards > 0 && inkwellCount < 12) {
    warnings.push(`Only ${inkwellCount} inkable cards. Consider adding more (recommended: 12-15 or more).`);
  }

  return {
    isValid: errors.length === 0,
    coreLegal: errors.length === 0 && notCore.size === 0,
    notCoreLegal: Array.from(notCore).sort(),
    errors,
    warnings,
  };
};

export const getDeckStatistics = (deck: Deck, allCards: LorcanaCard[] | CardLookup) => {
  const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  
  // Cost distribution
  const costDistribution: Record<number, number> = {};
  deck.cards.forEach(entry => {
    const card = toLookup(allCards).get(entry.cardId);
    if (card) {
      costDistribution[card.cost] = (costDistribution[card.cost] || 0) + entry.quantity;
    }
  });
  
  // Ink color distribution
  const inkDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = toLookup(allCards).get(entry.cardId);
    const color = card?.color || 'None';
    inkDistribution[color] = (inkDistribution[color] || 0) + entry.quantity;
  });
  
  // Type distribution
  const typeDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = toLookup(allCards).get(entry.cardId);
    if (card) {
      typeDistribution[card.type] = (typeDistribution[card.type] || 0) + entry.quantity;
    }
  });
  
  // Rarity distribution
  const rarityDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = toLookup(allCards).get(entry.cardId);
    if (card) {
      rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + entry.quantity;
    }
  });
  
  // Average cost
  const averageCost = totalCards > 0 
    ? deck.cards.reduce((sum, entry) => {
        const card = toLookup(allCards).get(entry.cardId);
        return sum + ((card?.cost || 0) * entry.quantity);
      }, 0) / totalCards
    : 0;
  
  // Inkwell count
  const inkwellCount = deck.cards
    .filter(entry => {
      const card = toLookup(allCards).get(entry.cardId);
      return card?.inkwell;
    })
    .reduce((sum, entry) => sum + entry.quantity, 0);
  
  // Cost curve (0-7+ costs)
  const costCurve = Array.from({ length: 8 }, (_, i) => ({
    cost: i === 7 ? '7+' : i.toString(),
    count: i === 7 
      ? Object.entries(costDistribution)
          .filter(([cost]) => parseInt(cost) >= 7)
          .reduce((sum, [, count]) => sum + count, 0)
      : costDistribution[i] || 0
  }));
  
  return {
    totalCards,
    costDistribution,
    inkDistribution,
    typeDistribution,
    rarityDistribution,
    averageCost: Math.round(averageCost * 10) / 10, // Round to 1 decimal
    inkwellCount,
    inkwellPercentage: totalCards > 0 ? Math.round((inkwellCount / totalCards) * 100) : 0,
    costCurve,
    uniqueCards: deck.cards.length
  };
};

export const compareDeckVersions = (oldDeck: Deck, newDeck: Deck, allCards: LorcanaCard[] | CardLookup) => {
  const changes: Array<{
    type: 'added' | 'removed' | 'modified';
    cardName: string;
    oldQuantity?: number;
    newQuantity?: number;
  }> = [];
  
  const oldCardMap = new Map(oldDeck.cards.map(entry => [entry.cardId, entry]));
  const newCardMap = new Map(newDeck.cards.map(entry => [entry.cardId, entry]));
  
  // Check for added and modified cards
  newDeck.cards.forEach(newEntry => {
    const oldEntry = oldCardMap.get(newEntry.cardId);
    const card = toLookup(allCards).get(newEntry.cardId);
    const cardName = card?.fullName || 'Unknown Card';
    
    if (!oldEntry) {
      changes.push({
        type: 'added',
        cardName,
        newQuantity: newEntry.quantity
      });
    } else if (oldEntry.quantity !== newEntry.quantity) {
      changes.push({
        type: 'modified',
        cardName,
        oldQuantity: oldEntry.quantity,
        newQuantity: newEntry.quantity
      });
    }
  });
  
  // Check for removed cards
  oldDeck.cards.forEach(oldEntry => {
    if (!newCardMap.has(oldEntry.cardId)) {
      const card = toLookup(allCards).get(oldEntry.cardId);
      const cardName = card?.fullName || 'Unknown Card';
      changes.push({
        type: 'removed',
        cardName,
        oldQuantity: oldEntry.quantity
      });
    }
  });
  
  return changes;
};

export const generateDeckHash = (deck: Deck): string => {
  // Create a consistent hash of the deck for comparison
  const sortedCards = [...deck.cards]
    .sort((a, b) => a.cardId - b.cardId)
    .map(entry => `${entry.cardId}:${entry.quantity}`)
    .join(',');
  
  // Simple hash function (not cryptographic, just for comparison)
  let hash = 0;
  for (let i = 0; i < sortedCards.length; i++) {
    const char = sortedCards.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
};

export const isLegalFormat = (deck: Deck, allCards: LorcanaCard[] | CardLookup, format: 'core' | 'infinity' = 'core'): boolean => {
  const v = validateDeck(deck, allCards);
  return format === 'core' ? v.coreLegal : v.isValid;
};

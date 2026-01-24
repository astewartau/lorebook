import { Deck, LorcanaCard } from '../types';
import { DECK_RULES } from '../constants';

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateDeck = (deck: Deck, allCards: LorcanaCard[]): DeckValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  
  // Rule 1: Deck must have at least the minimum number of cards
  if (totalCards < DECK_RULES.MIN_CARDS) {
    errors.push(`Deck needs ${DECK_RULES.MIN_CARDS - totalCards} more cards (currently ${totalCards}/${DECK_RULES.MIN_CARDS} minimum)`);
  }
  
  // Rule 2: No more than maximum copies of any card (with special exceptions)
  const overLimitCards = deck.cards.filter(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    if (!card) return false;
    
    // Special case: Dalmatian Puppy - Tail Wagger can have up to 99 copies
    if (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') {
      return entry.quantity > 99;
    }
    // Standard 4-copy limit for all other cards
    return entry.quantity > DECK_RULES.MAX_COPIES_PER_CARD;
  });
  
  if (overLimitCards.length > 0) {
    overLimitCards.forEach(entry => {
      const card = allCards.find(c => c.id === entry.cardId);
      if (!card) return;
      
      // Special error message for Dalmatian Puppy
      if (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') {
        errors.push(`"${card.name} - ${card.version}" exceeds 99-copy limit (${entry.quantity} copies)`);
      } else {
        errors.push(`"${card.name}" exceeds ${DECK_RULES.MAX_COPIES_PER_CARD}-copy limit (${entry.quantity} copies)`);
      }
    });
  }
  
  // Rule 3: Cards with quantity <= 0 (shouldn't happen but safety check)
  const invalidQuantityCards = deck.cards.filter(card => card.quantity <= 0);
  if (invalidQuantityCards.length > 0) {
    errors.push(`Deck contains cards with invalid quantities`);
  }
  
  // Rule 4: Check ink color restrictions (max 2 colors in competitive play)
  const allColors = deck.cards.map(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    return card?.color || '';
  }).filter(color => color !== '');
  const baseColors = new Set<string>();
  
  // Extract base colors from both single and dual-ink cards
  allColors.forEach(color => {
    if (color.includes('-')) {
      // Dual-ink card: split and add both colors
      const [color1, color2] = color.split('-');
      baseColors.add(color1);
      baseColors.add(color2);
    } else {
      // Single-ink card
      baseColors.add(color);
    }
  });
  
  // Check if deck has more than 2 base colors
  if (baseColors.size > 2) {
    errors.push(`Deck has more than 2 ink colors (${baseColors.size} colors: ${Array.from(baseColors).join(', ')})`);
  }
  
  // Validate dual-ink cards only use the deck's base colors
  const baseColorArray = Array.from(baseColors);
  const invalidDualInks = allColors.filter(color => {
    if (!color.includes('-')) return false; // Skip single-ink cards
    const [color1, color2] = color.split('-');
    return !baseColorArray.includes(color1) || !baseColorArray.includes(color2);
  });
  
  if (invalidDualInks.length > 0) {
    errors.push(`Deck contains dual-ink cards with colors not in the deck's base colors`);
  }
  
  // Rule 5: Check for sufficient inkwell cards (recommended: at least 12-15)
  const inkwellCards = deck.cards.filter(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    return card?.inkwell;
  });
  const inkwellCount = inkwellCards.reduce((sum, entry) => sum + entry.quantity, 0);
  if (inkwellCount < 12) {
    warnings.push(`Only ${inkwellCount} inkwell cards. Consider adding more (recommended: 12-15).`);
  } else if (inkwellCount > 20) {
    warnings.push(`${inkwellCount} inkwell cards might be too many. Consider reducing (recommended: 12-15).`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const getDeckStatistics = (deck: Deck, allCards: LorcanaCard[]) => {
  const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  
  // Cost distribution
  const costDistribution: Record<number, number> = {};
  deck.cards.forEach(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    if (card) {
      costDistribution[card.cost] = (costDistribution[card.cost] || 0) + entry.quantity;
    }
  });
  
  // Ink color distribution
  const inkDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    const color = card?.color || 'None';
    inkDistribution[color] = (inkDistribution[color] || 0) + entry.quantity;
  });
  
  // Type distribution
  const typeDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    if (card) {
      typeDistribution[card.type] = (typeDistribution[card.type] || 0) + entry.quantity;
    }
  });
  
  // Rarity distribution
  const rarityDistribution: Record<string, number> = {};
  deck.cards.forEach(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    if (card) {
      rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + entry.quantity;
    }
  });
  
  // Average cost
  const averageCost = totalCards > 0 
    ? deck.cards.reduce((sum, entry) => {
        const card = allCards.find(c => c.id === entry.cardId);
        return sum + ((card?.cost || 0) * entry.quantity);
      }, 0) / totalCards
    : 0;
  
  // Inkwell count
  const inkwellCount = deck.cards
    .filter(entry => {
      const card = allCards.find(c => c.id === entry.cardId);
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

export const compareDeckVersions = (oldDeck: Deck, newDeck: Deck, allCards: LorcanaCard[]) => {
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
    const card = allCards.find(c => c.id === newEntry.cardId);
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
      const card = allCards.find(c => c.id === oldEntry.cardId);
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

export const isLegalFormat = (deck: Deck, allCards: LorcanaCard[], format: 'standard' | 'unlimited' = 'standard'): boolean => {
  // For now, we'll just implement basic validation
  // In the future, this could check against banned/restricted lists for different formats

  const validation = validateDeck(deck, allCards);
  if (!validation.isValid) return false;
  
  if (format === 'standard') {
    // Add standard format specific rules here
    // For example, checking set legality, banned cards, etc.
  }
  
  return true;
};
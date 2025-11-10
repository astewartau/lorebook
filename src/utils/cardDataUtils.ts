import { LorcanaCard, CardDatabase } from '../types';

// Export static data that doesn't depend on card data
export const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Epic', 'Enchanted', 'Iconic', 'Special'];

// Functions to compute derived data from cards
export const getSetsFromDatabase = (db: CardDatabase) => {
  return Object.entries(db.sets).map(([key, set]) => ({
    code: key,
    name: set.name,
    number: set.number
  }));
};

export const getRarities = (cards: LorcanaCard[]) => {
  return Array.from(new Set(cards.map(card => card.rarity))).sort((a, b) => {
    const aIndex = rarityOrder.indexOf(a);
    const bIndex = rarityOrder.indexOf(b);
    return aIndex - bIndex;
  });
};

export const getColors = (cards: LorcanaCard[]) => {
  return Array.from(new Set(cards.map(card => card.color)))
    .filter(color => color === '' || !color.includes('-'))
    .sort();
};

export const getCardTypes = (cards: LorcanaCard[]) => {
  return Array.from(new Set(cards.map(card => card.type))).sort();
};

export const getStories = (cards: LorcanaCard[]) => {
  return Array.from(new Set(cards.map(card => card.story).filter(Boolean) as string[])).sort();
};

export const getSubtypes = (cards: LorcanaCard[]) => {
  return Array.from(new Set(
    cards.flatMap(card => card.subtypes || [])
  )).sort();
};

export const getCosts = (cards: LorcanaCard[]) => {
  return Array.from(new Set(cards.map(card => card.cost))).sort((a, b) => a - b);
};

export const getStrengthRange = (cards: LorcanaCard[]) => {
  const cardsWithStrength = cards.filter(card => card.strength !== undefined);
  if (cardsWithStrength.length === 0) return { min: 0, max: 0 };

  return {
    min: Math.min(...cardsWithStrength.map(card => card.strength!)),
    max: Math.max(...cardsWithStrength.map(card => card.strength!))
  };
};

export const getWillpowerRange = (cards: LorcanaCard[]) => {
  const cardsWithWillpower = cards.filter(card => card.willpower !== undefined);
  if (cardsWithWillpower.length === 0) return { min: 0, max: 0 };

  return {
    min: Math.min(...cardsWithWillpower.map(card => card.willpower!)),
    max: Math.max(...cardsWithWillpower.map(card => card.willpower!))
  };
};

export const getLoreRange = (cards: LorcanaCard[]) => {
  const cardsWithLore = cards.filter(card => card.lore !== undefined);
  if (cardsWithLore.length === 0) return { min: 0, max: 0 };

  return {
    min: Math.min(...cardsWithLore.map(card => card.lore!)),
    max: Math.max(...cardsWithLore.map(card => card.lore!))
  };
};

export const getCostRange = (cards: LorcanaCard[]) => {
  const costs = getCosts(cards);
  if (costs.length === 0) return { min: 0, max: 0 };

  return {
    min: Math.min(...costs),
    max: Math.max(...costs)
  };
};

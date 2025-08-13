import { LorcanaCard, CardDatabase } from '../types';
import cardDatabase from './allCards.json';

const db = cardDatabase as CardDatabase;

export const allCards: LorcanaCard[] = db.cards;

export const sets = Object.entries(db.sets).map(([key, set]) => ({
  code: key,
  name: set.name,
  number: set.number
}));

// Extract unique values from card data
export const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Enchanted', 'Special'];

export const rarities = Array.from(new Set(allCards.map(card => card.rarity))).sort((a, b) => {
  const aIndex = rarityOrder.indexOf(a);
  const bIndex = rarityOrder.indexOf(b);
  return aIndex - bIndex;
});

// Export only single colors and empty string, not dual-ink combinations
export const colors = Array.from(new Set(allCards.map(card => card.color)))
  .filter(color => color === '' || !color.includes('-'))
  .sort();

export const cardTypes = Array.from(new Set(allCards.map(card => card.type))).sort();

export const stories = Array.from(new Set(allCards.map(card => card.story).filter(Boolean) as string[])).sort();

export const subtypes = Array.from(new Set(
  allCards.flatMap(card => card.subtypes || [])
)).sort();

export const costs = Array.from(new Set(allCards.map(card => card.cost))).sort((a, b) => a - b);

export const strengthRange = {
  min: Math.min(...allCards.filter(card => card.strength !== undefined).map(card => card.strength!)),
  max: Math.max(...allCards.filter(card => card.strength !== undefined).map(card => card.strength!))
};

export const willpowerRange = {
  min: Math.min(...allCards.filter(card => card.willpower !== undefined).map(card => card.willpower!)),
  max: Math.max(...allCards.filter(card => card.willpower !== undefined).map(card => card.willpower!))
};

export const loreRange = {
  min: Math.min(...allCards.filter(card => card.lore !== undefined).map(card => card.lore!)),
  max: Math.max(...allCards.filter(card => card.lore !== undefined).map(card => card.lore!))
};

export const costRange = {
  min: Math.min(...costs),
  max: Math.max(...costs)
};

export default allCards;
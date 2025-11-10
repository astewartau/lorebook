/**
 * This file provides backward compatibility by loading card data from the public folder.
 * The CardDataContext provides the same data dynamically.
 *
 * Components should migrate to use useCardData() hook from CardDataContext.
 */

// For now, we'll load from the public allCards.json file synchronously
// This is a temporary solution until all components are migrated to useCardData()

// Export re-export utilities
export { rarityOrder } from '../utils/cardDataUtils';

// Import the JSON file directly - this will be bundled
// Note: This is the downloaded copy from lorcanajson.org
import cardDatabase from './allCards.json';
import { CardDatabase, LorcanaCard } from '../types';
import * as cardDataUtils from '../utils/cardDataUtils';

const db = cardDatabase as CardDatabase;

// Export card data
export const allCards: LorcanaCard[] = db.cards;
export const sets = cardDataUtils.getSetsFromDatabase(db);
export const rarities = cardDataUtils.getRarities(db.cards);
export const colors = cardDataUtils.getColors(db.cards);
export const cardTypes = cardDataUtils.getCardTypes(db.cards);
export const stories = cardDataUtils.getStories(db.cards);
export const subtypes = cardDataUtils.getSubtypes(db.cards);
export const costs = cardDataUtils.getCosts(db.cards);
export const strengthRange = cardDataUtils.getStrengthRange(db.cards);
export const willpowerRange = cardDataUtils.getWillpowerRange(db.cards);
export const loreRange = cardDataUtils.getLoreRange(db.cards);
export const costRange = cardDataUtils.getCostRange(db.cards);

export default allCards;

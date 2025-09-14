import { Deck, LorcanaCard } from '../types';

/**
 * Generates an Inktable import URL for a deck
 * Format: https://inktable.net/lor/import?svc=lorebook&name=DeckName&id=base64EncodedDeckData
 */
export const generateInktableUrl = (deck: Deck, allCards: LorcanaCard[], playerName?: string): string => {
  // Convert deck to Inktable format: CardName_Version$Quantity|
  const deckString = deck.cards
    .map(deckCard => {
      const card = allCards.find(c => c.id === deckCard.cardId);
      if (!card) {
        console.warn(`Card with ID ${deckCard.cardId} not found`);
        return null;
      }
      
      // Format: "CardName_Version$Quantity"
      let cardString = card.name;
      if (card.version) {
        cardString += `_${card.version}`;
      }
      cardString += `$${deckCard.quantity}`;
      
      return cardString;
    })
    .filter(cardString => cardString !== null)
    .join('|');

  // Add trailing pipe to match Dreamborn's format
  const finalDeckString = deckString + '|';
  
  // Base64 encode the deck string
  const encodedDeck = btoa(finalDeckString);
  
  // Build the URL - Inktable requires svc=dreamborn for import functionality
  const params = new URLSearchParams({
    svc: 'dreamborn',
    name: playerName || deck.name,
    id: encodedDeck
  });
  
  return `https://inktable.net/lor/import?${params.toString()}`;
};

/**
 * Opens the Inktable import URL in a new tab
 */
export const exportToInktable = (deck: Deck, allCards: LorcanaCard[], playerName?: string): void => {
  const url = generateInktableUrl(deck, allCards, playerName);
  window.open(url, '_blank');
};

/**
 * Copies the Inktable import URL to clipboard
 */
export const copyInktableUrl = async (deck: Deck, allCards: LorcanaCard[], playerName?: string): Promise<boolean> => {
  try {
    const url = generateInktableUrl(deck, allCards, playerName);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generates multiple Inktable URLs for testing different service parameters
 */
export const generateInktableTestUrls = (deck: Deck, allCards: LorcanaCard[], playerName?: string): { lorebook: string; dreamborn: string; } => {
  // Convert deck to Inktable format
  const deckString = deck.cards
    .map(deckCard => {
      const card = allCards.find(c => c.id === deckCard.cardId);
      if (!card) return null;
      
      let cardString = card.name;
      if (card.version) {
        cardString += `_${card.version}`;
      }
      cardString += `$${deckCard.quantity}`;
      
      return cardString;
    })
    .filter(cardString => cardString !== null)
    .join('|');

  const finalDeckString = deckString + '|';
  const encodedDeck = btoa(finalDeckString);
  
  const name = playerName || deck.name;
  
  return {
    lorebook: `https://inktable.net/lor/import?svc=lorebook&name=${encodeURIComponent(name)}&id=${encodedDeck}`,
    dreamborn: `https://inktable.net/lor/import?svc=dreamborn&name=${encodeURIComponent(name)}&id=${encodedDeck}`
  };
};

/**
 * Validates that a deck can be exported to Inktable
 */
export const validateInktableExport = (deck: Deck, allCards: LorcanaCard[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!deck.cards || deck.cards.length === 0) {
    errors.push('Deck has no cards');
    return { valid: false, errors };
  }
  
  // Check for cards that don't exist in the database
  const missingCards = deck.cards.filter(deckCard => {
    const card = allCards.find(c => c.id === deckCard.cardId);
    return !card;
  });
  
  if (missingCards.length > 0) {
    errors.push(`${missingCards.length} card(s) not found in database`);
  }
  
  // Check for cards without names (shouldn't happen but let's be safe)
  const cardsWithoutNames = deck.cards.filter(deckCard => {
    const card = allCards.find(c => c.id === deckCard.cardId);
    return card && (!card.name || card.name.trim() === '');
  });
  
  if (cardsWithoutNames.length > 0) {
    errors.push(`${cardsWithoutNames.length} card(s) have missing names`);
  }
  
  return { valid: errors.length === 0, errors };
};
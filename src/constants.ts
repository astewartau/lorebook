// Lorcana TCG Official Game Rules
export const DECK_RULES = {
  MIN_CARDS: 60,
  MAX_CARDS: 9999, // No maximum deck size in Lorcana, only minimum of 60 (using large number instead of Infinity)
  MAX_COPIES_PER_CARD: 4
} as const;

// UI Pagination
export const PAGINATION = {
  CARDS_PER_PAGE: 100
} as const;
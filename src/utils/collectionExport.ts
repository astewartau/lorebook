import { CollectionCardEntry, LorcanaCard } from '../types';

/**
 * Exports a collection to CSV format compatible with Dreamborn.
 */
export function exportCollectionToCSV(
  collection: CollectionCardEntry[],
  allCards: LorcanaCard[]
): string {
  // Group collection by unique card identity (name + set + card number)
  const cardMap = new Map<string, {
    card: LorcanaCard;
    normalQuantity: number;
    foilQuantity: number;
  }>();

  collection.forEach(entry => {
    const card = allCards.find(c => c.id === entry.cardId);
    if (!card) return;

    // Create unique key based on card identity
    const key = `${card.fullName}|${card.setCode}|${card.number}`;

    if (cardMap.has(key)) {
      // Add to existing entry
      const existing = cardMap.get(key)!;
      existing.normalQuantity += entry.quantityNormal;
      existing.foilQuantity += entry.quantityFoil;
    } else {
      // Create new entry
      cardMap.set(key, {
        card,
        normalQuantity: entry.quantityNormal,
        foilQuantity: entry.quantityFoil
      });
    }
  });

  // Build CSV content with Dreamborn format headers
  const headers = 'Normal,Foil,Name,Set,Card Number,Color,Rarity,Price,Foil Price';
  const rows: string[] = [headers];

  cardMap.forEach(({ card, normalQuantity, foilQuantity }) => {
    // Only include cards with quantities > 0
    if (normalQuantity > 0 || foilQuantity > 0) {
      // Format card number for display
      let displayCardNumber = card.number.toString();
      if (card.promoGrouping) {
        // For promo cards, use the promo grouping as the set and include promo number
        displayCardNumber = card.promoGrouping.includes('/') ? card.promoGrouping : displayCardNumber;
      }

      // Escape quotes in card names and wrap in quotes if needed
      const escapedName = card.fullName.includes(',') || card.fullName.includes('"')
        ? `"${card.fullName.replace(/"/g, '""')}"`
        : card.fullName;

      const set = card.promoGrouping || card.setCode;
      const color = card.color || '';
      const rarity = card.rarity || '';

      const row = `${normalQuantity},${foilQuantity},${escapedName},${set},${displayCardNumber},${color},${rarity},,`;
      rows.push(row);
    }
  });

  return rows.join('\n');
}

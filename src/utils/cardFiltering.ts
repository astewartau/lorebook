import { LorcanaCard, FilterOptions, SortOption } from '../types';
import { rarityOrder, sets, costRange, strengthRange, willpowerRange, loreRange } from '../data/allCards';
import { matchesSmartSearch } from './smartSearch';

// Helper function to check if a card matches search criteria
const matchesSearchFilter = (card: LorcanaCard, searchTerm: string): boolean => {
  return matchesSmartSearch(card, searchTerm);
};

// Helper function to check if a card matches color filters
const matchesColorFilter = (card: LorcanaCard, filters: FilterOptions): boolean => {
  const isDualInk = card.color.includes('-');
  
  // If no colors are selected, handle based on mode
  if (filters.colors.length === 0) {
    switch (filters.colorMatchMode) {
      case 'dual-only':
        // Show all dual-ink cards when no specific colors selected
        return isDualInk;
      case 'any':
      case 'only':
      default:
        // Show all cards when no colors selected
        return true;
    }
  }
  
  // Colors are selected, apply filtering logic
  switch (filters.colorMatchMode) {
    case 'any':
      // Match any card that includes any selected color
      return filters.colors.some(color => card.color.includes(color));
      
    case 'only':
      // Show only cards with the exact selected colors
      if (filters.colors.length === 1) {
        // Single color selected: only show single-ink cards of that color
        return !isDualInk && card.color === filters.colors[0];
      } else {
        // Multiple colors selected: show single-ink cards of selected colors 
        // AND dual-ink cards with combinations of only the selected colors
        if (isDualInk) {
          // For dual-ink: both colors must be in the selected colors
          const [color1, color2] = card.color.split('-');
          return filters.colors.includes(color1) && filters.colors.includes(color2);
        } else {
          // For single-ink: must be one of the selected colors
          return filters.colors.includes(card.color);
        }
      }
      
    case 'dual-only':
      // Only show dual-ink cards
      if (!isDualInk) return false;
      
      if (filters.colors.length === 1) {
        // Single color selected: show any dual-ink that includes that color
        return card.color.includes(filters.colors[0]);
      } else if (filters.colors.length === 2) {
        // Two colors selected: show only the exact dual-ink combination
        const [color1, color2] = card.color.split('-');
        const sortedCardColors = [color1, color2].sort();
        const sortedSelectedColors = [...filters.colors].sort();
        return sortedCardColors.join('-') === sortedSelectedColors.join('-');
      } else {
        // More than 2 colors selected: no dual-ink can match exactly
        return false;
      }
      
    default:
      return true;
  }
};

// Helper function to check if a card matches collection filters
const matchesCollectionFilter = (
  card: LorcanaCard,
  filters: FilterOptions,
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number }
): boolean => {
  if (filters.collectionFilter === 'all') return true;
  
  // Use individual card ID to get exact quantities for this specific card
  const quantities = getCardQuantity(card.id);
  const isInCollection = quantities.total > 0;
  
  return filters.collectionFilter === 'owned' ? isInCollection : !isInCollection;
};

// Helper function to check if a card matches range filters
const matchesRangeFilters = (card: LorcanaCard, filters: FilterOptions): boolean => {
  const matchesCostRange = card.cost >= filters.costMin && card.cost <= filters.costMax;
  const matchesStrength = card.strength === undefined || (card.strength >= filters.strengthMin && card.strength <= filters.strengthMax);
  const matchesWillpower = card.willpower === undefined || (card.willpower >= filters.willpowerMin && card.willpower <= filters.willpowerMax);
  const matchesLore = card.lore === undefined || (card.lore >= filters.loreMin && card.lore <= filters.loreMax);
  
  return matchesCostRange && matchesStrength && matchesWillpower && matchesLore;
};

// Filter cards based on search term and filters
export const filterCards = (
  cards: LorcanaCard[],
  searchTerm: string,
  filters: FilterOptions,
  staleCardIds: Set<number>,
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number }
): LorcanaCard[] => {
  return cards.filter(card => {
    // If this card is in our stale cards set, always include it
    if (staleCardIds.has(card.id)) {
      console.log('Including stale card:', card.name);
      return true;
    }
    
    const matchesSearch = matchesSearchFilter(card, searchTerm);
    const matchesSet = filters.sets.length === 0 || filters.sets.includes(card.setCode);
    
    // Handle Illumineer's Quest cards (no ink color) separately
    const isIllumineerQuest = card.color === '';
    const matchesIllumineerQuest = isIllumineerQuest ? filters.includeIllumineerQuest : true;
    
    // Color filtering - only apply to non-Illumineer's Quest cards
    const matchesColor = isIllumineerQuest || matchesColorFilter(card, filters);
    
    const matchesRarity = filters.rarities.length === 0 || filters.rarities.includes(card.rarity);
    const matchesType = filters.types.length === 0 || filters.types.includes(card.type);
    const matchesStory = filters.stories.length === 0 || (card.story && filters.stories.includes(card.story));
    const matchesSubtype = filters.subtypes.length === 0 || (card.subtypes && card.subtypes.some(st => filters.subtypes.includes(st)));
    
    const matchesCostList = filters.costs.length === 0 || filters.costs.includes(card.cost);
    const matchesRanges = matchesRangeFilters(card, filters);
    
    const matchesInkwell = filters.inkwellOnly === null || card.inkwell === filters.inkwellOnly;
    const matchesInCollection = matchesCollectionFilter(card, filters, getCardQuantity);
    
    // Check card count filter - use individual card quantities
    const matchesCardCount = filters.cardCountOperator === null || (() => {
      const quantities = getCardQuantity(card.id);
      const totalCount = quantities.total;
      
      switch (filters.cardCountOperator) {
        case 'eq': return totalCount === filters.cardCountValue;
        case 'gte': return totalCount >= filters.cardCountValue;
        case 'lte': return totalCount <= filters.cardCountValue;
        default: return true;
      }
    })();
    
    // Check enchanted and special filters based on individual card rarity
    const matchesEnchanted = filters.hasEnchanted === null || 
      (filters.hasEnchanted === true && card.rarity === 'Enchanted') ||
      (filters.hasEnchanted === false && card.rarity !== 'Enchanted');
    
    const matchesSpecial = filters.hasSpecial === null || 
      (filters.hasSpecial === true && (card.rarity === 'Special' || card.promoGrouping !== undefined)) ||
      (filters.hasSpecial === false && card.rarity !== 'Special' && card.promoGrouping === undefined);

    return matchesSearch && matchesSet && matchesColor && matchesIllumineerQuest && matchesRarity && matchesType && 
           matchesStory && matchesSubtype && matchesCostList && matchesRanges &&
           matchesInkwell && matchesInCollection && matchesCardCount && matchesEnchanted && matchesSpecial;
  });
};

// Sort cards based on sort criteria
export const sortCards = (cards: LorcanaCard[], sortBy: SortOption): LorcanaCard[] => {
  return cards.sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy.field) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'cost':
        aValue = a.cost;
        bValue = b.cost;
        break;
      case 'rarity':
        aValue = rarityOrder.indexOf(a.rarity);
        bValue = rarityOrder.indexOf(b.rarity);
        break;
      case 'set':
        aValue = a.setCode;
        bValue = b.setCode;
        break;
      case 'number':
        aValue = a.number;
        bValue = b.number;
        break;
      case 'color':
        aValue = a.color;
        bValue = b.color;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'story':
        aValue = a.story || '';
        bValue = b.story || '';
        break;
      case 'strength':
        aValue = a.strength || 0;
        bValue = b.strength || 0;
        break;
      case 'willpower':
        aValue = a.willpower || 0;
        bValue = b.willpower || 0;
        break;
      case 'lore':
        aValue = a.lore || 0;
        bValue = b.lore || 0;
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortBy.direction === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
};

// Group cards by specified field
export const groupCards = (
  cards: LorcanaCard[], 
  groupBy: string
): Record<string, LorcanaCard[]> => {
  if (groupBy === 'none') return {};
  
  const groupedCards: Record<string, LorcanaCard[]> = {};
  
  cards.forEach(card => {
    let groupKey = '';
    
    switch (groupBy) {
      case 'set':
        const setInfo = sets.find(s => s.code === card.setCode);
        groupKey = setInfo?.name || card.setCode;
        break;
      case 'color':
        groupKey = card.color || 'No Ink Color';
        break;
      case 'rarity':
        groupKey = card.rarity;
        break;
      case 'type':
        groupKey = card.type;
        break;
      case 'story':
        groupKey = card.story || 'No Story';
        break;
      case 'cost':
        groupKey = `Cost ${card.cost}`;
        break;
      default:
        groupKey = 'Unknown';
    }
    
    if (!groupedCards[groupKey]) {
      groupedCards[groupKey] = [];
    }
    groupedCards[groupKey].push(card);
  });
  
  // Sort the groups based on the grouping type
  const sortedGroupedCards: Record<string, LorcanaCard[]> = {};
  let sortedKeys: string[];
  
  switch (groupBy) {
    case 'cost':
      // Sort cost groups numerically
      sortedKeys = Object.keys(groupedCards).sort((a, b) => {
        const costA = parseInt(a.replace('Cost ', ''));
        const costB = parseInt(b.replace('Cost ', ''));
        return costA - costB;
      });
      break;
    case 'rarity':
      // Sort rarity groups by rarity order
      sortedKeys = Object.keys(groupedCards).sort((a, b) => {
        return rarityOrder.indexOf(a) - rarityOrder.indexOf(b);
      });
      break;
    case 'set':
      // Sort set groups by set order (assuming sets are already in chronological order)
      sortedKeys = Object.keys(groupedCards).sort((a, b) => {
        const setA = sets.find(s => s.name === a);
        const setB = sets.find(s => s.name === b);
        if (!setA || !setB) return a.localeCompare(b);
        return sets.indexOf(setA) - sets.indexOf(setB);
      });
      break;
    default:
      // Sort alphabetically for other group types
      sortedKeys = Object.keys(groupedCards).sort();
      break;
  }
  
  // Rebuild the object with sorted keys
  sortedKeys.forEach(key => {
    sortedGroupedCards[key] = groupedCards[key];
  });
  
  return sortedGroupedCards;
};

// Count active filters
export const countActiveFilters = (filters: FilterOptions): number => {
  return (
    filters.sets.length +
    filters.colors.length +
    filters.rarities.length +
    filters.types.length +
    filters.stories.length +
    filters.subtypes.length +
    filters.costs.length +
    (filters.costMin !== costRange.min || filters.costMax !== costRange.max ? 1 : 0) +
    (filters.strengthMin !== strengthRange.min || filters.strengthMax !== strengthRange.max ? 1 : 0) +
    (filters.willpowerMin !== willpowerRange.min || filters.willpowerMax !== willpowerRange.max ? 1 : 0) +
    (filters.loreMin !== loreRange.min || filters.loreMax !== loreRange.max ? 1 : 0) +
    (filters.inkwellOnly !== null ? 1 : 0) +
    (filters.hasEnchanted !== null ? 1 : 0) +
    (filters.hasSpecial !== null ? 1 : 0) +
    (filters.includeIllumineerQuest ? 1 : 0) +
    (filters.collectionFilter !== 'all' ? 1 : 0) +
    (filters.cardCountOperator !== null ? 1 : 0)
  );
};
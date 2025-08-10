import { ConsolidatedCard, FilterOptions, SortOption } from '../types';
import { rarityOrder, sets, costRange, strengthRange, willpowerRange, loreRange } from '../data/allCards';
import { consolidatedCardMatchesFilters } from './cardConsolidation';

// Helper function to check if a card matches search criteria
const matchesSearchFilter = (baseCard: any, searchTerm: string): boolean => {
  return baseCard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (baseCard.version?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
         (baseCard.story?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
};

// Helper function to check if a card matches color filters
const matchesColorFilter = (baseCard: any, filters: FilterOptions): boolean => {
  const isDualInk = baseCard.color.includes('-');
  
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
      return filters.colors.some(color => baseCard.color.includes(color));
      
    case 'only':
      // Show only cards with the exact selected colors
      if (filters.colors.length === 1) {
        // Single color selected: only show single-ink cards of that color
        return !isDualInk && baseCard.color === filters.colors[0];
      } else {
        // Multiple colors selected: show single-ink cards of selected colors 
        // AND dual-ink cards with combinations of only the selected colors
        if (isDualInk) {
          // For dual-ink: both colors must be in the selected colors
          const [color1, color2] = baseCard.color.split('-');
          return filters.colors.includes(color1) && filters.colors.includes(color2);
        } else {
          // For single-ink: must be one of the selected colors
          return filters.colors.includes(baseCard.color);
        }
      }
      
    case 'dual-only':
      // Only show dual-ink cards
      if (!isDualInk) return false;
      
      if (filters.colors.length === 1) {
        // Single color selected: show any dual-ink that includes that color
        return baseCard.color.includes(filters.colors[0]);
      } else if (filters.colors.length === 2) {
        // Two colors selected: show only the exact dual-ink combination
        const [color1, color2] = baseCard.color.split('-');
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
  consolidatedCard: ConsolidatedCard,
  filters: FilterOptions,
  getVariantQuantities: (fullName: string) => { regular: number; foil: number; enchanted: number; special: number }
): boolean => {
  if (filters.collectionFilter === 'all') return true;
  
  const quantities = getVariantQuantities(consolidatedCard.fullName);
  const totalOwned = quantities.regular + quantities.foil + quantities.enchanted + quantities.special;
  const isInCollection = totalOwned > 0;
  
  return filters.collectionFilter === 'owned' ? isInCollection : !isInCollection;
};

// Helper function to check if a card matches range filters
const matchesRangeFilters = (baseCard: any, filters: FilterOptions): boolean => {
  const matchesCostRange = baseCard.cost >= filters.costMin && baseCard.cost <= filters.costMax;
  const matchesStrength = baseCard.strength === undefined || (baseCard.strength >= filters.strengthMin && baseCard.strength <= filters.strengthMax);
  const matchesWillpower = baseCard.willpower === undefined || (baseCard.willpower >= filters.willpowerMin && baseCard.willpower <= filters.willpowerMax);
  const matchesLore = baseCard.lore === undefined || (baseCard.lore >= filters.loreMin && baseCard.lore <= filters.loreMax);
  
  return matchesCostRange && matchesStrength && matchesWillpower && matchesLore;
};

// Filter cards based on search term and filters
export const filterCards = (
  cards: ConsolidatedCard[],
  searchTerm: string,
  filters: FilterOptions,
  staleCardIds: Set<number>,
  getVariantQuantities: (fullName: string) => { regular: number; foil: number; enchanted: number; special: number }
): ConsolidatedCard[] => {
  return cards.filter(consolidatedCard => {
    const { baseCard } = consolidatedCard;
    
    // If this card is in our stale cards set, always include it
    if (staleCardIds.has(baseCard.id)) {
      console.log('Including stale card:', baseCard.name);
      return true;
    }
    
    const matchesSearch = matchesSearchFilter(baseCard, searchTerm);
    const matchesSet = filters.sets.length === 0 || filters.sets.includes(baseCard.setCode);
    
    // Handle Illumineer's Quest cards (no ink color) separately
    const isIllumineerQuest = baseCard.color === '';
    const matchesIllumineerQuest = isIllumineerQuest ? filters.includeIllumineerQuest : true;
    
    // Color filtering - only apply to non-Illumineer's Quest cards
    const matchesColor = isIllumineerQuest || matchesColorFilter(baseCard, filters);
    
    const matchesType = filters.types.length === 0 || filters.types.includes(baseCard.type);
    const matchesStory = filters.stories.length === 0 || (baseCard.story && filters.stories.includes(baseCard.story));
    const matchesSubtype = filters.subtypes.length === 0 || (baseCard.subtypes && baseCard.subtypes.some(st => filters.subtypes.includes(st)));
    
    const matchesCostList = filters.costs.length === 0 || filters.costs.includes(baseCard.cost);
    const matchesRanges = matchesRangeFilters(baseCard, filters);
    
    const matchesInkwell = filters.inkwellOnly === null || baseCard.inkwell === filters.inkwellOnly;
    const matchesInCollection = matchesCollectionFilter(consolidatedCard, filters, getVariantQuantities);
    
    // Check card count filter
    const matchesCardCount = filters.cardCountOperator === null || (() => {
      const quantities = getVariantQuantities(consolidatedCard.fullName);
      const totalCount = quantities.regular + quantities.foil + quantities.enchanted + quantities.special;
      
      switch (filters.cardCountOperator) {
        case 'eq': return totalCount === filters.cardCountValue;
        case 'gte': return totalCount >= filters.cardCountValue;
        case 'lte': return totalCount <= filters.cardCountValue;
        default: return true;
      }
    })();
    
    // Check consolidated card specific filters
    const matchesConsolidatedFilters = consolidatedCardMatchesFilters(consolidatedCard, filters);

    return matchesSearch && matchesSet && matchesColor && matchesIllumineerQuest && matchesType && 
           matchesStory && matchesSubtype && matchesCostList && matchesRanges &&
           matchesInkwell && matchesInCollection && matchesCardCount && matchesConsolidatedFilters;
  });
};

// Sort cards based on sort criteria
export const sortCards = (cards: ConsolidatedCard[], sortBy: SortOption): ConsolidatedCard[] => {
  return cards.sort((a, b) => {
    let aValue: any, bValue: any;
    const aCard = a.baseCard;
    const bCard = b.baseCard;

    switch (sortBy.field) {
      case 'name':
        aValue = aCard.name;
        bValue = bCard.name;
        break;
      case 'cost':
        aValue = aCard.cost;
        bValue = bCard.cost;
        break;
      case 'rarity':
        aValue = rarityOrder.indexOf(aCard.rarity);
        bValue = rarityOrder.indexOf(bCard.rarity);
        break;
      case 'set':
        aValue = aCard.setCode;
        bValue = bCard.setCode;
        break;
      case 'number':
        aValue = aCard.number;
        bValue = bCard.number;
        break;
      case 'color':
        aValue = aCard.color;
        bValue = bCard.color;
        break;
      case 'type':
        aValue = aCard.type;
        bValue = bCard.type;
        break;
      case 'story':
        aValue = aCard.story || '';
        bValue = bCard.story || '';
        break;
      case 'strength':
        aValue = aCard.strength || 0;
        bValue = bCard.strength || 0;
        break;
      case 'willpower':
        aValue = aCard.willpower || 0;
        bValue = bCard.willpower || 0;
        break;
      case 'lore':
        aValue = aCard.lore || 0;
        bValue = bCard.lore || 0;
        break;
      default:
        aValue = aCard.name;
        bValue = bCard.name;
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
  cards: ConsolidatedCard[], 
  groupBy: string
): Record<string, ConsolidatedCard[]> => {
  if (groupBy === 'none') return {};
  
  const groupedCards: Record<string, ConsolidatedCard[]> = {};
  
  cards.forEach(card => {
    let groupKey = '';
    const baseCard = card.baseCard;
    
    switch (groupBy) {
      case 'set':
        const setInfo = sets.find(s => s.code === baseCard.setCode);
        groupKey = setInfo?.name || baseCard.setCode;
        break;
      case 'color':
        groupKey = baseCard.color || 'No Ink Color';
        break;
      case 'rarity':
        groupKey = baseCard.rarity;
        break;
      case 'type':
        groupKey = baseCard.type;
        break;
      case 'story':
        groupKey = baseCard.story || 'No Story';
        break;
      case 'cost':
        groupKey = `Cost ${baseCard.cost}`;
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
  const sortedGroupedCards: Record<string, ConsolidatedCard[]> = {};
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
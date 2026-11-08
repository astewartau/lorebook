import { LorcanaCard, FilterOptions, SortOption } from '../types';
import { rarityOrder } from '../utils/cardDataUtils';
import { matchesSmartSearch } from './smartSearch';

// Legality comes from the card data (LorcanaJSON's allowedInFormats), which
// follows rotations, reprints and bans.
const matchesLegality = (card: LorcanaCard, legality: 'core' | 'infinity'): boolean =>
  legality === 'infinity' ? card.legal.infinity : card.legal.core;

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

  // Treat 0-0 ranges as "no filter" (data not loaded yet or no filtering intended)
  const strengthRangeActive = filters.strengthMin !== 0 || filters.strengthMax !== 0;
  const willpowerRangeActive = filters.willpowerMin !== 0 || filters.willpowerMax !== 0;
  const loreRangeActive = filters.loreMin !== 0 || filters.loreMax !== 0;

  const matchesStrength = card.strength === undefined ||
    !strengthRangeActive ||
    (card.strength >= filters.strengthMin && card.strength <= filters.strengthMax);
  const matchesWillpower = card.willpower === undefined ||
    !willpowerRangeActive ||
    (card.willpower >= filters.willpowerMin && card.willpower <= filters.willpowerMax);
  const matchesLore = card.lore === undefined ||
    !loreRangeActive ||
    (card.lore >= filters.loreMin && card.lore <= filters.loreMax);

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
    if (staleCardIds.has(card.id)) return true;
    
    const matchesSearch = matchesSearchFilter(card, searchTerm);
    const matchesLegalFormat = matchesLegality(card, filters.legality);
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

    return matchesSearch && matchesLegalFormat && matchesSet && matchesColor && matchesIllumineerQuest && matchesRarity && matchesType &&
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
        // Parse setCode as number for proper numeric sorting (e.g., "10" > "9")
        // Handle special codes like "Q1", "Q2" by checking if they're numeric
        const aSetNum = isNaN(parseInt(a.setCode)) ? a.setCode : parseInt(a.setCode);
        const bSetNum = isNaN(parseInt(b.setCode)) ? b.setCode : parseInt(b.setCode);
        // If one is a number and one is a string, numbers come first
        if (typeof aSetNum === 'number' && typeof bSetNum === 'string') {
          aValue = 0;
          bValue = 1;
        } else if (typeof aSetNum === 'string' && typeof bSetNum === 'number') {
          aValue = 1;
          bValue = 0;
        } else {
          aValue = aSetNum;
          bValue = bSetNum;
        }
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
  groupBy: string,
  sets?: Array<{ code: string; name: string; number: number }>
): Record<string, LorcanaCard[]> => {
  if (groupBy === 'none') return {};

  const groupedCards: Record<string, LorcanaCard[]> = {};

  cards.forEach(card => {
    let groupKey = '';

    switch (groupBy) {
      case 'set':
        const setInfo = sets?.find(s => s.code === card.setCode);
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
        if (!sets) return a.localeCompare(b);
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

// Compute available filter options based on cards filtered by OTHER filters
// This enables "contextual" filtering where selecting one filter narrows options in other filters
export interface FilterOptionWithCount {
  value: string;
  count: number;
}

export interface ContextualFilterOptions {
  sets: string[];
  colors: string[];
  rarities: string[];
  types: string[];
  stories: string[];
  subtypes: string[];
  costs: number[];
  // Counts for each option
  setCounts: Record<string, number>;
  colorCounts: Record<string, number>;
  rarityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  storyCounts: Record<string, number>;
  subtypeCounts: Record<string, number>;
  costCounts: Record<number, number>;
}

// Helper to filter cards with one filter category excluded
const filterCardsExcluding = (
  cards: LorcanaCard[],
  searchTerm: string,
  filters: FilterOptions,
  excludeFilter: keyof FilterOptions,
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number }
): LorcanaCard[] => {
  return cards.filter(card => {
    const matchesSearch = matchesSearchFilter(card, searchTerm);
    const matchesLegalFormat = excludeFilter === 'legality' || matchesLegality(card, filters.legality);
    const matchesSet = excludeFilter === 'sets' || filters.sets.length === 0 || filters.sets.includes(card.setCode);

    // Handle Illumineer's Quest cards
    const isIllumineerQuest = card.color === '';
    const matchesIllumineerQuest = isIllumineerQuest ? filters.includeIllumineerQuest : true;

    // Color filtering - only apply to non-Illumineer's Quest cards
    const matchesColor = excludeFilter === 'colors' || isIllumineerQuest || matchesColorFilter(card, filters);

    const matchesRarity = excludeFilter === 'rarities' || filters.rarities.length === 0 || filters.rarities.includes(card.rarity);
    const matchesType = excludeFilter === 'types' || filters.types.length === 0 || filters.types.includes(card.type);
    const matchesStory = excludeFilter === 'stories' || filters.stories.length === 0 || (card.story && filters.stories.includes(card.story));
    const matchesSubtype = excludeFilter === 'subtypes' || filters.subtypes.length === 0 || (card.subtypes && card.subtypes.some(st => filters.subtypes.includes(st)));

    const matchesCostList = excludeFilter === 'costs' || filters.costs.length === 0 || filters.costs.includes(card.cost);
    const matchesRanges = matchesRangeFilters(card, filters);

    const matchesInkwell = filters.inkwellOnly === null || card.inkwell === filters.inkwellOnly;
    const matchesInCollection = matchesCollectionFilter(card, filters, getCardQuantity);

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

    const matchesEnchanted = filters.hasEnchanted === null ||
      (filters.hasEnchanted === true && card.rarity === 'Enchanted') ||
      (filters.hasEnchanted === false && card.rarity !== 'Enchanted');

    const matchesSpecial = filters.hasSpecial === null ||
      (filters.hasSpecial === true && (card.rarity === 'Special' || card.promoGrouping !== undefined)) ||
      (filters.hasSpecial === false && card.rarity !== 'Special' && card.promoGrouping === undefined);

    return matchesSearch && matchesLegalFormat && matchesSet && matchesColor && matchesIllumineerQuest && matchesRarity &&
           matchesType && matchesStory && matchesSubtype && matchesCostList && matchesRanges &&
           matchesInkwell && matchesInCollection && matchesCardCount && matchesEnchanted && matchesSpecial;
  });
};

type Facet = 'sets' | 'colors' | 'rarities' | 'types' | 'stories' | 'subtypes' | 'costs';
const FACETS: Facet[] = ['sets', 'colors', 'rarities', 'types', 'stories', 'subtypes', 'costs'];

const inksOfCard = (c: LorcanaCard): string[] => (c.color ? c.color.split('-') : []);

// Compute contextual options for each filter category: the options of one
// category are counted over cards that pass every OTHER filter. One pass:
// a card failing no category counts everywhere, a card failing exactly one
// category counts only there, and a card failing two or more counts nowhere.
export const computeContextualFilterOptions = (
  allCards: LorcanaCard[],
  searchTerm: string,
  filters: FilterOptions,
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number }
): ContextualFilterOptions => {
  const counts: Record<Facet, Record<string, number>> = {
    sets: {}, colors: {}, rarities: {}, types: {}, stories: {}, subtypes: {}, costs: {},
  };
  const add = (facet: Facet, keys: string[]) => {
    for (const k of keys) if (k) counts[facet][k] = (counts[facet][k] || 0) + 1;
  };
  const keysFor = (facet: Facet, c: LorcanaCard): string[] => {
    switch (facet) {
      case 'sets': return [c.setCode];
      case 'colors': return inksOfCard(c);
      case 'rarities': return [c.rarity];
      case 'types': return [c.type];
      case 'stories': return c.story ? [c.story] : [];
      case 'subtypes': return c.subtypes ?? [];
      case 'costs': return [String(c.cost)];
    }
  };

  // Everything that isn't a category filter must pass.
  const base = filterCardsExcluding(
    allCards, searchTerm,
    { ...filters, sets: [], colors: [], rarities: [], types: [], stories: [], subtypes: [], costs: [] },
    'colors', getCardQuantity
  );

  for (const card of base) {
    const isQuest = card.color === '';
    const fails: Facet[] = [];
    if (filters.sets.length && !filters.sets.includes(card.setCode)) fails.push('sets');
    if (!isQuest && !matchesColorFilter(card, filters)) fails.push('colors');
    if (filters.rarities.length && !filters.rarities.includes(card.rarity)) fails.push('rarities');
    if (filters.types.length && !filters.types.includes(card.type)) fails.push('types');
    if (filters.stories.length && !(card.story && filters.stories.includes(card.story))) fails.push('stories');
    if (filters.subtypes.length && !(card.subtypes && card.subtypes.some(st => filters.subtypes.includes(st)))) fails.push('subtypes');
    if (filters.costs.length && !filters.costs.includes(card.cost)) fails.push('costs');

    if (fails.length === 0) FACETS.forEach(f => add(f, keysFor(f, card)));
    else if (fails.length === 1) add(fails[0], keysFor(fails[0], card));
  }

  const costCounts: Record<number, number> = {};
  Object.entries(counts.costs).forEach(([k, v]) => { costCounts[parseInt(k)] = v; });

  return {
    sets: Object.keys(counts.sets),
    colors: Object.keys(counts.colors),
    rarities: Object.keys(counts.rarities),
    types: Object.keys(counts.types),
    stories: Object.keys(counts.stories).sort(),
    subtypes: Object.keys(counts.subtypes).sort(),
    costs: Object.keys(counts.costs).map(Number).sort((a, b) => a - b),
    setCounts: counts.sets,
    colorCounts: counts.colors,
    rarityCounts: counts.rarities,
    typeCounts: counts.types,
    storyCounts: counts.stories,
    subtypeCounts: counts.subtypes,
    costCounts,
  };
};

// Count active filters
export const countActiveFilters = (
  filters: FilterOptions,
  ranges?: {
    costRange?: { min: number; max: number };
    strengthRange?: { min: number; max: number };
    willpowerRange?: { min: number; max: number };
    loreRange?: { min: number; max: number };
  }
): number => {
  const costRange = ranges?.costRange || { min: 0, max: 10 };
  const strengthRange = ranges?.strengthRange || { min: 0, max: 10 };
  const willpowerRange = ranges?.willpowerRange || { min: 0, max: 10 };
  const loreRange = ranges?.loreRange || { min: 0, max: 5 };

  // A range counts only when it narrows the data's range.
  const narrows = (min: number, max: number, r: { min: number; max: number }) =>
    r.max > 0 && (min > r.min || max < r.max);
  const costRangeActive = narrows(filters.costMin, filters.costMax, costRange);
  const strengthRangeActive = narrows(filters.strengthMin, filters.strengthMax, strengthRange);
  const willpowerRangeActive = narrows(filters.willpowerMin, filters.willpowerMax, willpowerRange);
  const loreRangeActive = narrows(filters.loreMin, filters.loreMax, loreRange);

  return (
    filters.sets.length +
    filters.colors.length +
    filters.rarities.length +
    filters.types.length +
    filters.stories.length +
    filters.subtypes.length +
    filters.costs.length +
    (costRangeActive ? 1 : 0) +
    (strengthRangeActive ? 1 : 0) +
    (willpowerRangeActive ? 1 : 0) +
    (loreRangeActive ? 1 : 0) +
    (filters.inkwellOnly !== null ? 1 : 0) +
    (filters.hasEnchanted !== null ? 1 : 0) +
    (filters.hasSpecial !== null ? 1 : 0) +
    (filters.includeIllumineerQuest ? 1 : 0) +
    (filters.collectionFilter !== 'all' ? 1 : 0) +
    (filters.cardCountOperator !== null ? 1 : 0)
  );
};
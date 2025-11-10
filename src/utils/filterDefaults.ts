import { FilterOptions, SortOption } from '../types';

// Default ranges - these will be overridden by actual card data when available
const DEFAULT_COST_RANGE = { min: 0, max: 10 };
const DEFAULT_STRENGTH_RANGE = { min: 0, max: 10 };
const DEFAULT_WILLPOWER_RANGE = { min: 0, max: 10 };
const DEFAULT_LORE_RANGE = { min: 0, max: 5 };

export const getDefaultFilters = (ranges?: {
  costRange?: { min: number; max: number };
  strengthRange?: { min: number; max: number };
  willpowerRange?: { min: number; max: number };
  loreRange?: { min: number; max: number };
}): FilterOptions => {
  const costRange = ranges?.costRange || DEFAULT_COST_RANGE;
  const strengthRange = ranges?.strengthRange || DEFAULT_STRENGTH_RANGE;
  const willpowerRange = ranges?.willpowerRange || DEFAULT_WILLPOWER_RANGE;
  const loreRange = ranges?.loreRange || DEFAULT_LORE_RANGE;

  return {
    search: '',
    sets: [],
    colors: [],
    colorMatchMode: 'any',
    rarities: [],
    types: [],
    stories: [],
    subtypes: [],
    costs: [],
    costMin: costRange.min,
    costMax: costRange.max,
    strengthMin: strengthRange.min,
    strengthMax: strengthRange.max,
    willpowerMin: willpowerRange.min,
    willpowerMax: willpowerRange.max,
    loreMin: loreRange.min,
    loreMax: loreRange.max,
    inkwellOnly: null,
    hasEnchanted: null,
    hasSpecial: null,
    includeIllumineerQuest: false,
    collectionFilter: 'all',
    cardCountOperator: null,
    cardCountValue: 1,
    fadeOthers: false,
  };
};

export interface URLState {
  searchTerm: string;
  viewMode: 'grid' | 'list';
  sortBy: SortOption;
  groupBy: string;
  filters: FilterOptions;
}

export const parseURLState = (searchParams: URLSearchParams): URLState => {
  const defaultFilters = getDefaultFilters();
  
  // Parse filters from URL params
  const urlFilters = { ...defaultFilters };
  
  const sets = searchParams.getAll('set');
  if (sets.length > 0) urlFilters.sets = sets;
  
  const colors = searchParams.getAll('color');
  if (colors.length > 0) urlFilters.colors = colors;
  
  const rarities = searchParams.getAll('rarity');
  if (rarities.length > 0) urlFilters.rarities = rarities;
  
  const types = searchParams.getAll('type');
  if (types.length > 0) urlFilters.types = types;
  
  const collectionFilter = searchParams.get('collection');
  if (collectionFilter) urlFilters.collectionFilter = collectionFilter as any;
  
  const inkable = searchParams.get('inkable');
  if (inkable === 'true') urlFilters.inkwellOnly = true;
  if (inkable === 'false') urlFilters.inkwellOnly = false;
  
  const minCost = searchParams.get('minCost');
  if (minCost) urlFilters.costMin = parseInt(minCost);
  
  const maxCost = searchParams.get('maxCost');
  if (maxCost) urlFilters.costMax = parseInt(maxCost);
  
  return {
    searchTerm: searchParams.get('search') || '',
    viewMode: (searchParams.get('view') as 'grid' | 'list') || 'grid',
    sortBy: {
      field: (searchParams.get('sortField') as SortOption['field']) || 'set',
      direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc'
    },
    groupBy: searchParams.get('groupBy') || 'none',
    filters: urlFilters
  };
};
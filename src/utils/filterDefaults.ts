import { costRange, strengthRange, willpowerRange, loreRange } from '../data/allCards';
import { FilterOptions, SortOption } from '../types';

export const getDefaultFilters = (): FilterOptions => {
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
import { FilterOptions, SortOption } from '../types';

// Stat ranges default to unbounded: wider than any card, so they filter
// nothing and don't count as active. Panels show them clamped to the data.
const UNBOUNDED = { min: 0, max: 99 };

export const getDefaultFilters = (_ranges?: unknown): FilterOptions => {
  const costRange = UNBOUNDED;
  const strengthRange = UNBOUNDED;
  const willpowerRange = UNBOUNDED;
  const loreRange = UNBOUNDED;

  return {
    search: '',
    legality: 'core',
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
  
  const legality = searchParams.get('legality');
  if (legality === 'core' || legality === 'infinity') urlFilters.legality = legality;

  const sets = searchParams.getAll('set');
  if (sets.length > 0) urlFilters.sets = sets;
  
  const colors = searchParams.getAll('color');
  if (colors.length > 0) urlFilters.colors = colors;
  
  const rarities = searchParams.getAll('rarity');
  if (rarities.length > 0) urlFilters.rarities = rarities;
  
  const types = searchParams.getAll('type');
  if (types.length > 0) urlFilters.types = types;

  const stories = searchParams.getAll('story');
  if (stories.length > 0) urlFilters.stories = stories;

  const subtypes = searchParams.getAll('subtype');
  if (subtypes.length > 0) urlFilters.subtypes = subtypes;

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
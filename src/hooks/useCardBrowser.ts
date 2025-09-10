import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterOptions, SortOption, LorcanaCard } from '../types';
import { allCards } from '../data/allCards';
import { useCollection } from '../contexts/CollectionContext';
import { usePagination } from './usePagination';
import { useDebounce } from './useDebounce';
import { filterCards, sortCards, groupCards, countActiveFilters } from '../utils/cardFiltering';
import { getDefaultFilters, parseURLState } from '../utils/filterDefaults';
import { PAGINATION } from '../constants';

export const useCardBrowser = () => {
  // ================================
  // 1. EXTERNAL DEPENDENCIES
  // ================================
  const { getCardQuantity, addCardToCollection, removeCardFromCollection } = useCollection();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ================================
  // 2. STATE INITIALIZATION & URL SYNC
  // ================================
  const urlState = parseURLState(searchParams);
  const [searchTerm, setSearchTermState] = useState(urlState.searchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(urlState.viewMode);
  const [sortBy, setSortByState] = useState<SortOption>(urlState.sortBy);
  const [groupBy, setGroupByState] = useState<string>(urlState.groupBy);
  const [filters, setFiltersState] = useState<FilterOptions>(urlState.filters);
  const [showFilters, setShowFilters] = useState(false);
  
  // ================================  
  // 3. STALE CARD TRACKING STATE
  // ================================
  const [staleCardIds, setStaleCardIds] = useState<Set<number>>(new Set());
  const [showFilterNotification, setShowFilterNotification] = useState(false);
  const [staleCardCount, setStaleCardCount] = useState(0);
  
  // ================================
  // 4. COLLECTION HELPERS
  // ================================
  // No more getVariantQuantities - we work with individual cards directly

  // Track window size for responsive pagination
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ================================
  // 5. COMPUTED VALUES & EFFECTS
  // ================================
  // Dynamic pagination based on viewport and view mode
  const cardsPerPage = useMemo(() => {
    if (viewMode === 'list') {
      // List view can show more items based on screen size
      const { width, height } = windowSize;
      
      // Estimate based on screen capacity
      if (width >= 1920 && height >= 1080) {
        return 300; // 2xl screens with 4 columns
      } else if (width >= 1536) {
        return 200; // xl screens with 3 columns
      } else if (width >= 1280) {
        return 150; // lg screens with 2 columns
      }
    }
    return PAGINATION.CARDS_PER_PAGE; // Default 100
  }, [viewMode, windowSize]);

  const { sortedCards, groupedCards, totalCards, activeFiltersCount } = useMemo(() => {
    const filtered = filterCards(allCards, debouncedSearchTerm, filters, staleCardIds, getCardQuantity);
    const sorted = sortCards(filtered, sortBy);
    const grouped = groupCards(sorted, groupBy);
    const activeCount = countActiveFilters(filters);
    
    return {
      sortedCards: sorted,
      groupedCards: grouped,
      totalCards: sorted.length,
      activeFiltersCount: activeCount
    };
  }, [debouncedSearchTerm, filters, sortBy, groupBy, staleCardIds, getCardQuantity]);
  
  const pagination = usePagination({
    totalItems: totalCards,
    itemsPerPage: cardsPerPage,
    resetTriggers: [debouncedSearchTerm, filters, sortBy, groupBy]
  });
  
  const paginatedCards = useMemo(() => {
    return sortedCards.slice(pagination.startIndex, pagination.endIndex);
  }, [sortedCards, pagination.startIndex, pagination.endIndex]);

  // ================================
  // 5. URL UPDATE UTILITIES
  // ================================
  const updateURLParams = useCallback((params: Record<string, string | string[] | undefined>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      
      Object.entries(params).forEach(([key, value]) => {
        newParams.delete(key);
        
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => newParams.append(key, v));
          } else {
            newParams.set(key, value);
          }
        }
      });
      
      return newParams;
    });
  }, [setSearchParams]);

  // ================================
  // 6. STATE SETTERS (URL-synced)
  // ================================
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    // URL update will happen via useEffect when debouncedSearchTerm changes
  }, []);
  
  // Update URL when debounced search term changes
  useEffect(() => {
    updateURLParams({ search: debouncedSearchTerm || undefined });
  }, [debouncedSearchTerm, updateURLParams]);

  const setSortBy = useCallback((sort: SortOption) => {
    setSortByState(sort);
    updateURLParams({ 
      sortField: sort.field, 
      sortDirection: sort.direction 
    });
  }, [updateURLParams]);

  const setGroupBy = useCallback((group: string) => {
    setGroupByState(group);
    updateURLParams({ groupBy: group === 'none' ? undefined : group });
  }, [updateURLParams]);

  const setFilters = useCallback((newFilters: FilterOptions) => {
    setFiltersState(newFilters);
    const defaultFilters = getDefaultFilters();
    
    const params: Record<string, string | string[] | undefined> = {
      set: newFilters.sets.length > 0 && JSON.stringify(newFilters.sets) !== JSON.stringify(defaultFilters.sets) ? newFilters.sets : undefined,
      color: newFilters.colors.length > 0 && JSON.stringify(newFilters.colors) !== JSON.stringify(defaultFilters.colors) ? newFilters.colors : undefined,
      rarity: newFilters.rarities.length > 0 && JSON.stringify(newFilters.rarities) !== JSON.stringify(defaultFilters.rarities) ? newFilters.rarities : undefined,
      type: newFilters.types.length > 0 && JSON.stringify(newFilters.types) !== JSON.stringify(defaultFilters.types) ? newFilters.types : undefined,
      collection: newFilters.collectionFilter !== defaultFilters.collectionFilter ? newFilters.collectionFilter : undefined,
      inkable: newFilters.inkwellOnly !== defaultFilters.inkwellOnly ? String(newFilters.inkwellOnly) : undefined,
      minCost: newFilters.costMin !== defaultFilters.costMin ? String(newFilters.costMin) : undefined,
      maxCost: newFilters.costMax !== defaultFilters.costMax ? String(newFilters.costMax) : undefined,
    };
    
    updateURLParams(params);
  }, [updateURLParams]);

  const clearAllFilters = useCallback(() => {
    setFilters(getDefaultFilters());
    setSearchTerm('');
  }, [setFilters, setSearchTerm]);

  // ================================
  // 7. STALE CARD BUSINESS LOGIC
  // ================================  
  const handleCardQuantityChange = useCallback((
    card: LorcanaCard, 
    normalChange: number,
    foilChange: number
  ) => {
    // Apply the change using the card ID system
    if (normalChange !== 0 || foilChange !== 0) {
      if (normalChange + foilChange > 0) {
        addCardToCollection(card.id, Math.max(0, normalChange), Math.max(0, foilChange));
      } else {
        removeCardFromCollection(card.id, Math.max(0, -normalChange), Math.max(0, -foilChange));
      }
    }
    
    // Check if this card would now be filtered out due to collection filters
    if (filters.collectionFilter !== 'all') {
      console.log('Checking if card would be filtered out...', {
        cardName: card.name,
        filter: filters.collectionFilter,
        normalChange,
        foilChange
      });
      
      // Get current quantities for this specific card ID before the change to predict future state
      const currentQuantities = getCardQuantity(card.id);
      const currentTotalOwned = currentQuantities.total;
      
      // Predict what the state will be after this change
      const predictedTotalOwned = currentTotalOwned + normalChange + foilChange;
      const willBeInCollection = predictedTotalOwned > 0;
      
      // Check if card would be filtered out after the change
      const wouldBeFilteredOut = (
        (filters.collectionFilter === 'owned' && !willBeInCollection) ||  // Filter wants "in collection" but card will not be in collection
        (filters.collectionFilter === 'not-owned' && willBeInCollection)     // Filter wants "not in collection" but card will be in collection
      );
      
      console.log('Stale card prediction:', {
        cardName: card.name,
        currentTotalOwned,
        normalChange,
        foilChange,
        predictedTotalOwned,
        willBeInCollection,
        filterWantsInCollection: filters.collectionFilter,
        wouldBeFilteredOut,
        currentStaleIds: Array.from(staleCardIds)
      });
      
      if (wouldBeFilteredOut && !staleCardIds.has(card.id)) {
        console.log('Adding card to stale list:', card.name);
        setStaleCardIds(prev => {
          const newSet = new Set(prev);
          newSet.add(card.id);
          return newSet;
        });
        setStaleCardCount(prev => prev + 1);
        setShowFilterNotification(true);
      }
    }
  }, [filters.collectionFilter, staleCardIds, addCardToCollection, removeCardFromCollection, getCardQuantity]);

  const refreshStaleCards = useCallback(() => {
    setStaleCardIds(new Set());
    setShowFilterNotification(false);
    setStaleCardCount(0);
  }, []);

  const dismissFilterNotification = useCallback(() => {
    setShowFilterNotification(false);
  }, []);

  // ================================
  // 8. EFFECTS
  // ================================
  // Clear stale cards when filters change (user is intentionally refreshing)
  useEffect(() => {
    setStaleCardIds(new Set());
    setShowFilterNotification(false);
    setStaleCardCount(0);
  }, [filters, debouncedSearchTerm, sortBy, groupBy]);

  // ================================
  // 9. RETURN INTERFACE
  // ================================
  return {
    // State
    searchTerm,
    filters,
    sortBy,
    groupBy,
    viewMode,
    showFilters,
    staleCardIds,
    showFilterNotification,
    staleCardCount,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSortBy,
    setGroupBy,
    setViewMode,
    setShowFilters,
    clearAllFilters,
    handleCardQuantityChange,
    refreshStaleCards,
    dismissFilterNotification,
    
    // Computed
    sortedCards,
    groupedCards,
    totalCards,
    activeFiltersCount,
    paginatedCards,
    pagination
  };
};
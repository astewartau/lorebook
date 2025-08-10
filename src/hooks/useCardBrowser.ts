import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterOptions, SortOption, ConsolidatedCard } from '../types';
import { consolidatedCards } from '../data/allCards';
import { useCollection } from '../contexts/CollectionContext';
import { usePagination } from './usePagination';
import { filterCards, sortCards, groupCards, countActiveFilters } from '../utils/cardFiltering';
import { getDefaultFilters, parseURLState } from '../utils/filterDefaults';

export const useCardBrowser = () => {
  // ================================
  // 1. EXTERNAL DEPENDENCIES
  // ================================
  const { getVariantQuantities, addVariantToCollection, removeVariantFromCollection } = useCollection();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ================================
  // 2. STATE INITIALIZATION & URL SYNC
  // ================================
  const urlState = parseURLState(searchParams);
  const [searchTerm, setSearchTermState] = useState(urlState.searchTerm);
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
  // 4. COMPUTED VALUES & EFFECTS
  // ================================
  const cardsPerPage = 100;

  const { sortedCards, groupedCards, totalCards, activeFiltersCount } = useMemo(() => {
    const filtered = filterCards(consolidatedCards, searchTerm, filters, staleCardIds, getVariantQuantities);
    const sorted = sortCards(filtered, sortBy);
    const grouped = groupCards(sorted, groupBy);
    const activeCount = countActiveFilters(filters);
    
    return {
      sortedCards: sorted,
      groupedCards: grouped,
      totalCards: sorted.length,
      activeFiltersCount: activeCount
    };
  }, [searchTerm, filters, sortBy, groupBy, getVariantQuantities, staleCardIds]);
  
  const pagination = usePagination({
    totalItems: totalCards,
    itemsPerPage: cardsPerPage,
    resetTriggers: [searchTerm, filters, sortBy, groupBy]
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
    updateURLParams({ search: term || undefined });
  }, [updateURLParams]);

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
  const handleVariantQuantityChange = useCallback((
    consolidatedCard: ConsolidatedCard, 
    variantType: 'regular' | 'foil' | 'enchanted' | 'special', 
    change: number
  ) => {
    // Apply the change
    if (change > 0) {
      addVariantToCollection(consolidatedCard, variantType, change);
    } else {
      removeVariantFromCollection(consolidatedCard.fullName, variantType, Math.abs(change));
    }
    
    // Check if this card would now be filtered out due to collection filters
    if (filters.collectionFilter !== 'all') {
      console.log('Checking if card would be filtered out...', {
        cardName: consolidatedCard.baseCard.name,
        filter: filters.collectionFilter,
        change
      });
      
      // Get current quantities before the change to predict future state
      const currentQuantities = getVariantQuantities(consolidatedCard.fullName);
      const currentTotalOwned = currentQuantities.regular + currentQuantities.foil + currentQuantities.enchanted + currentQuantities.special;
      
      // Predict what the state will be after this change
      const predictedTotalOwned = currentTotalOwned + change;
      const willBeInCollection = predictedTotalOwned > 0;
      
      // Check if card would be filtered out after the change
      const wouldBeFilteredOut = (
        (filters.collectionFilter === 'owned' && !willBeInCollection) ||  // Filter wants "in collection" but card will not be in collection
        (filters.collectionFilter === 'not-owned' && willBeInCollection)     // Filter wants "not in collection" but card will be in collection
      );
      
      console.log('Stale card prediction:', {
        cardName: consolidatedCard.baseCard.name,
        currentTotalOwned,
        change,
        predictedTotalOwned,
        willBeInCollection,
        filterWantsInCollection: filters.collectionFilter,
        wouldBeFilteredOut,
        currentStaleIds: Array.from(staleCardIds)
      });
      
      if (wouldBeFilteredOut && !staleCardIds.has(consolidatedCard.baseCard.id)) {
        console.log('Adding card to stale list:', consolidatedCard.baseCard.name);
        setStaleCardIds(prev => {
          const newSet = new Set(prev);
          newSet.add(consolidatedCard.baseCard.id);
          return newSet;
        });
        setStaleCardCount(prev => prev + 1);
        setShowFilterNotification(true);
      }
    }
  }, [filters.collectionFilter, getVariantQuantities, staleCardIds, addVariantToCollection, removeVariantFromCollection]);

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
  }, [filters, searchTerm, sortBy, groupBy]);

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
    handleVariantQuantityChange,
    refreshStaleCards,
    dismissFilterNotification,
    
    // Collection functions (needed by child components)
    getVariantQuantities,
    
    // Computed
    sortedCards,
    groupedCards,
    totalCards,
    activeFiltersCount,
    paginatedCards,
    pagination
  };
};
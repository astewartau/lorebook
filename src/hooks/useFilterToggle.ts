import { useCallback } from 'react';
import { FilterOptions } from '../types';

// Define the high costs array as a constant
const HIGH_COSTS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const useFilterToggle = (
  filters: FilterOptions,
  setFilters: (filters: FilterOptions) => void
) => {
  const toggleColorFilter = useCallback((color: string) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color];
    setFilters({ ...filters, colors: newColors });
  }, [filters, setFilters]);

  const toggleCostFilter = useCallback((cost: number) => {
    if (cost === 7) {
      // Handle 7+ costs (7, 8, 9, 10+)
      const hasAnyHighCost = HIGH_COSTS.some(c => filters.costs.includes(c));
      
      if (hasAnyHighCost) {
        // Remove all high costs
        const newCosts = filters.costs.filter(c => !HIGH_COSTS.includes(c));
        setFilters({ ...filters, costs: newCosts });
      } else {
        // Add all high costs
        const newCosts = [...filters.costs, ...HIGH_COSTS.filter(c => !filters.costs.includes(c))];
        setFilters({ ...filters, costs: newCosts });
      }
    } else {
      const newCosts = filters.costs.includes(cost)
        ? filters.costs.filter(c => c !== cost)
        : [...filters.costs, cost];
      setFilters({ ...filters, costs: newCosts });
    }
  }, [filters, setFilters]);

  const toggleRarityFilter = useCallback((rarity: string) => {
    const newRarities = filters.rarities.includes(rarity)
      ? filters.rarities.filter(r => r !== rarity)
      : [...filters.rarities, rarity];
    setFilters({ ...filters, rarities: newRarities });
  }, [filters, setFilters]);

  const toggleInkwellFilter = useCallback((inkwellOnly: boolean) => {
    const newInkwellOnly = filters.inkwellOnly === inkwellOnly ? null : inkwellOnly;
    setFilters({ ...filters, inkwellOnly: newInkwellOnly });
  }, [filters, setFilters]);

  const isCostSelected = useCallback((cost: number): boolean => {
    if (cost === 7) {
      return HIGH_COSTS.some(c => filters.costs.includes(c));
    }
    return filters.costs.includes(cost);
  }, [filters.costs]);

  return {
    toggleColorFilter,
    toggleCostFilter,
    toggleRarityFilter,
    toggleInkwellFilter,
    isCostSelected,
    HIGH_COSTS
  };
};
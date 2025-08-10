// Filter constants
export const INK_COLORS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'] as const;
export const INK_COSTS = [1, 2, 3, 4, 5, 6, 7] as const;
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Enchanted', 'Special'] as const;

// Helper function to toggle array values
export const toggleArrayValue = <T>(array: T[], value: T): T[] => {
  return array.includes(value)
    ? array.filter(item => item !== value)
    : [...array, value];
};

// Helper function to check if a filter is active
export const isFilterActive = <T>(filterArray: T[], value: T): boolean => {
  return filterArray.includes(value);
};
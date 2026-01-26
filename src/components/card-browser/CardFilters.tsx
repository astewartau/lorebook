import React from 'react';
import { RotateCcw } from 'lucide-react';
import FilterPanel from '../shared/FilterPanel';
import { FilterOptions } from '../../types';
import { RARITY_ICONS, COLOR_ICONS } from '../../constants/icons';
import { ContextualFilterOptions } from '../../utils/cardFiltering';

interface CardFiltersProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  activeFiltersCount: number;
  clearAllFilters: () => void;
  contextualOptions?: ContextualFilterOptions;
}

const CardFilters: React.FC<CardFiltersProps> = ({
  showFilters,
  setShowFilters,
  filters,
  setFilters,
  activeFiltersCount,
  clearAllFilters,
  contextualOptions,
}) => {
  if (!showFilters) return null;

  return (
    <>
      {/* Backdrop - lighter on desktop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 lg:bg-opacity-20 z-40"
        onClick={() => setShowFilters(false)}
      />
      
      {/* Sidebar - True overlay for both mobile and desktop */}
      <div className={`
        fixed top-0 left-0 z-50
        w-80 sm:w-96 lg:w-80 xl:w-96
        h-screen
        bg-white border-r-2 border-lorcana-gold shadow-2xl
        overflow-y-auto
        transform transition-transform duration-300
        ${showFilters ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="sticky top-0 bg-white border-b-2 border-lorcana-gold p-4 lg:p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-lorcana-ink">Filters</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAllFilters}
                disabled={activeFiltersCount === 0}
                className={`flex items-center space-x-1 px-3 py-1 text-sm border-2 border-lorcana-gold rounded-sm transition-colors ${
                  activeFiltersCount > 0
                    ? 'text-lorcana-ink hover:text-lorcana-navy hover:bg-lorcana-cream cursor-pointer'
                    : 'text-gray-400 border-gray-300 cursor-not-allowed'
                }`}
              >
                <RotateCcw size={14} />
                <span>Clear All</span>
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="text-lorcana-navy hover:text-lorcana-ink transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 lg:p-6">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            activeFiltersCount={activeFiltersCount}
            onClearAllFilters={clearAllFilters}
            onClose={() => setShowFilters(false)}
            rarityIconMap={RARITY_ICONS}
            colorIconMap={COLOR_ICONS}
            showCollectionFilters={true}
            contextualOptions={contextualOptions}
          />
        </div>
      </div>
    </>
  );
};

export default CardFilters;
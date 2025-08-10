import React from 'react';
import { FilterOptions } from '../types';
import CustomDropdown from './CustomDropdown';
import { useFilterToggle } from '../hooks/useFilterToggle';
import { INK_COLORS, INK_COSTS, RARITIES } from '../utils/filterHelpers';

interface QuickFiltersProps {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  colorIconMap: Record<string, string>;
  rarityIconMap: Record<string, string>;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  setFilters,
  colorIconMap,
  rarityIconMap
}) => {
  const {
    toggleColorFilter,
    toggleCostFilter,
    toggleRarityFilter,
    toggleInkwellFilter,
    isCostSelected
  } = useFilterToggle(filters, setFilters);

  return (
    <div className="bg-lorcana-navy border-2 border-lorcana-gold border-t-0 rounded-b-sm shadow-xl p-3 mb-6 relative">
      {/* Subtle inner glow for connection */}
      <div className="absolute inset-0 bg-gradient-to-b from-lorcana-gold/10 via-transparent to-transparent rounded-b-sm pointer-events-none"></div>
      <div className="relative z-10">
      <div className="flex flex-wrap items-center gap-2">
        {/* Color match mode dropdown */}
        <CustomDropdown
          value={filters.colorMatchMode}
          onChange={(value) => setFilters({...filters, colorMatchMode: value as 'any' | 'only' | 'dual-only'})}
          options={[
            { value: 'any', label: 'Match any' },
            { value: 'only', label: 'Only chosen' },
            { value: 'dual-only', label: 'Dual-inks only' }
          ]}
          compact={true}
        />

        {/* Divider */}
        <div className="h-8 w-px bg-lorcana-gold"></div>

        {/* Ink Colors */}
        <div className="flex gap-1">
          {INK_COLORS.map(color => (
            <button
              key={color}
              onClick={() => toggleColorFilter(color)}
              className={`p-1 rounded-sm transition-all hover:scale-110 ${
                filters.colors.includes(color)
                  ? 'bg-lorcana-purple-light shadow-lg'
                  : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
              }`}
              title={color}
            >
              <img
                src={colorIconMap[color]}
                alt={color}
                className="w-6 h-6"
              />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-lorcana-gold"></div>

        {/* Ink Costs */}
        <div className="flex gap-1">
          {INK_COSTS.map(cost => {
            const isSelected = isCostSelected(cost);
            
            return (
              <button
                key={cost}
                onClick={() => toggleCostFilter(cost)}
                className={`relative p-1 rounded-sm transition-all hover:scale-110 ${
                  isSelected
                    ? 'bg-lorcana-purple-light shadow-lg'
                    : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
                }`}
                title={`Cost ${cost}${cost === 7 ? '+' : ''}`}
              >
                <img
                  src="/imgs/uninkable.png"
                  alt="Ink Cost"
                  className="w-6 h-6"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {cost === 7 ? '7+' : cost}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-lorcana-gold"></div>

        {/* Inkwell */}
        <div className="flex gap-1">
          <button
            onClick={() => toggleInkwellFilter(true)}
            className={`p-1 rounded-sm transition-all hover:scale-110 ${
              filters.inkwellOnly === true
                ? 'bg-lorcana-purple-light shadow-lg'
                : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
            }`}
            title="Inkable"
          >
            <img
              src="/imgs/inkable.png"
              alt="Inkable"
              className="w-6 h-6"
            />
          </button>
          <button
            onClick={() => toggleInkwellFilter(false)}
            className={`p-1 rounded-sm transition-all hover:scale-110 ${
              filters.inkwellOnly === false
                ? 'bg-lorcana-purple-light shadow-lg'
                : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
            }`}
            title="Uninkable"
          >
            <img
              src="/imgs/uninkable.png"
              alt="Uninkable"
              className="w-6 h-6"
            />
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-lorcana-gold"></div>

        {/* Rarities */}
        <div className="flex gap-1">
          {RARITIES.map(rarity => (
            <button
              key={rarity}
              onClick={() => toggleRarityFilter(rarity)}
              className={`p-1 rounded-sm transition-all hover:scale-110 ${
                filters.rarities.includes(rarity)
                  ? 'bg-lorcana-purple-light shadow-lg'
                  : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
              }`}
              title={rarity}
            >
              <img
                src={rarityIconMap[rarity]}
                alt={rarity}
                className="w-6 h-6"
              />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-lorcana-gold"></div>

        {/* My Collection */}
        <CustomDropdown
          value={filters.collectionFilter}
          onChange={(value) => setFilters({...filters, collectionFilter: value as 'all' | 'owned' | 'not-owned'})}
          options={[
            { value: 'all', label: 'Ignore collection' },
            { value: 'owned', label: 'In collection' },
            { value: 'not-owned', label: 'Not in collection' }
          ]}
          compact={true}
        />
      </div>
      </div>
    </div>
  );
};

export default QuickFilters;
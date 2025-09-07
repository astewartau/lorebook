import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FilterOptions } from '../../types';
import { cardTypes, stories, subtypes, sets, strengthRange, willpowerRange, loreRange } from '../../data/allCards';
import MultiSelectFilter from '../MultiSelectFilter';
import RangeFilter from '../RangeFilter';
import { CollectionFilter } from '../filters';
import { RARITY_ICONS, COLOR_ICONS } from '../../constants/icons';
import { useFilterToggle } from '../../hooks/useFilterToggle';
import { INK_COLORS, INK_COSTS, RARITIES } from '../../utils/filterHelpers';

interface FilterPanelProps {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  activeFiltersCount: number;
  onClearAllFilters: () => void;
  onClose: () => void;
  rarityIconMap?: Record<string, string>;
  colorIconMap?: Record<string, string>;
  showCollectionFilters?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFilters,
  activeFiltersCount,
  onClearAllFilters,
  onClose,
  rarityIconMap = RARITY_ICONS,
  colorIconMap = COLOR_ICONS,
  showCollectionFilters = true
}) => {
  const [illumineerQuestExpanded, setIllumineerQuestExpanded] = useState(false);
  const {
    toggleColorFilter,
    toggleCostFilter,
    toggleRarityFilter,
    toggleInkwellFilter,
    isCostSelected
  } = useFilterToggle(filters, setFilters);
  
  return (
    <div className="space-y-4">
      {/* Quick Icon Filters Section */}
      <div className="space-y-3 p-3 bg-lorcana-navy rounded-sm border border-lorcana-gold">
        {/* Color Match Mode Dropdown */}
        <div>
          <select
            value={filters.colorMatchMode}
            onChange={(e) => setFilters({...filters, colorMatchMode: e.target.value as 'any' | 'only' | 'dual-only'})}
            className="w-full text-xs px-2 py-1 border-2 border-lorcana-gold rounded-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white"
          >
            <option value="any">Match any with colours</option>
            <option value="only">Show only chosen colours</option>
            <option value="dual-only">Show only chosen dual-inks</option>
          </select>
        </div>
        
        {/* Ink Colors Row */}
        <div className="flex gap-1">
          {INK_COLORS.map(color => (
            <button
              key={color}
              onClick={() => toggleColorFilter(color)}
              className={`flex-1 p-1 rounded-sm transition-all hover:scale-110 flex items-center justify-center ${
                filters.colors.includes(color)
                  ? 'bg-lorcana-purple-light shadow-lg'
                  : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
              }`}
              title={color}
            >
              <img
                src={colorIconMap[color]}
                alt={color}
                className="w-full h-auto max-w-8 max-h-8"
              />
            </button>
          ))}
        </div>
        
        {/* Rarities Row */}
        <div className="flex gap-1">
          {RARITIES.map(rarity => (
            <button
              key={rarity}
              onClick={() => toggleRarityFilter(rarity)}
              className={`flex-1 p-1 rounded-sm transition-all hover:scale-110 flex items-center justify-center ${
                filters.rarities.includes(rarity)
                  ? 'bg-lorcana-purple-light shadow-lg'
                  : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
              }`}
              title={rarity}
            >
              <img
                src={rarityIconMap[rarity]}
                alt={rarity}
                className="w-full h-auto max-w-8 max-h-8"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs font-bold text-lorcana-gold flex items-center justify-center w-8 h-8">
                {rarity.substring(0, 2).toUpperCase()}
              </span>
            </button>
          ))}
        </div>
        
        {/* Ink Costs Row */}
        <div className="flex gap-1">
          {INK_COSTS.map(cost => {
            const isSelected = isCostSelected(cost);
            
            return (
              <button
                key={cost}
                onClick={() => toggleCostFilter(cost)}
                className={`flex-1 p-1 rounded-sm transition-all hover:scale-110 flex items-center justify-center relative ${
                  isSelected
                    ? 'bg-lorcana-purple-light shadow-lg'
                    : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
                }`}
                title={`Cost ${cost}${cost === 7 ? '+' : ''}`}
              >
                <img
                  src="/imgs/uninkable.png"
                  alt="Ink Cost"
                  className="w-full h-auto max-w-8 max-h-8"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {cost === 7 ? '7+' : cost}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Inkwell Row */}
        <div className="flex gap-1">
          <button
            onClick={() => toggleInkwellFilter(true)}
            className={`flex-1 p-1 rounded-sm transition-all hover:scale-110 flex items-center justify-center ${
              filters.inkwellOnly === true
                ? 'bg-lorcana-purple-light shadow-lg'
                : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
            }`}
            title="Inkable"
          >
            <img
              src="/imgs/inkable.png"
              alt="Inkable"
              className="w-full h-auto max-w-8 max-h-8"
            />
          </button>
          <button
            onClick={() => toggleInkwellFilter(false)}
            className={`flex-1 p-1 rounded-sm transition-all hover:scale-110 flex items-center justify-center ${
              filters.inkwellOnly === false
                ? 'bg-lorcana-purple-light shadow-lg'
                : 'bg-transparent hover:bg-lorcana-purple/70 hover:shadow-md'
            }`}
            title="Uninkable"
          >
            <img
              src="/imgs/uninkable.png"
              alt="Uninkable"
              className="w-full h-auto max-w-8 max-h-8"
            />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <MultiSelectFilter
          title="Set"
          options={sets.map(s => s.name)}
          selectedValues={filters.sets.map(setCode => sets.find(s => s.code === setCode)?.name || setCode)}
          onChange={(values) => {
            const setCodes = (values as string[]).map(name => sets.find(s => s.name === name)?.code || name);
            setFilters({...filters, sets: setCodes});
          }}
          defaultCollapsed={true}
        />
        
        {showCollectionFilters && (
          <CollectionFilter
            collectionFilter={filters.collectionFilter}
            cardCountOperator={filters.cardCountOperator}
            cardCountValue={filters.cardCountValue}
            onChange={(collectionFilter, cardCountOperator, cardCountValue) => 
              setFilters({...filters, collectionFilter, cardCountOperator, cardCountValue})
            }
            defaultCollapsed={true}
          />
        )}
        
        <MultiSelectFilter
          title="Type"
          options={cardTypes}
          selectedValues={filters.types}
          onChange={(values) => setFilters({...filters, types: values as string[]})}
          defaultCollapsed={true}
        />
        
        <MultiSelectFilter
          title="Franchise"
          options={stories}
          selectedValues={filters.stories}
          onChange={(values) => setFilters({...filters, stories: values as string[]})}
          maxHeight="max-h-64"
          defaultCollapsed={true}
        />
        
        <MultiSelectFilter
          title="Subtype"
          options={subtypes}
          selectedValues={filters.subtypes}
          onChange={(values) => setFilters({...filters, subtypes: values as string[]})}
          maxHeight="max-h-64"
          defaultCollapsed={true}
        />
        
        <RangeFilter
          title="Strength"
          min={strengthRange.min}
          max={strengthRange.max}
          selectedMin={filters.strengthMin}
          selectedMax={filters.strengthMax}
          onChange={(min, max) => setFilters({...filters, strengthMin: min, strengthMax: max})}
          defaultCollapsed={true}
        />

        <RangeFilter
          title="Willpower"
          min={willpowerRange.min}
          max={willpowerRange.max}
          selectedMin={filters.willpowerMin}
          selectedMax={filters.willpowerMax}
          onChange={(min, max) => setFilters({...filters, willpowerMin: min, willpowerMax: max})}
          defaultCollapsed={true}
        />
        
        <RangeFilter
          title="Lore"
          min={loreRange.min}
          max={loreRange.max}
          selectedMin={filters.loreMin}
          selectedMax={filters.loreMax}
          onChange={(min, max) => setFilters({...filters, loreMin: min, loreMax: max})}
          defaultCollapsed={true}
        />
        
        <div className="border-2 border-lorcana-gold rounded-sm bg-white shadow-sm">
          <button
            onClick={() => setIllumineerQuestExpanded(!illumineerQuestExpanded)}
            className="flex justify-between items-center w-full p-3 hover:bg-lorcana-cream transition-colors"
          >
            <h3 className="font-medium text-lorcana-ink">Illumineer's Quest</h3>
            {illumineerQuestExpanded ? (
              <ChevronUp size={16} className="text-lorcana-ink" />
            ) : (
              <ChevronDown size={16} className="text-lorcana-ink" />
            )}
          </button>
          {illumineerQuestExpanded && (
            <div className="border-t border-lorcana-gold p-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeIllumineerQuest}
                  onChange={(e) => setFilters({...filters, includeIllumineerQuest: e.target.checked})}
                  className="rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold"
                />
                <span className="text-sm text-lorcana-ink">Include Illumineer's Quest cards</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
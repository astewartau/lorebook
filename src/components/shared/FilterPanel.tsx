import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Sparkles, BookOpen } from 'lucide-react';
import { FilterOptions } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { useFilterToggle } from '../../hooks/useFilterToggle';
import { INK_COLORS, INK_COSTS, RARITIES } from '../../utils/filterHelpers';
import CustomDropdown from '../CustomDropdown';

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

// Reusable collapsible section component
interface FilterSectionProps {
  title: string;
  activeCount?: number;
  onClear?: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  activeCount = 0,
  onClear,
  defaultExpanded = true,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-lorcana-gold/40 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-lorcana-cream/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-lorcana-ink text-sm">{title}</span>
          {activeCount > 0 && (
            <span className="bg-lorcana-gold text-lorcana-ink text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && onClear && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-lorcana-navy hover:text-lorcana-ink transition-colors p-1"
              title="Clear"
            >
              <X size={14} />
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={16} className="text-lorcana-navy" />
          ) : (
            <ChevronDown size={16} className="text-lorcana-navy" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

// Icon button for ink colors and similar visual filters
interface IconToggleProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
}

const IconToggle: React.FC<IconToggleProps> = ({ icon, label, isActive, onClick, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const imgSizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses} rounded-lg flex items-center justify-center transition-all
        ${isActive
          ? 'bg-lorcana-navy ring-2 ring-lorcana-gold shadow-md scale-105'
          : 'bg-lorcana-cream hover:bg-lorcana-gold/30 border border-lorcana-gold/50'
        }
      `}
      title={label}
    >
      <img src={icon} alt={label} className={imgSizeClasses} />
    </button>
  );
};

// Checkbox option component
interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: string;
}

const CheckboxOption: React.FC<CheckboxOptionProps> = ({ label, checked, onChange, icon }) => (
  <label className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-lorcana-cream/50 cursor-pointer transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold focus:ring-offset-0"
    />
    {icon && <img src={icon} alt="" className="w-4 h-4" />}
    <span className="text-sm text-lorcana-ink">{label}</span>
  </label>
);

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  setFilters,
  showCollectionFilters = true,
  colorIconMap = {},
  rarityIconMap = {}
}) => {
  const {
    sets,
    cardTypes,
    stories,
    subtypes,
    strengthRange,
    willpowerRange,
    loreRange
  } = useCardData();

  const {
    toggleColorFilter,
    toggleCostFilter,
    toggleRarityFilter,
    isCostSelected,
    HIGH_COSTS
  } = useFilterToggle(filters, setFilters);

  // Helper to update filters
  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters({ ...filters, [key]: value });
  };

  // Toggle array value helper
  const toggleArrayValue = <T,>(array: T[], value: T): T[] => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  return (
    <div className="space-y-1">
      {/* Ink Colors Section */}
      <FilterSection
        title="Ink Color"
        activeCount={filters.colors.length}
        onClear={() => updateFilter('colors', [])}
        defaultExpanded={true}
      >
        <div className="space-y-3">
          {/* Color Match Mode */}
          <div className="mb-3">
            <CustomDropdown
              value={filters.colorMatchMode}
              onChange={(value) => updateFilter('colorMatchMode', value as 'any' | 'only' | 'dual-only')}
              options={[
                { value: 'any', label: 'Match any selected' },
                { value: 'only', label: 'Exactly selected only' },
                { value: 'dual-only', label: 'Dual-ink cards only' }
              ]}
            />
          </div>

          {/* Color Icons */}
          <div className="flex flex-wrap gap-2">
            {INK_COLORS.map(color => (
              <IconToggle
                key={color}
                icon={colorIconMap[color] || `/imgs/${color.toLowerCase()}.svg`}
                label={color}
                isActive={filters.colors.includes(color)}
                onClick={() => toggleColorFilter(color)}
              />
            ))}
          </div>
        </div>
      </FilterSection>

      {/* Ink Cost Section */}
      <FilterSection
        title="Ink Cost"
        activeCount={filters.costs.length > 0 ? (HIGH_COSTS.some(c => filters.costs.includes(c)) ? filters.costs.filter(c => c <= 6).length + 1 : filters.costs.length) : 0}
        onClear={() => updateFilter('costs', [])}
        defaultExpanded={true}
      >
        <div className="flex flex-wrap gap-2">
          {INK_COSTS.map(cost => {
            const isSelected = isCostSelected(cost);
            return (
              <button
                key={cost}
                onClick={() => toggleCostFilter(cost)}
                className={`
                  relative w-9 h-9 rounded-lg flex items-center justify-center transition-all
                  ${isSelected
                    ? 'bg-lorcana-navy ring-2 ring-lorcana-gold shadow-md scale-105'
                    : 'bg-lorcana-cream hover:bg-lorcana-gold/30 border border-lorcana-gold/50'
                  }
                `}
                title={`Cost ${cost}${cost === 7 ? '+' : ''}`}
              >
                <img src="/imgs/uninkable.png" alt="" className="w-6 h-6 opacity-80" />
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isSelected ? 'text-lorcana-gold' : 'text-lorcana-ink'}`}>
                  {cost === 7 ? '7+' : cost}
                </span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Rarity Section */}
      <FilterSection
        title="Rarity"
        activeCount={filters.rarities.length}
        onClear={() => updateFilter('rarities', [])}
        defaultExpanded={true}
      >
        <div className="flex flex-wrap gap-2">
          {RARITIES.map(rarity => (
            <IconToggle
              key={rarity}
              icon={rarityIconMap[rarity] || `/imgs/${rarity.toLowerCase().replace(' ', '_')}.svg`}
              label={rarity}
              isActive={filters.rarities.includes(rarity)}
              onClick={() => toggleRarityFilter(rarity)}
              size="sm"
            />
          ))}
        </div>
      </FilterSection>

      {/* Inkwell Section */}
      <FilterSection
        title="Inkwell"
        activeCount={filters.inkwellOnly !== null ? 1 : 0}
        onClear={() => updateFilter('inkwellOnly', null)}
        defaultExpanded={false}
      >
        <div className="flex gap-2">
          <button
            onClick={() => updateFilter('inkwellOnly', filters.inkwellOnly === true ? null : true)}
            className={`
              flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium
              ${filters.inkwellOnly === true
                ? 'bg-lorcana-navy text-lorcana-gold ring-2 ring-lorcana-gold'
                : 'bg-lorcana-cream hover:bg-lorcana-gold/30 text-lorcana-ink border border-lorcana-gold/50'
              }
            `}
          >
            <img src="/imgs/inkable.png" alt="" className="w-5 h-5" />
            Inkable
          </button>
          <button
            onClick={() => updateFilter('inkwellOnly', filters.inkwellOnly === false ? null : false)}
            className={`
              flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium
              ${filters.inkwellOnly === false
                ? 'bg-lorcana-navy text-lorcana-gold ring-2 ring-lorcana-gold'
                : 'bg-lorcana-cream hover:bg-lorcana-gold/30 text-lorcana-ink border border-lorcana-gold/50'
              }
            `}
          >
            <img src="/imgs/uninkable.png" alt="" className="w-5 h-5" />
            Uninkable
          </button>
        </div>
      </FilterSection>

      {/* Card Type Section */}
      <FilterSection
        title="Card Type"
        activeCount={filters.types.length}
        onClear={() => updateFilter('types', [])}
        defaultExpanded={false}
      >
        <div className="grid grid-cols-2 gap-1">
          {cardTypes.map(type => (
            <CheckboxOption
              key={type}
              label={type}
              checked={filters.types.includes(type)}
              onChange={() => updateFilter('types', toggleArrayValue(filters.types, type))}
            />
          ))}
        </div>
      </FilterSection>

      {/* Set Section */}
      <FilterSection
        title="Set"
        activeCount={filters.sets.length}
        onClear={() => updateFilter('sets', [])}
        defaultExpanded={false}
      >
        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
          {sets.map(set => (
            <CheckboxOption
              key={set.code}
              label={set.name}
              checked={filters.sets.includes(set.code)}
              onChange={() => updateFilter('sets', toggleArrayValue(filters.sets, set.code))}
            />
          ))}
        </div>
      </FilterSection>

      {/* Franchise (Story) Section */}
      <FilterSection
        title="Franchise"
        activeCount={filters.stories.length}
        onClear={() => updateFilter('stories', [])}
        defaultExpanded={false}
      >
        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
          {stories.map(story => (
            <CheckboxOption
              key={story}
              label={story}
              checked={filters.stories.includes(story)}
              onChange={() => updateFilter('stories', toggleArrayValue(filters.stories, story))}
            />
          ))}
        </div>
      </FilterSection>

      {/* Subtype Section */}
      <FilterSection
        title="Subtype"
        activeCount={filters.subtypes.length}
        onClear={() => updateFilter('subtypes', [])}
        defaultExpanded={false}
      >
        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
          {subtypes.map(subtype => (
            <CheckboxOption
              key={subtype}
              label={subtype}
              checked={filters.subtypes.includes(subtype)}
              onChange={() => updateFilter('subtypes', toggleArrayValue(filters.subtypes, subtype))}
            />
          ))}
        </div>
      </FilterSection>

      {/* Character Stats Section */}
      <FilterSection
        title="Character Stats"
        activeCount={
          // Only count as active if data has loaded (range isn't 0-0) and filter differs from actual range
          (strengthRange.max > 0 && (filters.strengthMin !== strengthRange.min || filters.strengthMax !== strengthRange.max) ? 1 : 0) +
          (willpowerRange.max > 0 && (filters.willpowerMin !== willpowerRange.min || filters.willpowerMax !== willpowerRange.max) ? 1 : 0) +
          (loreRange.max > 0 && (filters.loreMin !== loreRange.min || filters.loreMax !== loreRange.max) ? 1 : 0)
        }
        onClear={() => setFilters({
          ...filters,
          strengthMin: strengthRange.min,
          strengthMax: strengthRange.max,
          willpowerMin: willpowerRange.min,
          willpowerMax: willpowerRange.max,
          loreMin: loreRange.min,
          loreMax: loreRange.max
        })}
        defaultExpanded={false}
      >
        <div className="space-y-4">
          {/* Strength */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-lorcana-ink">Strength</span>
              <span className="text-xs text-lorcana-navy">
                {filters.strengthMin} - {filters.strengthMax}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={strengthRange.min}
                max={strengthRange.max}
                value={filters.strengthMin}
                onChange={(e) => updateFilter('strengthMin', Math.max(strengthRange.min, Math.min(parseInt(e.target.value) || strengthRange.min, filters.strengthMax)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
              <div className="flex-1 h-1 bg-lorcana-cream rounded-full relative">
                <div
                  className="absolute h-full bg-lorcana-gold rounded-full"
                  style={{
                    left: `${((filters.strengthMin - strengthRange.min) / (strengthRange.max - strengthRange.min)) * 100}%`,
                    right: `${100 - ((filters.strengthMax - strengthRange.min) / (strengthRange.max - strengthRange.min)) * 100}%`
                  }}
                />
              </div>
              <input
                type="number"
                min={strengthRange.min}
                max={strengthRange.max}
                value={filters.strengthMax}
                onChange={(e) => updateFilter('strengthMax', Math.min(strengthRange.max, Math.max(parseInt(e.target.value) || strengthRange.max, filters.strengthMin)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
            </div>
          </div>

          {/* Willpower */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-lorcana-ink">Willpower</span>
              <span className="text-xs text-lorcana-navy">
                {filters.willpowerMin} - {filters.willpowerMax}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={willpowerRange.min}
                max={willpowerRange.max}
                value={filters.willpowerMin}
                onChange={(e) => updateFilter('willpowerMin', Math.max(willpowerRange.min, Math.min(parseInt(e.target.value) || willpowerRange.min, filters.willpowerMax)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
              <div className="flex-1 h-1 bg-lorcana-cream rounded-full relative">
                <div
                  className="absolute h-full bg-lorcana-gold rounded-full"
                  style={{
                    left: `${((filters.willpowerMin - willpowerRange.min) / (willpowerRange.max - willpowerRange.min)) * 100}%`,
                    right: `${100 - ((filters.willpowerMax - willpowerRange.min) / (willpowerRange.max - willpowerRange.min)) * 100}%`
                  }}
                />
              </div>
              <input
                type="number"
                min={willpowerRange.min}
                max={willpowerRange.max}
                value={filters.willpowerMax}
                onChange={(e) => updateFilter('willpowerMax', Math.min(willpowerRange.max, Math.max(parseInt(e.target.value) || willpowerRange.max, filters.willpowerMin)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
            </div>
          </div>

          {/* Lore */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-lorcana-ink">Lore</span>
              <span className="text-xs text-lorcana-navy">
                {filters.loreMin} - {filters.loreMax}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={loreRange.min}
                max={loreRange.max}
                value={filters.loreMin}
                onChange={(e) => updateFilter('loreMin', Math.max(loreRange.min, Math.min(parseInt(e.target.value) || loreRange.min, filters.loreMax)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
              <div className="flex-1 h-1 bg-lorcana-cream rounded-full relative">
                <div
                  className="absolute h-full bg-lorcana-gold rounded-full"
                  style={{
                    left: `${((filters.loreMin - loreRange.min) / (loreRange.max - loreRange.min)) * 100}%`,
                    right: `${100 - ((filters.loreMax - loreRange.min) / (loreRange.max - loreRange.min)) * 100}%`
                  }}
                />
              </div>
              <input
                type="number"
                min={loreRange.min}
                max={loreRange.max}
                value={filters.loreMax}
                onChange={(e) => updateFilter('loreMax', Math.min(loreRange.max, Math.max(parseInt(e.target.value) || loreRange.max, filters.loreMin)))}
                className="w-16 px-2 py-1 text-sm border-2 border-lorcana-gold rounded-lg focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream text-center"
              />
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Special Cards Section */}
      <FilterSection
        title="Special Cards"
        activeCount={
          (filters.hasEnchanted !== null ? 1 : 0) +
          (filters.hasSpecial !== null ? 1 : 0) +
          (filters.includeIllumineerQuest ? 1 : 0)
        }
        onClear={() => setFilters({
          ...filters,
          hasEnchanted: null,
          hasSpecial: null,
          includeIllumineerQuest: false
        })}
        defaultExpanded={false}
      >
        <div className="space-y-2">
          {/* Enchanted Filter */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-lorcana-cream/50">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-sm text-lorcana-ink flex-1">Enchanted</span>
            <div className="flex gap-1">
              <button
                onClick={() => updateFilter('hasEnchanted', filters.hasEnchanted === true ? null : true)}
                className={`px-2 py-1 text-xs rounded ${filters.hasEnchanted === true ? 'bg-lorcana-navy text-lorcana-gold' : 'bg-white border border-lorcana-gold/50 text-lorcana-ink'}`}
              >
                Only
              </button>
              <button
                onClick={() => updateFilter('hasEnchanted', filters.hasEnchanted === false ? null : false)}
                className={`px-2 py-1 text-xs rounded ${filters.hasEnchanted === false ? 'bg-lorcana-navy text-lorcana-gold' : 'bg-white border border-lorcana-gold/50 text-lorcana-ink'}`}
              >
                Exclude
              </button>
            </div>
          </div>

          {/* Promo/Special Filter */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-lorcana-cream/50">
            <img src="/imgs/promo.png" alt="" className="w-4 h-4" />
            <span className="text-sm text-lorcana-ink flex-1">Promo/Special</span>
            <div className="flex gap-1">
              <button
                onClick={() => updateFilter('hasSpecial', filters.hasSpecial === true ? null : true)}
                className={`px-2 py-1 text-xs rounded ${filters.hasSpecial === true ? 'bg-lorcana-navy text-lorcana-gold' : 'bg-white border border-lorcana-gold/50 text-lorcana-ink'}`}
              >
                Only
              </button>
              <button
                onClick={() => updateFilter('hasSpecial', filters.hasSpecial === false ? null : false)}
                className={`px-2 py-1 text-xs rounded ${filters.hasSpecial === false ? 'bg-lorcana-navy text-lorcana-gold' : 'bg-white border border-lorcana-gold/50 text-lorcana-ink'}`}
              >
                Exclude
              </button>
            </div>
          </div>

          {/* Illumineer's Quest Toggle */}
          <label className="flex items-center gap-2 p-2 rounded-lg bg-lorcana-cream/50 cursor-pointer hover:bg-lorcana-cream transition-colors">
            <BookOpen size={16} className="text-amber-600" />
            <span className="text-sm text-lorcana-ink flex-1">Include Illumineer's Quest</span>
            <input
              type="checkbox"
              checked={filters.includeIllumineerQuest}
              onChange={(e) => updateFilter('includeIllumineerQuest', e.target.checked)}
              className="w-4 h-4 rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold focus:ring-offset-0"
            />
          </label>
        </div>
      </FilterSection>

      {/* Collection Section */}
      {showCollectionFilters && (
        <FilterSection
          title="Collection"
          activeCount={
            (filters.collectionFilter !== 'all' ? 1 : 0) +
            (filters.cardCountOperator !== null ? 1 : 0) +
            (filters.fadeOthers ? 1 : 0)
          }
          onClear={() => setFilters({
            ...filters,
            collectionFilter: 'all',
            cardCountOperator: null,
            cardCountValue: 1,
            fadeOthers: false
          })}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            {/* Collection Status */}
            <div>
              <label className="block text-xs font-medium text-lorcana-navy mb-1.5">Show cards</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'all' as const, label: 'All' },
                  { value: 'owned' as const, label: 'Owned' },
                  { value: 'not-owned' as const, label: 'Missing' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFilter('collectionFilter', option.value)}
                    className={`
                      py-1.5 px-2 text-xs font-medium rounded-lg transition-all
                      ${filters.collectionFilter === option.value
                        ? 'bg-lorcana-navy text-lorcana-gold'
                        : 'bg-lorcana-cream hover:bg-lorcana-gold/30 text-lorcana-ink border border-lorcana-gold/50'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Filter */}
            <div>
              <label className="block text-xs font-medium text-lorcana-navy mb-1.5">Quantity</label>
              <div className="flex items-center gap-2">
                <select
                  value={filters.cardCountOperator || ''}
                  onChange={(e) => updateFilter('cardCountOperator', e.target.value === '' ? null : e.target.value as 'eq' | 'gte' | 'lte')}
                  className="flex-1 text-sm px-2 py-1.5 border-2 border-lorcana-gold rounded-lg focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
                >
                  <option value="">Any quantity</option>
                  <option value="eq">Exactly</option>
                  <option value="gte">At least</option>
                  <option value="lte">At most</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={filters.cardCountValue}
                  onChange={(e) => updateFilter('cardCountValue', parseInt(e.target.value) || 0)}
                  disabled={filters.cardCountOperator === null}
                  className="w-16 text-sm px-2 py-1.5 border-2 border-lorcana-gold rounded-lg focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream disabled:bg-gray-100 disabled:text-gray-400 text-center"
                />
              </div>
            </div>

            {/* Fade Others Option */}
            <label className="flex items-center gap-2 p-2 rounded-lg bg-lorcana-cream/50 cursor-pointer hover:bg-lorcana-cream transition-colors">
              <input
                type="checkbox"
                checked={filters.fadeOthers}
                onChange={(e) => updateFilter('fadeOthers', e.target.checked)}
                className="w-4 h-4 rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold focus:ring-offset-0"
              />
              <div>
                <span className="text-sm text-lorcana-ink">Fade non-matching</span>
                <p className="text-xs text-lorcana-navy">Show filtered cards in greyscale instead of hiding</p>
              </div>
            </label>
          </div>
        </FilterSection>
      )}
    </div>
  );
};

export default FilterPanel;

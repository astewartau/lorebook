import React from 'react';
import { Grid, List, Filter, RotateCcw } from 'lucide-react';
import { SortOption, FilterOptions } from '../../types';
import CardViewControls from './CardViewControls';
import GitHubStyleSearch from '../GitHubStyleSearch';

interface CardSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  groupBy: string;
  setGroupBy: (group: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFiltersCount: number;
  showFilterNotification: boolean;
  refreshStaleCards: () => void;
}

const CardSearch: React.FC<CardSearchProps> = ({
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  viewMode,
  setViewMode,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  showFilterNotification,
  refreshStaleCards,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white border-2 border-lorcana-gold border-t-0 rounded-b-sm shadow-lg p-3 sm:p-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex gap-1 mb-3">
          <div className="flex-1 min-w-0">
            <GitHubStyleSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search cards..."
              className="text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 h-12 px-2 py-2 border-2 rounded-sm focus:ring-2 focus:ring-lorcana-gold flex items-center transition-colors ${
              activeFiltersCount > 0 ? 'bg-lorcana-gold border-lorcana-navy text-lorcana-ink' : 'border-lorcana-gold hover:bg-lorcana-cream'
            }`}
          >
            <Filter size={18} />
            {activeFiltersCount > 0 && (
              <span className="bg-lorcana-navy text-lorcana-gold text-xs font-bold px-1 py-0.5 rounded-sm ml-1">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <CardViewControls
            viewMode={viewMode}
            setViewMode={setViewMode}
            sortBy={sortBy}
            setSortBy={setSortBy}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <GitHubStyleSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search cards..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={`${sortBy.field}-${sortBy.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortBy({ field: field as any, direction: direction as 'asc' | 'desc' });
              }}
              className="px-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white hover:bg-lorcana-cream transition-colors"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="cost-asc">Cost Low-High</option>
              <option value="cost-desc">Cost High-Low</option>
              <option value="rarity-asc">Rarity Low-High</option>
              <option value="rarity-desc">Rarity High-Low</option>
              <option value="set-asc">Set (Oldest First)</option>
              <option value="set-desc">Set (Newest First)</option>
              <option value="color-asc">Color A-Z</option>
              <option value="color-desc">Color Z-A</option>
              <option value="type-asc">Type A-Z</option>
              <option value="type-desc">Type Z-A</option>
              <option value="story-asc">Story A-Z</option>
              <option value="story-desc">Story Z-A</option>
              <option value="strength-asc">Strength Low-High</option>
              <option value="strength-desc">Strength High-Low</option>
              <option value="willpower-asc">Willpower Low-High</option>
              <option value="willpower-desc">Willpower High-Low</option>
              <option value="lore-asc">Lore Low-High</option>
              <option value="lore-desc">Lore High-Low</option>
            </select>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white hover:bg-lorcana-cream transition-colors"
            >
              <option value="none">No Grouping</option>
              <option value="set">Group by Set</option>
              <option value="color">Group by Ink Color</option>
              <option value="rarity">Group by Rarity</option>
              <option value="type">Group by Type</option>
              <option value="story">Group by Story</option>
              <option value="cost">Group by Cost</option>
            </select>
            <button
              onClick={refreshStaleCards}
              disabled={!showFilterNotification}
              className={`px-3 py-2 border-2 rounded-sm focus:ring-2 focus:ring-lorcana-gold transition-colors ${
                showFilterNotification 
                  ? 'hover:bg-lorcana-gold text-lorcana-navy border-lorcana-gold bg-lorcana-cream' 
                  : 'text-gray-400 border-gray-300 cursor-not-allowed'
              }`}
              title={showFilterNotification ? 'Refresh view to apply current filters' : 'No stale cards to refresh'}
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border-2 rounded-sm focus:ring-2 focus:ring-lorcana-gold flex items-center space-x-2 transition-colors ${
                activeFiltersCount > 0 ? 'bg-lorcana-gold border-lorcana-navy text-lorcana-ink' : 'border-lorcana-gold hover:bg-lorcana-cream'
              }`}
            >
              <Filter size={20} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-lorcana-navy text-lorcana-gold text-xs font-bold px-2 py-1 rounded-sm">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-2 border-2 border-lorcana-gold rounded-sm hover:bg-lorcana-cream focus:ring-2 focus:ring-lorcana-gold transition-colors"
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardSearch;
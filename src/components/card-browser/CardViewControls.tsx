import React, { useState } from 'react';
import { Eye, ChevronDown, Grid, List } from 'lucide-react';
import { SortOption } from '../../types';

interface CardViewControlsProps {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  groupBy: string;
  setGroupBy: (group: string) => void;
}

const CardViewControls: React.FC<CardViewControlsProps> = ({
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
}) => {
  const [showViewMenu, setShowViewMenu] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setShowViewMenu(!showViewMenu)}
        className="h-12 min-w-[48px] px-3 py-2 border-2 border-lorcana-gold rounded-sm hover:bg-lorcana-cream focus:ring-2 focus:ring-lorcana-gold transition-colors flex items-center justify-center touch-manipulation"
      >
        <Eye size={18} />
        <ChevronDown size={14} className="ml-0.5" />
      </button>
      
      {/* View Menu Dropdown */}
      {showViewMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowViewMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border-2 border-lorcana-gold rounded-sm shadow-xl z-50">
            <div className="p-3 space-y-3">
              {/* View Mode */}
              <div>
                <label className="block text-xs font-medium text-lorcana-ink mb-1">View</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      setShowViewMenu(false);
                    }}
                    className={`flex-1 px-2 py-1 rounded-sm border text-xs font-medium transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-lorcana-gold border-lorcana-navy text-lorcana-ink' 
                        : 'border-lorcana-gold hover:bg-lorcana-cream'
                    }`}
                  >
                    <Grid size={14} className="inline mr-1" />
                    Grid
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setShowViewMenu(false);
                    }}
                    className={`flex-1 px-2 py-1 rounded-sm border text-xs font-medium transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-lorcana-gold border-lorcana-navy text-lorcana-ink' 
                        : 'border-lorcana-gold hover:bg-lorcana-cream'
                    }`}
                  >
                    <List size={14} className="inline mr-1" />
                    List
                  </button>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs font-medium text-lorcana-ink mb-1">Sort</label>
                <select
                  value={`${sortBy.field}-${sortBy.direction}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortBy({ field: field as any, direction: direction as 'asc' | 'desc' });
                  }}
                  className="w-full px-2 py-1 border-2 border-lorcana-gold rounded-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white text-xs"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="cost-asc">Cost Low-High</option>
                  <option value="cost-desc">Cost High-Low</option>
                  <option value="rarity-asc">Rarity Low-High</option>
                  <option value="rarity-desc">Rarity High-Low</option>
                  <option value="set-asc">Set (Oldest First)</option>
                  <option value="set-desc">Set (Newest First)</option>
                </select>
              </div>

              {/* Group By */}
              <div>
                <label className="block text-xs font-medium text-lorcana-ink mb-1">Group</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full px-2 py-1 border-2 border-lorcana-gold rounded-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-white text-xs"
                >
                  <option value="none">No Grouping</option>
                  <option value="set">Group by Set</option>
                  <option value="color">Group by Ink Color</option>
                  <option value="rarity">Group by Rarity</option>
                  <option value="type">Group by Type</option>
                  <option value="story">Group by Story</option>
                  <option value="cost">Group by Cost</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CardViewControls;
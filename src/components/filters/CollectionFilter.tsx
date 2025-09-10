import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import CustomDropdown from '../CustomDropdown';

interface CollectionFilterProps {
  collectionFilter: 'all' | 'owned' | 'not-owned';
  cardCountOperator: 'eq' | 'gte' | 'lte' | null;
  cardCountValue: number;
  fadeOthers: boolean;
  onChange: (collectionFilter: 'all' | 'owned' | 'not-owned', cardCountOperator: 'eq' | 'gte' | 'lte' | null, cardCountValue: number, fadeOthers: boolean) => void;
  defaultCollapsed?: boolean;
}

const CollectionFilter: React.FC<CollectionFilterProps> = ({
  collectionFilter,
  cardCountOperator,
  cardCountValue,
  fadeOthers,
  onChange,
  defaultCollapsed = false
}) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const hasFilter = collectionFilter !== 'all' || cardCountOperator !== null;

  const handleClear = () => {
    onChange('all', null, 1, false);
  };

  return (
    <div className="border-2 border-lorcana-gold rounded-sm bg-white shadow-sm">
      <div 
        className="flex justify-between items-center p-3 cursor-pointer hover:bg-lorcana-cream"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-lorcana-ink">Collection</h3>
          {hasFilter && (
            <span className="bg-lorcana-gold text-lorcana-ink text-xs font-medium px-2 py-1 rounded-sm">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasFilter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-lorcana-navy hover:text-lorcana-ink transition-colors"
              title="Clear filter"
            >
              <X size={16} />
            </button>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-lorcana-gold p-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-lorcana-ink mb-2">Collection Filter</label>
              <CustomDropdown
                value={collectionFilter}
                onChange={(value) => onChange(value as 'all' | 'owned' | 'not-owned', cardCountOperator, cardCountValue, fadeOthers)}
                options={[
                  { value: 'all', label: 'Ignore collection' },
                  { value: 'owned', label: 'In collection' },
                  { value: 'not-owned', label: 'Not in collection' }
                ]}
              />
            </div>
            
            <div className="border-t border-lorcana-gold/30 pt-3">
              <h4 className="font-medium text-lorcana-ink mb-2 text-sm">Card Count</h4>
              <div className="flex items-center space-x-2">
                <select
                  value={cardCountOperator || ''}
                  onChange={(e) => onChange(
                    collectionFilter,
                    e.target.value === '' ? null : e.target.value as 'eq' | 'gte' | 'lte',
                    cardCountValue,
                    fadeOthers
                  )}
                  className="text-xs px-2 py-1 border-2 border-lorcana-gold rounded-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
                >
                  <option value="">Any</option>
                  <option value="eq">Exactly</option>
                  <option value="gte">At least</option>
                  <option value="lte">At most</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={cardCountValue}
                  onChange={(e) => onChange(collectionFilter, cardCountOperator, parseInt(e.target.value) || 0, fadeOthers)}
                  disabled={cardCountOperator === null}
                  className="w-16 text-xs px-2 py-1 border-2 border-lorcana-gold rounded-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="text-xs text-lorcana-navy">copies</span>
              </div>
            </div>
            
            <div className="border-t border-lorcana-gold/30 pt-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fadeOthers}
                  onChange={(e) => onChange(collectionFilter, cardCountOperator, cardCountValue, e.target.checked)}
                  className="w-4 h-4 text-lorcana-gold bg-lorcana-cream border-2 border-lorcana-gold rounded focus:ring-lorcana-gold focus:ring-1"
                />
                <span className="text-sm text-lorcana-ink">Fade others</span>
              </label>
              <p className="text-xs text-lorcana-navy mt-1 ml-6">Show non-matching cards in greyscale</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionFilter;
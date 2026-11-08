import React from 'react';
import PaginationControls from '../shared/PaginationControls';
import { CardGridView, CardListView, GroupedView } from '../card-views';
import { LorcanaCard, FilterOptions, SortOption } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { RARITY_ICONS, COLOR_ICONS } from '../../constants/icons';

interface CardResultsProps {
  groupBy: string;
  viewMode: 'grid' | 'list';
  totalCards: number;
  groupedCards: Record<string, LorcanaCard[]>;
  paginatedCards: LorcanaCard[];
  sortedCards: LorcanaCard[]; // All cards for virtual scrolling
  pagination: {
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: number) => void;
    goToNextPage: () => void;
    goToPrevPage: () => void;
    startIndex: number;
    endIndex: number;
  };
  handleCardQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  staleCardIds: Set<number>;
  handleCardClick: (card: LorcanaCard) => void;
  allCards?: LorcanaCard[];
  filters?: FilterOptions;
  sortBy?: SortOption;
  onRenderedCardsChange?: (cards: LorcanaCard[]) => void;
  onFiltersChange?: (filters: FilterOptions) => void;
  /** Cards Infinity would show when Core shows none. */
  infinityMatches?: number;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

const FormatToggle: React.FC<{ filters: FilterOptions; onChange: (f: FilterOptions) => void }> = ({ filters, onChange }) => (
  <div role="group" aria-label="Format" className="inline-flex border-2 border-lorcana-gold rounded-sm overflow-hidden text-sm">
    {(['core', 'infinity'] as const).map(format => (
      <button
        key={format}
        type="button"
        aria-pressed={filters.legality === format}
        title={format === 'core' ? 'Cards legal in Core constructed' : 'Every card (Infinity format)'}
        onClick={() => onChange({ ...filters, legality: format })}
        className={`px-3 py-1 font-medium transition-colors ${
          filters.legality === format ? 'bg-lorcana-gold text-lorcana-navy' : 'bg-white text-lorcana-ink hover:bg-lorcana-cream'
        }`}
      >
        {format === 'core' ? 'Core' : 'Infinity'}
      </button>
    ))}
  </div>
);

const CardResults: React.FC<CardResultsProps> = ({
  groupBy,
  viewMode,
  totalCards,
  groupedCards,
  paginatedCards,
  sortedCards,
  pagination,
  handleCardQuantityChange,
  staleCardIds,
  handleCardClick,
  allCards,
  filters,
  sortBy,
  onRenderedCardsChange,
  onFiltersChange,
  infinityMatches = 0,
  onClearFilters,
  hasActiveFilters,
}) => {
  const { sets } = useCardData();

  const formatToggle = filters && onFiltersChange ? <FormatToggle filters={filters} onChange={onFiltersChange} /> : null;

  if (totalCards === 0 && filters) {
    return (
      <div className="flex flex-col items-center text-center px-4 py-16 gap-4">
        {formatToggle}
        <h2 className="text-xl font-semibold text-lorcana-ink">No cards match</h2>
        {infinityMatches > 0 && onFiltersChange ? (
          <p className="text-lorcana-navy">
            You're looking at Core cards only. {infinityMatches} card{infinityMatches === 1 ? '' : 's'} match in Infinity.
          </p>
        ) : (
          <p className="text-lorcana-navy">Try a different search, or fewer filters.</p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {infinityMatches > 0 && onFiltersChange && (
            <button type="button" className="btn-lorcana-gold" onClick={() => onFiltersChange({ ...filters, legality: 'infinity' })}>
              Show Infinity cards
            </button>
          )}
          {hasActiveFilters && onClearFilters && (
            <button type="button" className="btn-lorcana-navy" onClick={onClearFilters}>
              Clear search and filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        {groupBy !== 'none' ? (
          <div className="flex justify-between items-center mb-4 px-2 sm:px-4">
            <div className="text-lorcana-ink font-medium">
              Showing {totalCards} card{totalCards === 1 ? "" : "s"} in {Object.keys(groupedCards).length} group{Object.keys(groupedCards).length === 1 ? "" : "s"}
            </div>
            {formatToggle}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flex justify-between items-center mb-4 px-2 sm:px-4">
            <div className="text-lorcana-ink font-medium">
              Showing {totalCards} card{totalCards === 1 ? "" : "s"}
            </div>
            {formatToggle}
          </div>
        ) : (
          <div className="px-2 sm:px-4">
            {formatToggle && <div className="flex justify-end mb-2">{formatToggle}</div>}
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={totalCards}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setCurrentPage}
              onPrevPage={pagination.goToPrevPage}
              onNextPage={pagination.goToNextPage}
              showCompact={true}
              showBottomControls={false}
            />
          </div>
        )}

        {groupBy !== 'none' ? (
          <div className="px-2 sm:px-4">
            <GroupedView
              groupedCards={groupedCards}
              viewMode={viewMode}
              onQuantityChange={handleCardQuantityChange}
              staleCardIds={staleCardIds}
              rarityIconMap={RARITY_ICONS}
              colorIconMap={COLOR_ICONS}
              sets={sets}
              onCardClick={handleCardClick}
            />
          </div>
        ) : viewMode === 'grid' ? (
          <CardGridView
            cards={sortedCards}
            onQuantityChange={handleCardQuantityChange}
            onCardClick={handleCardClick}
            allCards={allCards}
            filters={filters}
            sortBy={sortBy}
            onRenderedCardsChange={onRenderedCardsChange}
          />
        ) : (
          <div className="px-2 sm:px-4">
            <CardListView
              cards={paginatedCards}
              onQuantityChange={handleCardQuantityChange}
              staleCardIds={staleCardIds}
              rarityIconMap={RARITY_ICONS}
              colorIconMap={COLOR_ICONS}
              sets={sets}
              onCardClick={handleCardClick}
            />
          </div>
        )}

        {groupBy === 'none' && viewMode !== 'grid' && (
          <div className="px-2 sm:px-4">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={totalCards}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              onPageChange={pagination.setCurrentPage}
              onPrevPage={pagination.goToPrevPage}
              onNextPage={pagination.goToNextPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardResults;
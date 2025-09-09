import React from 'react';
import PaginationControls from '../shared/PaginationControls';
import { CardGridView, CardListView, GroupedView } from '../card-views';
import { LorcanaCard } from '../../types';
import { sets } from '../../data/allCards';
import { RARITY_ICONS, COLOR_ICONS } from '../../constants/icons';
import ZoomControl from '../ui/ZoomControl';

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
}

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
}) => {
  return (
    <div className="w-full">
      <div className="space-y-6">
        {groupBy !== 'none' ? (
          <div className="flex justify-between items-center mb-4 px-2 sm:px-4">
            <div className="text-lorcana-ink font-medium">
              Showing {totalCards} cards in {Object.keys(groupedCards).length} groups
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flex justify-between items-center mb-4 px-2 sm:px-4">
            <div className="text-lorcana-ink font-medium">
              Showing {totalCards} cards
            </div>
          </div>
        ) : (
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
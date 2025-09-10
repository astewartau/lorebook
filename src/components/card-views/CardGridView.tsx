import React from 'react';
import { LorcanaCard, FilterOptions, SortOption } from '../../types';
import VirtualizedCardGrid from './VirtualizedCardGrid';

interface CardGridViewProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
  allCards?: LorcanaCard[];
  filters?: FilterOptions;
  sortBy?: SortOption;
  onRenderedCardsChange?: (cards: LorcanaCard[]) => void;
}

const CardGridView: React.FC<CardGridViewProps> = ({
  cards,
  onQuantityChange,
  onCardClick,
  allCards,
  filters,
  sortBy,
  onRenderedCardsChange
}) => {
  // Now using window scrolling, no need for height calculations
  return (
    <VirtualizedCardGrid
      cards={cards}
      onQuantityChange={onQuantityChange}
      onCardClick={onCardClick}
      allCards={allCards}
      filters={filters}
      sortBy={sortBy}
      onRenderedCardsChange={onRenderedCardsChange}
    />
  );
};

export default CardGridView;
import React from 'react';
import { LorcanaCard } from '../../types';
import VirtualizedCardGrid from './VirtualizedCardGrid';

interface CardGridViewProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
}

const CardGridView: React.FC<CardGridViewProps> = ({
  cards,
  onQuantityChange,
  onCardClick
}) => {
  // Now using window scrolling, no need for height calculations
  return (
    <VirtualizedCardGrid
      cards={cards}
      onQuantityChange={onQuantityChange}
      onCardClick={onCardClick}
    />
  );
};

export default CardGridView;
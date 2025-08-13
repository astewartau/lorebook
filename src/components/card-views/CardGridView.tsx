import React from 'react';
import { LorcanaCard } from '../../types';
import Card from '../Card';
import { useDynamicGrid } from '../../hooks';

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
  const { containerRef, gridStyle } = useDynamicGrid();

  return (
    <div 
      ref={containerRef}
      className="pb-8"
      style={gridStyle}
    >
      {cards.map((card) => (
        <div key={card.id} className="relative">
          <Card
            card={card}
            onQuantityChange={(normalChange, foilChange) => 
              onQuantityChange(card, normalChange, foilChange)
            }
            onCardClick={onCardClick}
          />
        </div>
      ))}
    </div>
  );
};

export default CardGridView;
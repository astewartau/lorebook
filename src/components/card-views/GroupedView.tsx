import React from 'react';
import { LorcanaCard } from '../../types';
import CardGridView from './CardGridView';
import CardListView from './CardListView';

interface GroupedViewProps {
  groupedCards: Record<string, LorcanaCard[]>;
  viewMode: 'grid' | 'list';
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  staleCardIds: Set<number>;
  rarityIconMap: Record<string, string>;
  colorIconMap: Record<string, string>;
  sets: Array<{code: string; name: string; number: number}>;
  onCardClick?: (card: LorcanaCard) => void;
}

const GroupedView: React.FC<GroupedViewProps> = ({
  groupedCards,
  viewMode,
  onQuantityChange,
  staleCardIds,
  rarityIconMap,
  colorIconMap,
  sets,
  onCardClick
}) => {
  return (
    <div className="space-y-6">
      {Object.entries(groupedCards).map(([groupName, cards]) => (
        <div key={groupName}>
          {/* Group Header */}
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <h3 className="px-4 text-lg font-semibold text-gray-700 bg-white">{groupName}</h3>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
          
          {/* Cards in this group */}
          {viewMode === 'grid' ? (
            <div className="mb-8">
              <CardGridView
                cards={cards}
                onQuantityChange={onQuantityChange}
                onCardClick={onCardClick}
              />
            </div>
          ) : (
            <div className="mb-8">
              <CardListView
                cards={cards}
                onQuantityChange={onQuantityChange}
                staleCardIds={staleCardIds}
                rarityIconMap={rarityIconMap}
                colorIconMap={colorIconMap}
                sets={sets}
                onCardClick={onCardClick}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GroupedView;
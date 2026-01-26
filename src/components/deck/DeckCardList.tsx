import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Minus, Plus } from 'lucide-react';
import { Deck, LorcanaCard } from '../../types';
import { COLOR_ICONS } from '../../constants/icons';
import { DECK_RULES } from '../../constants';
import { useCollection } from '../../contexts/CollectionContext';
import { useCardData } from '../../contexts/CardDataContext';

interface DeckCardListProps {
  deck: Deck;
  onRemoveCard: (cardId: number) => void;
  onUpdateQuantity: (cardId: number, quantity: number) => void;
  onImagePreview: (show: boolean, x?: number, y?: number, imageUrl?: string) => void;
  onCardClick?: (cardId: number) => void;
  groupBy?: 'cost' | 'type' | 'color' | 'set' | 'story';
}

const DeckCardList: React.FC<DeckCardListProps> = ({
  deck,
  onRemoveCard,
  onUpdateQuantity,
  onImagePreview,
  onCardClick,
  groupBy = 'cost'
}) => {
  const { getCardQuantity } = useCollection();
  const { allCards } = useCardData();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalCards = deck.cards.reduce((sum, entry) => sum + entry.quantity, 0);

  // Look up card data and combine with quantities and collection info
  type CardWithQuantity = LorcanaCard & {
    quantity: number;
    owned: number;
    missing: number;
  };

  const cardsWithData: CardWithQuantity[] = useMemo(() => {
    return deck.cards
      .map(entry => {
        const card = allCards.find(c => c.id === entry.cardId);
        if (!card) return null;
        const ownedQuantity = getCardQuantity(entry.cardId);
        return {
          ...card,
          quantity: entry.quantity,
          owned: Math.min(ownedQuantity.total, entry.quantity),
          missing: Math.max(0, entry.quantity - ownedQuantity.total)
        };
      })
      .filter(card => card !== null) as CardWithQuantity[];
  }, [deck.cards, getCardQuantity]);

  // Sort cards by set and number (always)
  const sortedCards = useMemo(() => {
    return [...cardsWithData].sort((a, b) => {
      if (a.setCode !== b.setCode) return a.setCode.localeCompare(b.setCode);
      if (a.number !== b.number) return a.number - b.number;
      return a.name.localeCompare(b.name);
    });
  }, [cardsWithData]);

  // Group cards
  const groupedCards = useMemo(() => {
    return sortedCards.reduce((acc, card) => {
      let groupKey: string;
      switch (groupBy) {
        case 'cost':
          groupKey = `${card.cost} Cost`;
          break;
        case 'type':
          groupKey = card.type;
          break;
        case 'color':
          groupKey = card.color || 'None';
          break;
        case 'set':
          groupKey = card.setCode || 'Unknown Set';
          break;
        case 'story':
          groupKey = card.story || 'Unknown';
          break;
        default:
          groupKey = 'Other';
      }

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(card);
      return acc;
    }, {} as Record<string, CardWithQuantity[]>);
  }, [sortedCards, groupBy]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards).sort(([a], [b]) => {
      if (groupBy === 'cost') {
        const costA = parseInt(a.split(' ')[0]);
        const costB = parseInt(b.split(' ')[0]);
        return costA - costB;
      }
      if (groupBy === 'set') {
        return a.localeCompare(b);
      }
      return a.localeCompare(b);
    });
  }, [groupedCards, groupBy]);

  const toggleGroup = (groupName: string) => {
    setCollapsed(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* No controls in sidebar - grouping controlled by parent */}

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {deck.cards.length === 0 ? (
          <div className="p-4 text-center text-lorcana-purple text-sm">
            No cards in deck. Start adding cards to build your deck!
          </div>
        ) : (
          <div className="space-y-1">
            {sortedGroups.map(([groupName, cards]) => {
              const isCollapsed = collapsed[groupName];
              const groupTotal = cards.reduce((sum, card) => sum + card.quantity, 0);
              
              return (
                <div key={groupName}>
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center justify-between p-2 hover:bg-lorcana-cream transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {isCollapsed ? (
                        <ChevronRight size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      <span className="text-sm font-medium text-lorcana-navy">
                        {groupName}
                      </span>
                    </div>
                    <span className="text-xs text-lorcana-purple">
                      {groupTotal} cards
                    </span>
                  </button>
                  
                  {!isCollapsed && (
                    <div className="ml-4 space-y-1">
                      {cards.map((card) => {
                        const isFullyOwned = card.owned >= card.quantity;
                        const opacity = !isFullyOwned ? 0.5 : 1;

                        return (
                          <div
                            key={card.id}
                            className="flex items-center space-x-2 p-2 hover:bg-lorcana-cream rounded-sm"
                            style={{ opacity }}
                          >
                            {/* Card Thumbnail */}
                            <div className="w-8 h-10 flex-shrink-0">
                              <img
                                src={card.images.thumbnail}
                                alt={card.fullName}
                                className="w-full h-full object-cover rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onCardClick?.(card.id)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  onImagePreview(true, rect.left, rect.top, card.images.full);
                                }}
                                onMouseLeave={() => onImagePreview(false)}
                              />
                            </div>
                            
                            {/* Card Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium text-lorcana-ink truncate">
                                  {card.name}
                                </div>
                                {card.missing > 0 && (
                                  <span className="text-xs px-1 py-0.5 bg-red-100 text-red-700 rounded-sm font-medium">
                                    {card.owned}/{card.quantity}
                                  </span>
                                )}
                              </div>
                              {card.version && (
                                <div className="text-xs text-lorcana-purple truncate">
                                  {card.version}
                                </div>
                              )}
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs font-bold text-lorcana-navy bg-lorcana-gold px-1 rounded-sm">{card.cost}</span>
                                {card.color && COLOR_ICONS[card.color] && (
                                  <img
                                    src={COLOR_ICONS[card.color]}
                                    alt={card.color}
                                    className="w-3 h-3"
                                  />
                                )}
                                <span className="text-xs text-lorcana-purple">{card.type}</span>
                                <span className="text-xs text-lorcana-purple">
                                  {card.setCode} #{card.number}
                                </span>
                              </div>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                onClick={() => onUpdateQuantity(card.id, card.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 rounded-sm transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-sm font-semibold min-w-[1rem] text-center">
                                {card.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(card.id, card.quantity + 1)}
                                disabled={(() => {
                                  const maxCopies = (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') ? 99 : DECK_RULES.MAX_COPIES_PER_CARD;
                                  return card.quantity >= maxCopies || totalCards >= DECK_RULES.MAX_CARDS;
                                })()}
                                className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-sm transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckCardList;
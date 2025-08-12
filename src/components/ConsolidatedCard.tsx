import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { ConsolidatedCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useCollection } from '../contexts/CollectionContext';
import CardImage from './CardImage';
import ContextMenu from './ContextMenu';
import { DECK_RULES } from '../constants';

interface ConsolidatedCardProps {
  consolidatedCard: ConsolidatedCard;
  quantities: { regular: number; foil: number; enchanted: number; special: number };
  onQuantityChange: (variantType: 'regular' | 'foil' | 'enchanted' | 'special', change: number) => void;
  onCardClick?: (card: ConsolidatedCard) => void;
}

const ConsolidatedCardComponent: React.FC<ConsolidatedCardProps> = ({ 
  consolidatedCard, 
  quantities,
  onQuantityChange,
  onCardClick
}) => {
  const { user } = useAuth();
  const { isEditingDeck, currentDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity, createDeckAndStartEditing } = useDeck();
  const { getVariantQuantities } = useCollection();
  const { baseCard, hasEnchanted, hasSpecial, enchantedCard } = consolidatedCard;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  
  // Get deck quantity for this card
  const deckQuantity = currentDeck?.cards.find(c => c.id === baseCard.id)?.quantity || 0;
  
  // Get total collection quantity
  const collectionQuantities = getVariantQuantities(consolidatedCard.fullName);
  const totalCollectionQuantity = collectionQuantities.regular + collectionQuantities.foil + 
                                  collectionQuantities.enchanted + collectionQuantities.special;
  
  const handleAddToDeck = () => {
    if (currentDeck) {
      const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
      if (deckQuantity < DECK_RULES.MAX_COPIES_PER_CARD && totalCards < DECK_RULES.MAX_CARDS) {
        addCardToDeck(baseCard);
      }
    }
  };
  
  const handleRemoveFromDeck = () => {
    if (currentDeck && deckQuantity > 0) {
      const newQuantity = deckQuantity - 1;
      if (newQuantity === 0) {
        removeCardFromDeck(baseCard.id);
      } else {
        updateCardQuantity(baseCard.id, newQuantity);
      }
    }
  };
  
  const canAddToDeck = () => {
    if (!currentDeck) return false;
    const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
    return deckQuantity < DECK_RULES.MAX_COPIES_PER_CARD && totalCards < DECK_RULES.MAX_CARDS;
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAddToNewDeck = async () => {
    try {
      // Create a new deck with the card already included
      const deckName = `New Deck - ${baseCard.name}`;
      await createDeckAndStartEditing(deckName, `Deck featuring ${baseCard.name}`, baseCard);
    } catch (error) {
      console.error('Error creating new deck:', error);
    }
  };

  const getVariantBackground = (variantType: 'regular' | 'foil' | 'enchanted' | 'special') => {
    switch (variantType) {
      case 'regular':
        return 'bg-lorcana-cream border-lorcana-gold';
      case 'foil':
        return 'bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 border-lorcana-navy';
      case 'enchanted':
        return 'bg-gradient-to-r from-red-200 via-yellow-200 via-green-200 via-blue-200 to-purple-200 border-lorcana-gold';
      case 'special':
        return 'bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-300 border-lorcana-gold';
      default:
        return 'bg-lorcana-cream border-lorcana-gold';
    }
  };

  const renderQuantityControl = (
    variantType: 'regular' | 'foil' | 'enchanted' | 'special',
    quantity: number,
    isAvailable: boolean
  ) => {
    if (!isAvailable) return null;

    return (
      <div className={`flex items-center justify-between px-2 py-1 rounded-md border ${getVariantBackground(variantType)} transition-all`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuantityChange(variantType, -1);
          }}
          disabled={quantity <= 0}
          className="p-0.5 rounded text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
        >
          <Minus size={10} />
        </button>
        <span className="font-semibold text-xs min-w-[1rem] text-center text-lorcana-ink">
          {quantity}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuantityChange(variantType, 1);
          }}
          className="p-0.5 rounded text-green-600 hover:text-green-800 transition-colors"
        >
          <Plus size={10} />
        </button>
      </div>
    );
  };
  
  const renderDeckControl = () => {
    return (
      <div className="flex items-center justify-between px-2 py-1 bg-lorcana-cream rounded-sm border-2 border-lorcana-gold">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveFromDeck();
          }}
          disabled={deckQuantity <= 0}
          className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
        >
          <Minus size={12} />
        </button>
        
        <span className="text-sm font-semibold text-lorcana-ink">
          {deckQuantity}{totalCollectionQuantity > 0 ? `/${Math.min(totalCollectionQuantity, 4)}` : ''}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToDeck();
          }}
          disabled={!canAddToDeck()}
          className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
        >
          <Plus size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Card Image */}
      <div 
        className="relative rounded-sm shadow-lg hover:shadow-2xl transition-all duration-300 ease-out aspect-[2.5/3.5] overflow-hidden cursor-pointer transform-gpu select-none border-2 border-lorcana-gold"
        onClick={() => onCardClick?.(consolidatedCard)}
        onContextMenu={handleRightClick}
      >
        <CardImage
          card={baseCard}
          enchantedCard={enchantedCard}
          enableHover={true}
          enableTilt={true}
          size="full"
          className="w-full h-full"
        />
      </div>

      {/* Quantity controls below card - show deck controls in edit mode, collection controls otherwise */}
      {user && (
        <div className="flex justify-center space-x-1">
          {isEditingDeck ? (
            renderDeckControl()
          ) : (
            <>
              {renderQuantityControl('regular', quantities.regular, consolidatedCard.hasRegular)}
              {renderQuantityControl('foil', quantities.foil, consolidatedCard.hasFoil)}
              {hasEnchanted && renderQuantityControl('enchanted', quantities.enchanted, true)}
              {hasSpecial && renderQuantityControl('special', quantities.special, true)}
            </>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && user && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: 'Add to new deck',
              icon: <Plus size={14} />,
              onClick: handleAddToNewDeck,
              disabled: isEditingDeck
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default ConsolidatedCardComponent;
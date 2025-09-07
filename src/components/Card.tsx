import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { LorcanaCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useCollection } from '../contexts/CollectionContext';
import CardImage from './CardImage';
import ContextMenu from './ContextMenu';
import { DECK_RULES } from '../constants';

interface CardProps {
  card: LorcanaCard;
  onQuantityChange?: (normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
}

const Card: React.FC<CardProps> = ({ 
  card,
  onQuantityChange,
  onCardClick
}) => {
  const { user } = useAuth();
  const { isEditingDeck, currentDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity, createDeckAndStartEditing } = useDeck();
  const { getCardQuantity } = useCollection();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  
  // Get current quantities for this specific card ID
  const quantities = getCardQuantity(card.id);
  
  // Get deck quantity for this card
  const deckQuantity = currentDeck?.cards.find(c => c.cardId === card.id)?.quantity || 0;
  
  const handleAddToDeck = () => {
    if (currentDeck) {
      const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
      const maxCopies = (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') ? 99 : DECK_RULES.MAX_COPIES_PER_CARD;
      if (deckQuantity < maxCopies && totalCards < DECK_RULES.MAX_CARDS) {
        addCardToDeck(card);
      }
    }
  };
  
  const handleRemoveFromDeck = () => {
    if (currentDeck && deckQuantity > 0) {
      const newQuantity = deckQuantity - 1;
      if (newQuantity === 0) {
        removeCardFromDeck(card.id);
      } else {
        updateCardQuantity(card.id, newQuantity);
      }
    }
  };
  
  const canAddToDeck = () => {
    if (!currentDeck) return false;
    const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
    const maxCopies = (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') ? 99 : DECK_RULES.MAX_COPIES_PER_CARD;
    
    return deckQuantity < maxCopies && totalCards < DECK_RULES.MAX_CARDS;
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAddToNewDeck = async () => {
    try {
      const deckName = `New Deck - ${card.name}`;
      await createDeckAndStartEditing(deckName, `Deck featuring ${card.name}`, card);
    } catch (error) {
      console.error('Error creating new deck:', error);
    }
  };

  const handleNormalQuantityChange = (change: number) => {
    if (onQuantityChange) {
      onQuantityChange(change, 0);
    }
  };

  const handleFoilQuantityChange = (change: number) => {
    if (onQuantityChange) {
      onQuantityChange(0, change);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const cardEl = cardRef.current;
    const rect = cardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation based on mouse position
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('');
  };

  const getCardBackground = () => {
    if (card.rarity === 'Enchanted') {
      return 'bg-gradient-to-r from-red-200 via-yellow-200 via-green-200 via-blue-200 to-purple-200 border-lorcana-gold';
    } else if (card.rarity === 'Special' || card.promoGrouping) {
      return 'bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-300 border-lorcana-gold';
    }
    return 'bg-lorcana-cream border-lorcana-gold';
  };

  const renderQuantityControls = () => {
    return (
      <div className="flex space-x-1">
        {/* Normal quantity control */}
        <div className="flex items-center justify-between px-2 py-1 rounded-md border bg-lorcana-cream border-lorcana-gold transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNormalQuantityChange(-1);
            }}
            disabled={quantities.normal <= 0}
            className="p-0.5 rounded text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
            title="Remove normal copy"
          >
            <Minus size={10} />
          </button>
          <span className="font-semibold text-xs min-w-[1rem] text-center text-lorcana-ink">
            {quantities.normal}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNormalQuantityChange(1);
            }}
            className="p-0.5 rounded text-green-600 hover:text-green-800 transition-colors"
            title="Add normal copy"
          >
            <Plus size={10} />
          </button>
        </div>

        {/* Foil quantity control */}
        <div className="flex items-center justify-between px-2 py-1 rounded-md border bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 border-lorcana-navy transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFoilQuantityChange(-1);
            }}
            disabled={quantities.foil <= 0}
            className="p-0.5 rounded text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
            title="Remove foil copy"
          >
            <Minus size={10} />
          </button>
          <span className="font-semibold text-xs min-w-[1rem] text-center text-lorcana-ink">
            {quantities.foil}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFoilQuantityChange(1);
            }}
            className="p-0.5 rounded text-green-600 hover:text-green-800 transition-colors"
            title="Add foil copy"
          >
            <Plus size={10} />
          </button>
        </div>
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
          {deckQuantity}{quantities.total > 0 ? `/${Math.min(quantities.total, 4)}` : ''}
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
        ref={cardRef}
        className={`relative rounded-sm shadow-lg hover:shadow-2xl transition-all duration-300 ease-out aspect-[2.5/3.5] overflow-hidden cursor-pointer transform-gpu select-none border-2 ${getCardBackground()}`}
        style={{
          transform: transform,
          transformOrigin: 'center center',
          transition: isHovered 
            ? 'transform 0.1s ease-out, box-shadow 0.3s ease-out' 
            : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s ease-out'
        }}
        onClick={() => onCardClick?.(card)}
        onContextMenu={handleRightClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardImage
          card={card}
          enableHover={true}
          enableTilt={false}
          size="full"
          className="w-full h-full"
        />
      </div>

      {/* Quantity controls below card - show deck controls in edit mode, collection controls otherwise */}
      {user && onQuantityChange && (
        <div className="flex justify-center">
          {isEditingDeck ? (
            renderDeckControl()
          ) : (
            renderQuantityControls()
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

export default Card;
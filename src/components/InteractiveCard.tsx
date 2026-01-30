import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { LorcanaCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useCollection } from '../contexts/CollectionContext';
import CardImage from './CardImage';
import ContextMenu from './ContextMenu';
import { DECK_RULES } from '../constants';
import { canHaveNormal } from '../utils/cardDataUtils';

interface CardProps {
  card: LorcanaCard;
  onQuantityChange?: (normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
  loading?: 'lazy' | 'eager';
}

const InteractiveCard: React.FC<CardProps> = ({
  card,
  onQuantityChange,
  onCardClick,
  loading = 'lazy'
}) => {
  const { user } = useAuth();
  const { isEditingDeck, currentDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity, createDeckAndStartEditing } = useDeck();
  const { getCardQuantity } = useCollection();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const lastUpdateTime = React.useRef<number>(0);
  
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

  // Check if device supports hover (non-touch)
  const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip tilt effect on touch devices
    if (!supportsHover || !cardRef.current) return;

    // Throttle to ~30fps (33ms)
    const now = performance.now();
    if (now - lastUpdateTime.current < 33) return;
    lastUpdateTime.current = now;

    const rect = cardRef.current.getBoundingClientRect();
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
    const showNormalControls = canHaveNormal(card.rarity);

    return (
      <div className="flex space-x-2">
        {/* Normal quantity control (only for cards that have normal versions) */}
        {showNormalControls && (
          <div className="flex items-center justify-between px-2 py-1 bg-lorcana-cream rounded-sm border-2 border-lorcana-gold">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNormalQuantityChange(-1);
              }}
              disabled={quantities.normal <= 0}
              className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
              aria-label={`Remove normal copy of ${card.name}`}
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-semibold text-lorcana-ink px-2">
              {quantities.normal}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNormalQuantityChange(1);
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 transition-colors rounded-sm"
              aria-label={`Add normal copy of ${card.name}`}
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* Foil quantity control - with shimmer effect */}
        <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 rounded-sm border-2 border-purple-400 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-shimmer pointer-events-none" style={{ animationDuration: '3s' }} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFoilQuantityChange(-1);
            }}
            disabled={quantities.foil <= 0}
            className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100/50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm relative z-10"
            aria-label={`Remove foil copy of ${card.name}`}
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-semibold text-purple-800 px-2 relative z-10">
            {quantities.foil}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFoilQuantityChange(1);
            }}
            className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100/50 transition-colors rounded-sm relative z-10"
            aria-label={`Add foil copy of ${card.name}`}
          >
            <Plus size={14} />
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
          className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
          aria-label={`Remove ${card.name} from deck`}
        >
          <Minus size={14} />
        </button>

        <span className="text-sm font-semibold text-lorcana-ink px-2">
          {deckQuantity}{quantities.total > 0 ? `/${Math.min(quantities.total, 4)}` : ''}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToDeck();
          }}
          disabled={!canAddToDeck()}
          className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
          aria-label={`Add ${card.name} to deck`}
        >
          <Plus size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-2 pb-2">
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
          className="w-full h-full"
          loading={loading}
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

export default InteractiveCard;
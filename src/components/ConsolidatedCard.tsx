import React, { useState, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import { ConsolidatedCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useCollection } from '../contexts/CollectionContext';
import { useProgressiveImage, useInViewport } from '../hooks';
import CardFallback from './CardFallback';

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
  const { isEditingDeck, currentDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity } = useDeck();
  const { getVariantQuantities } = useCollection();
  const { baseCard, hasEnchanted, hasSpecial, enchantedCard } = consolidatedCard;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState('');
  const [lightPosition, setLightPosition] = useState({ x: 50, y: 50 });
  const [showEnchanted, setShowEnchanted] = useState(false);
  
  // Single viewport detection for the entire card
  const [viewportRef, isInViewport] = useInViewport<HTMLDivElement>({ 
    rootMargin: '200px' // Start loading 200px before entering viewport
  });
  
  // Generate a unique card ID for the image manager
  const cardUniqueId = `card-${baseCard.id}`;
  
  // Progressive image loading for base card
  const baseImageProps = useProgressiveImage({
    thumbnail: baseCard.images.thumbnail,
    full: baseCard.images.full,
    cardId: cardUniqueId,
    isInViewport,
    imageType: 'regular'
  });
  
  // Progressive image loading for enchanted card (if exists)
  const enchantedImageProps = useProgressiveImage({
    thumbnail: enchantedCard?.images.thumbnail || baseCard.images.thumbnail,
    full: enchantedCard?.images.full || baseCard.images.full,
    cardId: cardUniqueId,
    isInViewport: isInViewport && hasEnchanted, // Only load if card has enchanted version
    imageType: 'enchanted'
  });
  
  // Get deck quantity for this card
  const deckQuantity = currentDeck?.cards.find(c => c.id === baseCard.id)?.quantity || 0;
  
  // Get total collection quantity
  const collectionQuantities = getVariantQuantities(consolidatedCard.fullName);
  const totalCollectionQuantity = collectionQuantities.regular + collectionQuantities.foil + 
                                  collectionQuantities.enchanted + collectionQuantities.special;
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation based on mouse position
    const rotateX = ((y - centerY) / centerY) * -15; // Max 15 degrees
    const rotateY = ((x - centerX) / centerX) * 15; // Max 15 degrees
    
    // Calculate light position as percentage
    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setLightPosition({ x: lightX, y: lightY });
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hasEnchanted) {
      setShowEnchanted(true);
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('');
    setLightPosition({ x: 50, y: 50 });
    setShowEnchanted(false);
  };
  
  const handleAddToDeck = () => {
    if (currentDeck) {
      const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
      if (deckQuantity < 4 && totalCards < 60) {
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
    return deckQuantity < 4 && totalCards < 60;
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
    <div className="flex flex-col space-y-2" ref={viewportRef}>
      {/* Card Image */}
      <div 
        ref={cardRef}
        className="relative rounded-sm shadow-lg hover:shadow-2xl transition-all duration-300 ease-out aspect-[2.5/3.5] overflow-hidden cursor-pointer transform-gpu select-none border-2 border-lorcana-gold"
        style={{
          transform: transform,
          transformOrigin: 'center center',
          transition: isHovered ? 'transform 0.1s ease-out, box-shadow 0.3s ease-out' : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.3s ease-out'
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onCardClick?.(consolidatedCard)}
      >
        {/* Base card image or fallback */}
        {!baseImageProps.src ? (
          <div className="absolute inset-0">
            <CardFallback
              name={baseCard.name}
              version={baseCard.version}
              className="w-full h-full"
            />
          </div>
        ) : (
          <img 
            src={baseImageProps.src} 
            alt={baseCard.fullName}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
            loading="lazy"
            style={{ 
              pointerEvents: 'none',
              opacity: hasEnchanted && showEnchanted && enchantedImageProps.src ? 0 : 1,
              transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease-out'
            }}
          />
        )}
        
        {/* Enchanted card image (only render if we have enchanted and it's loaded) */}
        {hasEnchanted && enchantedCard && (
          enchantedImageProps.src ? (
            <img 
              src={enchantedImageProps.src} 
              alt={enchantedCard.fullName}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
              loading="lazy"
              style={{ 
                pointerEvents: 'none',
                opacity: showEnchanted ? 1 : 0,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease-out',
                transform: showEnchanted ? 'scale(1)' : 'scale(1.05)',
                filter: showEnchanted ? 'none' : 'brightness(1.2) saturate(1.3)'
              }}
            />
          ) : (
            showEnchanted && !baseImageProps.src && (
              <div className="absolute inset-0" style={{ 
                opacity: 1,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <CardFallback
                  name={enchantedCard.name}
                  version={enchantedCard.version}
                  className="w-full h-full"
                />
              </div>
            )
          )
        )}
        
        {/* Loading indicator overlay */}
        {(baseImageProps.isLoading || (hasEnchanted && enchantedImageProps.isLoading)) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-lorcana-gold border-t-transparent rounded-full animate-spin opacity-30" />
          </div>
        )}
        
        {/* Light overlay effect */}
        {isHovered && (
          <>
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${lightPosition.x}% ${lightPosition.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)`
              }}
            />
            {/* Enchanted shimmer effect */}
            {hasEnchanted && showEnchanted && enchantedImageProps.src && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(105deg, 
                    transparent 40%, 
                    rgba(255, 255, 255, 0.7) 45%, 
                    rgba(255, 255, 255, 0.9) 50%, 
                    rgba(255, 255, 255, 0.7) 55%, 
                    transparent 60%)`,
                  transform: 'translateX(-100%)',
                  animation: 'shimmer 1.5s ease-out'
                }}
              />
            )}
          </>
        )}
        
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
    </div>
  );
};

export default ConsolidatedCardComponent;
import React, { useRef, useState } from 'react';
import { LorcanaCard } from '../types';
import { useProgressiveImage, useInViewport } from '../hooks';
import CardFallback from './CardFallback';

interface CardImageProps {
  card: LorcanaCard;
  enchantedCard?: LorcanaCard;
  showEnchanted?: boolean;
  enableHover?: boolean;
  enableTilt?: boolean;
  size?: 'thumbnail' | 'full';
  className?: string;
  onClick?: () => void;
  rootMargin?: string;
  priority?: 'high' | 'normal' | 'low';
}

const CardImage: React.FC<CardImageProps> = ({
  card,
  enchantedCard,
  showEnchanted = false,
  enableHover = false,
  enableTilt = false,
  size = 'full',
  className = '',
  onClick,
  rootMargin = '200px',
  priority = 'normal'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState('');
  const [lightPosition, setLightPosition] = useState({ x: 50, y: 50 });
  
  // Viewport detection with customizable root margin (only if priority is not set)
  const [viewportRef, isInViewport] = useInViewport<HTMLDivElement>({ 
    rootMargin,
    enabled: priority === 'normal' // Only enable viewport detection for normal priority
  });
  
  // Adjust viewport priority based on priority prop
  const adjustedInViewport = priority === 'high' ? true : 
                            priority === 'low' ? false : 
                            isInViewport;
  
  // Debug viewport detection (only on mount)
  React.useEffect(() => {
    console.log(`[CardImage] ${card.name} (#${card.number}): priority=${priority}, adjustedInViewport=${adjustedInViewport}`);
  }, [card.name, card.number]); // Only log on mount, not on every change
  
  // Generate a unique card ID for the image manager
  const cardUniqueId = `card-${card.id}`;
  
  // Progressive image loading for base card
  const baseImageProps = useProgressiveImage({
    thumbnail: card.images.thumbnail,
    full: size === 'thumbnail' ? card.images.thumbnail : card.images.full,
    cardId: cardUniqueId,
    isInViewport: adjustedInViewport,
    imageType: 'regular'
  });

  // Debug: Log what CardImage receives from useProgressiveImage
  console.log(`[CardImage] ${card.name} (#${card.number}): baseImageProps.src=${baseImageProps.src ? baseImageProps.src.split('/').pop() : 'NULL'}, isLoading=${baseImageProps.isLoading}`);

  // Debug: Log when component mounts/unmounts
  React.useEffect(() => {
    console.log(`[CardImage] Mounting card: ${card.name} (#${card.number}) - will register images`);
    return () => {
      console.log(`[CardImage] Unmounting card: ${card.name} (#${card.number})`);
    };
  }, [card.name, card.number]);
  
  // Progressive image loading for enchanted card (if exists)
  const hasEnchanted = !!enchantedCard;
  const enchantedImageProps = useProgressiveImage({
    thumbnail: enchantedCard?.images.thumbnail || card.images.thumbnail,
    full: size === 'thumbnail' 
      ? (enchantedCard?.images.thumbnail || card.images.thumbnail)
      : (enchantedCard?.images.full || card.images.full),
    cardId: cardUniqueId,
    isInViewport: adjustedInViewport && hasEnchanted,
    imageType: 'enchanted'
  });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    
    const cardEl = cardRef.current;
    const rect = cardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation based on mouse position
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    // Calculate light position as percentage
    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    setLightPosition({ x: lightX, y: lightY });
  };
  
  const handleMouseEnter = () => {
    if (!enableHover) return;
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    if (!enableHover && !enableTilt) return;
    setIsHovered(false);
    setTransform('');
    setLightPosition({ x: 50, y: 50 });
  };
  
  // Determine which image to show
  const shouldShowEnchanted = showEnchanted || (enableHover && isHovered && hasEnchanted);
  
  return (
    <div 
      ref={viewportRef}
      className={`relative ${className}`}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        className="relative w-full h-full"
        style={enableTilt ? {
          transform: transform,
          transformOrigin: 'center center',
          transition: isHovered 
            ? 'transform 0.1s ease-out' 
            : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        } : {}}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Base card image or fallback */}
        {!baseImageProps.src ? (
          <CardFallback
            name={card.name}
            version={card.version}
            className="w-full h-full"
          />
        ) : (
          <img 
            src={baseImageProps.src} 
            alt={card.fullName}
            className="w-full h-full object-cover block"
            loading="lazy"
            style={{ 
              pointerEvents: 'none',
              opacity: shouldShowEnchanted && enchantedImageProps.src ? 0 : 1,
              transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        )}
        
        {/* Enchanted card image (only render if we have enchanted) */}
        {hasEnchanted && enchantedCard && (
          enchantedImageProps.src ? (
            <img 
              src={enchantedImageProps.src} 
              alt={enchantedCard.fullName}
              className="absolute inset-0 w-full h-full object-contain"
              loading="lazy"
              style={{ 
                pointerEvents: 'none',
                opacity: shouldShowEnchanted ? 1 : 0,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: shouldShowEnchanted ? 'scale(1)' : 'scale(1.05)',
                filter: shouldShowEnchanted ? 'none' : 'brightness(1.2) saturate(1.3)'
              }}
            />
          ) : (
            shouldShowEnchanted && !baseImageProps.src && (
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
        
        {/* Light overlay effect (only if hover effects enabled) */}
        {enableHover && isHovered && (
          <>
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${lightPosition.x}% ${lightPosition.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)`
              }}
            />
            {/* Enchanted shimmer effect */}
            {hasEnchanted && shouldShowEnchanted && enchantedImageProps.src && (
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
    </div>
  );
};

export default CardImage;
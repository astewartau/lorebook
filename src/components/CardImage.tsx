import React, { useState, useRef } from 'react';
import { LorcanaCard } from '../types';
import CardFallback from './CardFallback';

interface CardImageProps {
  card: LorcanaCard;
  enableHover?: boolean;
  enableTilt?: boolean;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}

const CardImage: React.FC<CardImageProps> = ({
  card,
  enableHover = false,
  enableTilt = false,
  className = '',
  onClick,
  loading = 'lazy'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState('');
  const [lightPosition, setLightPosition] = useState({ x: 50, y: 50 });
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Start with thumbnail, upgrade to full image
  const thumbnailSrc = card.images.thumbnail;
  const fullImageSrc = card.images.full;
  
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
  
  // Use the loading prop for native lazy loading
  const loadingAttr = loading;
  
  return (
    <div 
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
        {/* Thumbnail image - shows immediately */}
        <img 
          src={thumbnailSrc} 
          alt={card.fullName}
          className="w-full h-full object-cover block"
          loading={loadingAttr}
          decoding="async"
          onError={() => setImageError(true)}
          style={{ 
            pointerEvents: 'none'
          }}
        />
        
        {/* Full resolution image - loads on top when ready */}
        {!imageError && (
          <img 
            src={fullImageSrc} 
            alt={card.fullName}
            className="w-full h-full object-cover block absolute inset-0"
            loading={loadingAttr}
            decoding="async"
            onLoad={() => setFullImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{ 
              pointerEvents: 'none',
              opacity: fullImageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        )}
        
        {/* Error fallback */}
        {imageError && (
          <div className="absolute inset-0">
            <CardFallback
              name={card.name}
              version={card.version}
              className="w-full h-full"
            />
          </div>
        )}
        
        {/* Light overlay effect (only if hover effects enabled) */}
        {enableHover && isHovered && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${lightPosition.x}% ${lightPosition.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)`
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CardImage;
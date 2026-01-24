import React, { useState } from 'react';
import { useCardData } from '../contexts/CardDataContext';

interface AvatarImageProps {
  cardId: number;
  cropData: { x: number; y: number; scale: number };
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const AvatarImage: React.FC<AvatarImageProps> = ({
  cardId,
  cropData,
  className = '',
  onClick
}) => {
  const { allCards } = useCardData();
  const [imageError, setImageError] = useState(false);

  // Get card data
  const card = allCards.find(c => c.id === cardId);
  
  if (!card || imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        onClick={onClick}
      >
        <span className="text-gray-500 text-xs">No Image</span>
      </div>
    );
  }

  return (
    <div 
      className={`overflow-hidden ${className}`}
      onClick={onClick}
    >
      <img
        src={card.images.full}
        alt={card.fullName}
        className="w-full h-full object-cover"
        style={{
          objectPosition: `${cropData.x}% ${cropData.y}%`,
          transform: `scale(${cropData.scale})`,
          transformOrigin: `${cropData.x}% ${cropData.y}%`
        }}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default AvatarImage;
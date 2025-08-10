import React from 'react';

interface CardFallbackProps {
  name: string;
  version?: string;
  className?: string;
  onClick?: () => void;
}

const CardFallback: React.FC<CardFallbackProps> = ({ 
  name, 
  version, 
  className = "",
  onClick 
}) => {
  return (
    <div 
      className={`relative border-2 border-lorcana-gold rounded-sm overflow-hidden cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Card back SVG as background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/imgs/cardback.svg" 
          alt="Card back"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Card text content */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-center">
        {/* Card name */}
        <h3 className="font-bold text-sm mb-1 leading-tight">
          {name}
        </h3>
        
        {/* Card version/subtitle */}
        {version && (
          <p className="font-medium text-xs leading-tight opacity-90">
            {version}
          </p>
        )}
      </div>
    </div>
  );
};

export default CardFallback;
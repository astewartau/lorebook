import React from 'react';
import CardImage from '../CardImage';
import { LorcanaCard } from '../../types';

interface CardWithOwnership extends LorcanaCard {
  owned: boolean;
  totalQuantity: number;
}

interface BinderCardSlotProps {
  card: CardWithOwnership;
  isFullscreen: boolean;
  isMobile: boolean;
  hoveredCard: string | null;
  mousePosition: { x: number; y: number };
  onCardClick: (card: LorcanaCard) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>, cardId: string) => void;
  onMouseLeave: () => void;
}

// Plastic sleeve shine effect styles (consolidated)
const PlasticSleeveEffect: React.FC<{
  isHovered: boolean;
  mousePosition: { x: number; y: number };
}> = ({ isHovered, mousePosition }) => (
  <>
    {/* Rectangular border shine - like light hitting the raised sleeve edges */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          linear-gradient(to right, rgba(255,255,255,0.4) 0%, transparent 8%),
          linear-gradient(to left, rgba(255,255,255,0.4) 0%, transparent 8%),
          linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 6%),
          linear-gradient(to top, rgba(255,255,255,0.3) 0%, transparent 6%)
        `,
        opacity: 0.6
      }}
    />
    {/* Corner highlights */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at top left, rgba(255,255,255,0.5) 0%, transparent 25%),
          radial-gradient(circle at top right, rgba(255,255,255,0.5) 0%, transparent 25%),
          radial-gradient(circle at bottom left, rgba(255,255,255,0.3) 0%, transparent 25%),
          radial-gradient(circle at bottom right, rgba(255,255,255,0.3) 0%, transparent 25%)
        `,
        opacity: 0.4
      }}
    />
    {/* Dynamic mouse light effect */}
    {isHovered && (
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.1) 40%, transparent 60%)`,
          opacity: 0.8
        }}
      />
    )}
    {/* Subtle overall gloss */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'rgba(255,255,255,0.05)',
        opacity: 0.8
      }}
    />
  </>
);

const BinderCardSlot: React.FC<BinderCardSlotProps> = ({
  card,
  isFullscreen,
  isMobile,
  hoveredCard,
  mousePosition,
  onCardClick,
  onMouseMove,
  onMouseLeave
}) => {
  const isHovered = hoveredCard === card.id.toString();

  // Mobile version is simpler (no hover effects, smaller padding)
  if (isMobile) {
    return (
      <div
        className="relative aspect-[5/7] overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
        onClick={() => onCardClick(card)}
        style={{
          border: card.owned ? '1px solid rgba(255,255,255,0.3)' : '2px dashed #999',
          background: card.owned
            ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.95) 100%)'
            : 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
          boxShadow: card.owned
            ? 'inset 0 1px 3px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.1)'
            : 'inset 0 1px 3px rgba(0,0,0,0.3)'
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            boxShadow: card.owned ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
            backgroundImage: 'url(/imgs/cardback.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Card image */}
          <div className={`w-full h-full leading-[0] ${!card.owned ? 'opacity-60 grayscale' : ''}`}>
            <CardImage
              card={card}
              enableHover={false}
              enableTilt={false}
              className="w-full h-full"
            />
          </div>

          {card.owned && (
            /* Quantity badge */
            <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1 py-0.5 rounded shadow-lg">
              {card.totalQuantity}
            </div>
          )}

          {/* Card number */}
          <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
            #{card.number}
          </div>
        </div>
      </div>
    );
  }

  // Desktop version with full hover effects
  return (
    <div
      className={`relative overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer aspect-[5/7] ${isFullscreen ? 'w-[calc(25vh*5/7)]' : ''}`}
      onClick={() => onCardClick(card)}
      onMouseMove={(e) => onMouseMove(e, card.id.toString())}
      onMouseLeave={onMouseLeave}
      style={{
        border: card.owned ? '1px solid rgba(255,255,255,0.3)' : '2px dashed #999',
        background: card.owned
          ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.95) 100%)'
          : 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
        boxShadow: card.owned
          ? 'inset 0 1px 3px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.1)'
          : 'inset 0 1px 3px rgba(0,0,0,0.3)'
      }}
    >
      {/* Card slot indentation effect */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: card.owned ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
          backgroundImage: 'url(/imgs/cardback.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Card image with progressive loading */}
        <div className={`w-full h-full leading-[0] ${!card.owned ? 'opacity-60 grayscale' : ''}`}>
          <CardImage
            card={card}
            enableHover={false}
            enableTilt={false}
            className="w-full h-full"
          />
        </div>

        {card.owned ? (
          /* Quantity badge */
          <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
            {card.totalQuantity}
          </div>
        ) : null}

        {/* Plastic sleeve shine effect for owned cards */}
        {card.owned && (
          <PlasticSleeveEffect isHovered={isHovered} mousePosition={mousePosition} />
        )}

        {/* Card number at bottom */}
        <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
          #{card.number}
        </div>
      </div>
    </div>
  );
};

export default BinderCardSlot;
export type { CardWithOwnership };

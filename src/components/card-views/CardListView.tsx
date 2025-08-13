import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { LorcanaCard } from '../../types';
import { useCollection } from '../../contexts/CollectionContext';

interface CardListViewProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  staleCardIds: Set<number>;
  rarityIconMap: Record<string, string>;
  colorIconMap: Record<string, string>;
  sets: Array<{code: string; name: string; number: number}>;
  onCardClick?: (card: LorcanaCard) => void;
}

const CardListView: React.FC<CardListViewProps> = ({
  cards,
  onQuantityChange,
  staleCardIds,
  rarityIconMap,
  colorIconMap,
  sets,
  onCardClick
}) => {
  const { getCardQuantity } = useCollection();
  // Get quantity control background styling
  const getNormalBackground = () => 'bg-lorcana-cream border-lorcana-gold';
  const getFoilBackground = () => 'bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-300 border-blue-500';

  // Compact quantity controls for normal and foil
  const renderNormalControl = (card: LorcanaCard, quantity: number) => (
    <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${getNormalBackground()} transition-all`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuantityChange(card, -1, 0);
        }}
        disabled={quantity <= 0}
        className="p-0.5 rounded text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
        title="Remove normal copy"
      >
        <Minus size={8} />
      </button>
      <span className="font-semibold text-xs min-w-[1rem] text-center text-lorcana-ink">
        {quantity}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuantityChange(card, 1, 0);
        }}
        className="p-0.5 rounded text-green-600 hover:text-green-800 transition-colors"
        title="Add normal copy"
      >
        <Plus size={8} />
      </button>
    </div>
  );

  const renderFoilControl = (card: LorcanaCard, quantity: number) => (
    <div className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${getFoilBackground()} transition-all`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuantityChange(card, 0, -1);
        }}
        disabled={quantity <= 0}
        className="p-0.5 rounded text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400"
        title="Remove foil copy"
      >
        <Minus size={8} />
      </button>
      <span className="font-semibold text-xs min-w-[1rem] text-center text-lorcana-ink">
        {quantity}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuantityChange(card, 0, 1);
        }}
        className="p-0.5 rounded text-green-600 hover:text-green-800 transition-colors"
        title="Add foil copy"
      >
        <Plus size={8} />
      </button>
    </div>
  );

  return (
    <div className="columns-1 xl:columns-2 gap-0">
      {cards.map((card) => {
        const quantities = getCardQuantity(card.id);
        const setInfo = sets.find(s => s.code === card.setCode);
        
        return (
          <div 
            key={card.id} 
            className={`bg-lorcana-navy p-2 rounded-sm hover:shadow-xl transition-all duration-300 ease-out border-2 border-lorcana-gold hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer transform-gpu break-inside-avoid ${
              staleCardIds.has(card.id) ? 'bg-orange-200 border-orange-400' : ''
            }`}
            onClick={() => onCardClick?.(card)}
          >
            {/* Mobile Layout - Two Lines */}
            <div className="sm:hidden">
              {/* First Line - Icons and Name */}
              <div className="flex items-center gap-1.5 text-xs mb-1">
                {/* Set/Card Number */}
                <span className="font-mono text-lorcana-cream font-semibold text-center flex-shrink-0">
                  {setInfo?.number || '?'}/#{card.number}
                </span>
                
                {/* Rarity */}
                {rarityIconMap[card.rarity] && (
                  <img 
                    src={rarityIconMap[card.rarity]} 
                    alt={card.rarity}
                    className="w-4 h-4 flex-shrink-0"
                  />
                )}
                
                {/* Ink Color Icon */}
                {card.color && (
                  <div className="flex-shrink-0 w-5 h-5 relative">
                    {card.color.includes('-') ? (
                      // Dual-ink cards: show both icons split diagonally
                      (() => {
                        const [color1, color2] = card.color.split('-');
                        const icon1 = colorIconMap[color1];
                        const icon2 = colorIconMap[color2];
                        if (icon1 && icon2) {
                          return (
                            <div className="relative w-5 h-5">
                              {/* First color (top-left triangle) */}
                              <div className="absolute inset-0 overflow-hidden">
                                <img 
                                  src={icon1} 
                                  alt={color1}
                                  className="w-5 h-5"
                                  style={{
                                    clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                                  }}
                                />
                              </div>
                              {/* Second color (bottom-right triangle) */}
                              <div className="absolute inset-0 overflow-hidden">
                                <img 
                                  src={icon2} 
                                  alt={color2}
                                  className="w-5 h-5"
                                  style={{
                                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
                                  }}
                                />
                              </div>
                              {/* Diagonal separator line */}
                              <div 
                                className="absolute inset-0 border-black border-opacity-20"
                                style={{
                                  borderWidth: '0 0 1px 0',
                                  transform: 'rotate(45deg)',
                                  transformOrigin: 'center'
                                }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()
                    ) : (
                      // Single ink cards: show normal icon
                      colorIconMap[card.color] && (
                        <img 
                          src={colorIconMap[card.color]} 
                          alt={card.color}
                          className="w-5 h-5"
                        />
                      )
                    )}
                  </div>
                )}
                
                {/* Ink Cost */}
                <div className="relative flex-shrink-0">
                  <img
                    src={card.inkwell ? "/imgs/inkable.png" : "/imgs/uninkable.png"}
                    alt={card.inkwell ? "Inkable" : "Uninkable"}
                    className="w-5 h-5"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {card.cost}
                  </span>
                </div>

                {/* Card Name - Now on first line */}
                <div className="flex-1 min-w-0 truncate">
                  <span className="font-semibold text-white">{card.name}</span>
                  {card.version && (
                    <span className="font-normal italic text-lorcana-cream"> - {card.version}</span>
                  )}
                </div>
              </div>
              
              {/* Second Line - Quantity Controls */}
              <div className="flex items-center gap-1">
                {renderNormalControl(card, quantities.normal)}
                {renderFoilControl(card, quantities.foil)}
              </div>
            </div>

            {/* Desktop Layout - Single Line (Original) */}
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              {/* Set/Card Number */}
              <span className="font-mono text-lorcana-cream font-semibold w-16 text-center">
                {setInfo?.number || '?'}/#{card.number}
              </span>
              
              {/* Rarity */}
              {rarityIconMap[card.rarity] && (
                <img 
                  src={rarityIconMap[card.rarity]} 
                  alt={card.rarity}
                  className="w-4 h-4 flex-shrink-0"
                />
              )}
              
              {/* Ink Color Icon */}
              {card.color && (
                <div className="flex-shrink-0 w-5 h-5 relative">
                  {card.color.includes('-') ? (
                    // Dual-ink cards: show both icons split diagonally
                    (() => {
                      const [color1, color2] = card.color.split('-');
                      const icon1 = colorIconMap[color1];
                      const icon2 = colorIconMap[color2];
                      if (icon1 && icon2) {
                        return (
                          <div className="relative w-5 h-5">
                            {/* First color (top-left triangle) */}
                            <div className="absolute inset-0 overflow-hidden">
                              <img 
                                src={icon1} 
                                alt={color1}
                                className="w-5 h-5"
                                style={{
                                  clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                                }}
                              />
                            </div>
                            {/* Second color (bottom-right triangle) */}
                            <div className="absolute inset-0 overflow-hidden">
                              <img 
                                src={icon2} 
                                alt={color2}
                                className="w-5 h-5"
                                style={{
                                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
                                }}
                              />
                            </div>
                            {/* Diagonal separator line */}
                            <div 
                              className="absolute inset-0 border-black border-opacity-20"
                              style={{
                                borderWidth: '0 0 1px 0',
                                transform: 'rotate(45deg)',
                                transformOrigin: 'center'
                              }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()
                  ) : (
                    // Single ink cards: show normal icon
                    colorIconMap[card.color] && (
                      <img 
                        src={colorIconMap[card.color]} 
                        alt={card.color}
                        className="w-5 h-5"
                      />
                    )
                  )}
                </div>
              )}
              
              {/* Ink Cost */}
              <div className="relative flex-shrink-0">
                <img
                  src={card.inkwell ? "/imgs/inkable.png" : "/imgs/uninkable.png"}
                  alt={card.inkwell ? "Inkable" : "Uninkable"}
                  className="w-5 h-5"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {card.cost}
                </span>
              </div>

              
              {/* Main Info Section - Flexible Width */}
              <div className="flex-1 flex items-center min-w-0">
                <span className="truncate">
                  <span className="font-semibold text-white">{card.name}</span>
                  {card.version && (
                    <span className="font-normal italic text-lorcana-cream"> - {card.version}</span>
                  )}
                </span>
              </div>
              
              
              {/* Controls Section - Fixed Width */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {renderNormalControl(card, quantities.normal)}
                {renderFoilControl(card, quantities.foil)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CardListView;
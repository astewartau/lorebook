import React, { useState, useRef, useEffect } from 'react';
import { X, Search, ZoomIn, ZoomOut, Move, Check } from 'lucide-react';
import { allCards } from '../data/allCards';
import { LorcanaCard } from '../types';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatarData: { cardId: number; cropData: CropData }) => void;
  currentAvatar?: { cardId: number; cropData: CropData };
  title?: string;
}

interface CropData {
  x: number;
  y: number;
  scale: number;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  currentAvatar,
  title = "Choose Avatar"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCard, setSelectedCard] = useState<LorcanaCard | null>(null);
  const [cropData, setCropData] = useState<CropData>({ x: 50, y: 50, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  // Load current avatar if exists
  useEffect(() => {
    if (currentAvatar && isOpen) {
      const card = allCards.find(c => c.id === currentAvatar.cardId);
      if (card) {
        setSelectedCard(card);
        setCropData(currentAvatar.cropData);
      }
    }
  }, [currentAvatar, isOpen]);

  // Prevent scrolling when dragging
  useEffect(() => {
    if (isDragging) {
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };
      
      document.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isDragging]);

  // Filter cards based on search
  const filteredCards = searchTerm.length > 2 
    ? allCards.filter(card => 
        card.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 20)
    : [];

  const handleCardSelect = (card: LorcanaCard) => {
    setSelectedCard(card);
    setCropData({ x: 50, y: 50, scale: 1 }); // Reset crop when selecting new card
    setSearchTerm('');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation(); // Prevent event bubbling
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate the mouse movement delta
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Mathematical calculation for proper movement scaling:
    // - Avatar preview container is 128px (w-32 h-32)  
    // - At scale S, dragging the full container width should move 100/S percent of the image
    // - So movement per pixel should be: 100 / (S * containerSize)
    
    const containerSize = 128; // 128px (w-32)
    const movementPerPixel = 100 / (cropData.scale * containerSize);
    
    // Convert pixel movement to percentage movement (inverted for natural feel)
    const moveX = -deltaX * movementPerPixel;
    const moveY = -deltaY * movementPerPixel;
    
    setCropData(prev => {
      const newX = Math.max(0, Math.min(100, prev.x + moveX));
      const newY = Math.max(0, Math.min(100, prev.y + moveY));
      return {
        ...prev,
        x: newX,
        y: newY
      };
    });
    
    // Update drag start position for next movement
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation(); // Prevent event bubbling
    
    const touch = e.touches[0];
    // Calculate the touch movement delta
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    // Same mathematical calculation as mouse
    const containerSize = 128; // 128px (w-32)
    const movementPerPixel = 100 / (cropData.scale * containerSize);
    
    // Convert pixel movement to percentage movement (inverted for natural feel)
    const moveX = -deltaX * movementPerPixel;
    const moveY = -deltaY * movementPerPixel;
    
    setCropData(prev => {
      const newX = Math.max(0, Math.min(100, prev.x + moveX));
      const newY = Math.max(0, Math.min(100, prev.y + moveY));
      return {
        ...prev,
        x: newX,
        y: newY
      };
    });
    
    // Update drag start position for next movement
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setCropData(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale + 0.25)
    }));
  };

  const handleZoomOut = () => {
    setCropData(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale - 0.25)
    }));
  };

  const handleSave = () => {
    if (selectedCard) {
      onSave({
        cardId: selectedCard.id,
        cropData
      });
      onClose();
    }
  };

  const getCardImageUrl = (card: LorcanaCard) => {
    return card.images.full;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto art-deco-corner">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-lorcana-navy text-lorcana-gold border-b-2 border-lorcana-gold">
          <div>
            <h2 className="text-xl font-bold text-lorcana-cream">{title}</h2>
            <p className="text-sm text-lorcana-cream/80">Search for a card and select the perfect crop</p>
          </div>
          <button
            onClick={onClose}
            className="text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side - Card search and selection */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-navy" size={20} />
                <input
                  type="text"
                  placeholder="Search for a card..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
                />
              </div>

              {/* Search results */}
              {filteredCards.length > 0 && (
                <div className="border-2 border-lorcana-gold rounded-sm max-h-60 overflow-y-auto">
                  {filteredCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => handleCardSelect(card)}
                      className="w-full text-left px-3 py-2 hover:bg-lorcana-gold/20 transition-colors flex items-center space-x-3"
                    >
                      <img 
                        src={getCardImageUrl(card)} 
                        alt={card.fullName}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <div className="font-medium text-sm text-lorcana-ink">{card.fullName}</div>
                        <div className="text-xs text-lorcana-navy">
                          Set {card.setCode} • #{card.number}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected card preview */}
              {selectedCard && (
                <div className="border-2 border-lorcana-gold rounded-sm p-4 bg-lorcana-cream/30">
                  <h3 className="font-medium text-lorcana-ink mb-2">Selected Card</h3>
                  <div className="flex justify-center">
                    <img 
                      src={getCardImageUrl(selectedCard)} 
                      alt={selectedCard.fullName}
                      className="w-32 h-auto rounded shadow-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-lorcana-navy text-center">{selectedCard.fullName}</p>
                </div>
              )}
            </div>

            {/* Right side - Avatar preview and controls */}
            <div className="space-y-4">
              <div className="border-2 border-lorcana-gold rounded-sm p-4">
                <h3 className="font-medium text-lorcana-ink mb-3">Avatar Preview</h3>
                
                {selectedCard ? (
                  <>
                    {/* Avatar preview circle */}
                    <div className="flex justify-center mb-4">
                      <div 
                        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-lorcana-gold cursor-move"
                        style={{ touchAction: 'none' }}
                        ref={imageRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url(${getCardImageUrl(selectedCard)})`,
                            backgroundSize: `${100 * cropData.scale}%`,
                            backgroundPosition: `${cropData.x}% ${cropData.y}%`,
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={handleZoomOut}
                          className="p-2 border border-lorcana-gold rounded hover:bg-lorcana-gold/20 transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut size={16} />
                        </button>
                        <span className="text-sm text-lorcana-navy px-3">
                          {Math.round(cropData.scale * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="p-2 border border-lorcana-gold rounded hover:bg-lorcana-gold/20 transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn size={16} />
                        </button>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-lorcana-navy flex items-center justify-center gap-1">
                          <Move size={14} />
                          Drag image to reposition
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-lorcana-navy/60">
                    <Search size={32} className="mb-2" />
                    <p className="text-sm">Search and select a card</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border-2 border-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-gold/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedCard}
                  className="flex-1 px-4 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Save Avatar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarEditor;
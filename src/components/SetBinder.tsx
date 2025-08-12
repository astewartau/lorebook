import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCollection } from '../contexts/CollectionContext';
import { useImageLoad } from '../contexts/ImageLoadContext';
import { consolidatedCards, sets } from '../data/allCards';
import CardImage from './CardImage';
import CardPreviewModal from './CardPreviewModal';
import { ConsolidatedCard } from '../types';

const SetBinder: React.FC = () => {
  const { setCode } = useParams<{ setCode: string }>();
  const navigate = useNavigate();
  const { getVariantQuantities } = useCollection();
  const imageLoad = useImageLoad();
  const [currentPageSpread, setCurrentPageSpread] = useState(0);
  const [selectedCard, setSelectedCard] = useState<ConsolidatedCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setData = sets.find(set => set.code === setCode);
  
  const setCards = !setCode ? [] : consolidatedCards
    .filter(card => card.baseCard.setCode === setCode)
    .sort((a, b) => a.baseCard.number - b.baseCard.number);

  const cardsWithOwnership = setCards.map(card => {
    const quantities = getVariantQuantities(card.fullName);
    const totalOwned = quantities.regular + quantities.foil + quantities.enchanted + quantities.special;
    
    return {
      ...card,
      owned: totalOwned > 0,
      quantities
    };
  });

  // Calculate derived values
  const ownedCount = cardsWithOwnership.filter(card => card.owned).length;
  const completionPercentage = setCards.length > 0 ? (ownedCount / setCards.length) * 100 : 0;
  const totalPageSpreads = Math.ceil(cardsWithOwnership.length / 18);

  // Preload adjacent pages for smooth navigation
  useEffect(() => {
    console.log(`[SetBinder] Preloading adjacent pages for current page: ${currentPageSpread}`);
    
    // Get cards for previous and next page spreads
    const prevPageStart = (currentPageSpread - 1) * 18;
    const nextPageStart = (currentPageSpread + 1) * 18;
    
    const prevPageCards = cardsWithOwnership.slice(prevPageStart, prevPageStart + 18);
    const nextPageCards = cardsWithOwnership.slice(nextPageStart, nextPageStart + 18);
    
    // Preload previous page images at low priority
    if (currentPageSpread > 0) {
      console.log(`[SetBinder] Preloading ${prevPageCards.length} cards from previous page ${currentPageSpread - 1}`);
      prevPageCards.forEach(cardData => {
        imageLoad.registerImage(
          cardData.baseCard.images.full,
          'regular-full',
          `preload-${cardData.baseCard.id}`,
          false, // not in viewport
          () => {}, // no callback needed
          () => {}  // no error callback needed
        );
      });
    }
    
    // Preload next page images at low priority  
    if (currentPageSpread < totalPageSpreads - 1) {
      console.log(`[SetBinder] Preloading ${nextPageCards.length} cards from next page ${currentPageSpread + 1}`);
      nextPageCards.forEach(cardData => {
        imageLoad.registerImage(
          cardData.baseCard.images.full,
          'regular-full', 
          `preload-${cardData.baseCard.id}`,
          false, // not in viewport
          () => {}, // no callback needed
          () => {}  // no error callback needed
        );
      });
    }
  }, [currentPageSpread, cardsWithOwnership, totalPageSpreads]);
  
  const handleNextPage = () => {
    if (currentPageSpread < totalPageSpreads - 1) {
      console.log(`[SetBinder] Navigating to next page: ${currentPageSpread} → ${currentPageSpread + 1}`);
      setCurrentPageSpread(prev => prev + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPageSpread > 0) {
      console.log(`[SetBinder] Navigating to prev page: ${currentPageSpread} → ${currentPageSpread - 1}`);
      setCurrentPageSpread(prev => prev - 1);
    }
  };

  const handleCardClick = (card: ConsolidatedCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };


  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevPage, handleNextPage]);

  if (!setData || !setCode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-lorcana-ink mb-2">Set not found</h2>
          <button 
            onClick={() => navigate('/collection')}
            className="btn-lorcana"
          >
            Back to Collection
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3320 50%, #3d2817 75%, #2c1810 100%)',
      position: 'relative'
    }}>
      {/* Wood grain texture overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.1) 2px,
          rgba(0,0,0,0.1) 4px
        ), repeating-linear-gradient(
          0deg,
          transparent,
          transparent 1px,
          rgba(0,0,0,0.05) 1px,
          rgba(0,0,0,0.05) 2px
        )`
      }} />
      {/* Header - floating above the binder */}
      <div className="relative z-10 p-4 pb-0">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur border-2 border-lorcana-gold rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/collection')}
                  className="flex items-center gap-2 text-lorcana-navy hover:text-lorcana-gold transition-colors"
                >
                  <ArrowLeft size={20} />
                  <span>Back to Collection</span>
                </button>
                <div className="w-px h-8 bg-lorcana-gold"></div>
                <div className="flex items-center gap-3">
                  <Book size={24} className="text-lorcana-gold" />
                  <div>
                    <h1 className="text-2xl font-bold text-lorcana-ink">{setData.name} Binder</h1>
                    <p className="text-lorcana-navy">
                      Set {setData.number} • {ownedCount}/{setCards.length} cards ({completionPercentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation - Above Binder */}
      <div className="p-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPageSpread === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentPageSpread === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 hover:scale-105 shadow-lg'
              }`}
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>

            <div className="text-center text-amber-100">
              <div className="text-lg font-semibold">
                Pages {currentPageSpread * 2 + 1}-{Math.min(currentPageSpread * 2 + 2, totalPageSpreads * 2)}
              </div>
              <div className="text-sm opacity-80 mb-2">
                Spread {currentPageSpread + 1} of {totalPageSpreads}
              </div>
              {/* Progress dots */}
              <div className="flex justify-center gap-1">
                {Array.from({ length: totalPageSpreads }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i !== currentPageSpread) {
                        console.log(`[SetBinder] Navigating via dot: ${currentPageSpread} → ${i}`);
                        setCurrentPageSpread(i);
                      }
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      i === currentPageSpread 
                        ? 'bg-amber-300 scale-125' 
                        : 'bg-amber-600/60 hover:bg-amber-400'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs opacity-60 mt-2 text-amber-200">
                Use ← → arrow keys to navigate
              </div>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPageSpread >= totalPageSpreads - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentPageSpread >= totalPageSpreads - 1
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 hover:scale-105 shadow-lg'
              }`}
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Binder Physical Representation */}
      <div className="p-4 pt-0">
        <div className="max-w-7xl mx-auto">
          {/* Binder Cover/Spine Effect */}
          <div 
            className="relative flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 25%, #CD853F  50%, #DEB887 75%, #F5DEB3 100%), linear-gradient(90deg, #2C1810 0%, #5D2E14 5%, #8B4513 15%, #A0522D 85%, #5D2E14 95%, #2C1810 100%)',
              backgroundBlendMode: 'multiply',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 2px 10px rgba(255,255,255,0.1)',
              border: '3px solid #8B4513'
            }}
          >
            
            {/* Binder binding holes and spine details */}
            <div className="absolute left-4 top-8 bottom-8 w-8 flex flex-col justify-center items-center space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative">
                  {/* Ring base */}
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{
                      background: 'linear-gradient(145deg, #C0C0C0 0%, #808080 50%, #404040 100%)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)'
                    }}
                  >
                    {/* Inner ring hole */}
                    <div
                      className="absolute inset-1 rounded-full"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, #2A2A2A, #0A0A0A)',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9), inset 0 -1px 2px rgba(255,255,255,0.1)'
                      }}
                    />
                    {/* Metallic highlight */}
                    <div
                      className="absolute top-1 left-1 w-2 h-2 rounded-full opacity-70"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8), transparent)',
                        filter: 'blur(1px)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Spine stitching */}
            <div className="absolute left-12 top-4 bottom-4 w-px flex flex-col justify-between">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-px"
                  style={{
                    background: 'linear-gradient(to bottom, #8B6B47, #6B5B37)',
                    boxShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                  }}
                />
              ))}
            </div>

            {/* Main binder content area */}
            <div className="pl-16 pr-8 py-8 flex-1 flex flex-col">

              {/* Binder Page Spread */}
              <div className="page-container relative flex-1">
                <div
                  className="page-spread flex gap-0 h-full relative"
                >
                  {/* Left Page */}
                  <div className="flex-1 flex flex-col" style={{
                    position: 'relative',
                    zIndex: 1,
                    background: `
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%),
                      repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(218,165,32,0.03) 2px,
                        rgba(218,165,32,0.03) 4px
                      )
                    `,
                    border: '2px solid #D4AF37',
                    borderRadius: '8px 2px 2px 8px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset -2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      2px 0 8px rgba(0,0,0,0.1)
                    `,
                    padding: '24px'
                  }}>
                    {/* Page edge effect */}
                    <div className="absolute right-0 top-0 bottom-0 w-px" style={{
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.05), rgba(0,0,0,0.1))',
                      boxShadow: '-1px 0 2px rgba(0,0,0,0.05)'
                    }} />
                    
                    {/* Paper fiber texture */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
                      mixBlendMode: 'multiply'
                    }} />
                    {/* Page content */}
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {cardsWithOwnership
                        .slice(currentPageSpread * 18, currentPageSpread * 18 + 9)
                        .map((cardData, index) => (
                          <div
                            key={cardData.baseCard.id}
                            className="relative aspect-[5/7] overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
                            onClick={() => handleCardClick(cardData)}
                            style={{
                              border: cardData.owned ? '1px solid rgba(255,255,255,0.3)' : '2px dashed #999',
                              background: cardData.owned 
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.95) 100%)' 
                                : 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
                              boxShadow: cardData.owned 
                                ? 'inset 0 1px 3px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.1)'
                                : 'inset 0 1px 3px rgba(0,0,0,0.3)'
                            }}
                          >
                            {/* Card slot indentation effect */}
                            <div className="absolute inset-0" style={{
                              boxShadow: cardData.owned ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
                              backgroundImage: 'url(/imgs/cardback.svg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              
                              {/* Card image with progressive loading */}
                              <div className={`w-full h-full leading-[0] ${!cardData.owned ? 'opacity-60 grayscale' : ''}`}>
                                <CardImage
                                  card={cardData.baseCard}
                                  enchantedCard={cardData.enchantedCard}
                                  size="full"
                                  enableHover={false}
                                  enableTilt={false}
                                  className="w-full h-full"
                                />
                              </div>
                              
                              {cardData.owned ? (
                                /* Quantity badge */
                                <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                                  {cardData.quantities.regular + cardData.quantities.foil + cardData.quantities.enchanted + cardData.quantities.special}
                                </div>
                              ) : null}

                              {/* Plastic sleeve shine effect for owned cards */}
                              {cardData.owned && (
                                <div 
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background: `linear-gradient(
                                      135deg,
                                      transparent 0%,
                                      rgba(255,255,255,0.2) 45%,
                                      rgba(255,255,255,0.3) 50%,
                                      rgba(255,255,255,0.2) 55%,
                                      transparent 100%
                                    )`,
                                    opacity: 0.6
                                  }}
                                />
                              )}
                              
                              {/* Card number at bottom */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                                #{cardData.baseCard.number}
                              </div>
                            </div>
                          </div>
                        ))}
                      
                      {Array.from({ 
                        length: Math.max(0, 9 - cardsWithOwnership.slice(currentPageSpread * 18, currentPageSpread * 18 + 9).length) 
                      }, (_, i) => (
                        <div
                          key={`empty-left-${i}`}
                          className="border-2 border-dashed border-gray-300 bg-gray-50 opacity-30"
                          style={{ aspectRatio: '5/7' }}
                        />
                      ))}
                    </div>
                    
                    {/* Page number */}
                    <div className="mt-auto pt-4 text-center text-amber-800 text-sm font-medium relative z-10">
                      Page {currentPageSpread * 2 + 1}
                    </div>
                  </div>

                  {/* Right Page */}
                  <div className="flex-1 flex flex-col" style={{
                    position: 'relative',
                    zIndex: 1,
                    background: `
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%),
                      repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(218,165,32,0.03) 2px,
                        rgba(218,165,32,0.03) 4px
                      )
                    `,
                    border: '2px solid #D4AF37',
                    borderRadius: '2px 8px 8px 2px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset 2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      -2px 0 8px rgba(0,0,0,0.1)
                    `,
                    padding: '24px'
                  }}>
                    {/* Page edge effect */}
                    <div className="absolute left-0 top-0 bottom-0 w-px" style={{
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.05), rgba(0,0,0,0.1))',
                      boxShadow: '1px 0 2px rgba(0,0,0,0.05)'
                    }} />
                    
                    {/* Paper fiber texture */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
                      mixBlendMode: 'multiply'
                    }} />
                    {/* Page content */}
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {cardsWithOwnership
                        .slice(currentPageSpread * 18 + 9, currentPageSpread * 18 + 18)
                        .map((cardData, index) => (
                          <div
                            key={cardData.baseCard.id}
                            className="relative aspect-[5/7] overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
                            onClick={() => handleCardClick(cardData)}
                            style={{
                              border: cardData.owned ? '1px solid rgba(255,255,255,0.3)' : '2px dashed #999',
                              background: cardData.owned 
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.95) 100%)' 
                                : 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)',
                              boxShadow: cardData.owned 
                                ? 'inset 0 1px 3px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.1)'
                                : 'inset 0 1px 3px rgba(0,0,0,0.3)'
                            }}
                          >
                            {/* Card slot indentation effect */}
                            <div className="absolute inset-0" style={{
                              boxShadow: cardData.owned ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
                              backgroundImage: 'url(/imgs/cardback.svg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              
                              {/* Card image with progressive loading */}
                              <div className={`w-full h-full leading-[0] ${!cardData.owned ? 'opacity-60 grayscale' : ''}`}>
                                <CardImage
                                  card={cardData.baseCard}
                                  enchantedCard={cardData.enchantedCard}
                                  size="full"
                                  enableHover={false}
                                  enableTilt={false}
                                  className="w-full h-full"
                                />
                              </div>
                              
                              {cardData.owned ? (
                                /* Quantity badge */
                                <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                                  {cardData.quantities.regular + cardData.quantities.foil + cardData.quantities.enchanted + cardData.quantities.special}
                                </div>
                              ) : null}

                              {/* Plastic sleeve shine effect for owned cards */}
                              {cardData.owned && (
                                <div 
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    background: `linear-gradient(
                                      135deg,
                                      transparent 0%,
                                      rgba(255,255,255,0.2) 45%,
                                      rgba(255,255,255,0.3) 50%,
                                      rgba(255,255,255,0.2) 55%,
                                      transparent 100%
                                    )`,
                                    opacity: 0.6
                                  }}
                                />
                              )}
                              
                              {/* Card number at bottom */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                                #{cardData.baseCard.number}
                              </div>
                            </div>
                          </div>
                        ))}
                      
                      {Array.from({ 
                        length: Math.max(0, 9 - cardsWithOwnership.slice(currentPageSpread * 18 + 9, currentPageSpread * 18 + 18).length) 
                      }, (_, i) => (
                        <div
                          key={`empty-right-${i}`}
                          className="border-2 border-dashed border-gray-300 bg-gray-50 opacity-30"
                          style={{ aspectRatio: '5/7' }}
                        />
                      ))}
                    </div>
                    
                    {/* Page number */}
                    <div className="mt-auto pt-4 text-center text-amber-800 text-sm font-medium relative z-10">
                      Page {currentPageSpread * 2 + 2}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Preview Modal */}
      <CardPreviewModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default SetBinder;
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, ChevronLeft, ChevronRight, Maximize2, Minimize2, Search, Plus, X } from 'lucide-react';
import { useCollection } from '../contexts/CollectionContext';
import { useBinder } from '../contexts/BinderContext';
import { useBinderNavigation } from '../hooks/useBinderNavigation';
import { useCardData } from '../contexts/CardDataContext';
import CardPhotoSwipe from './CardPhotoSwipe';
import BinderCardSlot from './binder/BinderCardSlot';
import { LorcanaCard } from '../types';
import * as api from '../lib/api';

const SetBinder: React.FC = () => {
  const { setCode, binderId, customBinderId } = useParams<{ setCode?: string; binderId?: string; customBinderId?: string }>();
  const navigate = useNavigate();
  const { getCardQuantity } = useCollection();
  const { binders, setCurrentBinder, addCardToBinder, removeCardFromBinder, setBinderCards } = useBinder();
  const { allCards, sets } = useCardData();
  const [selectedCard, setSelectedCard] = useState<LorcanaCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [binderView, setBinderView] = useState<api.BinderView | null>(null);
  const publishedBinder = binderView?.binder ?? null;
  const publishedBinderOwner = binderView?.owner ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const binderRef = useRef<HTMLDivElement>(null);

  // Custom binder from context
  const customBinder = customBinderId ? binders.find(b => b.id === customBinderId) : null;
  const isCustomBinder = !!customBinderId;

  // Set current binder in context when viewing
  useEffect(() => {
    if (customBinder) {
      setCurrentBinder(customBinder);
    }
    return () => setCurrentBinder(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customBinderId]);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && binderRef.current) {
      binderRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Load published binder data if we have a binderId
  useEffect(() => {
    if (binderId) {
      loadPublishedBinder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binderId]); // loadPublishedBinder is stable

  const loadPublishedBinder = async () => {
    if (!binderId) return;
    setLoading(true);
    setError(null);
    try {
      const view = await api.getBinderView(binderId);
      if (!view) {
        setError('This binder does not exist or is not shared.');
      }
      setBinderView(view);
    } catch (err) {
      setError(`Could not load binder: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Shared binders show their owner's quantities; your own binders show yours.
  const ownerQuantities = useMemo(
    () => new Map((binderView?.owned ?? []).map(o => [o.cardId, o])),
    [binderView]
  );

  const getOwnerCardQuantity = useCallback((cardId: number) => {
    if (binderId) {
      const q = ownerQuantities.get(cardId);
      const normal = q?.quantityNormal ?? 0;
      const foil = q?.quantityFoil ?? 0;
      return { total: normal + foil, foil, nonFoil: normal };
    }
    const own = getCardQuantity(cardId);
    return { total: own.total, foil: own.foil, nonFoil: own.normal };
  }, [binderId, ownerQuantities, getCardQuantity]);

  // Determine the actual setCode to use (from URL param or from published binder)
  const effectiveSetCode = setCode || publishedBinder?.setCode;
  const setData = effectiveSetCode ? sets.find(set => set.code === effectiveSetCode) : null;

  // Build card list: custom binder uses its own card entries, set binder uses set cards
  const cardsWithOwnership = useMemo(() => {
    if (isCustomBinder && customBinder) {
      return customBinder.cards
        .map(entry => {
          const card = allCards.find(c => c.id === entry.cardId);
          if (!card) return null;
          return {
            ...card,
            owned: true,
            totalQuantity: entry.quantity
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
    }

    const setCards = !effectiveSetCode ? [] : allCards
      .filter(card => card.setCode === effectiveSetCode && !card.promoGrouping)
      .sort((a, b) => a.number - b.number);

    return setCards.map(card => {
      const quantities = getOwnerCardQuantity(card.id);
      return {
        ...card,
        owned: quantities.total > 0,
        totalQuantity: quantities.total
      };
    });
  }, [isCustomBinder, customBinder, effectiveSetCode, allCards, getOwnerCardQuantity]);

  // Search results for add panel
  const addSearchResults = useMemo(() => {
    if (!showAddPanel || !addSearchTerm.trim() || !customBinder) return [];
    const term = addSearchTerm.toLowerCase().trim();
    return allCards
      .filter(c => c.fullName.toLowerCase().includes(term) || c.name.toLowerCase().includes(term))
      .slice(0, 12);
  }, [showAddPanel, addSearchTerm, allCards, customBinder]);

  // Calculate derived values
  const ownedCount = cardsWithOwnership.filter(card => card.owned).length;
  const setCards = isCustomBinder ? cardsWithOwnership : (!effectiveSetCode ? [] : allCards.filter(card => card.setCode === effectiveSetCode && !card.promoGrouping));
  const completionPercentage = setCards.length > 0 ? (ownedCount / setCards.length) * 100 : 0;
  // Desktop: 18 cards per spread (9 left + 9 right), Mobile: 9 cards per page
  const totalPageSpreads = Math.ceil(cardsWithOwnership.length / 18);
  const totalMobilePages = Math.ceil(cardsWithOwnership.length / 9);

  // Navigation hook (handles desktop/mobile nav, swipe, and keyboard)
  const {
    currentPageSpread,
    currentMobilePage,
    setCurrentPageSpread,
    setCurrentMobilePage,
    handleNextPage,
    handlePrevPage,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } = useBinderNavigation({ totalPageSpreads, totalMobilePages, isMobile, disableKeyboardNav: isModalOpen });

  const handleCardClick = (card: LorcanaCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  // Calculate the index of the selected card in the cards array for PhotoSwipe
  const selectedCardIndex = selectedCard
    ? cardsWithOwnership.findIndex(c => c.id === selectedCard.id)
    : 0;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
    setHoveredCard(cardId);
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
  };

  // Drag and drop handlers for custom binder reordering
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDropIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex && customBinder && customBinderId) {
      const newCards = [...customBinder.cards];
      const [moved] = newCards.splice(dragIndex, 1);
      newCards.splice(dropIndex, 0, moved);
      setBinderCards(customBinderId, newCards);
    }
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, dropIndex, customBinder, customBinderId, setBinderCards]);

  // Show loading spinner while loading published binder
  if (loading && binderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold mb-4"></div>
          <p className="text-lorcana-ink">Loading binder...</p>
        </div>
      </div>
    );
  }

  // Handle error cases
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading Binder
          </h2>
          <p className="text-gray-700 mb-4">
            {error}
          </p>
          <button 
            onClick={() => navigate(binderId ? '/community' : '/collections')}
            className="btn-lorcana mr-2"
          >
            Go Back
          </button>
          <button 
            onClick={() => {
              setError(null);
              if (binderId) {
                loadPublishedBinder();
              }
            }}
            className="btn-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isCustomBinder && !customBinder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-lorcana-ink mb-2">Binder not found</h2>
          <p className="text-lorcana-navy mb-4">This binder may have been deleted.</p>
          <button onClick={() => navigate('/collections')} className="btn-lorcana">
            Back to Collections
          </button>
        </div>
      </div>
    );
  }

  if (!isCustomBinder && (!setData || (!setCode && !effectiveSetCode))) {
    const isBinderNotFound = binderId && !publishedBinder;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-lorcana-ink mb-2">
            {isBinderNotFound ? 'Binder not found' : 'Set not found'}
          </h2>
          <p className="text-lorcana-navy mb-4">
            {isBinderNotFound
              ? 'This binder may have been deleted or made private.'
              : 'The requested set could not be found.'
            }
          </p>
          <button
            onClick={() => navigate(binderId ? '/community' : '/collections')}
            className="btn-lorcana"
          >
            {binderId ? 'Back to Community' : 'Back to Collections'}
          </button>
        </div>
      </div>
    );
  }


  return (
    <div ref={binderRef} className="min-h-screen relative" style={{
      background: 'linear-gradient(135deg, #2c1810 0%, #3d2817 25%, #4a3320 50%, #3d2817 75%, #2c1810 100%)',
      margin: 0,
      padding: 0
    }}>
      {/* Leather texture overlay for background - TEST */}
      <div className="absolute inset-0 opacity-70 pointer-events-none" style={{
        background: `url('/imgs/leather.png')`,
        backgroundSize: '100px 100px',
        mixBlendMode: 'normal',
        zIndex: 0
      }} />
      {/* Header - floating above the binder - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="relative z-10 p-4 pb-0">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur border-2 border-lorcana-gold rounded-lg shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate(isCustomBinder ? '/collections' : binderId ? '/community' : '/collections')}
                    className="flex items-center gap-2 text-lorcana-navy hover:text-lorcana-gold transition-colors"
                  >
                    <ArrowLeft size={20} />
                    <span>{binderId ? 'Back to Community' : 'Back to Collections'}</span>
                  </button>
                  <div className="w-px h-8 bg-lorcana-gold"></div>
                  <div className="flex items-center gap-3">
                    <Book size={24} className="text-lorcana-gold" />
                    <div>
                      <h1 className="text-2xl font-bold text-lorcana-ink">
                        {isCustomBinder
                          ? customBinder?.name || 'Custom Binder'
                          : publishedBinder ? publishedBinder.name : `${setData!.name} Binder`}
                      </h1>
                      <p className="text-lorcana-navy">
                        {isCustomBinder ? (
                          <>
                            {cardsWithOwnership.length} card{cardsWithOwnership.length !== 1 ? 's' : ''}
                            {customBinder?.description && <> • {customBinder.description}</>}
                          </>
                        ) : publishedBinder && publishedBinderOwner ? (
                          <>
                            {publishedBinderOwner.displayName}'s Collection • Set {setData!.number} • {ownedCount}/{setCards.length} cards ({completionPercentage.toFixed(1)}%)
                          </>
                        ) : (
                          <>
                            Set {setData!.number} • {ownedCount}/{setCards.length} cards ({completionPercentage.toFixed(1)}%)
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right side - Add Cards + Fullscreen */}
                <div className="flex items-center gap-2">
                  {isCustomBinder && (
                    <button
                      onClick={() => setShowAddPanel(!showAddPanel)}
                      className={`flex items-center gap-2 px-3 py-2 transition-colors border rounded-lg ${
                        showAddPanel
                          ? 'bg-lorcana-gold text-lorcana-navy border-lorcana-gold'
                          : 'text-lorcana-navy hover:text-lorcana-gold border-lorcana-gold/30 hover:border-lorcana-gold'
                      }`}
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">Add Cards</span>
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2 px-3 py-2 text-lorcana-navy hover:text-lorcana-gold transition-colors border border-lorcana-gold/30 hover:border-lorcana-gold rounded-lg"
                    title="Enter Fullscreen"
                  >
                    <Maximize2 size={18} />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search/Add Panel for custom binders */}
      {showAddPanel && isCustomBinder && !isFullscreen && (
        <div className="relative z-10 px-4 pt-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur border-2 border-lorcana-gold rounded-lg shadow-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lorcana-navy/50" />
                  <input
                    type="text"
                    value={addSearchTerm}
                    onChange={(e) => setAddSearchTerm(e.target.value)}
                    placeholder="Search cards to add..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-lorcana-gold/50 rounded-lg bg-lorcana-cream text-lorcana-ink focus:ring-2 focus:ring-lorcana-gold/50 focus:border-lorcana-gold"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => { setShowAddPanel(false); setAddSearchTerm(''); }}
                  className="p-2 text-lorcana-navy hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              {addSearchResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {addSearchResults.map(card => {
                    const inBinder = customBinder?.cards.find(c => c.cardId === card.id);
                    return (
                      <div key={card.id} className="relative group">
                        <div className="aspect-[5/7] rounded overflow-hidden shadow-md border border-lorcana-gold/30">
                          <img
                            src={card.images.thumbnail}
                            alt={card.fullName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <button
                          onClick={() => addCardToBinder(customBinderId!, card.id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors rounded"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-lorcana-gold text-lorcana-ink text-xs font-bold px-2 py-1 rounded shadow">
                            {inBinder ? `Add (${inBinder.quantity})` : 'Add'}
                          </span>
                        </button>
                        <p className="text-xs text-lorcana-ink mt-1 truncate text-center">{card.fullName}</p>
                      </div>
                    );
                  })}
                </div>
              ) : addSearchTerm.trim() ? (
                <p className="text-center text-lorcana-navy/60 py-4">No cards found for "{addSearchTerm}"</p>
              ) : (
                <p className="text-center text-lorcana-navy/60 py-4">Type a card name to search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen controls overlay */}
      {isFullscreen && (
        <>
          {/* Exit fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20"
            title="Exit Fullscreen"
          >
            <Minimize2 size={18} />
            <span className="hidden sm:inline">Exit Fullscreen</span>
          </button>
          
          {/* Navigation buttons for fullscreen */}
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4">
            {/* Previous button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPageSpread === 0}
              className={`flex items-center justify-center gap-2 px-4 py-2 w-32 rounded-lg transition-all backdrop-blur-sm ${
                currentPageSpread === 0
                  ? 'bg-gray-600/70 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700/90 shadow-lg'
              }`}
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>
            
            {/* Page indicator */}
            <div className={`px-4 py-2 bg-black/70 text-white rounded-lg backdrop-blur-sm ${isFullscreen ? 'hidden' : ''}`}>
              <span className="font-semibold">
                {currentPageSpread * 2 + 1}-{Math.min(currentPageSpread * 2 + 2, totalPageSpreads * 2)}
              </span>
              <span className="text-sm opacity-80 ml-2">
                of {totalPageSpreads * 2}
              </span>
            </div>
            
            {/* Next button */}
            <button
              onClick={handleNextPage}
              disabled={currentPageSpread >= totalPageSpreads - 1}
              className={`flex items-center justify-center gap-2 px-4 py-2 w-32 rounded-lg transition-all backdrop-blur-sm ${
                currentPageSpread >= totalPageSpreads - 1
                  ? 'bg-gray-600/70 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700/90 shadow-lg'
              }`}
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}

      {/* Page Navigation - Above Binder - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="sm:p-4 sm:pb-2 p-2 pb-1">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center sm:mb-4 mb-2">
            {/* Desktop navigation buttons */}
            <button
              onClick={() => {
                handlePrevPage();
              }}
              disabled={currentPageSpread === 0}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentPageSpread === 0
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 shadow-lg'
              }`}
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>
            
            {/* Mobile: Empty space for centering */}
            <div className="sm:hidden w-8"></div>

            <div className="text-center text-amber-100">
              {/* Desktop navigation display */}
              <div className="hidden sm:block">
                <div className="text-lg font-semibold">
                  Pages {currentPageSpread * 2 + 1}-{Math.min(currentPageSpread * 2 + 2, totalPageSpreads * 2)}
                </div>
                <div className="text-sm opacity-80 mb-2">
                  Spread {currentPageSpread + 1} of {totalPageSpreads}
                </div>
              </div>
              
              {/* Mobile navigation display */}
              <div className="sm:hidden">
                <div className="text-lg font-semibold">
                  Page {currentMobilePage + 1}
                </div>
                <div className="text-sm opacity-80 mb-2">
                  {currentMobilePage + 1} of {totalMobilePages}
                </div>
                <div className="text-xs opacity-60 text-amber-200">
                  Swipe left/right to navigate
                </div>
              </div>
              
              {/* Progress dots - Desktop */}
              <div className="hidden sm:flex justify-center gap-1">
                {Array.from({ length: totalPageSpreads }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i !== currentPageSpread) {
                        setCurrentPageSpread(i);
                        setCurrentMobilePage(i * 2);
                      }
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentPageSpread 
                        ? 'bg-amber-300' 
                        : 'bg-amber-600/60 hover:bg-amber-500/80'
                    }`}
                  />
                ))}
              </div>
              
              {/* Progress dots - Mobile */}
              <div className="sm:hidden flex justify-center gap-1">
                {Array.from({ length: totalMobilePages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (i !== currentMobilePage) {
                        setCurrentMobilePage(i);
                        setCurrentPageSpread(Math.floor(i / 2));
                      }
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentMobilePage 
                        ? 'bg-amber-300' 
                        : 'bg-amber-600/60 hover:bg-amber-500/80'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs opacity-60 mt-2 text-amber-200 hidden sm:block">
                Use ← → arrow keys to navigate
              </div>
            </div>

            {/* Desktop navigation buttons */}
            <button
              onClick={() => {
                handleNextPage();
              }}
              disabled={currentPageSpread >= totalPageSpreads - 1}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentPageSpread >= totalPageSpreads - 1
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 shadow-lg'
              }`}
            >
              <span>Next</span>
              <ChevronRight size={20} />
            </button>
            
            {/* Mobile: Empty space for centering */}
            <div className="sm:hidden w-8"></div>
          </div>
        </div>
      </div>
      )}

      {/* Binder Physical Representation */}
      <div className={`${isFullscreen ? 'h-screen flex items-center justify-center p-4' : 'sm:p-4 sm:pt-0 p-2 pt-0'}`}>
        <div className={`mx-auto ${isFullscreen ? 'w-[80vw] h-[93vh]' : 'max-w-7xl'}`} style={isFullscreen ? { minWidth: 'calc(3 * 25vh * 5 / 7 + 12rem)' } : {}}>
          {/* Binder Cover/Spine Effect */}
          <div 
            className={`relative flex flex-col ${isFullscreen ? 'h-full w-full' : ''}`}
            style={{
              background: `
                url('/imgs/leather.png'),
                linear-gradient(135deg, #2C1810 0%, #4A2C1A 25%, #6B3A20 50%, #4A2C1A 75%, #2C1810 100%)
              `,
              backgroundSize: '100px 100px, 100% 100%',
              backgroundBlendMode: 'normal, multiply',
              borderRadius: '12px',
              boxShadow: `
                0 25px 50px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.2),
                inset 0 -1px 0 rgba(0,0,0,0.8),
                inset 2px 0 4px rgba(0,0,0,0.3),
                inset -2px 0 4px rgba(0,0,0,0.3)
              `,
              border: '2px solid #1A0F08'
            }}
          >
            
            
            {/* Desktop spine stitching - left side */}
            <div className="hidden sm:flex absolute left-8 top-4 bottom-4 w-px flex-col justify-between">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-px"
                  style={{
                    background: 'linear-gradient(to bottom, #D4AF37, #B8941F)',
                    boxShadow: '1px 1px 3px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.3)'
                  }}
                />
              ))}
            </div>

            {/* Mobile top stitching */}
            <div className="sm:hidden absolute top-4 left-4 right-4 h-px flex justify-between">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-px"
                  style={{
                    background: 'linear-gradient(to right, #D4AF37, #B8941F)',
                    boxShadow: '1px 1px 3px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.3)'
                  }}
                />
              ))}
            </div>

            {/* Main binder content area */}
            <div className={`sm:pl-16 sm:pr-8 sm:py-8 pl-4 pr-4 pt-8 pb-4 flex flex-col ${isFullscreen ? 'flex-1 min-h-0' : 'flex-1'}`}>

              {/* Binder Page Spread */}
              <div className={`page-container relative ${isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1'}`}>
                {/* Desktop: Two-page spread with 3D effects */}
                <div className="hidden sm:flex page-spread gap-0 h-full relative">
                  {/* Page stack effects - multiple layers for deeper 3D effect */}
                  
                  {/* Third layer - deepest pages */}
                  <div className="absolute z-0" style={{ 
                    left: '-8px', 
                    right: '50%', 
                    top: '5px', 
                    bottom: '-9px',
                    background: `
                      url('/imgs/paper.png'),
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                    `,
                    backgroundSize: '80px 80px, 100% 100%',
                    backgroundBlendMode: 'normal, multiply',
                    border: '2px solid #D4AF37',
                    borderRadius: '8px 2px 2px 8px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset -2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      2px 0 8px rgba(0,0,0,0.1)
                    `
                  }} />
                  <div className="absolute z-0" style={{ 
                    right: '-8px', 
                    left: '50%', 
                    top: '5px', 
                    bottom: '-9px',
                    background: `
                      url('/imgs/paper.png'),
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                    `,
                    backgroundSize: '80px 80px, 100% 100%',
                    backgroundBlendMode: 'normal, multiply',
                    border: '2px solid #D4AF37',
                    borderRadius: '2px 8px 8px 2px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset 2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      -2px 0 8px rgba(0,0,0,0.1)
                    `
                  }} />
                  
                  {/* Second layer - middle pages */}
                  <div className="absolute z-0" style={{ 
                    left: '-4px', 
                    right: '50%', 
                    top: '2px', 
                    bottom: '-5px',
                    background: `
                      url('/imgs/paper.png'),
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                    `,
                    backgroundSize: '80px 80px, 100% 100%',
                    backgroundBlendMode: 'normal, multiply',
                    border: '2px solid #D4AF37',
                    borderRadius: '8px 2px 2px 8px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset -2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      2px 0 8px rgba(0,0,0,0.1)
                    `
                  }} />
                  <div className="absolute z-0" style={{ 
                    right: '-4px', 
                    left: '50%', 
                    top: '2px', 
                    bottom: '-5px',
                    background: `
                      url('/imgs/paper.png'),
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                    `,
                    backgroundSize: '80px 80px, 100% 100%',
                    backgroundBlendMode: 'normal, multiply',
                    border: '2px solid #D4AF37',
                    borderRadius: '2px 8px 8px 2px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset 2px 0 4px rgba(0,0,0,0.1),
                      inset 0 1px 3px rgba(212,175,55,0.3),
                      -2px 0 8px rgba(0,0,0,0.1)
                    `
                  }} />
                  
                  {/* Left Page */}
                  <div className="relative flex-1">
                    
                    <div className="h-full flex flex-col relative z-10" style={{
                      position: 'relative',
                      background: `
                        url('/imgs/paper.png'),
                        linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                      `,
                      backgroundSize: '80px 80px, 100% 100%',
                      backgroundBlendMode: 'normal, multiply',
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
                    
                    {/* Paper texture enhancement - TEST */}
                    <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
                      background: `
                        url('/imgs/paper.png')
                      `,
                      backgroundSize: '50px 50px',
                      mixBlendMode: 'normal'
                    }} />
                    {/* Page content */}
                    <div className={`grid grid-cols-3 ${isFullscreen ? 'gap-8 h-[calc(100%-4rem)] w-full justify-items-center px-8' : 'gap-3 flex-1'}`}>
                      {cardsWithOwnership
                        .slice(currentPageSpread * 18, currentPageSpread * 18 + 9)
                        .map((cardData, sliceIdx) => {
                          const absIdx = currentPageSpread * 18 + sliceIdx;
                          return (
                          <BinderCardSlot
                            key={cardData.id}
                            card={cardData}
                            isFullscreen={isFullscreen}
                            isMobile={false}
                            hoveredCard={hoveredCard}
                            mousePosition={mousePosition}
                            onCardClick={handleCardClick}
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            isCustomBinder={isCustomBinder}
                            onAddCard={isCustomBinder ? (cardId) => addCardToBinder(customBinderId!, cardId) : undefined}
                            onRemoveCard={isCustomBinder ? (cardId) => removeCardFromBinder(customBinderId!, cardId) : undefined}
                            cardIndex={absIdx}
                            isDragging={dragIndex === absIdx}
                            isDragTarget={dropIndex === absIdx}
                            onDragStart={isCustomBinder ? handleDragStart : undefined}
                            onDragOver={isCustomBinder ? handleDragOver : undefined}
                            onDragEnd={isCustomBinder ? handleDragEnd : undefined}
                          />
                          );
                        })}

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
                    <div className={`mt-auto text-center text-amber-800 text-sm font-medium relative z-10 ${isFullscreen ? 'pt-8' : 'pt-4'}`}>
                      Page {currentPageSpread * 2 + 1}
                    </div>
                    </div>
                  </div>

                  {/* Right Page */}
                  <div className="relative flex-1">

                    <div className="h-full flex flex-col relative z-10" style={{
                      position: 'relative',
                      background: `
                        url('/imgs/paper.png'),
                        linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                      `,
                      backgroundSize: '80px 80px, 100% 100%',
                      backgroundBlendMode: 'normal, multiply',
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

                    {/* Paper texture enhancement - TEST */}
                    <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
                      background: `
                        url('/imgs/paper.png')
                      `,
                      backgroundSize: '50px 50px',
                      mixBlendMode: 'normal'
                    }} />
                    {/* Page content */}
                    <div className={`grid grid-cols-3 ${isFullscreen ? 'gap-8 h-[calc(100%-4rem)] w-full justify-items-center px-8' : 'gap-3 flex-1'}`}>
                      {cardsWithOwnership
                        .slice(currentPageSpread * 18 + 9, currentPageSpread * 18 + 18)
                        .map((cardData, sliceIdx) => {
                          const absIdx = currentPageSpread * 18 + 9 + sliceIdx;
                          return (
                          <BinderCardSlot
                            key={cardData.id}
                            card={cardData}
                            isFullscreen={isFullscreen}
                            isMobile={false}
                            hoveredCard={hoveredCard}
                            mousePosition={mousePosition}
                            onCardClick={handleCardClick}
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            isCustomBinder={isCustomBinder}
                            onAddCard={isCustomBinder ? (cardId) => addCardToBinder(customBinderId!, cardId) : undefined}
                            onRemoveCard={isCustomBinder ? (cardId) => removeCardFromBinder(customBinderId!, cardId) : undefined}
                            cardIndex={absIdx}
                            isDragging={dragIndex === absIdx}
                            isDragTarget={dropIndex === absIdx}
                            onDragStart={isCustomBinder ? handleDragStart : undefined}
                            onDragOver={isCustomBinder ? handleDragOver : undefined}
                            onDragEnd={isCustomBinder ? handleDragEnd : undefined}
                          />
                          );
                        })}

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
                    <div className={`mt-auto text-center text-amber-800 text-sm font-medium relative z-10 ${isFullscreen ? 'pt-8' : 'pt-4'}`}>
                      Page {currentPageSpread * 2 + 2}
                    </div>
                    </div>
                  </div>
                </div>

                {/* Mobile: Single page view */}
                <div 
                  className="sm:hidden relative h-full"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  style={{ touchAction: 'pan-y pinch-zoom' }}
                >
                  <div className="h-full flex flex-col relative z-10" style={{
                    background: `
                      url('/imgs/paper.png'),
                      linear-gradient(135deg, #FFFEF7 0%, #FFF8DC 25%, #F5F5DC 100%)
                    `,
                    backgroundSize: '60px 60px, 100% 100%',
                    backgroundBlendMode: 'normal, multiply',
                    border: '2px solid #D4AF37',
                    borderRadius: '8px',
                    boxShadow: `
                      0 4px 8px rgba(0,0,0,0.2),
                      inset 0 1px 3px rgba(212,175,55,0.3)
                    `,
                    padding: '8px'
                  }}>
                    {/* Paper texture enhancement */}
                    <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                      background: `url('/imgs/paper.png')`,
                      backgroundSize: '40px 40px',
                      mixBlendMode: 'normal'
                    }} />
                    
                    {/* Page content - show 9 cards per mobile page */}
                    <div className={`grid grid-cols-3 ${isFullscreen ? 'gap-4 h-[calc(100%-3rem)] w-full justify-items-center px-4' : 'gap-1 flex-1'}`}>
                      {cardsWithOwnership
                        .slice(currentMobilePage * 9, (currentMobilePage + 1) * 9)
                        .map((cardData) => (
                          <BinderCardSlot
                            key={cardData.id}
                            card={cardData}
                            isFullscreen={isFullscreen}
                            isMobile={true}
                            hoveredCard={hoveredCard}
                            mousePosition={mousePosition}
                            onCardClick={handleCardClick}
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            isCustomBinder={isCustomBinder}
                            onAddCard={isCustomBinder ? (cardId) => addCardToBinder(customBinderId!, cardId) : undefined}
                            onRemoveCard={isCustomBinder ? (cardId) => removeCardFromBinder(customBinderId!, cardId) : undefined}
                          />
                        ))}

                      {/* Fill empty slots */}
                      {Array.from({
                        length: Math.max(0, 9 - cardsWithOwnership.slice(currentMobilePage * 9, (currentMobilePage + 1) * 9).length)
                      }, (_, i) => (
                        <div
                          key={`empty-mobile-${i}`}
                          className="border-2 border-dashed border-gray-300 bg-gray-50 opacity-30"
                          style={{ aspectRatio: '5/7' }}
                        />
                      ))}
                    </div>

                    {/* Page number */}
                    <div className={`mt-auto text-center text-amber-800 text-sm font-medium relative z-10 ${isFullscreen ? 'pt-4' : 'pt-1'}`}>
                      Page {currentMobilePage + 1}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra whitespace for scrolling */}
      <div className="sm:h-20 h-24"></div>

      {/* Card Preview Modal */}
      <CardPhotoSwipe
        cards={cardsWithOwnership}
        currentCardIndex={selectedCardIndex}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        galleryID="set-binder-gallery"
      />
    </div>
  );
};

export default SetBinder;
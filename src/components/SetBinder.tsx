import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useCollection } from '../contexts/CollectionContext';
import { allCards, sets } from '../data/allCards';
import CardImage from './CardImage';
import CardPhotoSwipe from './CardPhotoSwipe';
import { LorcanaCard } from '../types';
import { supabase, TABLES, UserBinder } from '../lib/supabase';

const SetBinder: React.FC = () => {
  const { setCode, binderId } = useParams<{ setCode?: string; binderId?: string }>();
  const navigate = useNavigate();
  const { getCardQuantity } = useCollection();
  const [currentPageSpread, setCurrentPageSpread] = useState(0);
  const [currentMobilePage, setCurrentMobilePage] = useState(0);
  const [selectedCard, setSelectedCard] = useState<LorcanaCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [publishedBinder, setPublishedBinder] = useState<UserBinder | null>(null);
  const [publishedBinderOwner, setPublishedBinderOwner] = useState<any>(null);
  const [ownerCollectionData, setOwnerCollectionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const binderRef = useRef<HTMLDivElement>(null);

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

  // Sync mobile page with desktop page on initial load
  useEffect(() => {
    setCurrentMobilePage(currentPageSpread * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally ignoring currentPageSpread

  const loadPublishedBinder = async () => {
    if (!binderId) return;
    
    setLoading(true);
    try {
      // Load binder data
      const { data: binderData, error: binderError } = await supabase
        .from(TABLES.USER_BINDERS)
        .select('*')
        .eq('id', binderId)
        .eq('is_public', true)
        .single();

      if (binderError) throw binderError;
      setPublishedBinder(binderData);

      // Load owner profile data
      const { data: profileData, error: profileError } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('display_name, user_id')
        .eq('user_id', binderData.user_id)
        .single();

      if (profileError) throw profileError;
      setPublishedBinderOwner(profileData);

      // Check if the binder publisher is currently in a group
      const { data: memberData, error: memberError } = await supabase
        .from('collection_group_members')
        .select('group_id, role')
        .eq('user_id', binderData.user_id)
        .single();

      // Check for membership query errors
      if (memberError && memberError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected for non-group users
        console.error('Error checking group membership:', memberError);
        throw new Error(`Could not verify group membership: ${memberError.message}`);
      }

      let targetUserId = binderData.user_id; // Default to publisher's collection
      let collectionSource = 'personal';
      let groupOwnerId = null;

      if (memberData?.group_id) {
        // Publisher is in a group - get the group owner
        const { data: groupData, error: groupError } = await supabase
          .from('collection_groups')
          .select('owner_id')
          .eq('id', memberData.group_id)
          .single();

        if (groupError) {
          console.error('Error fetching group data:', groupError);
          throw new Error(`Could not load group information: ${groupError.message}`);
        }

        if (!groupData?.owner_id) {
          throw new Error('Group exists but has no owner');
        }

        groupOwnerId = groupData.owner_id;
        targetUserId = groupOwnerId;
        collectionSource = 'group';
        console.log(`[SetBinder] Publisher is in group ${memberData.group_id}, loading owner's collection (${groupOwnerId})`);
      } else {
        console.log(`[SetBinder] Publisher not in group, loading personal collection (${binderData.user_id})`);
      }

      // Load the appropriate collection data
      // Note: Adding limit to handle large collections (Supabase default is 1000 rows)
      const { data: collectionData, error: collectionError } = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .select('*')
        .eq('user_id', targetUserId)
        .limit(10000);

      if (collectionError) {
        console.error('Collection data error:', collectionError);
        throw new Error(`Could not load collection data for ${collectionSource} collection: ${collectionError.message}`);
      }

      // Verify we got collection data when we expected it
      if (!collectionData || collectionData.length === 0) {
        console.warn(`[SetBinder] No collection data found for ${collectionSource} collection (user: ${targetUserId})`);
        // This is not necessarily an error - user might have empty collection
      }
      
      // Store the collection data
      setOwnerCollectionData(collectionData || []);
      console.log(`[SetBinder] Loaded ${(collectionData || []).length} collection items from ${collectionSource} collection`);
      
      // Debug: Show structure of first few collection items
      if (collectionData && collectionData.length > 0) {
        console.log('[SetBinder] Sample collection data:', collectionData.slice(0, 3));
      }

    } catch (error) {
      console.error('Error loading published binder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Could not load binder: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get card quantity from owner's collection data
  const getOwnerCardQuantity = (cardId: number) => {
    // Only use owner collection data if this is a published binder AND we have the data loaded
    if (binderId && publishedBinder && ownerCollectionData.length > 0) {
      // For published binders, use the owner's collection data
      const ownerCard = ownerCollectionData.find(c => c.card_id === cardId);
      const quantity = ownerCard?.quantity_total || 0;
      
      // Debug first few cards
      if (cardId <= 5) {
        console.log(`[Debug] Card ${cardId}: ownerCard =`, ownerCard, `quantity = ${quantity}`);
      }
      
      return {
        total: quantity,
        foil: ownerCard?.quantity_foil || 0,
        nonFoil: ownerCard?.quantity_normal || 0
      };
    } else {
      // For personal binders or when data is still loading, use current user's collection
      return getCardQuantity(cardId);
    }
  };

  // Determine the actual setCode to use (from URL param or from published binder)
  const effectiveSetCode = setCode || publishedBinder?.set_code;
  const setData = effectiveSetCode ? sets.find(set => set.code === effectiveSetCode) : null;
  
  const setCards = !effectiveSetCode ? [] : allCards
    .filter(card => card.setCode === effectiveSetCode && !card.promoGrouping) // Exclude promo cards
    .sort((a, b) => a.number - b.number); // Simple card number sort

  const cardsWithOwnership = setCards.map(card => {
    let totalOwned = 0;
    
    // Use the appropriate card quantity function based on context
    const quantities = getOwnerCardQuantity(card.id);
    totalOwned = quantities.total;
    
    return {
      ...card,
      owned: totalOwned > 0,
      totalQuantity: totalOwned
    };
  });

  // Calculate derived values
  const ownedCount = cardsWithOwnership.filter(card => card.owned).length;
  const completionPercentage = setCards.length > 0 ? (ownedCount / setCards.length) * 100 : 0;
  // Desktop: 18 cards per spread (9 left + 9 right), Mobile: 9 cards per page
  const totalPageSpreads = Math.ceil(cardsWithOwnership.length / 18);
  const totalMobilePages = Math.ceil(cardsWithOwnership.length / 9);

  
  const handleNextPage = useCallback(() => {
    if (currentPageSpread < totalPageSpreads - 1) {
      console.log(`[SetBinder] Navigating to next page: ${currentPageSpread} → ${currentPageSpread + 1}`);
      setCurrentPageSpread(prev => prev + 1);
      // Update mobile page to show equivalent content
      setCurrentMobilePage(prev => Math.min(prev + 2, totalMobilePages - 1));
    }
  }, [currentPageSpread, totalPageSpreads, totalMobilePages]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPageSpread > 0) {
      console.log(`[SetBinder] Navigating to prev page: ${currentPageSpread} → ${currentPageSpread - 1}`);
      setCurrentPageSpread(prev => prev - 1);
      // Update mobile page to show equivalent content
      setCurrentMobilePage(prev => Math.max(prev - 2, 0));
    }
  }, [currentPageSpread]);

  const handleNextMobilePage = useCallback(() => {
    if (currentMobilePage < totalMobilePages - 1) {
      console.log(`[SetBinder] Mobile navigating to next page: ${currentMobilePage} → ${currentMobilePage + 1}`);
      setCurrentMobilePage(prev => prev + 1);
      // Update desktop spread to show equivalent content
      setCurrentPageSpread(Math.floor(currentMobilePage / 2));
    }
  }, [currentMobilePage, totalMobilePages]);
  
  const handlePrevMobilePage = useCallback(() => {
    if (currentMobilePage > 0) {
      console.log(`[SetBinder] Mobile navigating to prev page: ${currentMobilePage} → ${currentMobilePage - 1}`);
      setCurrentMobilePage(prev => prev - 1);
      // Update desktop spread to show equivalent content
      setCurrentPageSpread(Math.floor((currentMobilePage - 1) / 2));
    }
  }, [currentMobilePage]);

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isMobile) {
      if (isLeftSwipe) {
        // Swipe left = next page
        handleNextMobilePage();
      } else if (isRightSwipe) {
        // Swipe right = previous page
        handlePrevMobilePage();
      }
    }
  };

  const handleCardClick = (card: LorcanaCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

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

  if (!setData || (!setCode && !effectiveSetCode)) {
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
                    onClick={() => navigate(binderId ? '/community' : '/collections')}
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
                        {publishedBinder ? publishedBinder.name : `${setData.name} Binder`}
                      </h1>
                      <p className="text-lorcana-navy">
                        {publishedBinder && publishedBinderOwner ? (
                          <>
                            {publishedBinderOwner.display_name}'s Collection • Set {setData.number} • {ownedCount}/{setCards.length} cards ({completionPercentage.toFixed(1)}%)
                          </>
                        ) : (
                          <>
                            Set {setData.number} • {ownedCount}/{setCards.length} cards ({completionPercentage.toFixed(1)}%)
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Fullscreen button */}
                <div className="flex items-center">
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
                        console.log(`[SetBinder] Navigating via dot: ${currentPageSpread} → ${i}`);
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
                        console.log(`[SetBinder] Mobile navigating via dot: ${currentMobilePage} → ${i}`);
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
                        .map((cardData, index) => (
                          <div
                            key={cardData.id}
                            className={`relative overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer aspect-[5/7] ${isFullscreen ? 'w-[calc(25vh*5/7)]' : ''}`}
                            onClick={() => handleCardClick(cardData)}
                            onMouseMove={(e) => handleCardMouseMove(e, cardData.id.toString())}
                            onMouseLeave={handleCardMouseLeave}
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
                                  card={cardData}
                                  enableHover={false}
                                  enableTilt={false}
                                  className="w-full h-full"
                                />
                              </div>
                              
                              {cardData.owned ? (
                                /* Quantity badge */
                                <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                                  {cardData.totalQuantity}
                                </div>
                              ) : null}

                              {/* Plastic sleeve shine effect for owned cards */}
                              {cardData.owned && (
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
                                  {hoveredCard === cardData.id.toString() && (
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
                              )}
                              
                              {/* Card number at bottom */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                                #{cardData.number}
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
                        .map((cardData, index) => (
                          <div
                            key={cardData.id}
                            className={`relative overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer aspect-[5/7] ${isFullscreen ? 'w-[calc(25vh*5/7)]' : ''}`}
                            onClick={() => handleCardClick(cardData)}
                            onMouseMove={(e) => handleCardMouseMove(e, cardData.id.toString())}
                            onMouseLeave={handleCardMouseLeave}
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
                                  card={cardData}
                                  enableHover={false}
                                  enableTilt={false}
                                  className="w-full h-full"
                                />
                              </div>
                              
                              {cardData.owned ? (
                                /* Quantity badge */
                                <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                                  {cardData.totalQuantity}
                                </div>
                              ) : null}

                              {/* Plastic sleeve shine effect for owned cards */}
                              {cardData.owned && (
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
                                  {hoveredCard === cardData.id.toString() && (
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
                              )}
                              
                              {/* Card number at bottom */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
                                #{cardData.number}
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
                        .map((cardData, index) => (
                          <div
                            key={cardData.id}
                            className="relative aspect-[5/7] overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
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
                            <div className="absolute inset-0" style={{
                              boxShadow: cardData.owned ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
                              backgroundImage: 'url(/imgs/cardback.svg)',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}>
                              {/* Card image */}
                              <div className={`w-full h-full leading-[0] ${!cardData.owned ? 'opacity-60 grayscale' : ''}`}>
                                <CardImage
                                  card={cardData}
                                  enableHover={false}
                                  enableTilt={false}
                                  className="w-full h-full"
                                />
                              </div>
                              
                              {cardData.owned && (
                                /* Quantity badge */
                                <div className="absolute top-1 right-1 bg-lorcana-gold text-lorcana-ink text-xs font-bold px-1 py-0.5 rounded shadow-lg">
                                  {cardData.totalQuantity}
                                </div>
                              )}
                              
                              {/* Card number */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                                #{cardData.number}
                              </div>
                            </div>
                          </div>
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
        cards={selectedCard ? [selectedCard] : []}
        currentCardIndex={0}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        galleryID="set-binder-gallery"
      />
    </div>
  );
};

export default SetBinder;
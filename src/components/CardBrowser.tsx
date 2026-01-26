import React, { useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCardBrowser } from '../hooks';
import QuickFilters from './QuickFilters';
import { RARITY_ICONS, COLOR_ICONS } from '../constants/icons';
import CardPhotoSwipe from './CardPhotoSwipe';
import { LorcanaCard } from '../types';
import CardSearch from './card-browser/CardSearch';
import CardFilters from './card-browser/CardFilters';
import CardResults from './card-browser/CardResults';
import { useCardData } from '../contexts/CardDataContext';
import { useDeck } from '../contexts/DeckContext';
import { useCollection } from '../contexts/CollectionContext';
import { useAuth } from '../contexts/AuthContext';


const CardBrowser: React.FC = () => {
  const [isPhotoSwipeOpen, setIsPhotoSwipeOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [renderedCards, setRenderedCards] = useState<LorcanaCard[]>([]);
  const { allCards, isLoading, error, refreshCardData } = useCardData();
  const { isEditingDeck, currentDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity } = useDeck();
  const { getCardQuantity, addCardToCollection, removeCardFromCollection } = useCollection();
  const { user } = useAuth();

  // Memoize photo swipe handlers to avoid recreating on every render
  // When editing deck: add/remove from deck
  // When not editing deck (but logged in): add/remove from collection (normal copies)
  const handlePhotoSwipeAddCard = useMemo(() => {
    if (isEditingDeck && currentDeck) {
      return (card: LorcanaCard) => {
        addCardToDeck(card);
      };
    }
    if (user) {
      return (card: LorcanaCard) => {
        addCardToCollection(card.id, 1, 0); // Add 1 normal copy
      };
    }
    return undefined;
  }, [isEditingDeck, currentDeck, addCardToDeck, user, addCardToCollection]);

  const handlePhotoSwipeRemoveCard = useMemo(() => {
    if (isEditingDeck && currentDeck) {
      return (cardId: number) => {
        const deckCard = currentDeck.cards.find(c => c.cardId === cardId);
        if (deckCard) {
          const newQuantity = deckCard.quantity - 1;
          if (newQuantity === 0) {
            removeCardFromDeck(cardId);
            setIsPhotoSwipeOpen(false); // Close PhotoSwipe when card is removed
          } else {
            updateCardQuantity(cardId, newQuantity);
          }
        }
      };
    }
    if (user) {
      return (cardId: number) => {
        removeCardFromCollection(cardId, 1, 0); // Remove 1 normal copy
      };
    }
    return undefined;
  }, [isEditingDeck, currentDeck, removeCardFromDeck, updateCardQuantity, user, removeCardFromCollection]);

  // For deck editing: use a Map of deck quantities
  const deckQuantitiesMap = useMemo(() => {
    if (!isEditingDeck || !currentDeck) return undefined;
    const map = new Map<number, number>();
    currentDeck.cards.forEach(entry => {
      map.set(entry.cardId, entry.quantity);
    });
    return map;
  }, [isEditingDeck, currentDeck]);

  // For collection mode: use a function to get quantities on demand
  const getCollectionQuantity = useMemo(() => {
    if (isEditingDeck || !user) return undefined;
    return (cardId: number) => getCardQuantity(cardId).total;
  }, [isEditingDeck, user, getCardQuantity]);

  const {
    // State
    searchTerm,
    filters,
    sortBy,
    groupBy,
    viewMode,
    showFilters,
    staleCardIds,
    showFilterNotification,
    staleCardCount,
    
    // Actions
    setSearchTerm,
    setFilters,
    setSortBy,
    setGroupBy,
    setViewMode,
    setShowFilters,
    clearAllFilters,
    handleCardQuantityChange,
    refreshStaleCards,
    dismissFilterNotification,
    
    // Computed
    groupedCards,
    totalCards,
    activeFiltersCount,
    paginatedCards,
    pagination,
    sortedCards,
    contextualOptions
  } = useCardBrowser(allCards);

  const handleCardClick = (card: LorcanaCard) => {
    // Use renderedCards when fadeOthers is enabled, otherwise use sortedCards
    const cardsForPhotoSwipe = filters.fadeOthers && renderedCards.length > 0 ? renderedCards : sortedCards;
    const cardIndex = cardsForPhotoSwipe.findIndex(c => c.id === card.id);
    setCurrentCardIndex(cardIndex >= 0 ? cardIndex : 0);
    setIsPhotoSwipeOpen(true);
  };

  const handlePhotoSwipeClose = () => {
    setIsPhotoSwipeOpen(false);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && showFilters) {
        // On desktop, keep filters open
        return;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showFilters]);

  // Show loading state on initial load
  if (isLoading && allCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lorcana-gold mb-4"></div>
          <p className="text-lorcana-ink">Loading card data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Show error banner if there's an error but we have fallback data */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm text-yellow-800">
                Using cached card data. 
                <span className="ml-2 text-yellow-600">{error}</span>
              </p>
            </div>
            <button
              onClick={refreshCardData}
              className="ml-4 text-sm text-yellow-800 underline hover:text-yellow-900"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      {/* Search container - sticky */}
      <div className="sticky top-0 z-30">
        {/* Search section */}
        <CardSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          setFilters={setFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFiltersCount={activeFiltersCount}
          showFilterNotification={showFilterNotification}
          refreshStaleCards={refreshStaleCards}
        />
        
        {/* Quick Filters - hidden on mobile */}
        <div className="hidden md:block">
          <div className="w-full px-2 sm:px-4">
            <QuickFilters
              filters={filters}
              setFilters={setFilters}
              colorIconMap={COLOR_ICONS}
              rarityIconMap={RARITY_ICONS}
            />
          </div>
        </div>
      </div>
      
      <div>
        <div className="w-full space-y-0">

        {/* Filters Sidebar */}
        <CardFilters
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filters={filters}
          setFilters={setFilters}
          activeFiltersCount={activeFiltersCount}
          clearAllFilters={clearAllFilters}
          contextualOptions={contextualOptions}
        />

        {/* Card Results */}
        <CardResults
          groupBy={groupBy}
          viewMode={viewMode}
          totalCards={totalCards}
          groupedCards={groupedCards}
          paginatedCards={paginatedCards}
          sortedCards={sortedCards}
          pagination={pagination}
          handleCardQuantityChange={handleCardQuantityChange}
          staleCardIds={staleCardIds}
          handleCardClick={handleCardClick}
          allCards={allCards}
          filters={filters}
          sortBy={sortBy}
          onRenderedCardsChange={setRenderedCards}
        />

        {/* Filter notification bubble */}
        {showFilterNotification && (
          <div className="fixed bottom-4 right-4 bg-white border-2 border-lorcana-gold rounded-sm shadow-xl p-4 max-w-sm z-50 art-deco-corner">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-orange-500">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {staleCardCount} card{staleCardCount !== 1 ? 's' : ''} no longer match
                  </p>
                  <p className="text-xs text-gray-600">your current filters</p>
                </div>
              </div>
              <button
                onClick={dismissFilterNotification}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={refreshStaleCards}
              className="w-full px-3 py-2 bg-lorcana-navy text-lorcana-gold text-sm font-medium rounded-sm hover:bg-opacity-90 transition-all"
            >
              Refresh View
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Card Preview with PhotoSwipe */}
      <CardPhotoSwipe
        cards={filters.fadeOthers && renderedCards.length > 0 ? renderedCards : sortedCards}
        currentCardIndex={currentCardIndex}
        isOpen={isPhotoSwipeOpen}
        onClose={handlePhotoSwipeClose}
        galleryID="card-browser-gallery"
        cardQuantities={deckQuantitiesMap}
        getQuantity={getCollectionQuantity}
        onAddCard={handlePhotoSwipeAddCard}
        onRemoveCard={handlePhotoSwipeRemoveCard}
      />
    </div>
  );
};

export default CardBrowser;
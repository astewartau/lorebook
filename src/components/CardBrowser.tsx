import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useCardBrowser } from '../hooks';
import QuickFilters from './QuickFilters';
import { RARITY_ICONS, COLOR_ICONS } from '../constants/icons';
import CardPhotoSwipe from './CardPhotoSwipe';
import { LorcanaCard } from '../types';
import CardSearch from './card-browser/CardSearch';
import CardFilters from './card-browser/CardFilters';
import CardResults from './card-browser/CardResults';
import { allCards } from '../data/allCards';


const CardBrowser: React.FC = () => {
  const [isPhotoSwipeOpen, setIsPhotoSwipeOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [renderedCards, setRenderedCards] = useState<LorcanaCard[]>([]);

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
    sortedCards
  } = useCardBrowser();

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

  return (
    <div>
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
      />
    </div>
  );
};

export default CardBrowser;
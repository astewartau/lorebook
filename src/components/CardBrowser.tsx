import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCardBrowser } from '../hooks';
import QuickFilters from './QuickFilters';
import { RARITY_ICONS, COLOR_ICONS } from '../constants/icons';
import CardPreviewModal from './CardPreviewModal';
import { ConsolidatedCard } from '../types';
import CardSearch from './card-browser/CardSearch';
import CardFilters from './card-browser/CardFilters';
import CardResults from './card-browser/CardResults';


const CardBrowser: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<ConsolidatedCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    handleVariantQuantityChange,
    refreshStaleCards,
    dismissFilterNotification,
    
    // Collection functions
    getVariantQuantities,
    
    // Computed
    groupedCards,
    totalCards,
    activeFiltersCount,
    paginatedCards,
    pagination
  } = useCardBrowser();

  const handleCardClick = (card: ConsolidatedCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
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
    <div className="space-y-0">
      {/* Search section - connects to header */}
      <CardSearch
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
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
        <QuickFilters
          filters={filters}
          setFilters={setFilters}
          colorIconMap={COLOR_ICONS}
          rarityIconMap={RARITY_ICONS}
        />
      </div>

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
        pagination={pagination}
        handleVariantQuantityChange={handleVariantQuantityChange}
        getVariantQuantities={getVariantQuantities}
        staleCardIds={staleCardIds}
        handleCardClick={handleCardClick}
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

      {/* Card Preview Modal */}
      <CardPreviewModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default CardBrowser;
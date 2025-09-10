import React, { useState, useEffect, useMemo } from 'react';
import { LorcanaCard, FilterOptions, SortOption } from '../../types';
import InteractiveCard from '../InteractiveCard';
import { useDynamicGrid } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { filterCards, sortCards } from '../../utils/cardFiltering';

interface VirtualizedCardGridProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
  height?: number; // Not used anymore but kept for compatibility
  allCards?: LorcanaCard[]; // All cards for fade others functionality
  filters?: FilterOptions; // Filter state for fade others functionality
  sortBy?: SortOption; // Sort option for fade others functionality
  onRenderedCardsChange?: (cards: LorcanaCard[]) => void; // Callback to update rendered cards
}

const VirtualizedCardGrid: React.FC<VirtualizedCardGridProps> = ({
  cards,
  onQuantityChange,
  onCardClick,
  height, // Not used anymore  
  allCards = [],
  filters,
  sortBy,
  onRenderedCardsChange
}) => {
  const { containerRef, columns, gapSize, fixedCardWidth, containerStyle } = useDynamicGrid({});
  const { user } = useAuth(); // Check if user is logged in
  const { getCardQuantity } = useCollection(); // For filtering logic
  const [scrollTop, setScrollTop] = useState(0);
  const [containerTop, setContainerTop] = useState(0);
  
  // Simple configuration using actual measurements
  const CARD_ASPECT_RATIO = 1468 / 2048; // Real aspect ratio from original image
  const CONTROLS_HEIGHT = user ? 28 : 0; // Only when logged in
  const SPACE_BETWEEN = 0; // No extra space needed
  
  // Trust the hook completely - no conflicting calculations
  const { actualColumns, actualCardWidth, actualCardHeight } = useMemo(() => {
    const cardWidth = fixedCardWidth;
    const cardHeight = cardWidth / CARD_ASPECT_RATIO + CONTROLS_HEIGHT + SPACE_BETWEEN;
    
    return { 
      actualColumns: columns,  // Use the hook's column calculation
      actualCardWidth: cardWidth, 
      actualCardHeight: cardHeight 
    };
  }, [columns, fixedCardWidth, CARD_ASPECT_RATIO, CONTROLS_HEIGHT, SPACE_BETWEEN]);
  
  // Track container position for window scrolling
  useEffect(() => {
    const updateContainerTop = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerTop(rect.top + window.scrollY);
      }
    };
    
    updateContainerTop();
    window.addEventListener('resize', updateContainerTop);
    
    return () => window.removeEventListener('resize', updateContainerTop);
  }, [containerRef, cards.length]);
  
  // Handle window scroll
  useEffect(() => {
    const handleScroll = () => {
      const windowScrollTop = window.scrollY;
      const relativeScrollTop = Math.max(0, windowScrollTop - containerTop);
      setScrollTop(relativeScrollTop);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [containerTop]);
  
  // Simple virtual scrolling
  // Determine which cards to render and which to fade
  const { cardsToRender, shouldFadeCard } = useMemo(() => {
    if (!filters?.fadeOthers || !allCards.length) {
      // If fadeOthers is off, just render the filtered cards with no fading
      return {
        cardsToRender: cards,
        shouldFadeCard: () => false
      };
    }
    
    // When fadeOthers is on, we need to:
    // 1. Apply all NON-collection filters to get the base set
    // 2. Determine which cards match the collection filters
    // 3. Show all cards from step 1, fading those that don't match step 2
    
    // Create a modified filter object without collection filters for the base filtering
    const nonCollectionFilters = {
      ...filters,
      collectionFilter: 'all' as const,
      cardCountOperator: null,
      // Keep fadeOthers as false to prevent recursion
      fadeOthers: false
    };
    
    // Get all cards that match non-collection filters
    const baseFilteredCards = filterCards(
      allCards,
      filters.search || '',
      nonCollectionFilters,
      new Set(),
      getCardQuantity
    );
    
    // Now determine which of those match the collection filters
    const collectionMatchingCards = filterCards(
      baseFilteredCards, // Start from base filtered set
      filters.search || '',
      filters, // Use full filters including collection filters
      new Set(),
      getCardQuantity
    );
    const matchingCardIds = new Set(collectionMatchingCards.map(card => card.id));
    
    // Apply sorting to the base filtered cards
    const sortedCards = sortBy ? sortCards(baseFilteredCards, sortBy) : baseFilteredCards;
    
    return {
      cardsToRender: sortedCards,
      shouldFadeCard: (cardId: number) => !matchingCardIds.has(cardId)
    };
  }, [filters, cards, allCards, getCardQuantity, sortBy]);

  // Notify parent component about the rendered cards
  useEffect(() => {
    if (onRenderedCardsChange) {
      onRenderedCardsChange(cardsToRender);
    }
  }, [cardsToRender, onRenderedCardsChange]);

  // Simple grid calculations
  const rowCount = Math.ceil(cardsToRender.length / actualColumns);
  const totalHeight = rowCount * (actualCardHeight + gapSize) - gapSize;

  const { visibleCards, visibleStart } = useMemo(() => {
    const viewportHeight = window.innerHeight;
    const bufferRows = 3;
    const rowHeight = actualCardHeight + gapSize;
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
    const endRow = Math.ceil((scrollTop + viewportHeight) / rowHeight) + bufferRows;
    
    const start = startRow * actualColumns;
    const end = Math.min(endRow * actualColumns, cardsToRender.length);
    
    return {
      visibleCards: cardsToRender.slice(start, end),
      visibleStart: start
    };
  }, [scrollTop, actualCardHeight, gapSize, actualColumns, cardsToRender]);
  
  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Total height spacer - this makes the page scrollable */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render each card with absolute positioning */}
        {visibleCards.map((card, index) => {
          const absoluteIndex = visibleStart + index;
          const row = Math.floor(absoluteIndex / actualColumns);
          const col = absoluteIndex % actualColumns;
          
          // Simple positioning - equal gaps everywhere
          const left = col * (actualCardWidth + gapSize);
          const top = row * (actualCardHeight + gapSize);
          
          const isFaded = shouldFadeCard(card.id);
          
          return (
            <div 
              key={card.id}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${actualCardWidth}px`,
                height: `${actualCardHeight}px`
              }}
              className={isFaded ? 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-300' : ''}
            >
              <InteractiveCard
                card={card}
                onQuantityChange={(normalChange, foilChange) => 
                  onQuantityChange(card, normalChange, foilChange)
                }
                onCardClick={onCardClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedCardGrid;
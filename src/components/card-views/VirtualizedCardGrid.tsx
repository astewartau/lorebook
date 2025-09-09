import React, { useState, useEffect, useMemo } from 'react';
import { LorcanaCard } from '../../types';
import InteractiveCard from '../InteractiveCard';
import { useDynamicGrid } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';

interface VirtualizedCardGridProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
  height?: number; // Not used anymore but kept for compatibility
}

const VirtualizedCardGrid: React.FC<VirtualizedCardGridProps> = ({
  cards,
  onQuantityChange,
  onCardClick,
  height // Not used anymore  
}) => {
  const { containerRef, columns, gapSize, fixedCardWidth, containerStyle } = useDynamicGrid({});
  const { user } = useAuth(); // Check if user is logged in
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
  
  // Simple grid calculations
  const rowCount = Math.ceil(cards.length / actualColumns);
  const totalHeight = rowCount * (actualCardHeight + gapSize) - gapSize;
  
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
  const { visibleCards, visibleStart } = useMemo(() => {
    const viewportHeight = window.innerHeight;
    const bufferRows = 3;
    const rowHeight = actualCardHeight + gapSize;
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
    const endRow = Math.ceil((scrollTop + viewportHeight) / rowHeight) + bufferRows;
    
    const start = startRow * actualColumns;
    const end = Math.min(endRow * actualColumns, cards.length);
    
    return {
      visibleCards: cards.slice(start, end),
      visibleStart: start
    };
  }, [scrollTop, actualCardHeight, gapSize, actualColumns, cards]);
  
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
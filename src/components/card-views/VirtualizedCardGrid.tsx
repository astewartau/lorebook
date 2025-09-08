import React, { useState, useEffect, useMemo } from 'react';
import { LorcanaCard } from '../../types';
import InteractiveCard from '../InteractiveCard';
import { useDynamicGrid } from '../../hooks';

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
  const { containerRef, columns, gridStyle } = useDynamicGrid();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerTop, setContainerTop] = useState(0);
  
  // Card dimensions
  const cardAspectRatio = 2.5 / 3.5;
  const controlsHeight = 40;
  const verticalSpacing = 8;
  // Extract gap size from the grid style
  const gapSize = parseInt(gridStyle.gap.replace('px', ''));
  
  // Calculate actual card width after CSS Grid auto-fit sizing
  const cardWidth = useMemo(() => {
    if (!containerRef.current) return 180;
    const containerWidth = containerRef.current.clientWidth;
    return (containerWidth - (gapSize * (columns - 1))) / columns;
  }, [columns, containerRef, gapSize]);
  
  const cardHeight = useMemo(() => {
    const imageHeight = cardWidth / cardAspectRatio;
    // Add all vertical spacing consistently
    return imageHeight + controlsHeight + verticalSpacing + gapSize;
  }, [cardWidth, cardAspectRatio, controlsHeight, verticalSpacing, gapSize]);
  
  const rowCount = Math.ceil(cards.length / columns);
  const totalHeight = rowCount * cardHeight;
  
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
  
  // Virtual scrolling calculations with mobile adjustments
  const { visibleCards, visibleStart } = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const viewportHeight = window.innerHeight;
    
    // Calculate visible range with larger buffers for fast scrolling
    // Desktop: 3 extra rows above + 3 below = ~18-24 extra cards loaded
    // Mobile: 5 extra rows above + 5 below = ~10-20 extra cards loaded (fewer columns)
    const bufferRows = isMobile ? 5 : 3;
    const startRow = Math.max(0, Math.floor(scrollTop / cardHeight) - bufferRows);
    const endRow = Math.ceil((scrollTop + viewportHeight) / cardHeight) + bufferRows;
    
    const start = startRow * columns;
    const end = Math.min(endRow * columns, cards.length);
    
    return {
      visibleCards: cards.slice(start, end),
      visibleStart: start
    };
  }, [scrollTop, cardHeight, columns, cards]);
  
  return (
    <div ref={containerRef} className="w-full">
      {/* Total height spacer - this makes the page scrollable */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render each card with absolute positioning */}
        {visibleCards.map((card, index) => {
          const absoluteIndex = visibleStart + index;
          const row = Math.floor(absoluteIndex / columns);
          const col = absoluteIndex % columns;
          
          // Calculate exact position for each card
          const left = col * (cardWidth + gapSize);
          const top = row * cardHeight;
          
          return (
            <div 
              key={card.id}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${cardWidth}px`,
                height: `${cardHeight - gapSize}px`
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
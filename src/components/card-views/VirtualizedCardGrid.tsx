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
  const { containerRef, columns } = useDynamicGrid();
  const [scrollTop, setScrollTop] = useState(0);
  const [containerTop, setContainerTop] = useState(0);
  
  // Card dimensions
  const cardAspectRatio = 2.5 / 3.5;
  const controlsHeight = 40;
  const verticalSpacing = 8;
  const gapSize = 16;
  
  // Calculate card height based on width
  const cardWidth = useMemo(() => {
    if (!containerRef.current) return 180;
    const containerWidth = containerRef.current.clientWidth;
    // Ensure minimum card width on mobile for better visibility
    const calculatedWidth = (containerWidth - (gapSize * (columns - 1))) / columns;
    return Math.max(140, calculatedWidth); // Minimum 140px width
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
    
    // Initial update
    updateContainerTop();
    
    // Update after a small delay to ensure layout is stable
    const timer = setTimeout(updateContainerTop, 100);
    
    window.addEventListener('resize', updateContainerTop);
    window.addEventListener('orientationchange', updateContainerTop);
    
    return () => {
      window.removeEventListener('resize', updateContainerTop);
      window.removeEventListener('orientationchange', updateContainerTop);
      clearTimeout(timer);
    };
  }, [containerRef, cards.length]);
  
  // Handle window scroll with RAF for smooth updates
  useEffect(() => {
    let rafId: number | null = null;
    
    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        const windowScrollTop = window.scrollY;
        const relativeScrollTop = Math.max(0, windowScrollTop - containerTop);
        setScrollTop(relativeScrollTop);
      });
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerTop]);
  
  // Virtual scrolling calculations with mobile adjustments
  const { visibleCards, visibleStart } = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    const viewportHeight = window.innerHeight;
    
    // Calculate visible range with larger buffers for mobile
    const bufferRows = isMobile ? 3 : 1; // More buffer rows on mobile
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
                height: `${cardHeight - gapSize}px`, // Remove gap from height to prevent overlap
                contain: 'layout style paint'
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
import { useState, useEffect, useRef, useMemo } from 'react';

interface UseDynamicGridOptions {
  minCardWidth?: number;
  gapSize?: number;
  maxColumns?: number;
  zoomScale?: number; // 0.5 to 2.0, where 1.0 is default
  fixedColumns?: number; // When set, overrides dynamic column calculation
}

export const useDynamicGrid = ({
  minCardWidth = 250, // Max card width - will shrink to fit
  gapSize = 12, // Single gap size - simple config
  maxColumns = 12,
  zoomScale = 1.0,
  fixedColumns
}: UseDynamicGridOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  // Responsive gap size - smaller on mobile
  const responsiveGapSize = useMemo(() => {
    return viewportWidth < 768 ? 8 : gapSize; // 8px on mobile, 12px on desktop
  }, [viewportWidth, gapSize]);
  
  // Calculate scaled card width with mobile adjustments
  const scaledMinCardWidth = useMemo(() => {
    let adjustedWidth = minCardWidth;
    
    // Reduce card width on mobile to ensure 2 columns fit comfortably
    if (viewportWidth < 768) {
      // Mobile: aim for 2 columns with gaps
      // Available width ~= viewport - padding, so roughly viewport - 32px
      // 2 cards + 1 gap = (cardWidth * 2) + gap
      const availableMobileWidth = viewportWidth - 32; // Account for padding
      const targetCardWidth = Math.floor((availableMobileWidth - responsiveGapSize) / 2);
      adjustedWidth = Math.min(minCardWidth, Math.max(140, targetCardWidth)); // Min 140px, max minCardWidth
    }
    
    return Math.round(adjustedWidth * zoomScale);
  }, [minCardWidth, zoomScale, responsiveGapSize, viewportWidth]);

  // Simple column calculation - KISS principle
  const columns = useMemo(() => {
    if (fixedColumns !== undefined) {
      return fixedColumns;
    }
    
    if (availableWidth === 0) {
      if (viewportWidth < 768) return 2;  // Mobile: 2 columns with smaller cards
      if (viewportWidth < 1024) return 4; // Tablet: 4 columns 
      return 6; // Desktop: 6 columns
    }
    
    // Simple approach: try fitting cards one by one
    let cols = 0;
    while (true) {
      const widthNeeded = (cols + 1) * scaledMinCardWidth + cols * responsiveGapSize;
      if (widthNeeded <= availableWidth) {
        cols++;
      } else {
        break;
      }
    }
    
    return Math.max(1, Math.min(cols, maxColumns));
  }, [availableWidth, responsiveGapSize, scaledMinCardWidth, maxColumns, fixedColumns]);

  // Calculate actual card width based on available space
  const actualCardWidth = useMemo(() => {
    if (availableWidth === 0 || columns === 0) {
      return scaledMinCardWidth;
    }
    
    // Calculate available width for cards (total width minus gaps)
    const widthForCards = availableWidth - (columns - 1) * responsiveGapSize;
    const calculatedCardWidth = Math.floor(widthForCards / columns);
    
    // Don't exceed the max width (scaledMinCardWidth)
    return Math.min(calculatedCardWidth, scaledMinCardWidth);
  }, [availableWidth, columns, responsiveGapSize, scaledMinCardWidth]);

  // Set up ResizeObserver to track parent container width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      // Observe the parent container, not the grid container itself
      const parentElement = container.parentElement;
      if (parentElement) {
        const width = parentElement.clientWidth;
        const viewport = window.innerWidth;
        console.log('DEBUG - Parent width:', width, 'Viewport:', viewport, 'Mobile:', viewport < 768);
        setAvailableWidth(width);
        setViewportWidth(viewport);
      }
    };

    // Multiple attempts to get accurate width on mobile
    const tryUpdateWidth = () => {
      updateWidth();
      // Extra attempt after a small delay for mobile
      setTimeout(updateWidth, 50);
      setTimeout(updateWidth, 150);
    };

    // Initial measurement with retries
    tryUpdateWidth();

    // Set up ResizeObserver for future changes - observe parent, not self
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    const parentElement = container.parentElement;
    if (parentElement) {
      resizeObserver.observe(parentElement);
    }

    // Also listen to window resize and orientation change
    window.addEventListener('resize', updateWidth);
    window.addEventListener('orientationchange', tryUpdateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
      window.removeEventListener('orientationchange', tryUpdateWidth);
    };
  }, []);

  // Simple container style - no CSS Grid complexity
  const containerStyle = useMemo(() => {
    // Calculate total grid width to center the grid
    const totalGridWidth = columns * actualCardWidth + (columns - 1) * responsiveGapSize;
    
    return {
      position: 'relative' as const,
      width: `${totalGridWidth}px`,
      margin: '0 auto'
    };
  }, [columns, actualCardWidth, responsiveGapSize]);

  return {
    containerRef,
    columns,
    gapSize: responsiveGapSize, // Now responsive - smaller on mobile
    fixedCardWidth: actualCardWidth, // Now responsive based on available space
    containerStyle
  };
};
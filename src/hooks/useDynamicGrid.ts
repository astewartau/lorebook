import { useState, useEffect, useRef, useMemo } from 'react';

interface UseDynamicGridOptions {
  minCardWidth?: number;
  gapSize?: number;
  maxColumns?: number;
}

export const useDynamicGrid = ({
  minCardWidth = 180,
  gapSize = 16,
  maxColumns = 8
}: UseDynamicGridOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate number of columns based on available width
  const columns = useMemo(() => {
    if (containerWidth === 0) return 2; // Default fallback

    // Use responsive minimum card widths for better mobile experience
    let effectiveMinWidth = minCardWidth;
    
    // On mobile screens, use smaller minimum width to ensure 2 columns
    if (containerWidth <= 480) {
      // For mobile, ensure we can fit 2 columns comfortably
      // Available space after gaps: containerWidth - gapSize
      // Per column: (containerWidth - gapSize) / 2
      const mobileMaxWidth = (containerWidth - gapSize) / 2;
      effectiveMinWidth = Math.min(140, mobileMaxWidth); // Never smaller than 140px
    } else if (containerWidth <= 768) {
      // For tablets, use slightly smaller minimum
      effectiveMinWidth = Math.min(160, minCardWidth);
    }

    // Account for gaps: if we have n columns, we have (n-1) gaps
    // So: availableWidth = n * cardWidth + (n-1) * gapSize
    // Solving for n: n = (availableWidth + gapSize) / (cardWidth + gapSize)
    const calculatedColumns = Math.floor((containerWidth + gapSize) / (effectiveMinWidth + gapSize));

    // Ensure we always have at least 1 column and respect maximum
    // On mobile, ensure at least 2 columns if space allows
    let minColumns = 1;
    if (containerWidth <= 480 && containerWidth >= 300) {
      minColumns = 2; // Force 2 columns on mobile if we have reasonable space
    }
    
    return Math.max(minColumns, Math.min(calculatedColumns, maxColumns));
  }, [containerWidth, minCardWidth, gapSize, maxColumns]);

  // Set up ResizeObserver to track container width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    // Initial measurement
    updateWidth();

    // Set up ResizeObserver for future changes
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(container);

    // Also listen to window resize as backup
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Calculate effective minimum width for grid template
  const effectiveMinWidth = useMemo(() => {
    if (containerWidth <= 480) {
      const mobileMaxWidth = (containerWidth - gapSize) / 2;
      return Math.min(140, mobileMaxWidth);
    } else if (containerWidth <= 768) {
      return Math.min(160, minCardWidth);
    }
    return minCardWidth;
  }, [containerWidth, minCardWidth, gapSize]);

  // Return the ref, calculated columns, and grid styles
  return {
    containerRef,
    columns,
    gridStyle: {
      display: 'grid' as const,
      gridTemplateColumns: `repeat(${columns}, minmax(${Math.max(effectiveMinWidth, 120)}px, 1fr))`,
      gap: `${gapSize}px`
    }
  };
};
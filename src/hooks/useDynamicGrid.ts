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

  // Standard CSS Grid approach: calculate columns based on auto-fit minmax
  const gap = 16; // Standard gap size
  
  const columns = useMemo(() => {
    if (containerWidth === 0) return 1; // Default fallback
    
    // Calculate how many cards fit with minimum width
    return Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
  }, [containerWidth]);

  const responsiveGapSize = gap;

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

  // No need for complex calculations - CSS Grid handles it all

  // Return the ref, calculated columns, and grid styles
  return {
    containerRef,
    columns,
    gridStyle: {
      display: 'grid' as const,
      gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))`,
      gap: `${gap}px`
    }
  };
};
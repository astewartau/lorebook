import { useState, useCallback, useEffect } from 'react';

interface UseBinderNavigationOptions {
  totalPageSpreads: number;
  totalMobilePages: number;
  isMobile: boolean;
  disableKeyboardNav?: boolean;
}

interface UseBinderNavigationReturn {
  currentPageSpread: number;
  currentMobilePage: number;
  setCurrentPageSpread: React.Dispatch<React.SetStateAction<number>>;
  setCurrentMobilePage: React.Dispatch<React.SetStateAction<number>>;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  handleNextMobilePage: () => void;
  handlePrevMobilePage: () => void;
  // Touch/swipe handlers
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const MIN_SWIPE_DISTANCE = 50;

export function useBinderNavigation({
  totalPageSpreads,
  totalMobilePages,
  isMobile,
  disableKeyboardNav = false
}: UseBinderNavigationOptions): UseBinderNavigationReturn {
  const [currentPageSpread, setCurrentPageSpread] = useState(0);
  const [currentMobilePage, setCurrentMobilePage] = useState(0);

  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Desktop navigation
  const handleNextPage = useCallback(() => {
    if (currentPageSpread < totalPageSpreads - 1) {
      setCurrentPageSpread(prev => prev + 1);
      setCurrentMobilePage(prev => Math.min(prev + 2, totalMobilePages - 1));
    }
  }, [currentPageSpread, totalPageSpreads, totalMobilePages]);

  const handlePrevPage = useCallback(() => {
    if (currentPageSpread > 0) {
      setCurrentPageSpread(prev => prev - 1);
      setCurrentMobilePage(prev => Math.max(prev - 2, 0));
    }
  }, [currentPageSpread]);

  // Mobile navigation
  const handleNextMobilePage = useCallback(() => {
    if (currentMobilePage < totalMobilePages - 1) {
      setCurrentMobilePage(prev => prev + 1);
      setCurrentPageSpread(Math.floor(currentMobilePage / 2));
    }
  }, [currentMobilePage, totalMobilePages]);

  const handlePrevMobilePage = useCallback(() => {
    if (currentMobilePage > 0) {
      setCurrentMobilePage(prev => prev - 1);
      setCurrentPageSpread(Math.floor((currentMobilePage - 1) / 2));
    }
  }, [currentMobilePage]);

  // Swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isMobile) {
      if (isLeftSwipe) {
        handleNextMobilePage();
      } else if (isRightSwipe) {
        handlePrevMobilePage();
      }
    }
  }, [touchStart, touchEnd, isMobile, handleNextMobilePage, handlePrevMobilePage]);

  // Keyboard navigation
  useEffect(() => {
    if (disableKeyboardNav) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNextPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevPage, handleNextPage, disableKeyboardNav]);

  return {
    currentPageSpread,
    currentMobilePage,
    setCurrentPageSpread,
    setCurrentMobilePage,
    handleNextPage,
    handlePrevPage,
    handleNextMobilePage,
    handlePrevMobilePage,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}

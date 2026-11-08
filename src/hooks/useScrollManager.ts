import { useState, useEffect, useRef } from 'react';

/**
 * Hides the mobile bottom navigation while scrolling down and shows it again
 * when scrolling up. Only a change of visibility causes a render.
 */
export const useScrollManager = () => {
  const [navVisible, setNavVisible] = useState(true);
  const visibleRef = useRef(true);
  const lastYRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const threshold = 8;

    const show = (visible: boolean) => {
      if (visibleRef.current !== visible) {
        visibleRef.current = visible;
        setNavVisible(visible);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        if (y < 50) {
          show(true);
          lastYRef.current = y;
          return;
        }
        const diff = y - lastYRef.current;
        if (Math.abs(diff) > threshold) {
          show(diff < 0);
          lastYRef.current = y;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { navVisible, setNavVisible };
};

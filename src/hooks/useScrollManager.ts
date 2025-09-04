import { useState, useEffect } from 'react';

export const useScrollManager = () => {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    
    const controlNavbar = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const threshold = 8; // Minimum scroll distance to trigger hide/show
          
          // Always show if we're near the top
          if (currentScrollY < 50) {
            if (!navVisible) setNavVisible(true);
            setLastScrollY(currentScrollY);
            ticking = false;
            return;
          }
          
          // Only change visibility if we've scrolled enough
          const scrollDiff = currentScrollY - lastScrollY;
          if (Math.abs(scrollDiff) > threshold) {
            if (scrollDiff > 0 && navVisible) {
              // Scrolling down - hide navbar
              setNavVisible(false);
            } else if (scrollDiff < 0 && !navVisible) {
              // Scrolling up - show navbar
              setNavVisible(true);
            }
            setLastScrollY(currentScrollY);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // Use passive listeners for better performance
    window.addEventListener('scroll', controlNavbar, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY, navVisible]);

  return { navVisible, setNavVisible };
};
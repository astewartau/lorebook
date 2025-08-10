import { useState, useEffect } from 'react';

export const useScrollManager = () => {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      const threshold = 10; // Minimum scroll distance to trigger hide/show
      
      // Don't hide/show if we're near the top
      if (currentScrollY < 100) {
        setNavVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY) > threshold) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down - hide navbar
          setNavVisible(false);
        } else {
          // Scrolling up - show navbar
          setNavVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    
    return () => {
      window.removeEventListener('scroll', controlNavbar);
    };
  }, [lastScrollY]);

  return { navVisible, setNavVisible };
};
import { useState, useEffect, useRef, RefObject } from 'react';

interface UseInViewportOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useInViewport = <T extends HTMLElement = HTMLElement>(
  options: UseInViewportOptions = {}
): [RefObject<T | null>, boolean] => {
  const {
    threshold = 0,
    rootMargin = '50px', // Start loading 50px before entering viewport
    enabled = true
  } = options;

  const elementRef = useRef<T>(null);
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin
      }
    );

    const element = elementRef.current;
    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, enabled]);

  return [elementRef, isInViewport];
};
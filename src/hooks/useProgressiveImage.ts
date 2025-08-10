import { useState, useEffect, useRef } from 'react';
import { useImageLoad } from '../contexts/ImageLoadContext';
import { ImageType } from '../utils/ImageLoadManager';

interface UseProgressiveImageOptions {
  thumbnail: string;
  full: string;
  cardId: string;
  isInViewport?: boolean;
  imageType: 'regular' | 'enchanted';
}

export const useProgressiveImage = ({
  thumbnail,
  full,
  cardId,
  isInViewport = true,
  imageType
}: UseProgressiveImageOptions) => {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const imageLoad = useImageLoad();
  const lastUrlsRef = useRef({ thumbnail: '', full: '' });
  const mountedRef = useRef(true);

  // Derive ImageType from the imageType prop
  const thumbnailType: ImageType = imageType === 'regular' ? 'regular-thumbnail' : 'enchanted-thumbnail';
  const fullType: ImageType = imageType === 'regular' ? 'regular-full' : 'enchanted-full';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset when URLs change
    if (lastUrlsRef.current.thumbnail !== thumbnail || lastUrlsRef.current.full !== full) {
      setThumbnailSrc(null);
      setFullSrc(null);
      setIsLoading(false);
      lastUrlsRef.current = { thumbnail, full };
    }
  }, [thumbnail, full]);

  useEffect(() => {
    if (!thumbnail || !full) return;

    setIsLoading(true);

    // Check if already loaded
    if (imageLoad.isLoaded(thumbnail)) {
      setThumbnailSrc(thumbnail);
    }
    if (imageLoad.isLoaded(full)) {
      setFullSrc(full);
      setIsLoading(false);
    }

    // Register thumbnail
    imageLoad.registerImage(
      thumbnail,
      thumbnailType,
      cardId,
      isInViewport,
      (url) => {
        if (mountedRef.current) {
          setThumbnailSrc(url);
        }
      },
      () => {
        // Thumbnail failed - full image will be prioritized automatically
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    );

    // Register full image
    imageLoad.registerImage(
      full,
      fullType,
      cardId,
      isInViewport,
      (url) => {
        if (mountedRef.current) {
          setFullSrc(url);
          setIsLoading(false);
        }
      },
      () => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      imageLoad.cancelLoad(thumbnail);
      imageLoad.cancelLoad(full);
    };
  }, [thumbnail, full, cardId, isInViewport, thumbnailType, fullType, imageLoad]);

  // Update priorities when viewport changes
  useEffect(() => {
    if (thumbnail) {
      imageLoad.updatePriority(thumbnail, isInViewport);
    }
    if (full) {
      imageLoad.updatePriority(full, isInViewport);
    }
  }, [isInViewport, thumbnail, full, imageLoad]);

  // Return the best available image
  const currentSrc = fullSrc || thumbnailSrc;
  const isFullLoaded = !!fullSrc;

  return {
    src: currentSrc,
    isLoading,
    isFullLoaded,
    blur: false, // No blur effect
    hasThumbnail: !!thumbnailSrc,
    hasFull: !!fullSrc
  };
};
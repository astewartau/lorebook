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
  const imageLoadRef = useRef(imageLoad);
  const lastUrlsRef = useRef({ thumbnail: '', full: '' });
  const mountedRef = useRef(true);
  
  // Keep imageLoad ref up to date
  imageLoadRef.current = imageLoad;

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

    // Check if already in cache first
    const thumbnailFromCache = imageLoad.getLoadedImageUrl(thumbnail);
    const fullFromCache = imageLoad.getLoadedImageUrl(full);
    
    if (thumbnailFromCache) {
      setThumbnailSrc(thumbnailFromCache);
    }
    if (fullFromCache) {
      setFullSrc(fullFromCache);
      setIsLoading(false);
    }

    // Also check ImageLoadManager
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
        // Update both local state AND global cache when image loads
        imageLoad.setImageLoaded(url);
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
        // Update both local state AND global cache when image loads
        imageLoad.setImageLoaded(url);
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
      imageLoadRef.current.cancelLoad(thumbnail);
      imageLoadRef.current.cancelLoad(full);
    };
  }, [thumbnail, full, cardId, isInViewport, thumbnailType, fullType]);

  // Update priorities when viewport changes
  useEffect(() => {
    if (thumbnail) {
      imageLoadRef.current.updatePriority(thumbnail, isInViewport);
    }
    if (full) {
      imageLoadRef.current.updatePriority(full, isInViewport);
    }
  }, [isInViewport, thumbnail, full]);

  // Return the best available image from global cache
  const currentSrc = fullSrc || thumbnailSrc;
  const isFullLoaded = !!fullSrc;

  // Only log when there's an actual issue
  // (removed excessive debug logging)

  return {
    src: currentSrc,
    isLoading,
    isFullLoaded,
    blur: false, // No blur effect
    hasThumbnail: !!thumbnailSrc,
    hasFull: !!fullSrc
  };
};
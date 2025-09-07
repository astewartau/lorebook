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

    // Check if thumbnail and full URLs are the same (thumbnail-only mode)
    const isThumbnailOnly = thumbnail === full;

    // Check if already in cache first
    const thumbnailFromCache = imageLoad.getLoadedImageUrl(thumbnail);
    const fullFromCache = isThumbnailOnly ? thumbnailFromCache : imageLoad.getLoadedImageUrl(full);
    
    if (thumbnailFromCache) {
      setThumbnailSrc(thumbnailFromCache);
      if (isThumbnailOnly) {
        setFullSrc(thumbnailFromCache); // Same image serves as both
        setIsLoading(false);
      }
    }
    if (!isThumbnailOnly && fullFromCache) {
      setFullSrc(fullFromCache);
      setIsLoading(false);
    }

    // Also check ImageLoadManager
    if (imageLoad.isLoaded(thumbnail)) {
      setThumbnailSrc(thumbnail);
      if (isThumbnailOnly) {
        setFullSrc(thumbnail); // Same image serves as both
        setIsLoading(false);
      }
    }
    if (!isThumbnailOnly && imageLoad.isLoaded(full)) {
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
          if (isThumbnailOnly) {
            // In thumbnail-only mode, this serves as both thumbnail and full
            setFullSrc(url);
            setIsLoading(false);
          }
        }
      },
      () => {
        // Thumbnail failed - full image will be prioritized automatically (unless it's thumbnail-only mode)
        if (mountedRef.current) {
          if (isThumbnailOnly) {
            setIsLoading(false); // No fallback in thumbnail-only mode
          }
        }
      }
    );

    // Only register full image if it's different from thumbnail
    if (!isThumbnailOnly) {
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
    }

    // Cleanup - use more granular cancelCallback to only remove this specific component's callbacks
    return () => {
      imageLoadRef.current.cancelCallback(thumbnail, cardId);
      if (!isThumbnailOnly) {
        imageLoadRef.current.cancelCallback(full, cardId);
      }
    };
  }, [thumbnail, full, cardId, isInViewport, thumbnailType, fullType]);

  // Update priorities when viewport changes
  useEffect(() => {
    const isThumbnailOnly = thumbnail === full;
    
    if (thumbnail) {
      imageLoadRef.current.updatePriority(thumbnail, isInViewport);
    }
    if (full && !isThumbnailOnly) {
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
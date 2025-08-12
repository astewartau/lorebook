import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import ImageLoadManager, { ImageType } from '../utils/ImageLoadManager';

interface ImageLoadContextType {
  registerImage: (
    url: string,
    imageType: ImageType,
    cardId: string,
    isInViewport: boolean,
    onLoad: (url: string) => void,
    onError: (url: string) => void
  ) => void;
  updatePriority: (url: string, isInViewport: boolean) => void;
  cancelLoad: (url: string) => void;
  clearStaleRequests: () => void;
  isLoaded: (url: string) => boolean;
  isLoading: (url: string) => boolean;
  hasFailed: (url: string) => boolean;
  // New global cache methods
  getLoadedImageUrl: (url: string) => string | null;
  setImageLoaded: (url: string) => void;
}

const ImageLoadContext = createContext<ImageLoadContextType | undefined>(undefined);

export const ImageLoadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const managerRef = useRef<ImageLoadManager>(ImageLoadManager.getInstance());
  // Global cache for loaded images
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Clean up on unmount
    return () => {
      // Don't clear the manager on unmount as it's a singleton
      // and other components might still be using it
    };
  }, []);

  const contextValue: ImageLoadContextType = {
    registerImage: (url, imageType, cardId, isInViewport, onLoad, onError) => {
      managerRef.current.registerImage(url, imageType, cardId, isInViewport, onLoad, onError);
    },
    updatePriority: (url, isInViewport) => {
      managerRef.current.updatePriority(url, isInViewport);
    },
    cancelLoad: (url) => {
      managerRef.current.cancelLoad(url);
    },
    clearStaleRequests: () => {
      managerRef.current.clearStaleRequests();
    },
    isLoaded: (url) => {
      return managerRef.current.isLoaded(url);
    },
    isLoading: (url) => {
      return managerRef.current.isLoading(url);
    },
    hasFailed: (url) => {
      return managerRef.current.hasFailed(url);
    },
    // New global cache methods
    getLoadedImageUrl: (url) => {
      return loadedImages.has(url) ? url : null;
    },
    setImageLoaded: (url) => {
      setLoadedImages(prev => {
        const newSet = new Set(prev);
        newSet.add(url);
        return newSet;
      });
    }
  };

  return (
    <ImageLoadContext.Provider value={contextValue}>
      {children}
    </ImageLoadContext.Provider>
  );
};

export const useImageLoad = () => {
  const context = useContext(ImageLoadContext);
  if (!context) {
    throw new Error('useImageLoad must be used within an ImageLoadProvider');
  }
  return context;
};
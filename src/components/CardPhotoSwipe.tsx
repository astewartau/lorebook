import React, { useEffect, useRef } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import { LorcanaCard } from '../types';

interface CardPhotoSwipeProps {
  cards: LorcanaCard[];
  currentCardIndex: number;
  isOpen: boolean;
  onClose: () => void;
  galleryID: string;
}

const CardPhotoSwipe: React.FC<CardPhotoSwipeProps> = ({ 
  cards, 
  currentCardIndex, 
  isOpen, 
  onClose, 
  galleryID 
}) => {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

  useEffect(() => {
    // Simple implementation like the working example
    let lightbox = new PhotoSwipeLightbox({
      gallery: '#' + galleryID,
      children: 'a',
      pswpModule: () => import('photoswipe'),
    });
    
    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
  }, []); // Empty deps like the working example

  useEffect(() => {
    // Open the lightbox when isOpen changes
    if (isOpen && lightboxRef.current) {
      lightboxRef.current.loadAndOpen(currentCardIndex);
    }
  }, [isOpen, currentCardIndex]);

  // Handle close event
  useEffect(() => {
    if (!lightboxRef.current) return;
    
    const handleClose = () => {
      onClose();
    };
    
    lightboxRef.current.on('close', handleClose);
    
    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.off('close', handleClose);
      }
    };
  }, [onClose]);

  // Always render the gallery (hidden), like the working example
  return (
    <div className="pswp-gallery" id={galleryID} style={{ display: 'none' }}>
      {cards.map((card, index) => (
        <a
          href={card.images.full}
          data-pswp-width="488"
          data-pswp-height="680"
          key={galleryID + '-' + index}
          target="_blank"
          rel="noreferrer"
        >
          <img src={card.images.full} alt={card.name} />
        </a>
      ))}
    </div>
  );
};

export default CardPhotoSwipe;
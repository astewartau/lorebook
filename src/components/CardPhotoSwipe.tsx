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
  cardQuantities?: Map<number, number>; // Map of cardId -> quantity (legacy)
  getQuantity?: (cardId: number) => number; // Function to get quantity (preferred)
  onAddCard?: (card: LorcanaCard) => void;
  onRemoveCard?: (cardId: number) => void;
}

const CardPhotoSwipe: React.FC<CardPhotoSwipeProps> = ({
  cards,
  currentCardIndex,
  isOpen,
  onClose,
  galleryID,
  cardQuantities,
  getQuantity,
  onAddCard,
  onRemoveCard
}) => {
  const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);
  const onAddCardRef = useRef(onAddCard);
  const onRemoveCardRef = useRef(onRemoveCard);
  const cardQuantitiesRef = useRef(cardQuantities);
  const getQuantityRef = useRef(getQuantity);
  const cardsRef = useRef(cards);

  // Keep refs up to date with latest props
  useEffect(() => {
    onAddCardRef.current = onAddCard;
    onRemoveCardRef.current = onRemoveCard;
    cardQuantitiesRef.current = cardQuantities;
    getQuantityRef.current = getQuantity;
    cardsRef.current = cards;
  }, [onAddCard, onRemoveCard, cardQuantities, getQuantity, cards]);

  // Track whether we have controls - used for dependency array
  const hasControls = !!(onAddCard && onRemoveCard);

  useEffect(() => {
    // Simple implementation like the working example

    let lightbox = new PhotoSwipeLightbox({
      // Use dataSource instead of gallery selector - this prevents pre-loading all images
      dataSource: [],
      pswpModule: () => import('photoswipe'),
      // Disable ALL close mechanisms when controls are present
      bgOpacity: 0.8,
      closeOnVerticalDrag: hasControls ? false : true,
      clickToCloseNonZoomable: false, // Always disable this
      tapAction: hasControls ? false : 'close',
      doubleTapAction: false,
      // Add padding at bottom to make room for controls (only if handlers provided)
      paddingFn: (viewportSize) => {
        return {
          top: 0,
          bottom: hasControls ? 100 : 0,
          left: 0,
          right: 0
        };
      }
    });

    // Add custom UI elements if handlers provided
    if (hasControls) {
      lightbox.on('uiRegister', function() {
        // Quantity control buttons
        lightbox.pswp?.ui?.registerElement({
            name: 'quantity-controls',
            order: 10,
            isButton: false,
            html: '',
            onInit: (el: HTMLElement) => {
              // Style the container - position in the reserved bottom padding area
              el.style.position = 'fixed';
              el.style.bottom = '20px';
              el.style.left = '50%';
              el.style.transform = 'translateX(-50%)';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.gap = '12px';
              el.style.padding = '12px 20px';
              el.style.backgroundColor = 'rgba(26, 43, 60, 0.95)';
              el.style.borderRadius = '8px';
              el.style.border = '2px solid #D4AF37';
              el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
              el.style.zIndex = '10000';
              el.style.pointerEvents = 'auto';

              // Mark this element so we can identify clicks on it
              el.setAttribute('data-pswp-controls', 'true');

              // Create buttons
              const minusBtn = document.createElement('button');
              minusBtn.type = 'button';
              minusBtn.innerHTML = '−';
              minusBtn.style.width = '40px';
              minusBtn.style.height = '40px';
              minusBtn.style.border = 'none';
              minusBtn.style.borderRadius = '4px';
              minusBtn.style.backgroundColor = '#dc2626';
              minusBtn.style.color = 'white';
              minusBtn.style.fontSize = '24px';
              minusBtn.style.fontWeight = 'bold';
              minusBtn.style.cursor = 'pointer';
              minusBtn.style.transition = 'all 0.2s';
              minusBtn.style.touchAction = 'none';

              const quantitySpan = document.createElement('span');
              quantitySpan.style.minWidth = '60px';
              quantitySpan.style.textAlign = 'center';
              quantitySpan.style.fontSize = '20px';
              quantitySpan.style.fontWeight = 'bold';
              quantitySpan.style.color = '#D4AF37';

              const plusBtn = document.createElement('button');
              plusBtn.type = 'button';
              plusBtn.innerHTML = '+';
              plusBtn.style.width = '40px';
              plusBtn.style.height = '40px';
              plusBtn.style.border = 'none';
              plusBtn.style.borderRadius = '4px';
              plusBtn.style.backgroundColor = '#16a34a';
              plusBtn.style.color = 'white';
              plusBtn.style.fontSize = '24px';
              plusBtn.style.fontWeight = 'bold';
              plusBtn.style.cursor = 'pointer';
              plusBtn.style.transition = 'all 0.2s';
              plusBtn.style.touchAction = 'none';

              // Hover effects
              minusBtn.onmouseenter = () => minusBtn.style.backgroundColor = '#b91c1c';
              minusBtn.onmouseleave = () => minusBtn.style.backgroundColor = '#dc2626';
              plusBtn.onmouseenter = () => plusBtn.style.backgroundColor = '#15803d';
              plusBtn.onmouseleave = () => plusBtn.style.backgroundColor = '#16a34a';

              const updateDisplay = () => {
                const currentCard = cardsRef.current[lightbox.pswp?.currIndex || 0];
                // Use getQuantity function if available, otherwise fall back to Map
                const quantity = getQuantityRef.current
                  ? getQuantityRef.current(currentCard.id)
                  : (cardQuantitiesRef.current?.get(currentCard.id) || 0);
                quantitySpan.textContent = `${quantity}`;
                minusBtn.disabled = quantity <= 0;
                minusBtn.style.opacity = quantity <= 0 ? '0.5' : '1';
                minusBtn.style.cursor = quantity <= 0 ? 'not-allowed' : 'pointer';
              };

              // Button click handlers - mark the event as handled
              minusBtn.addEventListener('click', (e: any) => {
                e._pswpControlHandled = true;
                const currentCard = cardsRef.current[lightbox.pswp?.currIndex || 0];
                onRemoveCardRef.current?.(currentCard.id);
                setTimeout(updateDisplay, 50); // Update after state change
              });

              plusBtn.addEventListener('click', (e: any) => {
                e._pswpControlHandled = true;
                const currentCard = cardsRef.current[lightbox.pswp?.currIndex || 0];
                onAddCardRef.current?.(currentCard);
                setTimeout(updateDisplay, 50); // Update after state change
              });

              // Update when slide changes
              lightbox.pswp?.on('change', updateDisplay);

              // Add to DOM
              el.appendChild(minusBtn);
              el.appendChild(quantitySpan);
              el.appendChild(plusBtn);

              // Initial update
              updateDisplay();
            }
          });
      });

    }

    lightbox.init();
    lightboxRef.current = lightbox;

    return () => {
      lightbox.destroy();
      lightboxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryID, hasControls]); // Recreate when entering/exiting deck editing mode

  useEffect(() => {
    // Open or close the lightbox when isOpen changes
    if (isOpen && lightboxRef.current) {
      // Convert cards to PhotoSwipe dataSource format
      const dataSource = cards.map((card) => ({
        src: card.images.full,
        width: 488,
        height: 680,
        alt: card.name
      }));

      // Update the dataSource dynamically
      lightboxRef.current.options.dataSource = dataSource;
      lightboxRef.current.loadAndOpen(currentCardIndex);
    } else if (!isOpen && lightboxRef.current?.pswp) {
      lightboxRef.current.pswp.close();
    }
  }, [isOpen, currentCardIndex, cards]);

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

  // No need to render anything - PhotoSwipe uses dataSource API
  return null;
};

export default CardPhotoSwipe;
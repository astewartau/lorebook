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

    // Register all UI elements in a single handler
    lightbox.on('uiRegister', function() {
      // Info panel toggle button - in the top toolbar area
      lightbox.pswp?.ui?.registerElement({
        name: 'info-button',
        ariaLabel: 'Card Info',
        order: 9,
        isButton: true,
        appendTo: 'bar',
        html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onClick: (event: Event, el: HTMLElement) => {
          const infoPanel = document.getElementById('pswp-info-panel');
          if (infoPanel) {
            const isVisible = infoPanel.style.transform === 'translateY(0px)';
            infoPanel.style.transform = isVisible ? 'translateY(100%)' : 'translateY(0px)';
          }
        }
      });

      // Info panel container
      lightbox.pswp?.ui?.registerElement({
        name: 'info-panel',
        order: 9,
        isButton: false,
        html: '',
        onInit: (el: HTMLElement) => {
          el.id = 'pswp-info-panel';
          el.style.position = 'fixed';
          el.style.bottom = hasControls ? '90px' : '0';
          el.style.left = '0';
          el.style.right = '0';
          el.style.maxHeight = '60vh';
          el.style.backgroundColor = 'rgba(26, 43, 60, 0.97)';
          el.style.borderTop = '2px solid #D4AF37';
          el.style.color = 'white';
          el.style.transform = 'translateY(100%)';
          el.style.transition = 'transform 0.3s ease-in-out';
          el.style.zIndex = '9999';
          el.style.overflowY = 'auto';
          el.style.pointerEvents = 'auto';
          el.setAttribute('data-pswp-controls', 'true');

          const updateInfoPanel = () => {
            const currentCard = cardsRef.current[lightbox.pswp?.currIndex || 0];
            if (!currentCard) return;

            el.innerHTML = `
              <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                  <div>
                    <h2 style="margin: 0; font-size: 1.5rem; color: #D4AF37; font-weight: bold;">${currentCard.fullName}</h2>
                    ${currentCard.version ? `<p style="margin: 4px 0 0 0; color: #9CA3AF; font-style: italic;">${currentCard.version}</p>` : ''}
                  </div>
                  <button id="close-info-panel" style="background: none; border: none; color: #9CA3AF; font-size: 24px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Set</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">Set ${currentCard.setCode} · #${currentCard.number}</p>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Rarity</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.rarity}</p>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Ink</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.color || 'None'}</p>
                  </div>
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Cost</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.cost} · ${currentCard.inkwell ? 'Inkable' : 'Uninkable'}</p>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Type</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.type}${currentCard.subtypes?.length ? ' · ' + currentCard.subtypes.join(', ') : ''}</p>
                  </div>
                  ${currentCard.type === 'Character' ? `
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Stats</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">⚔️ ${currentCard.strength ?? '-'} · 🛡️ ${currentCard.willpower ?? '-'} · ◆ ${currentCard.lore ?? '-'}</p>
                  </div>
                  ` : `
                  <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                    <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Lore</span>
                    <p style="margin: 4px 0 0 0; font-weight: 500;">◆ ${currentCard.lore ?? '-'}</p>
                  </div>
                  `}
                </div>

                ${currentCard.story ? `
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                  <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Franchise</span>
                  <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.story}</p>
                </div>
                ` : ''}

                ${currentCard.abilities?.length ? `
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                  <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Abilities</span>
                  ${currentCard.abilities.map((ability: any) => `
                    <div style="margin-top: 8px;">
                      ${ability.name ? `<p style="margin: 0; font-weight: 600; color: #D4AF37;">${ability.name}</p>` : ''}
                      <p style="margin: 4px 0 0 0; font-size: 0.9rem;">${ability.effect || ability.text || ''}</p>
                    </div>
                  `).join('')}
                </div>
                ` : ''}

                ${currentCard.flavorText ? `
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                  <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Flavor Text</span>
                  <p style="margin: 4px 0 0 0; font-style: italic; color: #D1D5DB;">${currentCard.flavorText}</p>
                </div>
                ` : ''}

                ${currentCard.artists?.length ? `
                <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px;">
                  <span style="color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase;">Artist${currentCard.artists.length > 1 ? 's' : ''}</span>
                  <p style="margin: 4px 0 0 0; font-weight: 500;">${currentCard.artists.join(', ')}</p>
                </div>
                ` : ''}
              </div>
            `;

            // Add close button handler
            const closeBtn = document.getElementById('close-info-panel');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                el.style.transform = 'translateY(100%)';
              });
            }
          };

          // Update when slide changes
          lightbox.pswp?.on('change', () => {
            updateInfoPanel();
          });

          // Initial update
          updateInfoPanel();
        }
      });

      // Add quantity control UI elements if handlers provided
      if (hasControls) {
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
      }
    });

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
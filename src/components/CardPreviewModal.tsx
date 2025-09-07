import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LorcanaCard } from '../types';

interface CardPreviewModalProps {
  card: LorcanaCard | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoToPrevious?: boolean;
  canGoToNext?: boolean;
}

const CardPreviewModal: React.FC<CardPreviewModalProps> = ({ 
  card, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  canGoToPrevious = false, 
  canGoToNext = false 
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState<LorcanaCard | null>(null);
  
  // 3D tilt effect state
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && canGoToPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && canGoToNext && onNext) {
        onNext();
      }
    };

    if (isOpen && card) {
      // Store the current card and start rendering
      setCurrentCard(card);
      setShouldRender(true);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Force a reflow, then start animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else if (!isOpen && shouldRender) {
      // Start closing animation (keep currentCard for fade-out)
      setIsVisible(false);
      
      // Clean up after animation
      const cleanup = setTimeout(() => {
        setShouldRender(false);
        setCurrentCard(null);
        document.body.style.overflow = 'unset';
      }, 300);

      return () => {
        clearTimeout(cleanup);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, card, shouldRender]);

  // 3D tilt effect handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransform('');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHovered || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / rect.height) * -10; // Max 10 degrees
    const rotateY = (mouseX / rect.width) * 10;   // Max 10 degrees

    const newTransform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    setTransform(newTransform);
  };

  if (!shouldRender || !currentCard) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative p-8 transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous button */}
        {canGoToPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full transition-all duration-200 hover:scale-110"
            title="Previous card (←)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Next button */}
        {canGoToNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full transition-all duration-200 hover:scale-110"
            title="Next card (→)"
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div 
          ref={cardRef}
          className="relative cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          {/* Card image with 3D effect */}
          <img
            src={currentCard.images.full}
            alt={currentCard.name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-150 ease-out"
            style={{
              transform: transform || 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CardPreviewModal;
import React, { useEffect, useState, useRef } from 'react';
import { ConsolidatedCard } from '../types';
import { Sparkles, Zap } from 'lucide-react';

interface CardPreviewModalProps {
  card: ConsolidatedCard | null;
  isOpen: boolean;
  onClose: () => void;
}

const CardPreviewModal: React.FC<CardPreviewModalProps> = ({ card, isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState<ConsolidatedCard | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'foil' | 'enchanted'>('normal');
  const [foilMaskDataUrl, setFoilMaskDataUrl] = useState<string | null>(null);
  const [foilMaskLoading, setFoilMaskLoading] = useState(false);
  
  // 3D tilt effect state
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [lightPosition, setLightPosition] = useState({ x: 50, y: 50 }); // Virtual position for foil effects
  const [targetLightPosition, setTargetLightPosition] = useState({ x: 50, y: 50 }); // Real mouse position
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth interpolation for light position
  const animateLightPosition = () => {
    setLightPosition(current => {
      const dx = targetLightPosition.x - current.x;
      const dy = targetLightPosition.y - current.y;
      
      // Lerp factor - higher = faster animation
      const lerpFactor = isHovered ? 0.15 : 0.08;
      
      const newX = current.x + dx * lerpFactor;
      const newY = current.y + dy * lerpFactor;
      
      // If we're close enough, stop animating
      const threshold = 0.5;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return targetLightPosition;
      }
      
      return { x: newX, y: newY };
    });
    
    animationFrameRef.current = requestAnimationFrame(animateLightPosition);
  };

  // Start/stop animation based on hover/touch state
  useEffect(() => {
    if (isHovered || isTouching || (lightPosition.x !== 50 || lightPosition.y !== 50)) {
      animationFrameRef.current = requestAnimationFrame(animateLightPosition);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, isTouching, targetLightPosition, lightPosition]);

  // Detect mobile device and setup orientation handlers
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Setup simple device orientation when foil mode is activated
  useEffect(() => {
    if (!isMobile || viewMode !== 'foil' || !isVisible) return;

    console.log('Setting up device orientation for mobile foil effect');

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Skip gyroscope updates when user is touching the screen
      if (isTouching) return;
      
      console.log('🔥 DeviceOrientationEvent fired!', event);
      
      const alpha = event.alpha || 0; // Z axis (0-360)
      const beta = event.beta || 0;   // X axis (-180 to 180) - front/back tilt
      const gamma = event.gamma || 0; // Y axis (-90 to 90) - left/right tilt

      console.log(`📱 Orientation: Alpha=${alpha.toFixed(1)}°, Beta=${beta.toFixed(1)}°, Gamma=${gamma.toFixed(1)}°`);

      // Test if values are actually changing
      if (alpha === 0 && beta === 0 && gamma === 0) {
        console.warn('⚠️ All orientation values are 0 - sensor might not be working');
      }

      // Convert to light position (50% = center)
      const maxTilt = 30; // Max degrees to consider for effect
      const lightX = 50 + Math.max(-50, Math.min(50, (gamma / maxTilt) * 50));
      const lightY = 50 + Math.max(-50, Math.min(50, (beta / maxTilt) * 50));

      console.log(`✨ Light position: X=${lightX.toFixed(1)}%, Y=${lightY.toFixed(1)}%`);
      setTargetLightPosition({ x: lightX, y: lightY });
    };

    // Check for DeviceOrientationEvent support
    if (window.DeviceOrientationEvent) {
      console.log('DeviceOrientationEvent is supported');
      
      // For iOS 13+ - request permission first
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        console.log('iOS device detected - requesting permission');
        (DeviceOrientationEvent as any).requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            } else {
              console.warn('Device orientation permission denied');
            }
          })
          .catch((error: any) => console.error('Error requesting orientation permission:', error));
      } else {
        // For Android and older iOS - just add the listener
        console.log('Android device detected - adding orientation listener');
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } else {
      console.warn('DeviceOrientationEvent is not supported on this device');
    }

    // Cleanup
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      console.log('Device orientation listener removed');
    };
  }, [isMobile, viewMode, isVisible, isTouching]);

  // Load foil mask as data URL using CorsProxy.io
  const loadFoilMaskAsDataUrl = async (maskUrl: string) => {
    // Prevent multiple simultaneous requests for the same URL
    if (foilMaskLoading) return;
    
    setFoilMaskLoading(true);
    setFoilMaskDataUrl(null);
    
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(maskUrl)}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(proxyUrl, {
        mode: 'cors',
        cache: 'default',
        signal: controller.signal,
        headers: {
          'Accept': 'image/*,*/*',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Verify it's actually an image
      if (!blob.type.startsWith('image/')) {
        throw new Error('Response is not an image');
      }
      
      // Convert to data URL synchronously to avoid race conditions
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      
      setFoilMaskDataUrl(dataUrl);
      setFoilMaskLoading(false);
      
    } catch (error) {
      setFoilMaskLoading(false);
      setFoilMaskDataUrl(null);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen && card) {
      // Store the current card and start rendering
      setCurrentCard(card);
      setShouldRender(true);
      setViewMode('normal'); // Reset to normal version when opening
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Load foil mask if available
      if (card.baseCard.images.foilMask) {
        loadFoilMaskAsDataUrl(card.baseCard.images.foilMask);
      }
      
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
        setViewMode('normal');
        document.body.style.overflow = 'unset';
      }, 300);

      return () => {
        clearTimeout(cleanup);
        document.removeEventListener('keydown', handleEscape);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, card, shouldRender]);

  // 3D tilt effect handlers
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation based on mouse position (reduced intensity for larger modal)
    const rotateX = ((y - centerY) / centerY) * -8; // Max 8 degrees (reduced from 15)
    const rotateY = ((x - centerX) / centerX) * 8; // Max 8 degrees (reduced from 15)
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    
    // Update target light position - the virtual position will smoothly follow
    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;
    setTargetLightPosition({ x: lightX, y: lightY });
  };
  
  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      setTransform('');
      setTargetLightPosition({ x: 50, y: 50 }); // Virtual position will smoothly return to center
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile || !cardRef.current) return;
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    
    touchStartRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    setIsTouching(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile || !cardRef.current || !touchStartRef.current) return;
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation based on touch position (reduced intensity for larger modal)
    const rotateX = ((y - centerY) / centerY) * -8; // Max 8 degrees
    const rotateY = ((x - centerX) / centerX) * 8; // Max 8 degrees
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    
    // Update target light position - the virtual position will smoothly follow
    const lightX = (x / rect.width) * 100;
    const lightY = (y / rect.height) * 100;
    setTargetLightPosition({ x: lightX, y: lightY });
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    
    setIsTouching(false);
    touchStartRef.current = null;
    setTransform('');
    setTargetLightPosition({ x: 50, y: 50 }); // Virtual position will smoothly return to center
  };

  if (!shouldRender || !currentCard) return null;

  const hasEnchanted = currentCard.hasEnchanted && currentCard.enchantedCard;
  const hasFoil = currentCard.baseCard.images.foilMask;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Dimmed background overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-all duration-300 ease-out ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Card container with version switcher */}
      <div className="relative flex flex-col items-center gap-4">
        {/* Card images with 3D tilt effect */}
        <div 
          ref={cardRef}
          className="relative cursor-pointer transform-gpu select-none"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: transform,
            transition: isHovered || isTouching ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {/* Holographic light effect overlay for non-foil modes */}
          {viewMode !== 'foil' && (
            <div 
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: `radial-gradient(circle at ${lightPosition.x}% ${lightPosition.y}%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)`,
                opacity: transform ? 0.8 : 0,
                transition: 'opacity 0.3s ease-out'
              }}
            />
          )}
          
          {/* Base card image */}
          <img
            src={currentCard.baseCard.images.full}
            alt={currentCard.baseCard.fullName}
            className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-500 ease-out ${
              isVisible && viewMode === 'normal' ? 'opacity-100 scale-100' : 
              isVisible && viewMode !== 'normal' ? 'opacity-0 scale-95' : 'opacity-0 scale-75'
            }`}
            onClick={onClose}
            draggable={false}
          />
          
          {/* Foil version with shimmer effect */}
          {hasFoil && (
            <img
              src={currentCard.baseCard.images.full}
              alt={`${currentCard.baseCard.fullName} (Foil)`}
              className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-500 ease-out ${
                isVisible && viewMode === 'foil' ? 'opacity-100 scale-100' : 
                isVisible ? 'opacity-0 scale-105' : 'opacity-0 scale-75'
              }`}
              onClick={onClose}
              draggable={false}
              style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: `translateX(-50%) ${isVisible && viewMode === 'foil' ? 'scale(1)' : isVisible ? 'scale(1.05)' : 'scale(0.75)'}`
              }}
            />
          )}
              
          {/* Foil shimmer overlay - using data URL to bypass CORS */}
          {hasFoil && viewMode === 'foil' && (
            <div
              className={`absolute inset-0 rounded-lg pointer-events-none overflow-hidden transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                // Use data URL if available, otherwise fall back to whole-card effect
                ...(foilMaskDataUrl ? {
                  // Use the foil mask as an alpha mask - grayscale values determine shimmer intensity
                  maskImage: `url(${foilMaskDataUrl})`,
                  maskSize: '100% 100%', // Force exact size match with container
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center center',
                  maskMode: 'luminance', // Use luminance (grayscale) values for masking
                  WebkitMaskImage: `url(${foilMaskDataUrl})`,
                  WebkitMaskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat', 
                  WebkitMaskPosition: 'center center',
                  WebkitMaskMode: 'luminance',
                  // Full opacity so mask controls the shimmer intensity
                  opacity: 1.0
                } : {
                  // Fallback: whole-card effect with lower opacity while loading or if failed
                  opacity: foilMaskLoading ? 0.2 : 0.4
                })
              }}
            >
              {/* Main holographic rainbow sweep */}
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background: `
                    linear-gradient(
                      ${(lightPosition.x - 50) * 0.6 + (lightPosition.y + 15) * 0.4}deg,
                      transparent 0%,
                      rgba(255, 0, 150, 0.6) 15%,
                      rgba(0, 255, 255, 0.7) 25%,
                      rgba(255, 255, 0, 0.6) 35%,
                      rgba(255, 0, 255, 0.6) 45%,
                      rgba(0, 255, 0, 0.5) 55%,
                      transparent 100%
                    )
                  `,
                  mixBlendMode: 'screen',
                  filter: 'brightness(1.3) contrast(1.1)'
                }}
              />
              
              {/* Directional light reflection */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  background: `
                    radial-gradient(
                      ellipse ${Math.abs(lightPosition.x - 50) * 0.6 + 25}% ${Math.abs(lightPosition.y - 50) * 0.6 + 15}% at ${lightPosition.x}% ${lightPosition.y}%,
                      rgba(255, 255, 255, 0.7) 0%,
                      rgba(255, 255, 255, 0.2) 20%,
                      transparent 50%
                    )
                  `,
                  mixBlendMode: 'overlay'
                }}
              />
              
              {/* Rotating prismatic rainbow */}
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  background: `
                    conic-gradient(
                      from ${((lightPosition.x - 50) * 0.8 + (lightPosition.y + 15) * 0.5) + 45}deg at ${lightPosition.x}% ${Math.max(lightPosition.y - 50, 0)}%,
                      rgba(255, 0, 128, 0.6) 0deg,
                      rgba(0, 255, 128, 0.6) 60deg,
                      rgba(128, 0, 255, 0.6) 120deg,
                      rgba(255, 128, 0, 0.6) 180deg,
                      rgba(0, 128, 255, 0.6) 240deg,
                      rgba(255, 0, 128, 0.6) 360deg
                    )
                  `,
                  mixBlendMode: 'color-dodge',
                  filter: 'blur(1px)'
                }}
              />
              
              {/* Holographic texture pattern */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `
                    repeating-linear-gradient(
                      ${((lightPosition.x - 50) + (lightPosition.y + 15)) * 0.3}deg,
                      transparent 0px,
                      rgba(255, 255, 255, 0.08) 1px,
                      transparent 2px,
                      transparent 8px
                    ),
                    repeating-linear-gradient(
                      ${(-(lightPosition.x - 50) + (lightPosition.y + 15)) * 0.3 + 90}deg,
                      transparent 0px,
                      rgba(0, 255, 255, 0.08) 1px,
                      transparent 2px,
                      transparent 12px
                    )
                  `,
                  mixBlendMode: 'soft-light'
                }}
              />
              
              {/* Sparkle highlights */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background: `
                    radial-gradient(
                      circle at ${lightPosition.x + 10}% ${lightPosition.y - 10}%,
                      rgba(255, 255, 255, 0.8) 0%,
                      transparent 3%
                    ),
                    radial-gradient(
                      circle at ${lightPosition.x - 15}% ${lightPosition.y + 15}%,
                      rgba(255, 255, 255, 0.6) 0%,
                      transparent 2%
                    ),
                    radial-gradient(
                      circle at ${lightPosition.x + 5}% ${lightPosition.y + 20}%,
                      rgba(255, 255, 255, 0.7) 0%,
                      transparent 2.5%
                    )
                  `
                }}
              />
            </div>
          )}
          
          {/* Enchanted card image */}
          {hasEnchanted && (
            <img
              src={currentCard.enchantedCard!.images.full}
              alt={`${currentCard.enchantedCard!.fullName} (Enchanted)`}
              className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-500 ease-out ${
                isVisible && viewMode === 'enchanted' ? 'opacity-100 scale-100' : isVisible ? 'opacity-0 scale-105' : 'opacity-0 scale-75'
              }`}
              onClick={onClose}
              draggable={false}
              style={{
                position: 'absolute',
                top: '0',
                left: '50%',
                transform: `translateX(-50%) ${isVisible && viewMode === 'enchanted' ? 'scale(1)' : isVisible ? 'scale(1.05)' : 'scale(0.75)'}`
              }}
            />
          )}
        </div>
        
        {/* Version switcher buttons */}
        {(hasEnchanted || hasFoil) && (
          <div className={`flex gap-2 transition-all duration-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('normal');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                viewMode === 'normal'
                  ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Normal
            </button>
            
            {hasFoil && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('foil');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'foil'
                    ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={
                  isMobile 
                    ? 'Foil effect - tilt your device to see the shimmer!' 
                    : foilMaskLoading ? 'Loading foil mask...' : foilMaskDataUrl ? 'Foil mask loaded' : 'Using fallback foil effect'
                }
              >
                <Zap size={16} />
                Foil{isMobile && ' 📱'}
                {foilMaskLoading && <span className="text-xs animate-pulse">⏳</span>}
                {!foilMaskLoading && !foilMaskDataUrl && <span className="text-xs">⚠</span>}
              </button>
            )}
            
            {hasEnchanted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('enchanted');
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  viewMode === 'enchanted'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Sparkles size={16} />
                Enchanted
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPreviewModal;
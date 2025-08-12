import React, { useEffect, useRef } from 'react';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to prevent menu from going off-screen
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Check if menu goes off right edge
      if (rect.right > viewportWidth) {
        adjustedX = x - rect.width;
      }

      // Check if menu goes off bottom edge
      if (rect.bottom > viewportHeight) {
        adjustedY = y - rect.height;
      }

      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border-2 border-lorcana-gold rounded-sm shadow-xl art-deco-corner"
      style={{ left: x, top: y }}
    >
      <div className="py-1">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`
              w-full px-4 py-2 flex items-center space-x-2 text-left
              transition-colors min-w-[180px]
              ${item.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-lorcana-ink hover:bg-lorcana-cream'
              }
            `}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContextMenu;
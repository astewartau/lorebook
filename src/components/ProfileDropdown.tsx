import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { User, Bell, LogOut, Eye } from 'lucide-react';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfileClick: () => void;
  onProfileClick: () => void;
  onNotificationsClick: () => void;
  onSignOut: () => void;
  userDisplayName?: string;
  userEmail?: string;
  hasUnreadNotifications?: boolean;
  anchorEl?: HTMLElement | null;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onViewProfileClick,
  onProfileClick,
  onNotificationsClick,
  onSignOut,
  userDisplayName,
  userEmail,
  hasUnreadNotifications = false,
  anchorEl
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // 8px gap
        left: rect.right - 256 // 256px is dropdown width (w-64)
      });
    }
  }, [isOpen, anchorEl]);

  if (!isOpen) return null;

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  // Portal content - wrapped in a single container
  const dropdownContent = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
      />
      
      {/* Dropdown - positioned absolutely within the container */}
      <div 
        className="absolute w-64 bg-lorcana-navy border border-lorcana-gold/30 rounded-lg shadow-xl overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Info Header */}
        <div className="p-4 border-b border-lorcana-gold/20 bg-lorcana-purple/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lorcana-gold/20 rounded-full flex items-center justify-center">
              <User size={20} className="text-lorcana-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-lorcana-cream truncate">
                {userDisplayName || 'User'}
              </div>
              <div className="text-sm text-lorcana-cream/60 truncate">
                {userEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <button
            onClick={() => handleItemClick(onViewProfileClick)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left text-lorcana-cream hover:bg-lorcana-purple/20 transition-colors"
          >
            <Eye size={16} className="text-lorcana-cream/60" />
            <span>View Profile</span>
          </button>
          
          <button
            onClick={() => handleItemClick(onProfileClick)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left text-lorcana-cream hover:bg-lorcana-purple/20 transition-colors"
          >
            <User size={16} className="text-lorcana-cream/60" />
            <span>Edit Profile</span>
          </button>
          
          <button
            onClick={() => handleItemClick(onNotificationsClick)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left text-lorcana-cream hover:bg-lorcana-purple/20 transition-colors"
          >
            <div className="relative">
              <Bell size={16} className="text-lorcana-cream/60" />
              {hasUnreadNotifications && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-lorcana-navy"></div>
              )}
            </div>
            <span>Notifications</span>
            {hasUnreadNotifications && (
              <div className="ml-auto w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </button>
          
          <div className="border-t border-lorcana-gold/20 my-2"></div>
          
          <button
            onClick={() => handleItemClick(onSignOut)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left text-lorcana-cream hover:bg-red-900/20 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} className="text-lorcana-cream/60" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal
  return ReactDOM.createPortal(dropdownContent, document.body);
};

export default ProfileDropdown;
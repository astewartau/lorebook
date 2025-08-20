import React from 'react';
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
  hasUnreadNotifications = false
}) => {
  if (!isOpen) return null;

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="absolute top-full right-0 mt-2 w-64 bg-lorcana-navy border border-lorcana-gold/30 rounded-lg shadow-xl z-50 overflow-hidden">
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
    </>
  );
};

export default ProfileDropdown;
import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import ProfileDropdown from '../ProfileDropdown';
import NotificationDropdown from '../NotificationDropdown';
import { groupService } from '../../services/groupService';

interface AuthSectionProps {
  isMobile?: boolean;
  onLoginClick: () => void;
  onProfileClick: () => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  isMobile = false,
  onLoginClick,
  onProfileClick
}) => {
  const { user, signOut, loading } = useAuth();
  const { userProfile } = useProfile();
  const navigate = useNavigate();
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Check for unread notifications
  useEffect(() => {
    const checkUnreadNotifications = async () => {
      if (!user) return;
      try {
        const notifications = await groupService.getNotifications(user.id);
        const hasUnread = notifications.some(n => !n.is_read);
        setHasUnreadNotifications(hasUnread);
      } catch (error) {
        console.error('Error checking unread notifications:', error);
      }
    };

    if (user) {
      checkUnreadNotifications();
    }
  }, [user]);

  // Close dropdowns when clicking outside
  // Commented out - this conflicts with portal implementation
  // The ProfileDropdown component handles its own outside clicks via backdrop
  /*
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  */

  const handleMarkAllNotificationsRead = () => {
    setHasUnreadNotifications(false);
  };

  const handleViewProfile = () => {
    if (user) {
      navigate(`/community/${user.id}`);
    }
  };

  if (loading) {
    if (isMobile) {
      return (
        <div className="w-8 h-8 rounded-full bg-lorcana-cream/20 animate-pulse"></div>
      );
    }
    return (
      <div className="text-lorcana-cream">Loading...</div>
    );
  }

  if (user) {
    if (isMobile) {
      return (
        <div className="relative" ref={dropdownRef}>
          <button
            ref={profileButtonRef}
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
            className="relative p-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
            title={userProfile ? userProfile.displayName : user.email}
          >
            <User size={20} />
            {hasUnreadNotifications && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-lorcana-navy"></div>
            )}
          </button>

          <ProfileDropdown
            isOpen={showProfileDropdown}
            onClose={() => setShowProfileDropdown(false)}
            onViewProfileClick={handleViewProfile}
            onProfileClick={onProfileClick}
            onNotificationsClick={() => {
              setShowProfileDropdown(false);
              setShowNotifications(true);
            }}
            onSignOut={signOut}
            userDisplayName={userProfile?.displayName}
            userEmail={user.email}
            hasUnreadNotifications={hasUnreadNotifications}
            anchorEl={profileButtonRef.current}
          />

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3">
        <div className="relative" ref={dropdownRef}>
          <button
            ref={profileButtonRef}
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
            className="relative flex items-center space-x-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
          >
            <div className="relative">
              <User size={18} />
              {hasUnreadNotifications && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-lorcana-navy"></div>
              )}
            </div>
            <span className="text-sm truncate max-w-32" title={userProfile ? `@${userProfile.displayName}` : user.email}>
              {userProfile ? userProfile.displayName : user.email}
            </span>
            <ChevronDown size={14} className={`transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </button>

          <ProfileDropdown
            isOpen={showProfileDropdown}
            onClose={() => setShowProfileDropdown(false)}
            onViewProfileClick={handleViewProfile}
            onProfileClick={onProfileClick}
            onNotificationsClick={() => {
              setShowProfileDropdown(false);
              setShowNotifications(true);
            }}
            onSignOut={signOut}
            userDisplayName={userProfile?.displayName}
            userEmail={user.email}
            hasUnreadNotifications={hasUnreadNotifications}
            anchorEl={profileButtonRef.current}
          />

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        </div>
      </div>
    );
  }

  // Not signed in
  if (isMobile) {
    return (
      <button
        onClick={onLoginClick}
        data-sign-in-button
        className="p-2 text-lorcana-gold hover:text-lorcana-cream transition-colors"
      >
        <User size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={onLoginClick}
      data-sign-in-button
      className="flex items-center space-x-2 px-4 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-cream transition-colors font-medium"
    >
      <User size={16} />
      <span>Sign In</span>
    </button>
  );
};

export default AuthSection;
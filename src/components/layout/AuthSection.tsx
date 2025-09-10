import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import ProfileDropdown from '../ProfileDropdown';
import NotificationDropdown from '../NotificationDropdown';
import UserAvatarButton from '../UserAvatarButton';
import { groupService } from '../../services/groupService';

interface AuthSectionProps {
  isMobile?: boolean;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onAvatarClick?: () => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  isMobile = false,
  onLoginClick,
  onProfileClick,
  onAvatarClick
}) => {
  const { user, signOut, loading } = useAuth();
  const { userProfile } = useProfile();
  const navigate = useNavigate();
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);

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
          <div ref={profileButtonRef} className="w-8 h-8 rounded-full border-2 border-lorcana-gold">
            <UserAvatarButton
              userProfile={userProfile}
              size="sm"
              onAvatarClick={onAvatarClick}
              onProfileClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
              showEditHint={false}
              showProfileArea={false}
            />
          </div>
          
          {/* Notification indicator */}
          {hasUnreadNotifications && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-lorcana-navy"></div>
          )}

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
            onAvatarClick={onAvatarClick}
            userDisplayName={userProfile?.displayName}
            userEmail={user.email}
            userProfile={userProfile}
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
          <div ref={profileButtonRef}>
            <UserAvatarButton
              userProfile={userProfile}
              size="sm"
              onAvatarClick={onAvatarClick}
              onProfileClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
              showEditHint={false}
              showProfileArea={true}
            />
          </div>
          
          {/* Notification indicator */}
          {hasUnreadNotifications && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-lorcana-navy"></div>
          )}

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
            onAvatarClick={onAvatarClick}
            userDisplayName={userProfile?.displayName}
            userEmail={user.email}
            userProfile={userProfile}
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
import React from 'react';
import { User, Camera, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';
import AvatarImage from './AvatarImage';

interface UserAvatarButtonProps {
  userProfile: UserProfile | null;
  size?: 'sm' | 'md' | 'lg';
  onAvatarClick?: (e: React.MouseEvent) => void;
  onProfileClick?: (e: React.MouseEvent) => void;
  className?: string;
  showEditHint?: boolean;
  showProfileArea?: boolean;
}

const UserAvatarButton: React.FC<UserAvatarButtonProps> = ({
  userProfile,
  size = 'md',
  onAvatarClick,
  onProfileClick,
  className = '',
  showEditHint = false,
  showProfileArea = false
}) => {
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  if (showProfileArea) {
    // Combined avatar + profile area layout
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Avatar */}
        <div className="relative group w-8 h-8 rounded-full border-2 border-lorcana-gold overflow-hidden">
          {userProfile?.avatarCardId && userProfile?.avatarCropData ? (
            <AvatarImage
              cardId={userProfile.avatarCardId}
              cropData={userProfile.avatarCropData}
              className="w-full h-full cursor-pointer"
              onClick={onAvatarClick}
            />
          ) : (
            <button
              onClick={onAvatarClick}
              className="w-full h-full bg-lorcana-cream hover:bg-lorcana-gold transition-colors flex items-center justify-center group"
            >
              <User size={iconSizes[size]} className="text-lorcana-navy" />
            </button>
          )}
          {showEditHint && (
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={iconSizes[size] / 1.5} className="text-white" />
            </div>
          )}
        </div>

        {/* Profile Info Area */}
        <button
          onClick={onProfileClick}
          className="flex items-center space-x-1 text-lorcana-cream hover:text-lorcana-gold transition-colors"
        >
          <span className="text-sm truncate max-w-32">
            {userProfile?.displayName || 'Profile'}
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  // Simple avatar only
  if (userProfile?.avatarCardId && userProfile?.avatarCropData) {
    return (
      <div className={`relative group ${className}`}>
        <AvatarImage
          cardId={userProfile.avatarCardId}
          cropData={userProfile.avatarCropData}
          className="w-full h-full cursor-pointer"
          onClick={(e) => {
            // On mobile (no profile area), clicking avatar opens profile menu
            // Otherwise, clicking avatar opens avatar editor
            if (!showProfileArea && onProfileClick) {
              onProfileClick(e);
            } else if (onAvatarClick) {
              onAvatarClick(e);
            }
          }}
        />
        {showEditHint && showProfileArea && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={iconSizes[size] / 1.5} className="text-white" />
          </div>
        )}
      </div>
    );
  }

  // Default avatar (User icon)
  return (
    <button
      onClick={(e) => {
        // On mobile (no profile area), clicking avatar opens profile menu
        // Otherwise, clicking avatar opens avatar editor
        if (!showProfileArea && onProfileClick) {
          onProfileClick(e);
        } else if (onAvatarClick) {
          onAvatarClick(e);
        }
      }}
      className={`w-full h-full bg-lorcana-cream hover:bg-lorcana-gold transition-colors flex items-center justify-center group ${className}`}
    >
      <User size={iconSizes[size]} className="text-lorcana-navy" />
      {showEditHint && showProfileArea && (
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={iconSizes[size] / 1.5} className="text-white" />
        </div>
      )}
    </button>
  );
};

export default UserAvatarButton;
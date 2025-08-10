import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';

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
        <button
          onClick={() => signOut()}
          className="p-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
          title={`Sign out ${user.email}`}
        >
          <LogOut size={20} />
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-3">
        <button
          onClick={onProfileClick}
          className="flex items-center space-x-2 text-lorcana-cream hover:text-lorcana-gold transition-colors"
        >
          <User size={18} />
          <span className="text-sm truncate max-w-32 underline-offset-2 hover:underline" title={userProfile ? `@${userProfile.displayName}` : user.email}>
            {userProfile ? userProfile.displayName : user.email}
          </span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-1 px-3 py-1 text-sm text-lorcana-cream hover:text-lorcana-gold border border-lorcana-cream/30 hover:border-lorcana-gold rounded-sm transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
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
import React, { useState, useEffect } from 'react';
import { X, Save, User } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { userProfile, createOrUpdateProfile } = useProfile();
  
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load existing profile data
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setFullName(userProfile.fullName || '');
      setLocation(userProfile.location || '');
      setBio(userProfile.bio || '');
      setIsPublic(userProfile.isPublic);
    } else if (user) {
      // Set default display name from email
      setDisplayName(user.email?.split('@')[0] || '');
    }
  }, [userProfile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');

    const success = await createOrUpdateProfile({
      displayName: displayName.trim(),
      fullName: fullName.trim() || undefined,
      location: location.trim() || undefined,
      bio: bio.trim() || undefined,
      isPublic
    });

    if (success) {
      onClose();
    } else {
      setError('Failed to save profile. Please try again.');
    }

    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-lorcana-navy to-lorcana-purple p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-lorcana-gold transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-lorcana-gold rounded-full flex items-center justify-center">
              <User size={24} className="text-lorcana-navy" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-lorcana-gold">
                {userProfile ? 'Edit Profile' : 'Create Profile'}
              </h2>
              <p className="text-lorcana-cream text-sm">
                {userProfile ? 'Update your public profile' : 'Set up your public profile'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border-2 border-red-300 text-red-700 rounded-sm text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
              placeholder="Your username"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
              placeholder="Your real name (optional)"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
              placeholder="City, Country (optional)"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
              placeholder="Tell us about yourself and your Lorcana journey..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-lorcana-purple mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold"
            />
            <label htmlFor="isPublic" className="text-sm text-lorcana-ink">
              Make my profile public (visible in Community directory)
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-lorcana-navy flex items-center justify-center space-x-2"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-lorcana-gold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
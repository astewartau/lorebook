import React, { useState, useEffect } from 'react';
import { Save, User } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { useToast } from '../contexts/ToastContext';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { userProfile, createOrUpdateProfile } = useProfile();
  const { success: showSuccess, error: showError } = useToast();

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

    const result = await createOrUpdateProfile({
      displayName: displayName.trim(),
      fullName: fullName.trim() || undefined,
      location: location.trim() || undefined,
      bio: bio.trim() || undefined,
      isPublic
    });

    if (result) {
      showSuccess('Profile saved successfully!');
      onClose();
    } else {
      setError('Failed to save profile. Please try again.');
      showError('Failed to save profile');
    }

    setSaving(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userProfile ? 'Edit Profile' : 'Create Profile'}
      titleIcon={
        <div className="w-8 h-8 bg-lorcana-gold rounded-full flex items-center justify-center">
          <User size={18} className="text-lorcana-navy" />
        </div>
      }
      size="md"
      headerVariant="gradient"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-300 text-red-700 rounded-sm text-sm" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="profile-displayName" className="block text-sm font-medium text-lorcana-ink mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            id="profile-displayName"
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
          <label htmlFor="profile-fullName" className="block text-sm font-medium text-lorcana-ink mb-1">
            Full Name
          </label>
          <input
            id="profile-fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
            placeholder="Your real name (optional)"
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="profile-location" className="block text-sm font-medium text-lorcana-ink mb-1">
            Location
          </label>
          <input
            id="profile-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy"
            placeholder="City, Country (optional)"
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="profile-bio" className="block text-sm font-medium text-lorcana-ink mb-1">
            Bio
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy resize-none"
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
            id="profile-isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-lorcana-gold text-lorcana-navy focus:ring-lorcana-gold"
          />
          <label htmlFor="profile-isPublic" className="text-sm text-lorcana-ink">
            Make my profile public (visible in Community directory)
          </label>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-lorcana-navy flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </Modal>
  );
};

export default ProfileEditModal;

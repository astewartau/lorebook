import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Edit3, Eye, Book } from 'lucide-react';
import { UserProfile, Deck, CustomBinder } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import UserAvatarButton from './UserAvatarButton';
import ProfileEditModal from './ProfileEditModal';
import PublishedDeckCard from './PublishedDeckCard';
import * as api from '../lib/api';

interface UserProfileProps {
  onBack: () => void;
}

const UserProfileComponent: React.FC<UserProfileProps> = ({ onBack }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
  const [userBinders, setUserBinders] = useState<CustomBinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserProfile(userId).then(loadedProfile => {
        setProfile(loadedProfile);
        setLoading(false);
      });
    }
  }, [userId, loadUserProfile]);

  // This user's public decks and binders, queried by owner on the server.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([
      api.searchPublicDecks({ ownerId: userId, limit: 100 }),
      api.getUserBinders(userId, { publicOnly: true }),
    ]).then(([decks, binders]) => {
      if (cancelled) return;
      setUserDecks(decks);
      setUserBinders(binders);
    }).catch(error => console.error('Loading profile content failed:', error));
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-lorcana-ink mb-2">Profile not found</h2>
          <button onClick={onBack} className="btn-lorcana-navy">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-lorcana-cream">
      
      {/* Cover Photo + Profile Section */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-lorcana-gold transform rotate-45 -translate-x-16 -translate-y-16"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-lorcana-gold rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-lorcana-gold transform rotate-45 translate-y-20"></div>
          </div>
          
          {/* Back Button - Top Left */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center space-x-2 text-white hover:text-lorcana-gold transition-colors bg-black bg-opacity-20 rounded-full px-3 py-2"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Community</span>
          </button>
        </div>

        {/* Profile Info Container */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Avatar - Overlapping cover photo */}
            <div className="absolute -top-16 left-4">
              <UserAvatarButton
                userProfile={profile}
                size="lg"
                showEditHint={false}
                showProfileArea={false}
                className="w-32 h-32 border-4 border-white shadow-xl"
              />
            </div>

            {/* Profile Info and Actions */}
            <div className="pt-20 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                <div className="mb-4 sm:mb-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-lorcana-ink mb-1">
                    {profile.displayName}
                  </h1>
                  {profile.fullName && (
                    <p className="text-lg text-lorcana-navy mb-2">
                      {profile.fullName}
                    </p>
                  )}
                  
                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-lorcana-navy">
                    {profile.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin size={16} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>Joined {formatDate(profile.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {isOwnProfile && (
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="bg-lorcana-gold text-lorcana-navy px-6 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all duration-200 flex items-center space-x-2 shadow-lg"
                  >
                    <Edit3 size={16} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-4 max-w-2xl">
                  <p className="text-lorcana-navy leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
        {/* Activity Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-bold text-lorcana-ink mb-4">Activity</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Published Decks</span>
                <span className="font-bold text-lorcana-navy">{userDecks.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Published Binders</span>
                <span className="font-bold text-lorcana-navy">{userBinders.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="font-bold text-lorcana-navy">
                  {new Date(profile.createdAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Published Decks Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-lorcana-ink flex items-center">
              Published Decks
              <span className="ml-3 px-3 py-1 bg-lorcana-gold text-lorcana-navy text-sm font-medium rounded-full">
                {userDecks.length}
              </span>
            </h2>
          </div>

          <div className="p-6">
            {userDecks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500">
                  {isOwnProfile ? "You haven't published any decks yet." : "This user hasn't published any decks yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userDecks.map(deck => (
                  <PublishedDeckCard
                    key={deck.id}
                    deck={deck}
                    authorName={profile?.displayName || 'Unknown'}
                    onView={() => navigate(`/decks/${deck.id}`)}
                    canDuplicate={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Published Binders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-lorcana-ink flex items-center">
              Published Binders
              <span className="ml-3 px-3 py-1 bg-lorcana-gold text-lorcana-navy text-sm font-medium rounded-full">
                {userBinders.length}
              </span>
            </h2>
          </div>

          <div className="p-6">
            {userBinders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500">
                  {isOwnProfile ? "You haven't published any binders yet." : "This user hasn't published any binders yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userBinders.map(binder => (
                  <div key={binder.id} className="bg-white border-2 border-lorcana-gold rounded-sm p-4 hover:shadow-lg transition-shadow art-deco-corner-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lorcana-ink truncate">{binder.name}</h3>
                      <div className="flex items-center space-x-1 text-xs text-lorcana-navy bg-lorcana-purple/20 px-2 py-1 rounded-sm">
                        <Book size={12} />
                        <span>{binder.kind === 'set' ? 'Set' : 'Custom'}</span>
                      </div>
                    </div>

                    {binder.description && (
                      <p className="text-sm text-lorcana-navy mb-3 line-clamp-2">{binder.description}</p>
                    )}

                    {binder.setCode && (
                      <div className="text-xs text-lorcana-purple mb-4">
                        Set: {binder.setCode.toUpperCase()}
                      </div>
                    )}

                    <div className="text-xs text-lorcana-purple mb-4">
                      Published {binder.createdAt.toLocaleDateString()}
                    </div>

                    <button
                      onClick={() => navigate(`/binder/${binder.id}`)}
                      className="btn-lorcana-gold-sm w-full flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View Binder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default UserProfileComponent;
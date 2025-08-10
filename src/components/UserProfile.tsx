import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Edit3, Eye } from 'lucide-react';
import { UserProfile, Deck } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useProfile } from '../contexts/ProfileContext';
import { COLOR_ICONS } from '../constants/icons';
import ProfileEditModal from './ProfileEditModal';
import { DECK_RULES } from '../constants';

interface UserProfileProps {
  onBack: () => void;
}

const UserProfileComponent: React.FC<UserProfileProps> = ({ onBack }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { publicDecks, loadPublicDecks } = useDeck();
  const { loadUserProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userDecks, setUserDecks] = useState<Deck[]>([]);
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

  // Load user's public decks when userId changes
  useEffect(() => {
    if (userId) {
      loadPublicDecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Filter user decks when publicDecks changes
  useEffect(() => {
    if (userId && publicDecks.length > 0) {
      const userPublicDecks = publicDecks.filter(deck => deck.userId === userId);
      setUserDecks(userPublicDecks);
    }
  }, [userId, publicDecks]);

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
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="card-lorcana p-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Users</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="card-lorcana art-deco-corner overflow-hidden">
        {/* Art Deco Background Pattern */}
        <div className="relative bg-gradient-to-br from-lorcana-navy via-lorcana-purple to-lorcana-navy p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-lorcana-gold transform rotate-45 -translate-x-16 -translate-y-16"></div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-lorcana-gold rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-lorcana-gold transform rotate-45 translate-y-20"></div>
          </div>

          <div className="relative z-10 text-center text-white">
            {/* Avatar */}
            <div className="w-24 h-24 mx-auto mb-4 bg-lorcana-gold rounded-full flex items-center justify-center border-4 border-lorcana-cream shadow-2xl">
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-lorcana-navy">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name and Title */}
            <h1 className="text-3xl font-bold mb-2 text-lorcana-gold">
              {profile.displayName}
            </h1>
            {profile.fullName && (
              <p className="text-lg text-lorcana-cream opacity-90 mb-4">
                {profile.fullName}
              </p>
            )}

            {/* Profile Info */}
            <div className="flex justify-center items-center space-x-6 text-sm text-lorcana-cream">
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
        </div>

        {/* Profile Actions */}
        {isOwnProfile && (
          <div className="p-6 border-t-2 border-lorcana-gold bg-lorcana-cream">
            <div className="flex justify-center">
              <button 
                onClick={() => setShowProfileModal(true)}
                className="btn-lorcana-gold flex items-center space-x-2"
              >
                <Edit3 size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="card-lorcana p-6 art-deco-corner">
          <h2 className="text-xl font-bold text-lorcana-ink mb-4 flex items-center">
            <div className="w-1 h-6 bg-lorcana-gold mr-3"></div>
            About
          </h2>
          <p className="text-lorcana-navy leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Published Decks Section */}
      <div className="card-lorcana p-6 art-deco-corner">
        <h2 className="text-xl font-bold text-lorcana-ink mb-6 flex items-center">
          <div className="w-1 h-6 bg-lorcana-gold mr-3"></div>
          Published Decks
          <span className="ml-2 px-2 py-1 bg-lorcana-gold text-lorcana-ink text-sm font-medium rounded-sm">
            {userDecks.length}
          </span>
        </h2>

        {userDecks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lorcana-navy">
              {isOwnProfile ? "You haven't published any decks yet." : "This user hasn't published any decks yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userDecks.map(deck => {
              const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
              const inkColors = Object.entries(
                deck.cards.reduce((acc, card) => {
                  // Split dual-ink colors
                  const colors = card.color.includes('-') ? card.color.split('-') : [card.color];
                  colors.forEach(color => {
                    acc[color] = (acc[color] || 0) + card.quantity;
                  });
                  return acc;
                }, {} as Record<string, number>)
              ).filter(([, count]) => count > 0).sort(([, a], [, b]) => b - a);

              return (
                <div key={deck.id} className="bg-white border-2 border-lorcana-gold rounded-sm p-4 hover:shadow-lg transition-shadow art-deco-corner-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-lorcana-ink mb-1">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-sm text-lorcana-navy line-clamp-2">{deck.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 text-xs rounded-sm font-medium ${
                      cardCount === DECK_RULES.MAX_CARDS 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cardCount}/{DECK_RULES.MAX_CARDS} cards
                    </span>
                    
                    {/* Ink Colors */}
                    {inkColors.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {inkColors.slice(0, 3).map(([color]) => (
                          <div key={color} className="w-6 h-6 flex items-center justify-center" title={color}>
                            {COLOR_ICONS[color] ? (
                              <img src={COLOR_ICONS[color]} alt={color} className="w-full h-full" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-lorcana-gold border border-white" />
                            )}
                          </div>
                        ))}
                        {inkColors.length > 3 && (
                          <span className="text-xs text-lorcana-navy">+{inkColors.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-lorcana-purple mb-4">
                    Updated {new Date(deck.updatedAt).toLocaleDateString()}
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/deck/${deck.id}`)}
                    className="btn-lorcana-gold-sm w-full flex items-center justify-center gap-1"
                  >
                    <Eye size={14} />
                    View Deck
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default UserProfileComponent;
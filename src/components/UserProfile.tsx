import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Edit3, Eye, Book } from 'lucide-react';
import { UserProfile, Deck } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDeck } from '../contexts/DeckContext';
import { useProfile } from '../contexts/ProfileContext';
import { COLOR_ICONS } from '../constants/icons';
import UserAvatarButton from './UserAvatarButton';
import ProfileEditModal from './ProfileEditModal';
import { DECK_RULES } from '../constants';
import { supabase, TABLES, UserBinder } from '../lib/supabase';
import { allCards } from '../data/allCards';

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
  const [userBinders, setUserBinders] = useState<UserBinder[]>([]);
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

  // Load user's public decks when userId changes (only if not already loaded)
  useEffect(() => {
    if (userId && publicDecks.length === 0) {
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

  // Load user's public binders
  useEffect(() => {
    if (userId) {
      loadUserBinders(userId);
    }
  }, [userId]);

  const loadUserBinders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_BINDERS)
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserBinders(data || []);
    } catch (error) {
      console.error('Error loading user binders:', error);
      setUserBinders([]);
    }
  };

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userDecks.map(deck => {
              const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
              const inkColors = Object.entries(
                deck.cards.reduce((acc, entry) => {
                  const card = allCards.find(c => c.id === entry.cardId);
                  if (card) {
                    // Split dual-ink colors
                    const colors = card.color.includes('-') ? card.color.split('-') : [card.color];
                    colors.forEach((color: string) => {
                      acc[color] = (acc[color] || 0) + entry.quantity;
                    });
                  }
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
                    onClick={() => navigate(`/decks/${deck.id}`)}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userBinders.map(binder => (
                      <div key={binder.id} className="bg-white border-2 border-lorcana-gold rounded-sm p-4 hover:shadow-lg transition-shadow art-deco-corner-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lorcana-ink truncate">{binder.name}</h3>
                  <div className="flex items-center space-x-1 text-xs text-lorcana-navy bg-lorcana-purple/20 px-2 py-1 rounded-sm">
                    <Book size={12} />
                    <span>{binder.binder_type === 'set' ? 'Set' : 'Custom'}</span>
                  </div>
                </div>
                
                {binder.description && (
                  <p className="text-sm text-lorcana-navy mb-3 line-clamp-2">{binder.description}</p>
                )}
                
                {binder.set_code && (
                  <div className="text-xs text-lorcana-purple mb-4">
                    Set: {binder.set_code.toUpperCase()}
                  </div>
                )}
                
                <div className="text-xs text-lorcana-purple mb-4">
                  Published {new Date(binder.created_at).toLocaleDateString()}
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

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-lorcana-ink mb-4">Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Published Decks</span>
                    <span className="font-bold text-lorcana-navy">{userDecks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Published Binders</span>
                    <span className="font-bold text-lorcana-navy">{userBinders.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Member Since</span>
                    <span className="font-bold text-lorcana-navy">
                      {new Date(profile.createdAt).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Card (placeholder for future) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-lorcana-ink mb-4">Recent Activity</h3>
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Book size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Activity feed coming soon</p>
                </div>
              </div>
            </div>
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
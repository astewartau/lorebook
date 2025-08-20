import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Search, Globe, Lock, Copy, Trash2, Edit, Eye, User, X, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Deck } from '../types';
import DeckBox3D from './DeckBox3D';
import { DECK_RULES } from '../constants';

interface MyDecksProps {
  onBuildDeck: (deckId?: string) => void;
  onViewDeck: (deckId: string) => void;
}

const MyDecks: React.FC<MyDecksProps> = ({ onBuildDeck, onViewDeck }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const { 
    decks, 
    publicDecks, 
    createDeck, 
    deleteDeck, 
    duplicateDeck, 
    getDeckSummary, 
    exportDeck, 
    importDeck, 
    setCurrentDeck,
    startEditingDeck,
    publishDeck,
    unpublishDeck,
    loadPublicDecks
  } = useDeck();
  
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deckProfiles, setDeckProfiles] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Show notification with auto-dismiss
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load display names for deck authors
  const loadDeckProfiles = useCallback(async (decks: Deck[]) => {
    const profiles: Record<string, string> = {};
    
    for (const deck of decks) {
      if (deck.userId && !profiles[deck.userId]) {
        const profile = await loadUserProfile(deck.userId);
        if (profile) {
          profiles[deck.userId] = profile.displayName;
        }
      }
    }
    
    setDeckProfiles(prev => ({ ...prev, ...profiles }));
  }, [loadUserProfile]);

  // Load public decks only when viewing public tab or when not authenticated
  useEffect(() => {
    // Only load if we're actually viewing public decks
    const shouldLoadPublic = (!user || activeTab === 'public');
    
    if (shouldLoadPublic) {
      // Load once on mount/tab change, not on every keystroke
      loadPublicDecks(searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only reload when tab changes, not on search
  
  // Handle search with debouncing - separate from initial load
  useEffect(() => {
    // Only search if we're viewing public decks AND user is typing
    const shouldSearch = (!user || activeTab === 'public') && searchTerm.length > 0;
    
    if (shouldSearch) {
      if (searchTimeout) clearTimeout(searchTimeout);
      
      const timeout = setTimeout(async () => {
        await loadPublicDecks(searchTerm);
      }, 1500); // Increased debounce to 1.5 seconds
      
      setSearchTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Only trigger on search term change

  // Load profile display names when public decks change
  useEffect(() => {
    if (publicDecks.length > 0) {
      loadDeckProfiles(publicDecks);
    }
  }, [publicDecks, loadDeckProfiles]);

  const handleCreateDeck = async () => {
    try {
      // Create deck with default name and navigate immediately
      const defaultName = `New Deck ${decks.length + 1}`;
      const deckId = await createDeck(defaultName);
      onBuildDeck(deckId);
    } catch (error) {
      console.error('Error creating deck:', error);
      showNotification('error', 'Failed to create deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      try {
        await deleteDeck(deckId);
      } catch (error) {
        console.error('Error deleting deck:', error);
        showNotification('error', 'Failed to delete deck');
      }
    }
  };

  const handleDuplicateDeck = async (deckId: string) => {
    try {
      await duplicateDeck(deckId);
    } catch (error) {
      console.error('Error duplicating deck:', error);
      showNotification('error', 'Failed to duplicate deck');
    }
  };

  const handlePublishDeck = async (deckId: string) => {
    try {
      await publishDeck(deckId);
      showNotification('success', 'Deck published successfully!');
    } catch (error) {
      console.error('Error publishing deck:', error);
      showNotification('error', 'Failed to publish deck');
    }
  };

  const handleUnpublishDeck = async (deckId: string) => {
    try {
      await unpublishDeck(deckId);
      showNotification('success', 'Deck unpublished successfully!');
    } catch (error) {
      console.error('Error unpublishing deck:', error);
      showNotification('error', 'Failed to unpublish deck');
    }
  };

  const handleExportDeck = (deckId: string) => {
    const deckData = exportDeck(deckId);
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    
    const blob = new Blob([deckData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDeck = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const success = await importDeck(content);
        if (success) {
          showNotification('success', 'Deck imported successfully!');
        } else {
          showNotification('error', 'Failed to import deck. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleViewProfile = async (userId: string) => {
    if (!userId) return;
    
    // Check if user has a public profile
    const profile = await loadUserProfile(userId);
    if (profile && profile.isPublic) {
      navigate(`/community/${userId}`);
    }
  };

  // If not signed in, show only Published Decks tab
  if (!user) {
    return (
      <div>
        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`p-4 rounded-sm shadow-lg border-2 flex items-start space-x-3 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
              ) : (
                <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button 
                onClick={() => setNotification(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        
        <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
          {/* Sign-in prompt */}
          <div className="card-lorcana p-6 art-deco-corner text-center">
            <h2 className="text-xl font-bold text-lorcana-ink mb-2">Published Decks</h2>
            <p className="text-lorcana-navy mb-2">Discover and browse community decks</p>
            <p className="text-sm text-lorcana-navy">
              <button
                onClick={() => {
                  const signInButton = document.querySelector('[data-sign-in-button]') as HTMLButtonElement;
                  if (signInButton) signInButton.click();
                }}
                className="text-lorcana-gold hover:underline"
              >
                Sign in
              </button>
              {' '}to create and manage your own decks
            </p>
          </div>

          {/* Search Bar for Public Decks */}
          <div className="card-lorcana p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-navy" size={20} />
              <input
                type="text"
                placeholder="Search published decks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
              />
            </div>
          </div>

          {/* Public Deck Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicDecks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lorcana-navy">No published decks found.</p>
            </div>
          ) : (
            publicDecks.map(deck => {
              const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
              return (
                <div key={deck.id} className="card-lorcana p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-lorcana-ink">{deck.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-lorcana-navy">by</p>
                      {deck.userId ? (
                        <button
                          onClick={() => handleViewProfile(deck.userId!)}
                          className="flex items-center space-x-1 text-xs text-lorcana-gold hover:text-lorcana-navy hover:underline transition-colors"
                        >
                          <User size={12} />
                          <span>{deckProfiles[deck.userId!] || deck.authorEmail || 'Unknown'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-lorcana-navy">{deck.authorEmail || 'Unknown'}</span>
                      )}
                    </div>
                  </div>
                  
                  {deck.description && (
                    <p className="text-sm text-lorcana-navy mb-3">{deck.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      cardCount === DECK_RULES.MAX_CARDS 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cardCount}/{DECK_RULES.MAX_CARDS} cards
                    </span>
                    <span className="text-xs text-lorcana-navy">
                      Updated {new Date(deck.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewDeck(deck.id)}
                      className="btn-lorcana-gold-sm flex-1 flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View Deck
                    </button>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-sm shadow-lg border-2 flex items-start space-x-3 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
            ) : (
              <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      
      {/* Sub-tabs and Action Buttons */}
      <div className="bg-lorcana-cream border-b border-lorcana-gold/20">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('my')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'my'
                    ? 'border-lorcana-gold text-lorcana-navy font-medium'
                    : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
                }`}
              >
                <span>My Decks ({decks.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'public'
                    ? 'border-lorcana-gold text-lorcana-navy font-medium'
                    : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
                }`}
              >
                <span>Published Decks</span>
              </button>
            </div>
            
            {activeTab === 'my' && (
              <div className="flex gap-2">
                <button
                  onClick={handleCreateDeck}
                  className="btn-lorcana-gold-sm flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Build New Deck</span>
                </button>
                
                <button
                  onClick={() => navigate('/deck-forge')}
                  className="btn-lorcana-purple-sm flex items-center space-x-2 bg-gradient-to-r from-lorcana-purple to-lorcana-navy hover:from-lorcana-navy hover:to-lorcana-purple text-lorcana-cream"
                >
                  <Sparkles size={16} />
                  <span>Deck Forge</span>
                </button>
                
                <button
                  onClick={handleImportDeck}
                  className="btn-lorcana-navy-outline-sm flex items-center space-x-2"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
        {/* Search Bar for Public Decks */}
        {activeTab === 'public' && (
        <div className="card-lorcana p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-navy" size={20} />
            <input
              type="text"
              placeholder="Search published decks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
            />
          </div>
        </div>
      )}



      {/* Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'my' ? (
          decks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lorcana-navy mb-4">You haven't created any decks yet.</p>
              <button
                onClick={handleCreateDeck}
                className="btn-lorcana-gold"
              >
                Create Your First Deck
              </button>
            </div>
          ) : (
            decks.map(deck => {
              const summary = getDeckSummary(deck.id);
              if (!summary) return null;
              
              return (
                <div key={deck.id} className="card-lorcana p-6 relative group">
                  <DeckBox3D 
                    deck={deck} 
                    summary={summary}
                    onView={() => onViewDeck(deck.id)}
                    onEdit={() => {
                      startEditingDeck(deck.id);
                      navigate('/cards');
                    }}
                    onDuplicate={() => handleDuplicateDeck(deck.id)}
                    onDelete={() => handleDeleteDeck(deck.id)}
                    onExport={() => handleExportDeck(deck.id)}
                  />
                  
                  <div className="mt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-lorcana-ink">{deck.name}</h3>
                        {deck.isPublic && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                            <Globe size={12} />
                            Published
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        summary?.isValid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {summary?.cardCount || 0}/{DECK_RULES.MAX_CARDS}
                      </span>
                    </div>
                    
                    {deck.description && (
                      <p className="text-sm text-lorcana-navy mb-3">{deck.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setCurrentDeck(deck);
                          onBuildDeck(deck.id);
                        }}
                        className="btn-lorcana-gold-sm flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => onViewDeck(deck.id)}
                        className="btn-lorcana-navy-outline-sm flex items-center gap-1"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      
                      {deck.isPublic ? (
                        <button
                          onClick={() => handleUnpublishDeck(deck.id)}
                          className="btn-lorcana-navy-outline-sm flex items-center gap-1"
                        >
                          <Lock size={14} />
                          Unpublish
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublishDeck(deck.id)}
                          className="btn-lorcana-gold-sm flex items-center gap-1"
                        >
                          <Globe size={14} />
                          Publish
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDuplicateDeck(deck.id)}
                        className="btn-lorcana-navy-outline-sm flex items-center gap-1"
                        title="Duplicate"
                      >
                        <Copy size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleExportDeck(deck.id)}
                        className="btn-lorcana-navy-outline-sm flex items-center gap-1"
                        title="Export"
                      >
                        <Upload size={14} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="btn-lorcana-navy-outline-sm flex items-center gap-1 hover:bg-red-500 hover:text-white"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          publicDecks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lorcana-navy">No published decks found.</p>
            </div>
          ) : (
            publicDecks.map(deck => {
              const cardCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
              return (
                <div key={deck.id} className="card-lorcana p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-lorcana-ink">{deck.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-lorcana-navy">by</p>
                      {deck.userId ? (
                        <button
                          onClick={() => handleViewProfile(deck.userId!)}
                          className="flex items-center space-x-1 text-xs text-lorcana-gold hover:text-lorcana-navy hover:underline transition-colors"
                        >
                          <User size={12} />
                          <span>{deckProfiles[deck.userId!] || deck.authorEmail || 'Unknown'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-lorcana-navy">{deck.authorEmail || 'Unknown'}</span>
                      )}
                    </div>
                  </div>
                  
                  {deck.description && (
                    <p className="text-sm text-lorcana-navy mb-3">{deck.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      cardCount === DECK_RULES.MAX_CARDS 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {cardCount}/{DECK_RULES.MAX_CARDS} cards
                    </span>
                    <span className="text-xs text-lorcana-navy">
                      Updated {new Date(deck.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewDeck(deck.id)}
                      className="btn-lorcana-gold-sm flex-1 flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View Deck
                    </button>
                    
                    {user && deck.userId !== user.id && (
                      <button
                        onClick={() => handleDuplicateDeck(deck.id)}
                        className="btn-lorcana-navy-outline-sm flex items-center gap-1"
                        title="Copy to My Decks"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  </div>
  );
};

export default MyDecks;
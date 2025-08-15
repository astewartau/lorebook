import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Search, Globe, Lock, Copy, Trash2, Edit, Eye, User } from 'lucide-react';
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
    loading,
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
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deckProfiles, setDeckProfiles] = useState<Record<string, string>>({});

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
    if (!newDeckName.trim()) return;
    
    try {
      const deckId = await createDeck(newDeckName.trim(), newDeckDescription.trim() || undefined);
      setNewDeckName('');
      setNewDeckDescription('');
      setShowNewDeckForm(false);
      onBuildDeck(deckId);
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      try {
        await deleteDeck(deckId);
      } catch (error) {
        console.error('Error deleting deck:', error);
        alert('Failed to delete deck');
      }
    }
  };

  const handleDuplicateDeck = async (deckId: string) => {
    try {
      await duplicateDeck(deckId);
    } catch (error) {
      console.error('Error duplicating deck:', error);
      alert('Failed to duplicate deck');
    }
  };

  const handlePublishDeck = async (deckId: string) => {
    try {
      await publishDeck(deckId);
      alert('Deck published successfully!');
    } catch (error) {
      console.error('Error publishing deck:', error);
      alert('Failed to publish deck');
    }
  };

  const handleUnpublishDeck = async (deckId: string) => {
    try {
      await unpublishDeck(deckId);
      alert('Deck unpublished successfully!');
    } catch (error) {
      console.error('Error unpublishing deck:', error);
      alert('Failed to unpublish deck');
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
          alert('Deck imported successfully!');
        } else {
          alert('Failed to import deck. Please check the file format.');
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
      navigate(`/users/${userId}`);
    }
  };

  // If not signed in, show only Published Decks tab
  if (!user) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="card-lorcana p-6 art-deco-corner">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-lorcana-ink mb-2">Published Decks</h2>
              <p className="text-lorcana-navy">Discover and browse community decks</p>
              <p className="text-sm text-lorcana-navy mt-1">
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
          </div>
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

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold"></div>
            <p className="mt-2 text-lorcana-navy">Loading decks...</p>
          </div>
        )}

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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="card-lorcana p-6 art-deco-corner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-lorcana-ink mb-2">Deck Manager</h2>
            <p className="text-lorcana-navy">Build, manage, and share your Lorcana decks</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-2">
            {activeTab === 'my' && (
              <>
                <button
                  onClick={() => setShowNewDeckForm(true)}
                  className="btn-lorcana-gold flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>New Deck</span>
                </button>
                
                <button
                  onClick={handleImportDeck}
                  className="btn-lorcana-navy-outline flex items-center space-x-2"
                >
                  <Upload size={20} />
                  <span>Import</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-lorcana-gold">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-lorcana-gold text-lorcana-navy border-b-2 border-lorcana-navy -mb-0.5'
                : 'text-lorcana-navy hover:bg-lorcana-cream'
            }`}
          >
            My Decks ({decks.length})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'public'
                ? 'bg-lorcana-gold text-lorcana-navy border-b-2 border-lorcana-navy -mb-0.5'
                : 'text-lorcana-navy hover:bg-lorcana-cream'
            }`}
          >
            Published Decks
          </button>
        </div>
      </div>

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

      {/* New Deck Form */}
      {showNewDeckForm && (
        <div className="card-lorcana p-6">
          <h3 className="text-lg font-bold text-lorcana-ink mb-4">Create New Deck</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Deck Name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold"
            />
            <textarea
              placeholder="Description (optional)"
              value={newDeckDescription}
              onChange={(e) => setNewDeckDescription(e.target.value)}
              className="w-full px-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
                className="btn-lorcana-gold"
              >
                Create Deck
              </button>
              <button
                onClick={() => {
                  setShowNewDeckForm(false);
                  setNewDeckName('');
                  setNewDeckDescription('');
                }}
                className="btn-lorcana-navy-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold"></div>
          <p className="mt-2 text-lorcana-navy">Loading decks...</p>
        </div>
      )}

      {/* Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'my' ? (
          decks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lorcana-navy mb-4">You haven't created any decks yet.</p>
              <button
                onClick={() => setShowNewDeckForm(true)}
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
  );
};

export default MyDecks;
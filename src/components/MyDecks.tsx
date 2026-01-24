import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Search, User, Globe } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { Deck } from '../types';
import DeckCard from './DeckCard';
import PublishedDeckCard from './PublishedDeckCard';
import DeleteDeckModal from './DeleteDeckModal';
import AvatarEditor from './AvatarEditor';
import DeckImportModal from './DeckImportModal';

interface MyDecksProps {
  onBuildDeck: (deckId?: string) => void;
  onViewDeck: (deckId: string) => void;
}

const MyDecks: React.FC<MyDecksProps> = ({ onBuildDeck, onViewDeck }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const { success: showSuccess, error: showError } = useToast();
  const {
    decks,
    publicDecks,
    createDeckAndStartEditing,
    deleteDeck,
    duplicateDeck,
    getDeckSummary,
    exportDeck,
    importDeck,
    startEditingDeck,
    publishDeck,
    unpublishDeck,
    loadPublicDecks,
    updateDeck
  } = useDeck();

  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [deckProfiles, setDeckProfiles] = useState<Record<string, string>>({});
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; deckId: string; deckName: string }>({
    isOpen: false,
    deckId: '',
    deckName: ''
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarEditor, setAvatarEditor] = useState<{ isOpen: boolean; deckId: string; currentAvatar?: { cardId: number; cropData: { x: number; y: number; scale: number } } }>({
    isOpen: false,
    deckId: '',
    currentAvatar: undefined
  });
  const [importModalOpen, setImportModalOpen] = useState(false);

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
      }, 500); // Reduced debounce to 500ms for better UX

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
      // Create deck with default name and start editing immediately
      const defaultName = `New Deck ${decks.length + 1}`;
      await createDeckAndStartEditing(defaultName);
      navigate('/cards');
    } catch (error) {
      console.error('Error creating deck:', error);
      showError('Failed to create deck');
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      setDeleteModal({ isOpen: true, deckId, deckName: deck.name });
    }
  };

  const confirmDeleteDeck = async () => {
    setDeleteLoading(true);
    try {
      await deleteDeck(deleteModal.deckId);
      setDeleteModal({ isOpen: false, deckId: '', deckName: '' });
      showSuccess('Deck deleted successfully');
    } catch (error) {
      console.error('Error deleting deck:', error);
      showError('Failed to delete deck');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteDeck = () => {
    setDeleteModal({ isOpen: false, deckId: '', deckName: '' });
  };

  const handleDuplicateDeck = async (deckId: string) => {
    try {
      await duplicateDeck(deckId);
      showSuccess('Deck duplicated successfully');
    } catch (error) {
      console.error('Error duplicating deck:', error);
      showError('Failed to duplicate deck');
    }
  };

  const handlePublishDeck = async (deckId: string) => {
    try {
      await publishDeck(deckId);
      showSuccess('Deck published successfully!');
    } catch (error) {
      console.error('Error publishing deck:', error);
      showError('Failed to publish deck');
    }
  };

  const handleUnpublishDeck = async (deckId: string) => {
    try {
      await unpublishDeck(deckId);
      showSuccess('Deck unpublished successfully');
    } catch (error) {
      console.error('Error unpublishing deck:', error);
      showError('Failed to unpublish deck');
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
    showSuccess('Deck exported successfully');
  };

  const handleImportDeck = () => {
    setImportModalOpen(true);
  };

  const handleImportDeckData = async (deckData: string): Promise<boolean> => {
    const success = await importDeck(deckData);
    if (success) {
      showSuccess('Deck imported successfully!');
      setImportModalOpen(false);
    } else {
      showError('Failed to import deck. Please check the file format.');
    }
    return success;
  };

  const handleViewProfile = async (userId: string) => {
    if (!userId) return;

    // Check if user has a public profile
    const profile = await loadUserProfile(userId);
    if (profile && profile.isPublic) {
      navigate(`/community/${userId}`);
    }
  };

  const handleEditAvatar = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    setAvatarEditor({
      isOpen: true,
      deckId,
      currentAvatar: deck?.avatar
    });
  };

  const handleSaveAvatar = async (avatarData: { cardId: number; cropData: { x: number; y: number; scale: number } }) => {
    try {
      const deck = decks.find(d => d.id === avatarEditor.deckId);
      if (deck) {
        const updatedDeck = {
          ...deck,
          avatar: avatarData
        };
        await updateDeck(updatedDeck);
        showSuccess('Deck avatar updated successfully!');
      }
      setAvatarEditor({ isOpen: false, deckId: '', currentAvatar: undefined });
    } catch (error) {
      console.error('Error updating deck avatar:', error);
      showError('Failed to update deck avatar');
    }
  };

  const handleCloseAvatarEditor = () => {
    setAvatarEditor({ isOpen: false, deckId: '', currentAvatar: undefined });
  };

  // If not signed in, show only Published Decks tab
  if (!user) {
    return (
      <div>
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
                aria-label="Search published decks"
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
            publicDecks.map(deck => (
              <PublishedDeckCard
                key={deck.id}
                deck={deck}
                authorName={deckProfiles[deck.userId!] || deck.authorEmail || 'Unknown'}
                onView={() => onViewDeck(deck.id)}
                onViewProfile={handleViewProfile}
                canDuplicate={false}
              />
            ))
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="bg-lorcana-cream border-b border-lorcana-gold/20">
        <div className="container mx-auto px-2 sm:px-4">
          {/* Mobile: Full width equal buttons */}
          <div className="grid grid-cols-2 gap-1 sm:hidden" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'my'}
              onClick={() => setActiveTab('my')}
              className={`flex items-center justify-center px-2 py-3 border-b-2 transition-colors ${
                activeTab === 'my'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <User size={16} />
              <span className="ml-2 truncate">My Decks ({decks.length})</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'public'}
              onClick={() => setActiveTab('public')}
              className={`flex items-center justify-center px-2 py-3 border-b-2 transition-colors ${
                activeTab === 'public'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Globe size={16} />
              <span className="ml-2 truncate">Published Decks</span>
            </button>
          </div>

          {/* Desktop: Left-aligned buttons */}
          <div className="hidden sm:flex space-x-1" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'my'}
              onClick={() => setActiveTab('my')}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'my'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <User size={16} />
              <span className="ml-2">My Decks ({decks.length})</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'public'}
              onClick={() => setActiveTab('public')}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'public'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Globe size={16} />
              <span className="ml-2">Published Decks</span>
            </button>
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
              aria-label="Search published decks"
            />
          </div>
        </div>
      )}

      {/* My Decks Header with Actions */}
      {activeTab === 'my' && (
        <div className="flex justify-between items-center pb-4 border-b border-lorcana-gold/20">
          <div className="flex gap-6 text-sm text-lorcana-ink">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{decks.length} deck{decks.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateDeck}
              className="btn-lorcana-gold-sm flex items-center space-x-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Build New Deck</span>
              <span className="sm:hidden">Build</span>
            </button>

            <button
              onClick={handleImportDeck}
              className="btn-lorcana-navy-outline-sm flex items-center space-x-2"
              aria-label="Import deck from file"
            >
              <Upload size={16} />
              <span>Import</span>
            </button>
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
                <DeckCard
                  key={deck.id}
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
                  onPublish={() => handlePublishDeck(deck.id)}
                  onUnpublish={() => handleUnpublishDeck(deck.id)}
                  onEditAvatar={() => handleEditAvatar(deck.id)}
                />
              );
            })
          )
        ) : (
          publicDecks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lorcana-navy">No published decks found.</p>
            </div>
          ) : (
            publicDecks.map(deck => (
              <PublishedDeckCard
                key={deck.id}
                deck={deck}
                authorName={deckProfiles[deck.userId!] || deck.authorEmail || 'Unknown'}
                onView={() => onViewDeck(deck.id)}
                onDuplicate={() => handleDuplicateDeck(deck.id)}
                onViewProfile={handleViewProfile}
                canDuplicate={user && deck.userId !== user.id}
              />
            ))
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteDeckModal
        isOpen={deleteModal.isOpen}
        onClose={cancelDeleteDeck}
        onConfirm={confirmDeleteDeck}
        deckName={deleteModal.deckName}
        loading={deleteLoading}
      />

      {/* Avatar Editor Modal */}
      <AvatarEditor
        isOpen={avatarEditor.isOpen}
        onClose={handleCloseAvatarEditor}
        onSave={handleSaveAvatar}
        currentAvatar={avatarEditor.currentAvatar}
      />

      {/* Import Deck Modal */}
      <DeckImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportDeckData}
      />
      </div>
    </div>
  );
};

export default MyDecks;

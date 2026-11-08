import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Search, User, Globe, ArrowUpDown, Filter, LayoutGrid, List } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useCardData } from '../contexts/CardDataContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { useDeckBrowser } from '../hooks/useDeckBrowser';
import { getTagCategory } from '../utils/tagUtils';
import { Deck, DeckSortMode } from '../types';
import DeckCard from './DeckCard';
import PublishedDeckCard from './PublishedDeckCard';
import DeleteDeckModal from './DeleteDeckModal';
import AvatarEditor from './AvatarEditor';
import DeckImportModal from './DeckImportModal';
import DeckFilterPanel from './deck-browser/DeckFilterPanel';
import DeckTableView from './deck-browser/DeckTableView';

interface MyDecksProps {
  onBuildDeck: (deckId?: string) => void;
  onViewDeck: (deckId: string) => void;
}

const MyDecks: React.FC<MyDecksProps> = ({ onBuildDeck, onViewDeck }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const { success: showSuccess, error: showError } = useToast();
  const { allCards } = useCardData();
  const {
    decks,
    publicDecks,
    createDeckAndStartEditing,
    deleteDeck,
    duplicateDeck,
    getDeckSummary,
    importDeck,
    startEditingDeck,
    publishDeck,
    unpublishDeck,
    loadPublicDecks,
    updateDeck,
    allUserTags
  } = useDeck();

  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortTagCategory,
    setSortTagCategory,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    filteredDecks,
    visibleDecks,
    activeFiltersCount,
    sentinelRef,
    hasMore,
    availableStories,
    clearAllFilters,
  } = useDeckBrowser(activeTab);

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

  // Load public decks when on public tab (or unauthenticated)
  useEffect(() => {
    const shouldLoadPublic = (!user || activeTab === 'public');
    if (shouldLoadPublic) {
      loadPublicDecks(searchTerm || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm]);

  // Discover tag categories actually used across user's decks
  const usedTagCategories = useMemo(() => {
    const cats = new Set<string>();
    allUserTags.forEach(tag => {
      const cat = getTagCategory(tag);
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [allUserTags]);

  // Load profile display names when public decks change
  useEffect(() => {
    if (publicDecks.length > 0) {
      loadDeckProfiles(publicDecks);
    }
  }, [publicDecks, loadDeckProfiles]);

  const handleCreateDeck = async () => {
    try {
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
        await updateDeck({ ...deck, avatar: avatarData });
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

  const handleEditDeck = (deckId: string) => {
    startEditingDeck(deckId);
    navigate('/cards');
  };

  // Render the deck list content (grid or table)
  const renderDeckList = () => {
    const isMyTab = activeTab === 'my';
    const deckList = visibleDecks;

    if (deckList.length === 0) {
      if (isMyTab && decks.length === 0) {
        return (
          <div className="text-center py-12">
            <p className="text-lorcana-navy mb-4">You haven't created any decks yet.</p>
            <button onClick={handleCreateDeck} className="btn-lorcana-gold">
              Create Your First Deck
            </button>
          </div>
        );
      }
      return (
        <div className="text-center py-12">
          <p className="text-lorcana-navy">
            No decks match your {activeFiltersCount > 0 ? 'filters' : 'search'}.
          </p>
        </div>
      );
    }

    if (viewMode === 'table') {
      return (
        <DeckTableView
          decks={deckList}
          allCards={allCards}
          isMyDeck={isMyTab}
          getDeckSummary={getDeckSummary}
          deckProfiles={deckProfiles}
          onView={onViewDeck}
          onEdit={isMyTab ? handleEditDeck : undefined}
          onDuplicate={handleDuplicateDeck}
          onDelete={isMyTab ? handleDeleteDeck : undefined}
          onPublish={isMyTab ? handlePublishDeck : undefined}
          onUnpublish={isMyTab ? handleUnpublishDeck : undefined}
        />
      );
    }

    // Grid view
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isMyTab ? (
          deckList.map(deck => {
            const summary = getDeckSummary(deck.id);
            if (!summary) return null;
            return (
              <DeckCard
                key={deck.id}
                deck={deck}
                summary={summary}
                onView={() => onViewDeck(deck.id)}
                onEdit={() => handleEditDeck(deck.id)}
                onDuplicate={() => handleDuplicateDeck(deck.id)}
                onDelete={() => handleDeleteDeck(deck.id)}
                onPublish={() => handlePublishDeck(deck.id)}
                onUnpublish={() => handleUnpublishDeck(deck.id)}
                onEditAvatar={() => handleEditAvatar(deck.id)}
              />
            );
          })
        ) : (
          deckList.map(deck => (
            <PublishedDeckCard
              key={deck.id}
              deck={deck}
              authorName={deckProfiles[deck.userId!] || deck.ownerName || 'Unknown'}
              onView={() => onViewDeck(deck.id)}
              onDuplicate={() => handleDuplicateDeck(deck.id)}
              onViewProfile={handleViewProfile}
              canDuplicate={!!(user && deck.userId !== user.id)}
            />
          ))
        )}
      </div>
    );
  };

  // If not signed in, show only Published Decks tab
  if (!user) {
    return (
      <div>
        <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
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

          {/* Search Bar + Controls */}
          <div className="card-lorcana p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-3 py-2 border-2 rounded-sm transition-colors ${
                  activeFiltersCount > 0
                    ? 'border-lorcana-gold bg-lorcana-gold/20 text-lorcana-ink'
                    : 'border-lorcana-gold text-lorcana-navy hover:bg-lorcana-cream'
                }`}
              >
                <Filter size={16} />
                {activeFiltersCount > 0 && (
                  <span className="bg-lorcana-gold text-lorcana-ink text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <div className="flex border-2 border-lorcana-gold rounded-sm overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-lorcana-navy text-white' : 'text-lorcana-navy hover:bg-lorcana-cream'}`}
                  title="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-lorcana-navy text-white' : 'text-lorcana-navy hover:bg-lorcana-cream'}`}
                  title="Table view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-lorcana-navy">
            Showing {visibleDecks.length} of {filteredDecks.length} decks
          </div>

          {renderDeckList()}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-8" />}
        </div>

        <DeckFilterPanel
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filters={filters}
          setFilters={setFilters}
          activeFiltersCount={activeFiltersCount}
          clearAllFilters={clearAllFilters}
          allTags={allUserTags}
          allStories={availableStories}
        />
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
        {/* Search Bar + Filter/View Controls */}
        <div className="card-lorcana p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lorcana-navy" size={20} />
              <input
                type="text"
                placeholder={activeTab === 'my' ? 'Search my decks...' : 'Search published decks...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-lorcana-gold rounded-sm focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
                aria-label={activeTab === 'my' ? 'Search my decks' : 'Search published decks'}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-2 border-2 rounded-sm transition-colors ${
                activeFiltersCount > 0
                  ? 'border-lorcana-gold bg-lorcana-gold/20 text-lorcana-ink'
                  : 'border-lorcana-gold text-lorcana-navy hover:bg-lorcana-cream'
              }`}
              title="Filters"
            >
              <Filter size={16} />
              {activeFiltersCount > 0 && (
                <span className="bg-lorcana-gold text-lorcana-ink text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <div className="flex border-2 border-lorcana-gold rounded-sm overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-lorcana-navy text-white' : 'text-lorcana-navy hover:bg-lorcana-cream'}`}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-lorcana-navy text-white' : 'text-lorcana-navy hover:bg-lorcana-cream'}`}
                title="Table view"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Header with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-lorcana-gold/20">
          <div className="flex items-center gap-3 text-sm text-lorcana-ink">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span>
                Showing {visibleDecks.length} of {filteredDecks.length} deck{filteredDecks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-lorcana-navy flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => {
                  const mode = e.target.value as DeckSortMode;
                  setSortBy(mode);
                  if (mode !== 'tag') setSortTagCategory('');
                }}
                className="min-w-[140px] px-2 py-1 border border-lorcana-gold/50 rounded-sm bg-lorcana-cream text-lorcana-ink text-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-gold"
              >
                <option value="newest">Newest</option>
                <option value="updated">Last Updated</option>
                <option value="name">Name A-Z</option>
                {usedTagCategories.length > 0 && (
                  <option value="tag">Tag Category</option>
                )}
              </select>
              {sortBy === 'tag' && usedTagCategories.length > 0 && (
                <select
                  value={sortTagCategory}
                  onChange={(e) => setSortTagCategory(e.target.value)}
                  className="min-w-[140px] px-2 py-1 border border-lorcana-gold/50 rounded-sm bg-lorcana-cream text-lorcana-ink text-sm focus:ring-1 focus:ring-lorcana-gold focus:border-lorcana-gold"
                >
                  <option value="">Select category...</option>
                  {usedTagCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {activeTab === 'my' && (
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
          )}
        </div>

        {/* Deck List */}
        {renderDeckList()}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="h-8" />}

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

      {/* Filter Panel Overlay */}
      <DeckFilterPanel
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filters={filters}
        setFilters={setFilters}
        activeFiltersCount={activeFiltersCount}
        clearAllFilters={clearAllFilters}
        allTags={allUserTags}
        allStories={availableStories}
      />
    </div>
  );
};

export default MyDecks;

import React, { useState, useEffect } from 'react';
import { Package, Book, Users, Crown, Loader2, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import Collection from './Collection';
import AuthRequired from './AuthRequired';
import CollectionGroupModal from './CollectionGroupModal';
import { groupService, CollectionGroup, GroupMember } from '../services/groupService';
import DreambornImport from './DreambornImport';
import { useModal } from '../hooks';

const Collections: React.FC = () => {
  const { user } = useAuth();
  const { totalCards, uniqueCards, clearCollection } = useCollection();
  const [activeTab, setActiveTab] = useState<'sets' | 'binders' | 'family'>('sets');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);
  const importModal = useModal();
  const deleteConfirmModal = useModal();
  
  const handleDeleteAll = async () => {
    await clearCollection();
    deleteConfirmModal.close();
  };

  // Show auth required if not signed in
  if (!user) {
    return (
      <div>
        
        <AuthRequired 
          feature="collections" 
          onSignIn={() => {
            // Open login modal - need to pass this from App.tsx
            const signInButton = document.querySelector('[data-sign-in-button]') as HTMLButtonElement;
            if (signInButton) signInButton.click();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      
      {/* Sub-tabs for Collections */}
      <div className="bg-lorcana-cream border-b border-lorcana-gold/20">
        <div className="container mx-auto px-2 sm:px-4">
          {/* Mobile: Full width equal buttons */}
          <div className="grid grid-cols-3 gap-1 sm:hidden">
            <button
              onClick={() => setActiveTab('sets')}
              className={`flex items-center justify-center px-2 py-3 border-b-2 transition-colors ${
                activeTab === 'sets'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Package size={16} />
              <span className="ml-2 truncate">Sets</span>
            </button>
            <button
              onClick={() => setActiveTab('binders')}
              className={`flex items-center justify-center px-2 py-3 border-b-2 transition-colors ${
                activeTab === 'binders'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Book size={16} />
              <span className="ml-2 truncate">Binders</span>
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`flex items-center justify-center px-2 py-3 border-b-2 transition-colors ${
                activeTab === 'family'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Users size={16} />
              <span className="ml-2 truncate">Family</span>
            </button>
          </div>

          {/* Desktop: Left-aligned buttons */}
          <div className="hidden sm:flex space-x-1">
            <button
              onClick={() => setActiveTab('sets')}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'sets'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Package size={16} />
              <span className="ml-2">Sets</span>
            </button>
            <button
              onClick={() => setActiveTab('binders')}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'binders'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Book size={16} />
              <span className="ml-2">Binders</span>
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'family'
                  ? 'border-lorcana-gold text-lorcana-navy font-medium'
                  : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
              }`}
            >
              <Users size={16} />
              <span className="ml-2">Family</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-2 sm:px-4 py-6 space-y-6">
        {activeTab === 'sets' && (
          <Collection 
            totalCards={totalCards}
            uniqueCards={uniqueCards}
            onImportClick={() => importModal.open()}
            onDeleteAllClick={() => deleteConfirmModal.open()}
          />
        )}
        {activeTab === 'binders' && <CustomCollections />}
        {activeTab === 'family' && <FamilyCollections key={groupRefreshKey} onManageGroup={() => setShowGroupModal(true)} />}
      </div>

      {/* Collection Group Modal */}
      <CollectionGroupModal 
        isOpen={showGroupModal} 
        onClose={() => setShowGroupModal(false)}
        onGroupChanged={() => setGroupRefreshKey(prev => prev + 1)}
      />
      
      {/* Import Modal */}
      {importModal.isOpen && (
        <DreambornImport onClose={importModal.close} />
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-lorcana-gold rounded-sm p-6 max-w-md w-full mx-4 shadow-2xl art-deco-corner">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 border border-red-300 p-3 rounded-sm">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-lorcana-ink">Delete All Cards</h3>
                <p className="text-sm text-lorcana-navy">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-lorcana-ink mb-6">
              Are you sure you want to delete all {totalCards} cards from your collection? 
              This will permanently remove all cards and cannot be recovered.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={deleteConfirmModal.close}
                className="btn-lorcana-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors border-2 border-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomCollections: React.FC = () => {
  return (
    <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
      <Plus size={48} className="mx-auto text-lorcana-navy mb-4" />
      <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Custom Binders</h3>
      <p className="text-lorcana-navy mb-6">
        Create custom binders to organize your cards by theme, deck ideas, or any other criteria you choose.
      </p>
      <button className="btn-lorcana flex items-center gap-2 mx-auto">
        <Plus size={16} />
        <span>Create Custom Binder</span>
      </button>
    </div>
  );
};

interface FamilyCollectionsProps {
  onManageGroup: () => void;
  onGroupChanged?: () => void;
}

const FamilyCollections: React.FC<FamilyCollectionsProps> = ({ onManageGroup, onGroupChanged }) => {
  const { user } = useAuth();
  const [currentGroup, setCurrentGroup] = useState<CollectionGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupStats, setGroupStats] = useState({ totalCards: 0, uniqueCards: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadGroupData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const group = await groupService.getUserGroup(user.id);
      if (group) {
        setCurrentGroup(group);
        
        const [members, stats] = await Promise.all([
          groupService.getGroupMembers(group.id),
          groupService.getGroupStats(group.id)
        ]);
        
        setGroupMembers(members);
        setGroupStats(stats);
        
      } else {
        setCurrentGroup(null);
        setGroupMembers([]);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
        <Loader2 className="mx-auto mb-4 animate-spin text-lorcana-navy" size={48} />
        <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Loading Family Collection...</h3>
      </div>
    );
  }

  if (!currentGroup) {
    // No family collection - show creation interface
    return (
      <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
        <Users size={48} className="mx-auto text-lorcana-navy mb-4" />
        <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Family Collection</h3>
        <p className="text-lorcana-navy mb-6">
          Share your collection with family members! Create or join a family collection to combine your cards and avoid duplicates.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            className="btn-lorcana flex items-center gap-2"
            onClick={onManageGroup}
          >
            <Plus size={16} />
            <span>Create Family Collection</span>
          </button>
          <button 
            className="btn-lorcana-navy-outline flex items-center gap-2"
            onClick={onManageGroup}
          >
            <Users size={16} />
            <span>Join Existing Collection</span>
          </button>
        </div>
      </div>
    );
  }

  // Has family collection - show beautiful management interface
  return (
    <div className="space-y-6">
      {/* Family Collection Header */}
      <div className="bg-gradient-to-br from-lorcana-navy to-lorcana-purple border-2 border-lorcana-gold rounded-sm shadow-lg p-6 text-white art-deco-corner">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-lorcana-gold rounded-full p-3">
              <Users className="text-lorcana-navy" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-lorcana-gold">{currentGroup.name}</h2>
              <p className="text-lorcana-cream text-sm">
                {groupMembers.length} members • {groupStats.totalCards} total cards • {groupStats.uniqueCards} unique cards
              </p>
            </div>
          </div>
          <button
            onClick={onManageGroup}
            className="btn-lorcana-gold-sm"
          >
            Manage Group
          </button>
        </div>
        
        {/* Collection Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-sm p-3 text-center">
            <div className="text-2xl font-bold text-lorcana-gold">{groupStats.totalCards}</div>
            <div className="text-xs text-lorcana-cream">Total Cards</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-sm p-3 text-center">
            <div className="text-2xl font-bold text-lorcana-gold">{groupStats.uniqueCards}</div>
            <div className="text-xs text-lorcana-cream">Unique Cards</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-sm p-3 text-center">
            <div className="text-2xl font-bold text-lorcana-gold">{groupMembers.length}</div>
            <div className="text-xs text-lorcana-cream">Members</div>
          </div>
        </div>
      </div>

      {/* Family Members and Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Members */}
        <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-6 art-deco-corner">
          <h3 className="text-lg font-semibold text-lorcana-ink mb-4 flex items-center gap-2">
            <Users size={20} />
            Family Members
          </h3>
          <div className="grid gap-4">
            {groupMembers.map((member) => {
              const displayName = (member as any).user_profiles?.display_name || 'Unknown User';
              const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              
              return (
                <div key={member.id} className="flex items-center justify-between p-4 bg-lorcana-cream rounded-sm">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      member.role === 'owner' ? 'bg-lorcana-gold' : 'bg-lorcana-purple'
                    }`}>
                      {member.role === 'owner' ? (
                        <Crown size={16} className="text-lorcana-navy" />
                      ) : (
                        <span className="font-bold text-white">{initials}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-lorcana-ink">{displayName}</p>
                      <p className="text-sm text-lorcana-navy">
                        {member.role === 'owner' ? 'Owner' : 'Member'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-sm font-medium ${
                    member.role === 'owner' 
                      ? 'bg-lorcana-gold text-lorcana-navy' 
                      : 'bg-lorcana-navy text-lorcana-gold'
                  }`}>
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Placeholder for future feature */}
        <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-6 art-deco-corner">
          <h3 className="text-lg font-semibold text-lorcana-ink mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-lorcana-navy/30 mb-4" />
            <p className="text-lorcana-navy/60">Activity tracking coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collections;
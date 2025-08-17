import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Share2, AlertTriangle, Crown, Check, Copy, Loader2, Clock } from 'lucide-react';
import UserSearchInput from './UserSearchInput';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import { groupService, CollectionGroup, GroupMember } from '../services/groupService';

interface CollectionGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupChanged?: () => void;
}

const CollectionGroupModal: React.FC<CollectionGroupModalProps> = ({ isOpen, onClose, onGroupChanged }) => {
  const { user } = useAuth();
  const { collection, reloadCollection } = useCollection();
  const [currentStep, setCurrentStep] = useState<'overview' | 'create' | 'join' | 'manage'>('overview');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  
  // Real group data
  const [currentGroup, setCurrentGroup] = useState<CollectionGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupStats, setGroupStats] = useState({ totalCards: 0, uniqueCards: 0 });
  const [groupPendingInvites, setGroupPendingInvites] = useState<any[]>([]);
  const [personalStats, setPersonalStats] = useState({ totalCards: 0, uniqueCards: 0 });

  // Load user's current group on mount
  useEffect(() => {
    if (isOpen && user) {
      loadUserGroup();
      calculatePersonalStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Load group members when group changes
  useEffect(() => {
    if (currentGroup) {
      loadGroupMembers();
      loadGroupStats();
      loadGroupPendingInvites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup?.id]);

  const loadUserGroup = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const group = await groupService.getUserGroup(user.id);
      if (group) {
        setCurrentGroup(group);
        setCurrentStep('manage');
      }
    } catch (error) {
      console.error('Error loading user group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async () => {
    if (!currentGroup) return;
    try {
      const members = await groupService.getGroupMembers(currentGroup.id);
      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const loadGroupStats = async () => {
    if (!currentGroup) return;
    try {
      const stats = await groupService.getGroupStats(currentGroup.id);
      setGroupStats(stats);
    } catch (error) {
      console.error('Error loading group stats:', error);
    }
  };

  const loadGroupPendingInvites = async () => {
    if (!currentGroup) return;
    try {
      const invites = await groupService.getGroupPendingInvitations(currentGroup.id);
      setGroupPendingInvites(invites);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    }
  };

  const calculatePersonalStats = () => {
    const totalCards = collection.reduce((sum, item) => 
      sum + (item.quantityNormal || 0) + (item.quantityFoil || 0), 0
    );
    const uniqueCards = collection.length;
    setPersonalStats({ totalCards, uniqueCards });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await groupService.createGroup(groupName, user.id);
      if (result.success && result.group) {
        setCurrentGroup(result.group);
        setSuccessMessage('Group created successfully!');
        setShowSuccess(true);
        // Trigger refresh of parent component
        onGroupChanged?.();
        setTimeout(() => {
          setCurrentStep('manage');
          setShowSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (error) {
      setError('An error occurred while creating the group');
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim() || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await groupService.joinGroupByCode(user.id, inviteCode.toUpperCase());
      if (result.success && result.group) {
        setCurrentGroup(result.group);
        setSuccessMessage('Successfully joined the group!');
        setShowSuccess(true);
        // Trigger refresh of parent component
        onGroupChanged?.();
        setTimeout(() => {
          setCurrentStep('manage');
          setShowSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to join group');
      }
    } catch (error) {
      setError('Invalid invite code or unable to join group');
      console.error('Error joining group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = async (selectedUser: any) => {
    if (!currentGroup || !user) return;
    
    // Clear any previous errors
    setError(null);
    
    try {
      const result = await groupService.sendInvitation(
        currentGroup.id,
        user.id,
        selectedUser.user_id || selectedUser.id
      );
      
      if (result.success) {
        setPendingInvites(prev => [...prev, {
          ...selectedUser,
          status: 'pending',
          invitedAt: new Date()
        }]);
        setSuccessMessage('Invitation sent!');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
        // Reload pending invitations to show in members list
        loadGroupPendingInvites();
      } else {
        setError(result.error || 'Failed to send invitation');
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !currentGroup) return;
    setShowLeaveConfirmation(true);
  };

  const confirmLeaveGroup = async () => {
    if (!user || !currentGroup) return;
    
    setShowLeaveConfirmation(false);
    setIsLoading(true);
    try {
      const result = await groupService.leaveGroup(user.id);
      if (result.success) {
        setCurrentGroup(null);
        setGroupMembers([]);
        setCurrentStep('overview');
        setSuccessMessage('Successfully left the group');
        setShowSuccess(true);
        // Trigger refresh of parent component
        onGroupChanged?.();
        // Reload collection to show personal collection immediately
        await reloadCollection();
      } else {
        setError(result.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      setError('Failed to leave group');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (currentGroup?.invite_code) {
      navigator.clipboard.writeText(currentGroup.invite_code);
      setSuccessMessage('Invite code copied!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  if (!isOpen) return null;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="mx-auto h-16 w-16 text-lorcana-gold mb-4" />
        <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Collection Groups</h3>
        <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
          Share your Lorcana collection with family or friends. When you join a group, your collections merge into one shared collection.
        </p>
      </div>

      <div className="bg-lorcana-purple/30 rounded-lg p-4 border border-lorcana-gold/30">
        <h4 className="font-medium text-lorcana-cream mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          Your Current Collection
        </h4>
        <div className="text-sm text-lorcana-cream/80 space-y-1">
          <div>Total Cards: <span className="text-lorcana-gold font-medium">{personalStats.totalCards}</span></div>
          <div>Unique Cards: <span className="text-lorcana-gold font-medium">{personalStats.uniqueCards}</span></div>
          <p className="text-xs mt-2 text-lorcana-cream/60">
            When you join or create a group, this collection will be preserved but you'll work with the shared group collection instead.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setCurrentStep('create')}
          className="p-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors"
        >
          <UserPlus className="mx-auto h-8 w-8 mb-2" />
          <div className="font-medium">Create Group</div>
          <div className="text-xs opacity-80">Start a new collection group</div>
        </button>
        
        <button
          onClick={() => setCurrentStep('join')}
          className="p-4 border-2 border-lorcana-gold text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        >
          <Share2 className="mx-auto h-8 w-8 mb-2" />
          <div className="font-medium">Join Group</div>
          <div className="text-xs opacity-80">Join an existing group</div>
        </button>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="space-y-6">
      <div className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-lorcana-gold mb-3" />
        <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Create Collection Group</h3>
        <p className="text-lorcana-cream/80 text-sm">
          Create a new group to share your collection with others.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-lorcana-cream mb-2">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Smith Family Collection"
            className="w-full px-3 py-2 bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg text-lorcana-cream placeholder-lorcana-cream/50 focus:outline-none focus:border-lorcana-gold"
            disabled={isLoading}
          />
        </div>

        <div className="bg-lorcana-purple/30 rounded-lg p-4 border border-lorcana-gold/30">
          <h4 className="font-medium text-lorcana-cream mb-2">What happens next:</h4>
          <ul className="text-sm text-lorcana-cream/80 space-y-1">
            <li>• Your collection becomes the group's foundation</li>
            <li>• You'll get an invite code to share with others</li>
            <li>• Everyone in the group shares the same collection</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setCurrentStep('overview');
            setError(null);
          }}
          className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || isLoading}
          className="flex-1 py-2 px-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Creating...
            </>
          ) : (
            'Create Group'
          )}
        </button>
      </div>
    </div>
  );

  const renderJoin = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Share2 className="mx-auto h-12 w-12 text-lorcana-gold mb-3" />
        <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Join Collection Group</h3>
        <p className="text-lorcana-cream/80 text-sm">
          Enter the invite code you received to join an existing group.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-lorcana-cream mb-2">
            Invite Code
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g., FAMILY24"
            className="w-full px-3 py-2 bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg text-lorcana-cream placeholder-lorcana-cream/50 focus:outline-none focus:border-lorcana-gold uppercase tracking-wider text-center text-lg font-mono"
            disabled={isLoading}
            maxLength={8}
          />
        </div>

        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <h4 className="font-medium text-yellow-200 mb-1">Collection Access Change</h4>
              <p className="text-sm text-yellow-200/80">
                Your personal collection ({personalStats.totalCards} cards) will be preserved but temporarily inaccessible while in the group. You'll work with the shared group collection instead.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setCurrentStep('overview');
            setError(null);
          }}
          className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={handleJoinGroup}
          disabled={!inviteCode.trim() || isLoading}
          className="flex-1 py-2 px-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Joining...
            </>
          ) : (
            'Join Group'
          )}
        </button>
      </div>
    </div>
  );

  const renderManage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 bg-lorcana-gold/20 rounded-full flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-lorcana-gold" />
        </div>
        <h3 className="text-xl font-semibold text-lorcana-cream mb-1">{currentGroup?.name}</h3>
        <div className="flex items-center justify-center gap-2 text-lorcana-cream/60 text-sm">
          <span>Group Code: {currentGroup?.invite_code}</span>
          <button 
            onClick={copyInviteCode}
            className="text-lorcana-gold hover:text-lorcana-cream transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="bg-lorcana-purple/30 rounded-lg p-4 border border-lorcana-gold/30">
        <h4 className="font-medium text-lorcana-cream mb-2">Shared Collection Stats</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-lorcana-cream/60">Total Cards</div>
            <div className="text-lorcana-gold font-medium text-lg">{groupStats.totalCards}</div>
          </div>
          <div>
            <div className="text-lorcana-cream/60">Unique Cards</div>
            <div className="text-lorcana-gold font-medium text-lg">{groupStats.uniqueCards}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-lorcana-cream mb-3">
          Members ({groupMembers.length + groupPendingInvites.length})
        </h4>
        <div className="space-y-2">
          {groupMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-lorcana-purple/20 rounded-lg border border-lorcana-gold/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-lorcana-gold/20 rounded-full flex items-center justify-center">
                  {member.role === 'owner' ? (
                    <Crown size={14} className="text-lorcana-gold" />
                  ) : (
                    <Users size={14} className="text-lorcana-cream" />
                  )}
                </div>
                <div>
                  <div className="text-lorcana-cream font-medium">
                    {(member as any).user_profiles?.display_name || 'Unknown User'}
                  </div>
                  <div className="text-lorcana-cream/60 text-xs">
                    {member.role === 'owner' ? 'Owner' : 'Member'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {groupPendingInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 bg-lorcana-purple/10 rounded-lg border border-lorcana-gold/20 opacity-75">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Clock size={14} className="text-yellow-400" />
                </div>
                <div>
                  <div className="text-lorcana-cream font-medium">
                    {invite.user_profiles?.display_name || 'Unknown User'}
                  </div>
                  <div className="text-yellow-400/80 text-xs">
                    Pending Invitation • Sent {new Date(invite.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentGroup?.owner_id === user?.id && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-lorcana-cream mb-3">Invite New Member</h4>
            <UserSearchInput
              onUserSelect={handleUserSelect}
              placeholder="Search for users to invite..."
              excludeUserIds={groupMembers.map(m => m.user_id)}
            />
            {error && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
          </div>

          {pendingInvites.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-lorcana-cream/80 mb-2">Pending Invites</h5>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id || invite.user_id} className="flex items-center justify-between p-3 bg-lorcana-purple/10 rounded-lg border border-lorcana-gold/20">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-lorcana-gold/20 rounded-full flex items-center justify-center">
                        <Users size={12} className="text-lorcana-gold" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-lorcana-cream">
                          {invite.display_name || invite.displayName}
                        </div>
                        <div className="text-xs text-lorcana-cream/60">Invitation sent</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        >
          Close
        </button>
        <button 
          onClick={handleLeaveGroup}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              {currentGroup?.owner_id === user?.id ? 'Disbanding...' : 'Leaving...'}
            </>
          ) : (
            currentGroup?.owner_id === user?.id ? 'Disband Group' : 'Leave Group'
          )}
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="mx-auto h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-400" />
      </div>
      <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Success!</h3>
      <p className="text-lorcana-cream/80">
        {successMessage}
      </p>
    </div>
  );

  const renderLeaveConfirmation = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-lorcana-cream mb-2">
          {currentGroup?.owner_id === user?.id ? 'Disband Group?' : 'Leave Group?'}
        </h3>
        <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
          {currentGroup?.owner_id === user?.id 
            ? `Are you sure you want to disband "${currentGroup?.name}"? This will remove all members and return your collection to personal.`
            : `Are you sure you want to leave "${currentGroup?.name}"? You'll return to your personal collection and no longer have access to the shared group collection.`
          }
        </p>
      </div>

      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="font-medium text-red-200 mb-1">This action will:</h4>
            <ul className="text-sm text-red-200/80 space-y-1">
              {currentGroup?.owner_id === user?.id ? (
                <>
                  <li>• Remove all members from the group</li>
                  <li>• Delete the group permanently</li>
                  <li>• Return your collection to personal (you keep all cards)</li>
                </>
              ) : (
                <>
                  <li>• Remove you from the group permanently</li>
                  <li>• Restore your personal collection (preserved while in the group)</li>
                  <li>• Require a new invitation to rejoin</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setShowLeaveConfirmation(false)}
          className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={confirmLeaveGroup}
          disabled={isLoading}
          className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              {currentGroup?.owner_id === user?.id ? 'Disbanding...' : 'Leaving...'}
            </>
          ) : (
            currentGroup?.owner_id === user?.id ? 'Disband Group' : 'Leave Group'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-lorcana-navy rounded-lg border-2 border-lorcana-gold w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-lorcana-cream">
              {currentGroup ? 'Collection Group' : 'Collection Groups'}
            </h2>
            <button
              onClick={onClose}
              className="text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {isLoading && !showSuccess && !showLeaveConfirmation ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-lorcana-gold" size={32} />
            </div>
          ) : showSuccess ? renderSuccess() :
           showLeaveConfirmation ? renderLeaveConfirmation() :
           currentGroup ? renderManage() :
           currentStep === 'overview' ? renderOverview() :
           currentStep === 'create' ? renderCreate() :
           currentStep === 'join' ? renderJoin() :
           renderManage()}
        </div>
      </div>
    </div>
  );
};

export default CollectionGroupModal;
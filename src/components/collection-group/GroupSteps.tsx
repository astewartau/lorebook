import React from 'react';
import { Users, UserPlus, Share2, AlertTriangle, Crown, Check, Copy, Loader2, Clock } from 'lucide-react';
import UserSearchInput from '../UserSearchInput';
import { CollectionGroup, GroupMember } from '../../services/groupService';

// Shared props interface
interface StepProps {
  isLoading: boolean;
  error: string | null;
}

// Overview Step
interface OverviewStepProps extends StepProps {
  personalStats: { totalCards: number; uniqueCards: number };
  onCreateClick: () => void;
  onJoinClick: () => void;
}

export const GroupOverviewStep: React.FC<OverviewStepProps> = ({
  personalStats,
  onCreateClick,
  onJoinClick
}) => (
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
        onClick={onCreateClick}
        className="p-4 bg-lorcana-gold text-lorcana-navy rounded-lg hover:bg-lorcana-gold/90 transition-colors"
      >
        <UserPlus className="mx-auto h-8 w-8 mb-2" />
        <div className="font-medium">Create Group</div>
        <div className="text-xs opacity-80">Start a new collection group</div>
      </button>

      <button
        onClick={onJoinClick}
        className="p-4 border-2 border-lorcana-gold text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
      >
        <Share2 className="mx-auto h-8 w-8 mb-2" />
        <div className="font-medium">Join Group</div>
        <div className="text-xs opacity-80">Join an existing group</div>
      </button>
    </div>
  </div>
);

// Create Step
interface CreateStepProps extends StepProps {
  groupName: string;
  onGroupNameChange: (name: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const GroupCreateStep: React.FC<CreateStepProps> = ({
  groupName,
  onGroupNameChange,
  onBack,
  onSubmit,
  isLoading,
  error
}) => (
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
          onChange={(e) => onGroupNameChange(e.target.value)}
          placeholder="e.g., Smith Family Collection"
          className="w-full px-3 py-2 bg-lorcana-purple/20 border border-lorcana-gold/30 rounded-lg text-lorcana-cream placeholder-lorcana-cream/50 focus:outline-none focus:border-lorcana-gold"
          disabled={isLoading}
        />
      </div>

      <div className="bg-lorcana-purple/30 rounded-lg p-4 border border-lorcana-gold/30">
        <h4 className="font-medium text-lorcana-cream mb-2">What happens next:</h4>
        <ul className="text-sm text-lorcana-cream/80 space-y-1">
          <li>Your collection becomes the group's foundation</li>
          <li>You'll get an invite code to share with others</li>
          <li>Everyone in the group shares the same collection</li>
        </ul>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        disabled={isLoading}
      >
        Back
      </button>
      <button
        onClick={onSubmit}
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

// Join Step
interface JoinStepProps extends StepProps {
  inviteCode: string;
  personalStats: { totalCards: number; uniqueCards: number };
  onInviteCodeChange: (code: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const GroupJoinStep: React.FC<JoinStepProps> = ({
  inviteCode,
  personalStats,
  onInviteCodeChange,
  onBack,
  onSubmit,
  isLoading,
  error
}) => (
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
          onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
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
        onClick={onBack}
        className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        disabled={isLoading}
      >
        Back
      </button>
      <button
        onClick={onSubmit}
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

// Manage Step
interface ManageStepProps extends StepProps {
  currentGroup: CollectionGroup;
  groupMembers: GroupMember[];
  groupStats: { totalCards: number; uniqueCards: number };
  groupPendingInvites: any[];
  pendingInvites: any[];
  userId: string | undefined;
  onCopyInviteCode: () => void;
  onUserSelect: (user: any) => void;
  onLeaveGroup: () => void;
  onClose: () => void;
}

export const GroupManageStep: React.FC<ManageStepProps> = ({
  currentGroup,
  groupMembers,
  groupStats,
  groupPendingInvites,
  pendingInvites,
  userId,
  onCopyInviteCode,
  onUserSelect,
  onLeaveGroup,
  onClose,
  isLoading,
  error
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="mx-auto h-12 w-12 bg-lorcana-gold/20 rounded-full flex items-center justify-center mb-3">
        <Users className="h-6 w-6 text-lorcana-gold" />
      </div>
      <h3 className="text-xl font-semibold text-lorcana-cream mb-1">{currentGroup.name}</h3>
      <div className="flex items-center justify-center gap-2 text-lorcana-cream/60 text-sm">
        <span>Group Code: {currentGroup.invite_code}</span>
        <button
          onClick={onCopyInviteCode}
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
                  {member.role === 'owner' ? 'Owner' : 'Member'} Joined {new Date(member.joined_at).toLocaleDateString()}
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
                  Pending Invitation Sent {new Date(invite.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {currentGroup.owner_id === userId && (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-lorcana-cream mb-3">Invite New Member</h4>
          <UserSearchInput
            onUserSelect={onUserSelect}
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
        onClick={onLeaveGroup}
        disabled={isLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            {currentGroup.owner_id === userId ? 'Disbanding...' : 'Leaving...'}
          </>
        ) : (
          currentGroup.owner_id === userId ? 'Disband Group' : 'Leave Group'
        )}
      </button>
    </div>
  </div>
);

// Success Step
interface SuccessStepProps {
  message: string;
}

export const GroupSuccessStep: React.FC<SuccessStepProps> = ({ message }) => (
  <div className="text-center py-8">
    <div className="mx-auto h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
      <Check className="h-8 w-8 text-green-400" />
    </div>
    <h3 className="text-xl font-semibold text-lorcana-cream mb-2">Success!</h3>
    <p className="text-lorcana-cream/80">{message}</p>
  </div>
);

// Leave Confirmation Step
interface LeaveConfirmationStepProps extends StepProps {
  currentGroup: CollectionGroup;
  userId: string | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}

export const GroupLeaveConfirmation: React.FC<LeaveConfirmationStepProps> = ({
  currentGroup,
  userId,
  onCancel,
  onConfirm,
  isLoading
}) => {
  const isOwner = currentGroup.owner_id === userId;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-lorcana-cream mb-2">
          {isOwner ? 'Disband Group?' : 'Leave Group?'}
        </h3>
        <p className="text-lorcana-cream/80 text-sm max-w-md mx-auto">
          {isOwner
            ? `Are you sure you want to disband "${currentGroup.name}"? This will remove all members and return your collection to personal.`
            : `Are you sure you want to leave "${currentGroup.name}"? You'll return to your personal collection and no longer have access to the shared group collection.`
          }
        </p>
      </div>

      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="font-medium text-red-200 mb-1">This action will:</h4>
            <ul className="text-sm text-red-200/80 space-y-1">
              {isOwner ? (
                <>
                  <li>Remove all members from the group</li>
                  <li>Delete the group permanently</li>
                  <li>Return your collection to personal (you keep all cards)</li>
                </>
              ) : (
                <>
                  <li>Remove you from the group permanently</li>
                  <li>Restore your personal collection (preserved while in the group)</li>
                  <li>Require a new invitation to rejoin</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-lorcana-gold/50 text-lorcana-cream rounded-lg hover:bg-lorcana-gold/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              {isOwner ? 'Disbanding...' : 'Leaving...'}
            </>
          ) : (
            isOwner ? 'Disband Group' : 'Leave Group'
          )}
        </button>
      </div>
    </div>
  );
};

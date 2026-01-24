import React, { useReducer, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCollection } from '../contexts/CollectionContext';
import { groupService, CollectionGroup, GroupMember } from '../services/groupService';
import {
  GroupOverviewStep,
  GroupCreateStep,
  GroupJoinStep,
  GroupManageStep,
  GroupSuccessStep,
  GroupLeaveConfirmation
} from './collection-group/GroupSteps';

interface CollectionGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupChanged?: () => void;
}

// State interface
interface ModalState {
  currentStep: 'overview' | 'create' | 'join' | 'manage';
  groupName: string;
  inviteCode: string;
  pendingInvites: any[];
  showSuccess: boolean;
  successMessage: string;
  isLoading: boolean;
  error: string | null;
  showLeaveConfirmation: boolean;
  currentGroup: CollectionGroup | null;
  groupMembers: GroupMember[];
  groupStats: { totalCards: number; uniqueCards: number };
  groupPendingInvites: any[];
  personalStats: { totalCards: number; uniqueCards: number };
}

// Action types
type ModalAction =
  | { type: 'SET_STEP'; step: ModalState['currentStep'] }
  | { type: 'SET_GROUP_NAME'; name: string }
  | { type: 'SET_INVITE_CODE'; code: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SHOW_SUCCESS'; message: string }
  | { type: 'HIDE_SUCCESS' }
  | { type: 'SHOW_LEAVE_CONFIRMATION' }
  | { type: 'HIDE_LEAVE_CONFIRMATION' }
  | { type: 'SET_GROUP'; group: CollectionGroup | null }
  | { type: 'SET_GROUP_MEMBERS'; members: GroupMember[] }
  | { type: 'SET_GROUP_STATS'; stats: { totalCards: number; uniqueCards: number } }
  | { type: 'SET_GROUP_PENDING_INVITES'; invites: any[] }
  | { type: 'SET_PERSONAL_STATS'; stats: { totalCards: number; uniqueCards: number } }
  | { type: 'ADD_PENDING_INVITE'; invite: any }
  | { type: 'RESET' };

const initialState: ModalState = {
  currentStep: 'overview',
  groupName: '',
  inviteCode: '',
  pendingInvites: [],
  showSuccess: false,
  successMessage: '',
  isLoading: false,
  error: null,
  showLeaveConfirmation: false,
  currentGroup: null,
  groupMembers: [],
  groupStats: { totalCards: 0, uniqueCards: 0 },
  groupPendingInvites: [],
  personalStats: { totalCards: 0, uniqueCards: 0 }
};

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step, error: null };
    case 'SET_GROUP_NAME':
      return { ...state, groupName: action.name };
    case 'SET_INVITE_CODE':
      return { ...state, inviteCode: action.code };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SHOW_SUCCESS':
      return { ...state, showSuccess: true, successMessage: action.message };
    case 'HIDE_SUCCESS':
      return { ...state, showSuccess: false };
    case 'SHOW_LEAVE_CONFIRMATION':
      return { ...state, showLeaveConfirmation: true };
    case 'HIDE_LEAVE_CONFIRMATION':
      return { ...state, showLeaveConfirmation: false };
    case 'SET_GROUP':
      return { ...state, currentGroup: action.group };
    case 'SET_GROUP_MEMBERS':
      return { ...state, groupMembers: action.members };
    case 'SET_GROUP_STATS':
      return { ...state, groupStats: action.stats };
    case 'SET_GROUP_PENDING_INVITES':
      return { ...state, groupPendingInvites: action.invites };
    case 'SET_PERSONAL_STATS':
      return { ...state, personalStats: action.stats };
    case 'ADD_PENDING_INVITE':
      return { ...state, pendingInvites: [...state.pendingInvites, action.invite] };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const CollectionGroupModal: React.FC<CollectionGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupChanged
}) => {
  const { user } = useAuth();
  const { collection, reloadCollection } = useCollection();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load user's current group on mount
  useEffect(() => {
    if (isOpen && user) {
      loadUserGroup();
      calculatePersonalStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Load group details when group changes
  useEffect(() => {
    if (state.currentGroup) {
      loadGroupDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentGroup?.id]);

  const loadUserGroup = async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const group = await groupService.getUserGroup(user.id);
      if (group) {
        dispatch({ type: 'SET_GROUP', group });
        dispatch({ type: 'SET_STEP', step: 'manage' });
      }
    } catch (error) {
      console.error('Error loading user group:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const loadGroupDetails = async () => {
    if (!state.currentGroup) return;
    try {
      const [members, stats, invites] = await Promise.all([
        groupService.getGroupMembers(state.currentGroup.id),
        groupService.getGroupStats(state.currentGroup.id),
        groupService.getGroupPendingInvitations(state.currentGroup.id)
      ]);
      dispatch({ type: 'SET_GROUP_MEMBERS', members });
      dispatch({ type: 'SET_GROUP_STATS', stats });
      dispatch({ type: 'SET_GROUP_PENDING_INVITES', invites });
    } catch (error) {
      console.error('Error loading group details:', error);
    }
  };

  const calculatePersonalStats = () => {
    const totalCards = collection.reduce(
      (sum, item) => sum + (item.quantityNormal || 0) + (item.quantityFoil || 0),
      0
    );
    dispatch({ type: 'SET_PERSONAL_STATS', stats: { totalCards, uniqueCards: collection.length } });
  };

  const handleCreateGroup = useCallback(async () => {
    if (!state.groupName.trim() || !user) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const result = await groupService.createGroup(state.groupName, user.id);
      if (result.success && result.group) {
        dispatch({ type: 'SET_GROUP', group: result.group });
        dispatch({ type: 'SHOW_SUCCESS', message: 'Group created successfully!' });
        onGroupChanged?.();
        setTimeout(() => {
          dispatch({ type: 'SET_STEP', step: 'manage' });
          dispatch({ type: 'HIDE_SUCCESS' });
        }, 2000);
      } else {
        dispatch({ type: 'SET_ERROR', error: result.error || 'Failed to create group' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'An error occurred while creating the group' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [state.groupName, user, onGroupChanged]);

  const handleJoinGroup = useCallback(async () => {
    if (!state.inviteCode.trim() || !user) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const result = await groupService.joinGroupByCode(user.id, state.inviteCode.toUpperCase());
      if (result.success && result.group) {
        dispatch({ type: 'SET_GROUP', group: result.group });
        dispatch({ type: 'SHOW_SUCCESS', message: 'Successfully joined the group!' });
        onGroupChanged?.();
        setTimeout(() => {
          dispatch({ type: 'SET_STEP', step: 'manage' });
          dispatch({ type: 'HIDE_SUCCESS' });
        }, 2000);
      } else {
        dispatch({ type: 'SET_ERROR', error: result.error || 'Failed to join group' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Invalid invite code or unable to join group' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [state.inviteCode, user, onGroupChanged]);

  const handleUserSelect = useCallback(async (selectedUser: any) => {
    if (!state.currentGroup || !user) return;

    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const result = await groupService.sendInvitation(
        state.currentGroup.id,
        user.id,
        selectedUser.user_id || selectedUser.id
      );

      if (result.success) {
        dispatch({
          type: 'ADD_PENDING_INVITE',
          invite: { ...selectedUser, status: 'pending', invitedAt: new Date() }
        });
        dispatch({ type: 'SHOW_SUCCESS', message: 'Invitation sent!' });
        setTimeout(() => dispatch({ type: 'HIDE_SUCCESS' }), 1500);
        loadGroupDetails();
      } else {
        dispatch({ type: 'SET_ERROR', error: result.error || 'Failed to send invitation' });
        setTimeout(() => dispatch({ type: 'SET_ERROR', error: null }), 5000);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Failed to send invitation' });
      setTimeout(() => dispatch({ type: 'SET_ERROR', error: null }), 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentGroup, user]);

  const confirmLeaveGroup = useCallback(async () => {
    if (!user || !state.currentGroup) return;

    dispatch({ type: 'HIDE_LEAVE_CONFIRMATION' });
    dispatch({ type: 'SET_LOADING', loading: true });

    try {
      const result = await groupService.leaveGroup(user.id);
      if (result.success) {
        dispatch({ type: 'SET_GROUP', group: null });
        dispatch({ type: 'SET_GROUP_MEMBERS', members: [] });
        dispatch({ type: 'SET_STEP', step: 'overview' });
        dispatch({ type: 'SHOW_SUCCESS', message: 'Successfully left the group' });
        onGroupChanged?.();
        await reloadCollection();
      } else {
        dispatch({ type: 'SET_ERROR', error: result.error || 'Failed to leave group' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Failed to leave group' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [user, state.currentGroup, onGroupChanged, reloadCollection]);

  const copyInviteCode = useCallback(() => {
    if (state.currentGroup?.invite_code) {
      navigator.clipboard.writeText(state.currentGroup.invite_code);
      dispatch({ type: 'SHOW_SUCCESS', message: 'Invite code copied!' });
      setTimeout(() => dispatch({ type: 'HIDE_SUCCESS' }), 1500);
    }
  }, [state.currentGroup]);

  if (!isOpen) return null;

  // Render content based on state
  const renderContent = () => {
    // Loading state (initial load only)
    if (state.isLoading && !state.showSuccess && !state.showLeaveConfirmation && !state.currentGroup) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-lorcana-gold" size={32} />
        </div>
      );
    }

    // Success state
    if (state.showSuccess) {
      return <GroupSuccessStep message={state.successMessage} />;
    }

    // Leave confirmation
    if (state.showLeaveConfirmation && state.currentGroup) {
      return (
        <GroupLeaveConfirmation
          currentGroup={state.currentGroup}
          userId={user?.id}
          onCancel={() => dispatch({ type: 'HIDE_LEAVE_CONFIRMATION' })}
          onConfirm={confirmLeaveGroup}
          isLoading={state.isLoading}
          error={state.error}
        />
      );
    }

    // Manage group
    if (state.currentGroup) {
      return (
        <GroupManageStep
          currentGroup={state.currentGroup}
          groupMembers={state.groupMembers}
          groupStats={state.groupStats}
          groupPendingInvites={state.groupPendingInvites}
          pendingInvites={state.pendingInvites}
          userId={user?.id}
          onCopyInviteCode={copyInviteCode}
          onUserSelect={handleUserSelect}
          onLeaveGroup={() => dispatch({ type: 'SHOW_LEAVE_CONFIRMATION' })}
          onClose={onClose}
          isLoading={state.isLoading}
          error={state.error}
        />
      );
    }

    // Step-based rendering
    switch (state.currentStep) {
      case 'create':
        return (
          <GroupCreateStep
            groupName={state.groupName}
            onGroupNameChange={(name) => dispatch({ type: 'SET_GROUP_NAME', name })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 'overview' })}
            onSubmit={handleCreateGroup}
            isLoading={state.isLoading}
            error={state.error}
          />
        );
      case 'join':
        return (
          <GroupJoinStep
            inviteCode={state.inviteCode}
            personalStats={state.personalStats}
            onInviteCodeChange={(code) => dispatch({ type: 'SET_INVITE_CODE', code })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 'overview' })}
            onSubmit={handleJoinGroup}
            isLoading={state.isLoading}
            error={state.error}
          />
        );
      default:
        return (
          <GroupOverviewStep
            personalStats={state.personalStats}
            onCreateClick={() => dispatch({ type: 'SET_STEP', step: 'create' })}
            onJoinClick={() => dispatch({ type: 'SET_STEP', step: 'join' })}
            isLoading={state.isLoading}
            error={state.error}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-lorcana-navy rounded-lg border-2 border-lorcana-gold w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-lorcana-cream">
              {state.currentGroup ? 'Collection Group' : 'Collection Groups'}
            </h2>
            <button
              onClick={onClose}
              className="text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CollectionGroupModal;

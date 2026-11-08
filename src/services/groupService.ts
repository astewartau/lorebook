// Shared collections ("groups" in the current UI). A group is a collection
// with sharing turned on: it has an invite code or more than one member.
// Every check happens on the server; the user ids accepted here are kept only
// so existing callers don't change, and are never sent.

import * as api from '../lib/api';
import { supabase } from '../lib/supabase';

export interface CollectionGroup {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user_profiles: { display_name: string };
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending';
  created_at: string;
  inviter?: { display_name: string };
  collection_groups?: { name: string };
  user_profiles?: { display_name: string };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'group_invite' | 'group_join' | 'group_leave' | 'system';
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

type Result = { success: boolean; error?: string };

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

async function activeCollectionId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return (await api.getProfile(data.user.id))?.activeCollectionId ?? null;
}

function toGroup(info: api.CollectionInfo): CollectionGroup {
  return {
    id: info.id,
    name: info.name,
    owner_id: info.ownerId,
    invite_code: info.inviteCode ?? '',
    created_at: '',
    updated_at: '',
  };
}

function describe(n: { kind: string; data: Record<string, unknown> }): Pick<Notification, 'type' | 'title' | 'message'> {
  const d = n.data as Record<string, string | undefined>;
  switch (n.kind) {
    case 'collection_invite':
      return { type: 'group_invite', title: 'Collection invite', message: `${d.inviter_name ?? 'Someone'} invited you to share "${d.collection_name ?? 'a collection'}".` };
    case 'invite_accepted':
      return { type: 'group_join', title: 'Invite accepted', message: `${d.invitee_name ?? 'Someone'} joined your shared collection.` };
    case 'invite_declined':
      return { type: 'system', title: 'Invite declined', message: `${d.invitee_name ?? 'Someone'} declined your invite.` };
    case 'collection_removed':
      return { type: 'group_leave', title: 'Removed from collection', message: 'You were removed from a shared collection. Your own collection is active again.' };
    default:
      return { type: 'system', title: 'Notification', message: '' };
  }
}

class GroupService {
  /** The shared collection you are using, if sharing is on. */
  async getUserGroup(_userId?: string): Promise<CollectionGroup | null> {
    const id = await activeCollectionId();
    if (!id) return null;
    const info = await api.getCollectionInfo(id);
    if (!info) return null;
    const { data } = await supabase.auth.getUser();
    const shared = info.inviteCode !== null || info.members.length > 1 || info.ownerId !== data.user?.id;
    return shared ? toGroup(info) : null;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const info = await api.getCollectionInfo(groupId);
    return (info?.members ?? []).map(m => ({
      id: `${groupId}:${m.userId}`,
      group_id: groupId,
      user_id: m.userId,
      role: m.role === 'owner' ? 'owner' : 'member',
      joined_at: m.joinedAt.toISOString(),
      user_profiles: { display_name: m.displayName },
    }));
  }

  /** Turns sharing on for your own collection under a new name. */
  async createGroup(name: string, _ownerId?: string): Promise<Result & { group?: CollectionGroup }> {
    try {
      const { data } = await supabase.auth.getUser();
      const own = data.user ? await api.getOwnCollectionId(data.user.id) : null;
      if (!own) return { success: false, error: 'Your collection was not found' };
      await api.renameCollection(own, name);
      await api.rotateInviteCode(own);
      const info = await api.getCollectionInfo(own);
      return { success: true, group: info ? toGroup(info) : undefined };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }

  async joinGroupByCode(_userId: string, inviteCode: string): Promise<Result & { group?: CollectionGroup }> {
    try {
      const id = await api.joinCollection(inviteCode, true);
      const info = await api.getCollectionInfo(id);
      return { success: true, group: info ? toGroup(info) : undefined };
    } catch (e) {
      const msg = errorMessage(e);
      return { success: false, error: msg.includes('invalid invite code') ? 'Invalid invite code' : msg };
    }
  }

  /**
   * Leave the shared collection. For the owner this stops sharing: other
   * members are removed and the invite code is turned off.
   */
  async leaveGroup(_userId?: string): Promise<Result> {
    try {
      const group = await this.getUserGroup();
      if (!group) return { success: true };
      const { data } = await supabase.auth.getUser();
      if (group.owner_id === data.user?.id) {
        const info = await api.getCollectionInfo(group.id);
        for (const m of info?.members ?? []) {
          if (m.userId !== group.owner_id) await api.removeCollectionMember(group.id, m.userId);
        }
        await api.disableInviteCode(group.id);
      } else {
        await api.leaveCollection(group.id);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }

  async sendInvitation(groupId: string, _inviterId: string, inviteeId: string): Promise<Result> {
    try {
      await api.inviteToCollection(groupId, inviteeId);
      return { success: true };
    } catch (e) {
      const msg = errorMessage(e);
      if (msg.includes('already a member')) return { success: false, error: 'That user is already a member' };
      if (msg.includes('duplicate key')) return { success: false, error: 'That user already has a pending invite' };
      return { success: false, error: msg };
    }
  }

  async getGroupPendingInvitations(groupId: string): Promise<GroupInvitation[]> {
    const invites = await api.getPendingInvites({ collectionId: groupId });
    return invites.map(i => ({
      id: i.id,
      group_id: i.collectionId,
      inviter_id: i.inviterId,
      invitee_id: i.inviteeId,
      status: 'pending',
      created_at: i.createdAt.toISOString(),
      user_profiles: { display_name: i.inviteeName ?? 'Unknown User' },
    }));
  }

  /** Invites sent to you. Names come from the invite notification, written by the server. */
  async getPendingInvitations(userId: string): Promise<GroupInvitation[]> {
    const [invites, notes] = await Promise.all([
      api.getPendingInvites({ inviteeId: userId }),
      api.getNotifications(100),
    ]);
    const byInvite = new Map(notes
      .filter(n => n.kind === 'collection_invite')
      .map(n => [(n.data as Record<string, string>).invite_id, n.data as Record<string, string>]));
    return invites.map(i => {
      const d = byInvite.get(i.id);
      return {
        id: i.id,
        group_id: i.collectionId,
        inviter_id: i.inviterId,
        invitee_id: i.inviteeId,
        status: 'pending',
        created_at: i.createdAt.toISOString(),
        inviter: { display_name: d?.inviter_name ?? 'Someone' },
        collection_groups: { name: d?.collection_name ?? 'a shared collection' },
      };
    });
  }

  async acceptInvitation(invitationId: string, _userId?: string): Promise<Result> {
    try {
      await api.respondToInvite(invitationId, true, true);
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }

  async declineInvitation(invitationId: string, _userId?: string): Promise<Result> {
    try {
      await api.respondToInvite(invitationId, false, false);
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }

  async getNotifications(_userId?: string): Promise<Notification[]> {
    const rows = await api.getNotifications(50);
    return rows.map(n => ({
      id: n.id,
      user_id: n.user_id,
      ...describe({ kind: n.kind, data: n.data as Record<string, unknown> }),
      data: n.data as Record<string, unknown>,
      is_read: n.read_at !== null,
      created_at: n.created_at,
    }));
  }

  async markNotificationRead(notificationId: string, _userId?: string): Promise<void> {
    await api.markNotificationsRead([notificationId]);
  }

  async markAllNotificationsRead(_userId?: string): Promise<void> {
    await api.markNotificationsRead();
  }

  /** Polls for new notifications (realtime is off in the local stack). */
  subscribeToNotifications(_userId: string, onNotification: (n: Notification) => void) {
    let seen: Set<string> | null = null;
    const poll = async () => {
      try {
        const list = await this.getNotifications();
        if (seen) list.filter(n => !seen!.has(n.id)).forEach(onNotification);
        seen = new Set(list.map(n => n.id));
      } catch {
        // Try again next time.
      }
    };
    poll();
    const timer = setInterval(poll, 30_000);
    return { unsubscribe: () => clearInterval(timer) };
  }

  async getGroupStats(groupId: string): Promise<{ totalCards: number; uniqueCards: number }> {
    const cards = await api.getCollectionCards(groupId);
    return {
      totalCards: cards.reduce((sum, c) => sum + c.quantityNormal + c.quantityFoil, 0),
      uniqueCards: cards.length,
    };
  }
}

export const groupService = new GroupService();

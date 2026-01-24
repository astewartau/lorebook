import { supabase } from '../lib/supabase';

export interface CollectionTarget {
  targetUserId: string;
  groupId: string | null;
}

/**
 * Determines the target user ID for collection operations.
 * If the user is in a collection group, returns the group owner's ID.
 * Otherwise, returns the user's own ID.
 */
export async function getCollectionTarget(userId: string): Promise<CollectionTarget> {
  const { data: memberData } = await supabase
    .from('collection_group_members')
    .select(`
      group_id,
      role,
      collection_groups(owner_id)
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberData?.group_id) {
    const groupOwnerId = (memberData as any).collection_groups.owner_id;
    return { targetUserId: groupOwnerId, groupId: memberData.group_id };
  }

  return { targetUserId: userId, groupId: null };
}

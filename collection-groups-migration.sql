-- Collection Groups Feature Migration
-- This migration adds support for shared collections between users
-- Run this on your Supabase database to enable collection sharing

-- ============================================
-- 1. CREATE COLLECTION GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_groups_owner_id ON public.collection_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_collection_groups_invite_code ON public.collection_groups(invite_code);

-- ============================================
-- 2. CREATE COLLECTION GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.collection_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.collection_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collection_group_members_group_id ON public.collection_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_collection_group_members_user_id ON public.collection_group_members(user_id);

-- ============================================
-- 3. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('group_invite', 'group_join', 'group_leave', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- 4. CREATE GROUP INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.collection_groups(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, invitee_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON public.group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_id ON public.group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON public.group_invitations(status);

-- ============================================
-- 5. MODIFY USER_COLLECTIONS TABLE
-- ============================================
-- Add group_id column to link collections to groups
ALTER TABLE public.user_collections 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.collection_groups(id) ON DELETE SET NULL;

-- Create index for group-based queries
CREATE INDEX IF NOT EXISTS idx_user_collections_group_id ON public.user_collections(group_id);

-- ============================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current group
CREATE OR REPLACE FUNCTION get_user_group_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT group_id 
  FROM public.collection_group_members 
  WHERE user_id = p_user_id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to merge user's collection into a group
CREATE OR REPLACE FUNCTION merge_user_collection_to_group(
  p_user_id UUID,
  p_group_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update all existing collection items for this user to belong to the group
  UPDATE public.user_collections
  SET group_id = p_group_id,
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new group
CREATE OR REPLACE FUNCTION create_collection_group(
  p_name TEXT,
  p_owner_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_invite_code TEXT;
  v_attempts INTEGER := 0;
BEGIN
  -- Generate unique invite code with retry logic
  LOOP
    v_invite_code := generate_invite_code();
    v_attempts := v_attempts + 1;
    
    -- Try to insert with this code
    BEGIN
      INSERT INTO public.collection_groups (name, owner_id, invite_code)
      VALUES (p_name, p_owner_id, v_invite_code)
      RETURNING id INTO v_group_id;
      
      EXIT; -- Success, exit loop
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempts > 10 THEN
          RAISE EXCEPTION 'Could not generate unique invite code after 10 attempts';
        END IF;
        -- Continue loop to try again
    END;
  END LOOP;
  
  -- Add owner as a member
  INSERT INTO public.collection_group_members (group_id, user_id, role)
  VALUES (v_group_id, p_owner_id, 'owner');
  
  -- Mark owner's existing collection as part of this group
  UPDATE public.user_collections
  SET group_id = v_group_id
  WHERE user_id = p_owner_id AND group_id IS NULL;
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a group by invite code
CREATE OR REPLACE FUNCTION join_group_by_code(
  p_user_id UUID,
  p_invite_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_group_id UUID;
  v_group_name TEXT;
  v_existing_membership UUID;
BEGIN
  -- Check if user is already in a group
  SELECT group_id INTO v_existing_membership
  FROM public.collection_group_members
  WHERE user_id = p_user_id;
  
  IF v_existing_membership IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already in a group'
    );
  END IF;
  
  -- Find group by invite code
  SELECT id, name INTO v_group_id, v_group_name
  FROM public.collection_groups
  WHERE invite_code = p_invite_code;
  
  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid invite code'
    );
  END IF;
  
  -- Add user to group
  INSERT INTO public.collection_group_members (group_id, user_id, role)
  VALUES (v_group_id, p_user_id, 'member');
  
  -- Don't merge collections - user will work with shared collection while in group
  
  -- Create notification for group owner
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    owner_id,
    'group_join',
    'New Member Joined',
    (SELECT display_name FROM public.user_profiles WHERE user_id = p_user_id) || ' joined your group',
    jsonb_build_object(
      'group_id', v_group_id,
      'group_name', v_group_name,
      'member_id', p_user_id
    )
  FROM public.collection_groups
  WHERE id = v_group_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'group_id', v_group_id,
    'group_name', v_group_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave a group
CREATE OR REPLACE FUNCTION leave_collection_group(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
  v_is_owner BOOLEAN;
  v_member_count INTEGER;
BEGIN
  -- Get user's group and role
  SELECT cgm.group_id, cgm.role = 'owner' 
  INTO v_group_id, v_is_owner
  FROM public.collection_group_members cgm
  WHERE cgm.user_id = p_user_id;
  
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'User is not in a group';
  END IF;
  
  -- Count remaining members
  SELECT COUNT(*) INTO v_member_count
  FROM public.collection_group_members
  WHERE group_id = v_group_id;
  
  -- If owner and only member, delete the group
  IF v_is_owner AND v_member_count = 1 THEN
    -- Remove group_id from all collections first
    UPDATE public.user_collections
    SET group_id = NULL
    WHERE group_id = v_group_id;
    
    -- Delete the group (cascades to members, invitations)
    DELETE FROM public.collection_groups
    WHERE id = v_group_id;
  ELSIF v_is_owner AND v_member_count > 1 THEN
    RAISE EXCEPTION 'Owner cannot leave group with other members. Transfer ownership first.';
  ELSE
    -- Regular member leaving
    -- Remove member from group
    DELETE FROM public.collection_group_members
    WHERE user_id = p_user_id AND group_id = v_group_id;
    
    -- User returns to their personal collection automatically
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. CREATE TRIGGERS
-- ============================================

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_collection_groups_updated_at
  BEFORE UPDATE ON public.collection_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set group_id on new collection items
CREATE OR REPLACE FUNCTION auto_set_group_id()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- If group_id is not already set, get user's current group
  IF NEW.group_id IS NULL THEN
    SELECT group_id INTO v_group_id
    FROM public.collection_group_members
    WHERE user_id = NEW.user_id;
    
    IF v_group_id IS NOT NULL THEN
      NEW.group_id := v_group_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_collection_group_id
  BEFORE INSERT ON public.user_collections
  FOR EACH ROW EXECUTE FUNCTION auto_set_group_id();

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.collection_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for collection_groups
CREATE POLICY "Users can view groups they belong to" ON public.collection_groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.collection_group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON public.collection_groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their groups" ON public.collection_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their groups" ON public.collection_groups
  FOR DELETE USING (owner_id = auth.uid());

-- Create security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION get_user_current_group_id()
RETURNS UUID AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_group_id UUID;
BEGIN
  -- Only execute if we have a user
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the group_id for the current user
  SELECT group_id INTO user_group_id
  FROM public.collection_group_members 
  WHERE user_id = current_user_id
  LIMIT 1;
  
  RETURN user_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for collection_group_members  
DROP POLICY IF EXISTS "Users can view group member info" ON public.collection_group_members;
DROP POLICY IF EXISTS "Users can view members of their group" ON public.collection_group_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.collection_group_members;
DROP POLICY IF EXISTS "Users can view group members via function" ON public.collection_group_members;
DROP POLICY IF EXISTS "Users can view group members" ON public.collection_group_members;

CREATE POLICY "Users can view members in their group" ON public.collection_group_members
  FOR SELECT USING (group_id = get_user_current_group_id());

CREATE POLICY "System can insert members" ON public.collection_group_members
  FOR INSERT WITH CHECK (true); -- Controlled by functions

CREATE POLICY "Users can leave groups" ON public.collection_group_members
  FOR DELETE USING (user_id = auth.uid());

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true); -- Created by triggers/functions

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Policies for group_invitations
CREATE POLICY "Users can view invitations sent to them" ON public.group_invitations
  FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Group members can send invitations" ON public.group_invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.collection_group_members 
      WHERE user_id = auth.uid() AND group_id = group_invitations.group_id
    )
  );

CREATE POLICY "Users can update invitations sent to them" ON public.group_invitations
  FOR UPDATE USING (invitee_id = auth.uid());

CREATE POLICY "Inviters can cancel their invitations" ON public.group_invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- Update user_collections policies to respect groups
DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
CREATE POLICY "Users can view collections in their group" ON public.user_collections
  FOR SELECT USING (
    -- User can see their own collections
    user_id = auth.uid() 
    OR 
    -- User can see collections in their group
    group_id IN (
      SELECT group_id FROM public.collection_group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can insert collections" ON public.user_collections;
CREATE POLICY "Users can insert collections" ON public.user_collections
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
CREATE POLICY "Users can update collections in their group" ON public.user_collections
  FOR UPDATE USING (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT group_id FROM public.collection_group_members WHERE user_id = auth.uid()
    )
  );

-- Add policy for group collection insertions
CREATE POLICY "Users can insert group collections" ON public.user_collections
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT group_id FROM public.collection_group_members WHERE user_id = auth.uid()
    )
  );

-- Add policy for group collection deletions
CREATE POLICY "Users can delete group collections" ON public.user_collections
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    (group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM public.collection_group_members WHERE user_id = auth.uid()
    ))
  );

-- ============================================
-- 9. CREATE VIEW FOR EASIER QUERYING
-- ============================================
CREATE OR REPLACE VIEW public.user_collection_view AS
SELECT 
  uc.*,
  cg.name as group_name,
  cgm.role as user_role_in_group
FROM public.user_collections uc
LEFT JOIN public.collection_groups cg ON uc.group_id = cg.id
LEFT JOIN public.collection_group_members cgm ON cg.id = cgm.group_id AND cgm.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.user_collection_view TO authenticated;

-- ============================================
-- 10. SAMPLE QUERIES FOR APPLICATION
-- ============================================

-- To create a group:
-- SELECT create_collection_group('Family Collection', auth.uid());

-- To join a group:
-- SELECT join_group_by_code(auth.uid(), 'ABC12345');

-- To get user's collection (personal or group):
-- SELECT * FROM user_collections 
-- WHERE user_id = auth.uid() 
--    OR group_id = (SELECT group_id FROM collection_group_members WHERE user_id = auth.uid());

-- To send an invitation:
-- INSERT INTO group_invitations (group_id, inviter_id, invitee_id)
-- VALUES ($group_id, auth.uid(), $invitee_id);

-- To accept an invitation:
-- UPDATE group_invitations 
-- SET status = 'accepted', responded_at = NOW() 
-- WHERE id = $invitation_id AND invitee_id = auth.uid();
-- Then call: SELECT join_group_by_code(auth.uid(), $invite_code);

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- DROP TRIGGER IF EXISTS auto_set_collection_group_id ON public.user_collections;
-- DROP FUNCTION IF EXISTS auto_set_group_id();
-- DROP FUNCTION IF EXISTS leave_collection_group(UUID);
-- DROP FUNCTION IF EXISTS join_group_by_code(UUID, TEXT);
-- DROP FUNCTION IF EXISTS create_collection_group(TEXT, UUID);
-- DROP FUNCTION IF EXISTS merge_user_collection_to_group(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_user_group_id(UUID);
-- DROP FUNCTION IF EXISTS generate_invite_code();
-- DROP VIEW IF EXISTS public.user_collection_view;
-- ALTER TABLE public.user_collections DROP COLUMN IF EXISTS group_id;
-- DROP TABLE IF EXISTS public.group_invitations;
-- DROP TABLE IF EXISTS public.notifications;
-- DROP TABLE IF EXISTS public.collection_group_members;
-- DROP TABLE IF EXISTS public.collection_groups;
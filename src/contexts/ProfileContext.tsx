import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { supabase, TABLES } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  userProfile: UserProfile | null;
  allProfiles: UserProfile[];
  loading: boolean;
  createOrUpdateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  loadUserProfile: (userId: string) => Promise<UserProfile | null>;
  loadAllProfiles: () => Promise<void>;
  searchProfiles: (searchTerm: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Simple profile cache: userId -> {profile, timestamp}
  const [profileCache, setProfileCache] = useState<Map<string, {profile: UserProfile, timestamp: number}>>(new Map());

  // Load current user's profile when authenticated
  useEffect(() => {
    if (user) {
      loadUserProfile(user.id);
    } else {
      setUserProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    // Check cache first (5 minute TTL)
    const cached = profileCache.get(userId);
    const now = Date.now();
    const cacheValidTime = 5 * 60 * 1000; // 5 minutes
    
    if (cached && (now - cached.timestamp) < cacheValidTime) {
      return cached.profile;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Profile doesn't exist yet
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error loading profile:', error);
        return null;
      }

      const profile: UserProfile = {
        id: data.id,
        userId: data.user_id,
        displayName: data.display_name,
        fullName: data.full_name,
        location: data.location,
        bio: data.bio,
        avatarUrl: data.avatar_url,
        avatarCardId: data.avatar_card_id,
        avatarCropData: data.avatar_crop_data,
        isPublic: data.is_public,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      // Cache the profile
      setProfileCache(prev => {
        const newCache = new Map(prev);
        newCache.set(userId, { profile, timestamp: now });
        return newCache;
      });

      if (userId === user?.id) {
        setUserProfile(profile);
      }

      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async (profileData: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('id')
        .eq('user_id', user.id)
        .single();

      const profilePayload = {
        user_id: user.id,
        display_name: profileData.displayName || user.email?.split('@')[0] || 'Anonymous',
        full_name: profileData.fullName || null,
        location: profileData.location || null,
        bio: profileData.bio || null,
        avatar_url: profileData.avatarUrl || null,
        avatar_card_id: profileData.avatarCardId || null,
        avatar_crop_data: profileData.avatarCropData || null,
        is_public: profileData.isPublic !== undefined ? profileData.isPublic : true,
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from(TABLES.USER_PROFILES)
          .update(profilePayload)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new profile
        result = await supabase
          .from(TABLES.USER_PROFILES)
          .insert(profilePayload)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving profile:', result.error);
        return false;
      }

      // Update local state
      const updatedProfile: UserProfile = {
        id: result.data.id,
        userId: result.data.user_id,
        displayName: result.data.display_name,
        fullName: result.data.full_name,
        location: result.data.location,
        bio: result.data.bio,
        avatarUrl: result.data.avatar_url,
        avatarCardId: result.data.avatar_card_id,
        avatarCropData: result.data.avatar_crop_data,
        isPublic: result.data.is_public,
        createdAt: new Date(result.data.created_at),
        updatedAt: new Date(result.data.updated_at)
      };

      setUserProfile(updatedProfile);
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadAllProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('is_public', true)
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      const profiles = data.map(p => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name,
        fullName: p.full_name,
        location: p.location,
        bio: p.bio,
        avatarUrl: p.avatar_url,
        avatarCardId: p.avatar_card_id,
        avatarCropData: p.avatar_crop_data,
        isPublic: p.is_public,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at)
      }));

      setAllProfiles(profiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchProfiles = async (searchTerm: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from(TABLES.USER_PROFILES)
        .select('*')
        .eq('is_public', true);

      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('display_name', { ascending: true });

      if (error) {
        console.error('Error searching profiles:', error);
        return;
      }

      const profiles = data.map(p => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name,
        fullName: p.full_name,
        location: p.location,
        bio: p.bio,
        avatarUrl: p.avatar_url,
        avatarCardId: p.avatar_card_id,
        avatarCropData: p.avatar_crop_data,
        isPublic: p.is_public,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at)
      }));

      setAllProfiles(profiles);
    } catch (error) {
      console.error('Error searching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: ProfileContextType = {
    userProfile,
    allProfiles,
    loading,
    createOrUpdateProfile,
    loadUserProfile,
    loadAllProfiles,
    searchProfiles
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
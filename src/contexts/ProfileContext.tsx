import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { UserProfile } from '../types';
import * as api from '../lib/api';
import { useAuth } from './AuthContext';

interface ProfileContextType {
  userProfile: UserProfile | null;
  allProfiles: UserProfile[];
  loading: boolean;
  createOrUpdateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  /** Reloads the signed-in user's profile (e.g. after their active collection changes). */
  refreshUserProfile: () => Promise<UserProfile | null>;
  loadUserProfile: (userId: string) => Promise<UserProfile | null>;
  loadAllProfiles: () => Promise<void>;
  searchProfiles: (searchTerm: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const CACHE_TTL_MS = 5 * 60 * 1000;

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, { profile: UserProfile; at: number }>());

  const refreshUserProfile = useCallback(async () => {
    if (!userId) return null;
    try {
      const profile = await api.getProfile(userId);
      if (profile) cache.current.set(userId, { profile, at: Date.now() });
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refreshUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [userId, refreshUserProfile]);

  const loadUserProfile = useCallback(async (id: string) => {
    const cached = cache.current.get(id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.profile;
    try {
      const profile = await api.getProfile(id);
      if (profile) cache.current.set(id, { profile, at: Date.now() });
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }, []);

  const createOrUpdateProfile = useCallback(async (p: Partial<UserProfile>) => {
    if (!userId) return false;
    setLoading(true);
    try {
      const profile = await api.updateProfile(userId, {
        displayName: p.displayName,
        fullName: p.fullName,
        location: p.location,
        bio: p.bio,
        avatarCardId: p.avatarCardId,
        avatarCropData: p.avatarCropData,
        isPublic: p.isPublic,
      });
      cache.current.set(userId, { profile, at: Date.now() });
      setUserProfile(profile);
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const searchProfiles = useCallback(async (term: string) => {
    setLoading(true);
    try {
      setAllProfiles(await api.searchProfiles(term));
    } catch (error) {
      console.error('Error searching profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllProfiles = useCallback(() => searchProfiles(''), [searchProfiles]);

  const value = useMemo(() => ({
    userProfile,
    allProfiles,
    loading,
    createOrUpdateProfile,
    refreshUserProfile,
    loadUserProfile,
    loadAllProfiles,
    searchProfiles,
  }), [userProfile, allProfiles, loading, createOrUpdateProfile, refreshUserProfile, loadUserProfile, loadAllProfiles, searchProfiles]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

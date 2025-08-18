import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CollectionCardEntry } from '../types';
import { supabase, UserCollection, TABLES } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CollectionContextType {
  collection: CollectionCardEntry[];
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number };
  addCardToCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  removeCardFromCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  setCardQuantity: (cardId: number, quantityNormal: number, quantityFoil: number) => void;
  totalCards: number;
  uniqueCards: number;
  exportCollection: () => string;
  importCollection: (data: string) => boolean;
  importCollectionDirect: (cards: CollectionCardEntry[]) => Promise<boolean>;
  clearCollection: () => Promise<void>;
  reloadCollection: () => Promise<void>;
  syncStatus: 'idle' | 'loading' | 'error' | 'offline';
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

interface CollectionProviderProps {
  children: ReactNode;
}

export const CollectionProvider: React.FC<CollectionProviderProps> = ({ children }) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  const { user, session } = useAuth();
  const [collection, setCollection] = useState<CollectionCardEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error' | 'offline'>('idle');
  
  // Batch sync state
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, {quantityNormal: number, quantityFoil: number}>>(new Map());
  const [syncTimeout, setSyncTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isCurrentlySyncing, setIsCurrentlySyncing] = useState(false);

  // ================================
  // DATA LOADING & GROUP MANAGEMENT
  // ================================
  
  // Load collection data when user changes
  useEffect(() => {
    if (user && session) {
      loadCollectionFromSupabase();
    } else {
      // Clear collection when not authenticated
      setCollection([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  const loadCollectionFromSupabase = async () => {
    if (!user) return;
    
    setSyncStatus('loading');
    try {
      // Check if user is in a group and get group details
      const { data: memberData } = await supabase
        .from('collection_group_members')
        .select(`
          group_id,
          role,
          collection_groups(owner_id)
        `)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results
      
      let data, error;
      let targetUserId = user.id; // Default to loading own collection
      
      if (memberData?.group_id) {
        // User is in a group - determine whose collection to load
        const groupOwnerId = (memberData as any).collection_groups.owner_id;
        targetUserId = groupOwnerId; // Load the group owner's collection
      } else {
      }
      
      // Load the target user's collection (either own or group owner's)
      const result = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .select('*')
        .eq('user_id', targetUserId);
      
      data = result.data;
      error = result.error;

      if (error) {
        setSyncStatus('error');
        setCollection([]);
      } else {
        
        // Convert database format to internal format
        const converted = (data || []).map((item: UserCollection) => ({
          cardId: item.card_id,
          quantityNormal: item.quantity_normal || 0,
          quantityFoil: item.quantity_foil || 0
        }));
        
        setCollection(converted);
        setSyncStatus('idle');
      }
    } catch (error) {
      setSyncStatus('offline');
      setCollection([]);
    }
  };

  // ================================
  // DATABASE SYNC LOGIC
  // ================================
  
  // Batch sync all pending updates
  const syncBatchToSupabase = async (updatesToSync?: Map<number, {quantityNormal: number, quantityFoil: number}>) => {
    const updates = updatesToSync || pendingUpdates;
    if (!user || updates.size === 0) {
      return;
    }
    setSyncStatus('loading');
    try {
      // Check if user is in a group and get group details
      const { data: memberData } = await supabase
        .from('collection_group_members')
        .select(`
          group_id,
          role,
          collection_groups(owner_id)
        `)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      let targetUserId = user.id; // Default to saving to own collection
      let userGroupId: string | null = null;
      
      if (memberData?.group_id) {
        // User is in a group - save to the group owner's collection
        const groupOwnerId = (memberData as any).collection_groups.owner_id;
        targetUserId = groupOwnerId; // Save to owner's collection
        userGroupId = memberData.group_id;
      } else {
      }

      const updateEntries = Array.from(updates.entries());
      
      const upserts = [];
      const deletes = [];
      
      // Separate upserts from deletes
      for (const [cardId, {quantityNormal, quantityFoil}] of updateEntries) {
        if (quantityNormal <= 0 && quantityFoil <= 0) {
          deletes.push(cardId);
        } else {
          // Always save to the target user's collection (owner if in group, self if not)
          upserts.push({
            user_id: targetUserId,
            card_id: cardId,
            quantity_normal: quantityNormal,
            quantity_foil: quantityFoil,
            group_id: userGroupId // Set group_id if in group context
          });
        }
      }
      
      
      // Batch upsert to user_collections table
      if (upserts.length > 0) {
        const { error } = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .upsert(upserts, { onConflict: 'user_id,card_id' });
          
        if (error) {
          setSyncStatus('error');
          return;
        }
      }
      
      // Batch delete from user_collections table  
      if (deletes.length > 0) {
        const { error } = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .delete()
          .eq('user_id', targetUserId)
          .in('card_id', deletes);
          
        if (error) {
          setSyncStatus('error');
          return;
        }
      }
      
      // Updates already cleared by timer callback
      setSyncStatus('idle');
      setIsCurrentlySyncing(false); // Allow new syncs
      
    } catch (error) {
      setSyncStatus('offline');
      setIsCurrentlySyncing(false); // Allow new syncs after error
    }
  };

  // Queue a card update for batching
  const queueCardUpdate = (cardId: number, quantityNormal: number, quantityFoil: number) => {
    if (!user) {
      return;
    }
    
    // Add to pending updates
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(cardId, { quantityNormal, quantityFoil });
      return newMap;
    });
    
    // Reset the debounce timer
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    const timeout = setTimeout(() => {
      // Use callback to get current state, not closure
      setPendingUpdates(currentUpdates => {
        if (currentUpdates.size > 0 && !isCurrentlySyncing) {
          setIsCurrentlySyncing(true);
          // Pass the current updates directly to avoid closure issues
          syncBatchToSupabase(currentUpdates);
          // Clear the pending updates immediately to prevent other timers from running
          return new Map();
        } else {
          return currentUpdates;
        }
      });
    }, 2000); // 2 second debounce
    setSyncTimeout(timeout);
  };

  // ================================
  // COLLECTION CRUD OPERATIONS
  // ================================
  
  const getCardQuantity = (cardId: number): { normal: number; foil: number; total: number } => {
    const card = collection.find(c => c.cardId === cardId);
    return {
      normal: card?.quantityNormal || 0,
      foil: card?.quantityFoil || 0,
      total: (card?.quantityNormal || 0) + (card?.quantityFoil || 0)
    };
  };

  const addCardToCollection = (cardId: number, quantityNormal: number = 1, quantityFoil: number = 0) => {
    setCollection(prev => {
      const existingIndex = prev.findIndex(c => c.cardId === cardId);
      let newCollection;
      
      if (existingIndex >= 0) {
        // Update existing card
        newCollection = [...prev];
        newCollection[existingIndex] = {
          ...newCollection[existingIndex],
          quantityNormal: newCollection[existingIndex].quantityNormal + quantityNormal,
          quantityFoil: newCollection[existingIndex].quantityFoil + quantityFoil
        };
      } else {
        // Add new card
        newCollection = [...prev, { cardId, quantityNormal, quantityFoil }];
      }
      
      // Queue for batch sync
      const currentQuantities = getCardQuantity(cardId);
      queueCardUpdate(
        cardId, 
        currentQuantities.normal + quantityNormal,
        currentQuantities.foil + quantityFoil
      );
      
      return newCollection;
    });
  };

  const removeCardFromCollection = (cardId: number, quantityNormal: number = 1, quantityFoil: number = 0) => {
    setCollection(prev => {
      const existingIndex = prev.findIndex(c => c.cardId === cardId);
      
      if (existingIndex >= 0) {
        const newNormal = Math.max(0, prev[existingIndex].quantityNormal - quantityNormal);
        const newFoil = Math.max(0, prev[existingIndex].quantityFoil - quantityFoil);
        
        let newCollection;
        if (newNormal <= 0 && newFoil <= 0) {
          // Remove card entirely
          newCollection = prev.filter(c => c.cardId !== cardId);
        } else {
          // Update quantities
          newCollection = [...prev];
          newCollection[existingIndex] = {
            ...newCollection[existingIndex],
            quantityNormal: newNormal,
            quantityFoil: newFoil
          };
        }
        
        // Queue for batch sync
        queueCardUpdate(cardId, newNormal, newFoil);
        
        return newCollection;
      }
      
      return prev;
    });
  };

  const setCardQuantity = (cardId: number, quantityNormal: number, quantityFoil: number) => {
    setCollection(prev => {
      let newCollection;
      const existingIndex = prev.findIndex(c => c.cardId === cardId);
      
      if (quantityNormal <= 0 && quantityFoil <= 0) {
        // Remove card
        newCollection = prev.filter(c => c.cardId !== cardId);
      } else if (existingIndex >= 0) {
        // Update existing card
        newCollection = [...prev];
        newCollection[existingIndex] = { cardId, quantityNormal, quantityFoil };
      } else {
        // Add new card
        newCollection = [...prev, { cardId, quantityNormal, quantityFoil }];
      }
      
      // Queue for batch sync
      queueCardUpdate(cardId, quantityNormal, quantityFoil);
      
      return newCollection;
    });
  };

  const totalCards = collection.reduce((sum, card) => sum + card.quantityNormal + card.quantityFoil, 0);
  const uniqueCards = collection.length;

  // ================================
  // IMPORT/EXPORT OPERATIONS
  // ================================
  
  const exportCollection = (): string => {
    const exportData = {
      version: '2.0', // New version with foil support
      timestamp: new Date().toISOString(),
      cards: collection.map(card => ({
        cardId: card.cardId,
        normal: card.quantityNormal,
        foil: card.quantityFoil
      }))
    };
    return JSON.stringify(exportData, null, 2);
  };

  const importCollection = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.version === '2.0' && Array.isArray(parsed.cards)) {
        // Import new format with foil support
        const importedCards = parsed.cards.map((card: any) => ({
          cardId: card.cardId,
          quantityNormal: card.normal || 0,
          quantityFoil: card.foil || 0
        }));
        
        setCollection(importedCards);
        
        // Queue all cards for batch sync
        importedCards.forEach((card: CollectionCardEntry) => {
          queueCardUpdate(card.cardId, card.quantityNormal, card.quantityFoil);
        });
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Direct import for bulk operations (bypasses batching)
  const importCollectionDirect = async (cards: CollectionCardEntry[]): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setSyncStatus('loading');

    try {
      // Check if user is in a group and get group details
      const { data: memberData } = await supabase
        .from('collection_group_members')
        .select(`
          group_id,
          role,
          collection_groups(owner_id)
        `)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      let targetUserId = user.id; // Default to importing to own collection
      let userGroupId: string | null = null;
      
      if (memberData?.group_id) {
        // User is in a group - import to the group owner's collection
        const groupOwnerId = (memberData as any).collection_groups.owner_id;
        targetUserId = groupOwnerId; // Import to owner's collection
        userGroupId = memberData.group_id;
      }

      // Convert to database format
      const upserts = cards.map(card => ({
        user_id: targetUserId,
        card_id: card.cardId,
        quantity_normal: card.quantityNormal,
        quantity_foil: card.quantityFoil,
        group_id: userGroupId // Set group_id if in group context
      }));

      // Check for duplicates
      const cardIdCounts = new Map<number, number>();
      const duplicates: number[] = [];
      
      upserts.forEach(item => {
        const count = cardIdCounts.get(item.card_id) || 0;
        cardIdCounts.set(item.card_id, count + 1);
        if (count > 0) {
          duplicates.push(item.card_id);
        }
      });
      
      if (duplicates.length > 0) {
        const uniqueDuplicates = Array.from(new Set(duplicates));
        console.error('DUPLICATE CARD IDs FOUND IN IMPORT:', uniqueDuplicates);
        console.error('Duplicate details:');
        uniqueDuplicates.forEach(cardId => {
          const duplicateRows = cards.filter(c => c.cardId === cardId);
          console.error(`Card ID ${cardId} appears ${duplicateRows.length} times:`, duplicateRows);
        });
      }

      const { error } = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .upsert(upserts, { onConflict: 'user_id,card_id' });

      if (error) {
        console.error('Database upsert error:', error);
        setSyncStatus('error');
        return false;
      }

      // Update local state
      setCollection(cards);
      setSyncStatus('idle');
      
      return true;

    } catch (error) {
      setSyncStatus('error');
      return false;
    }
  };

  const clearCollection = async () => {
    if (!user) return;
    
    setSyncStatus('loading');
    
    try {
      // Check if user is in a group and get group details
      const { data: memberData } = await supabase
        .from('collection_group_members')
        .select(`
          group_id,
          role,
          collection_groups(owner_id)
        `)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      let targetUserId = user.id; // Default to clearing own collection
      
      if (memberData?.group_id) {
        // User is in a group - clear the group owner's collection
        const groupOwnerId = (memberData as any).collection_groups.owner_id;
        targetUserId = groupOwnerId; // Clear owner's collection
      }

      // Clear from database first
      const { error } = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .delete()
        .eq('user_id', targetUserId);

      if (error) {
        setSyncStatus('error');
        return;
      }

      // Only clear local state if database deletion succeeded
      setCollection([]);
      setSyncStatus('idle');
      
    } catch (error) {
      setSyncStatus('offline');
    }
  };

  // ================================
  // CONTEXT PROVIDER SETUP
  // ================================
  
  const value: CollectionContextType = {
    collection,
    getCardQuantity,
    addCardToCollection,
    removeCardFromCollection,
    setCardQuantity,
    totalCards,
    uniqueCards,
    exportCollection,
    importCollection,
    importCollectionDirect,
    clearCollection,
    reloadCollection: loadCollectionFromSupabase,
    syncStatus,
  };

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollection = () => {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
};
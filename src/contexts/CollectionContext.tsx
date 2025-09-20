import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CollectionCardEntry } from '../types';
import { supabase, UserCollection, TABLES } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { allCards } from '../data/allCards';

interface CollectionContextType {
  collection: CollectionCardEntry[];
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number };
  addCardToCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  removeCardFromCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  setCardQuantity: (cardId: number, quantityNormal: number, quantityFoil: number) => void;
  totalCards: number;
  uniqueCards: number;
  exportCollection: () => string;
  exportCollectionCSV: () => string;
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
      
      // Load the target user's collection using pagination to handle Supabase limits
      console.log(`[CollectionContext] Loading collection for user: ${targetUserId}`);

      let allData: UserCollection[] = [];
      let hasMore = true;
      let offset = 0;
      const PAGE_SIZE = 1000;

      while (hasMore) {
        console.log(`[CollectionContext] Fetching page at offset ${offset}`);

        const result = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .select('*')
          .eq('user_id', targetUserId)
          .range(offset, offset + PAGE_SIZE - 1);

        if (result.error) {
          error = result.error;
          break;
        }

        const pageData = result.data || [];
        allData = allData.concat(pageData);

        console.log(`[CollectionContext] Page result: ${pageData.length} rows`);

        // If we got fewer rows than the page size, we've reached the end
        hasMore = pageData.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      data = allData;

      console.log(`[CollectionContext] Total collection loaded:`, {
        totalRows: data?.length || 0,
        hasError: !!error,
        errorMessage: error?.message
      });

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

        console.log(`[CollectionContext] Converted ${converted.length} collection entries`);
        console.log(`[CollectionContext] Unique cards: ${new Set(converted.map(c => c.cardId)).size}`);

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

  const exportCollectionCSV = (): string => {

    // Group collection by unique card identity (name + set + card number)
    const cardMap = new Map<string, {
      card: any;
      normalQuantity: number;
      foilQuantity: number;
    }>();

    collection.forEach(entry => {
      const card = allCards.find((c: any) => c.id === entry.cardId);
      if (!card) return;

      // Create unique key based on card identity
      const key = `${card.fullName}|${card.setCode}|${card.number}`;

      if (cardMap.has(key)) {
        // Add to existing entry
        const existing = cardMap.get(key)!;
        existing.normalQuantity += entry.quantityNormal;
        existing.foilQuantity += entry.quantityFoil;
      } else {
        // Create new entry
        cardMap.set(key, {
          card,
          normalQuantity: entry.quantityNormal,
          foilQuantity: entry.quantityFoil
        });
      }
    });

    // Build CSV content with Dreamborn format headers
    const headers = 'Normal,Foil,Name,Set,Card Number,Color,Rarity,Price,Foil Price';
    const rows: string[] = [headers];

    cardMap.forEach(({ card, normalQuantity, foilQuantity }) => {
      // Only include cards with quantities > 0
      if (normalQuantity > 0 || foilQuantity > 0) {
        // Format card number for display
        let displayCardNumber = card.number.toString();
        if (card.promoGrouping) {
          // For promo cards, use the promo grouping as the set and include promo number
          displayCardNumber = card.promoGrouping.includes('/') ? card.promoGrouping : displayCardNumber;
        }

        // Escape quotes in card names and wrap in quotes if needed
        const escapedName = card.fullName.includes(',') || card.fullName.includes('"')
          ? `"${card.fullName.replace(/"/g, '""')}"`
          : card.fullName;

        const set = card.promoGrouping || card.setCode;
        const color = card.color || '';
        const rarity = card.rarity || '';

        const row = `${normalQuantity},${foilQuantity},${escapedName},${set},${displayCardNumber},${color},${rarity},,`;
        rows.push(row);
      }
    });

    return rows.join('\n');
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

      // Batch the upserts to handle large collections (Supabase has limits on bulk operations)
      const BATCH_SIZE = 1000;
      const batches = [];

      for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
        batches.push(upserts.slice(i, i + BATCH_SIZE));
      }

      console.log(`Processing ${upserts.length} cards in ${batches.length} batches of ${BATCH_SIZE}`);

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} cards)`);

        const { error } = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .upsert(batch, { onConflict: 'user_id,card_id' });

        if (error) {
          console.error(`Database upsert error in batch ${i + 1}:`, error);
          setSyncStatus('error');
          return false;
        }
      }

      console.log('All batches processed successfully');

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
    exportCollectionCSV,
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
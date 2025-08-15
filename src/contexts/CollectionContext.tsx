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
  clearCollection: () => Promise<void>;
  syncStatus: 'idle' | 'loading' | 'error' | 'offline';
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

interface CollectionProviderProps {
  children: ReactNode;
}

export const CollectionProvider: React.FC<CollectionProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [collection, setCollection] = useState<CollectionCardEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'error' | 'offline'>('idle');
  
  // Batch sync state
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, {quantityNormal: number, quantityFoil: number}>>(new Map());
  const [syncTimeout, setSyncTimeout] = useState<NodeJS.Timeout | null>(null);

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
      const { data, error } = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading collection:', error);
        setSyncStatus('error');
        setCollection([]);
      } else {
        // Convert database format to internal format
        const converted = data.map((item: UserCollection) => ({
          cardId: item.card_id,
          quantityNormal: item.quantity_normal || 0,
          quantityFoil: item.quantity_foil || 0
        }));
        
        setCollection(converted);
        setSyncStatus('idle');
      }
    } catch (error) {
      console.error('Network error loading collection:', error);
      setSyncStatus('offline');
      setCollection([]);
    }
  };

  // Batch sync all pending updates
  const syncBatchToSupabase = async () => {
    if (!user || pendingUpdates.size === 0) return;
    
    setSyncStatus('loading');
    try {
      const updates = Array.from(pendingUpdates.entries());
      const upserts = [];
      const deletes = [];
      
      // Separate upserts from deletes
      for (const [cardId, {quantityNormal, quantityFoil}] of updates) {
        if (quantityNormal <= 0 && quantityFoil <= 0) {
          deletes.push(cardId);
        } else {
          upserts.push({
            user_id: user.id,
            card_id: cardId,
            quantity_normal: quantityNormal,
            quantity_foil: quantityFoil
          });
        }
      }
      
      // Batch upsert
      if (upserts.length > 0) {
        const { error } = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .upsert(upserts, { onConflict: 'user_id,card_id' });
          
        if (error) {
          console.error('Error batch upserting cards:', error);
          setSyncStatus('error');
          return;
        }
      }
      
      // Batch delete
      if (deletes.length > 0) {
        const { error } = await supabase
          .from(TABLES.USER_COLLECTIONS)
          .delete()
          .eq('user_id', user.id)
          .in('card_id', deletes);
          
        if (error) {
          console.error('Error batch deleting cards:', error);
          setSyncStatus('error');
          return;
        }
      }
      
      // Clear pending updates on success
      setPendingUpdates(new Map());
      setSyncStatus('idle');
      
    } catch (error) {
      console.error('Network error syncing batch:', error);
      setSyncStatus('offline');
    }
  };

  // Queue a card update for batching
  const queueCardUpdate = (cardId: number, quantityNormal: number, quantityFoil: number) => {
    if (!user) return;
    
    // Add to pending updates
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(cardId, { quantityNormal, quantityFoil });
      return newMap;
    });
    
    // Reset the debounce timer
    if (syncTimeout) clearTimeout(syncTimeout);
    const timeout = setTimeout(() => {
      syncBatchToSupabase();
    }, 2000); // 2 second debounce
    setSyncTimeout(timeout);
  };

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
        console.error('Invalid import format');
        return false;
      }
    } catch (error) {
      console.error('Error importing collection:', error);
      return false;
    }
  };

  const clearCollection = async () => {
    if (!user) return;
    
    setSyncStatus('loading');
    
    try {
      // Clear from database first
      const { error } = await supabase
        .from(TABLES.USER_COLLECTIONS)
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing collection from database:', error);
        setSyncStatus('error');
        return;
      }

      // Only clear local state if database deletion succeeded
      setCollection([]);
      setSyncStatus('idle');
      console.log('Collection cleared successfully');
      
    } catch (error) {
      console.error('Network error clearing collection:', error);
      setSyncStatus('offline');
    }
  };

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
    clearCollection,
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
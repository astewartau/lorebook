import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Deck, LorcanaCard, DeckSummary, DeckCard } from '../types';
import { validateDeck as validateDeckUtil } from '../utils/deckValidation';
import { supabase, UserDeck, TABLES } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { DECK_RULES } from '../constants';

interface DeckContextType {
  decks: Deck[];
  publicDecks: Deck[];
  currentDeck: Deck | null;
  isEditingDeck: boolean;
  loading: boolean;
  createDeck: (name: string, description?: string) => Promise<string>;
  createDeckAndStartEditing: (name: string, description?: string, initialCard?: LorcanaCard) => Promise<Deck>;
  deleteDeck: (deckId: string) => Promise<void>;
  duplicateDeck: (deckId: string) => Promise<string>;
  updateDeck: (deck: Deck) => Promise<void>;
  setCurrentDeck: (deck: Deck | null) => void;
  startEditingDeck: (deckId: string) => void;
  startEditingDeckObject: (deck: Deck) => void;
  stopEditingDeck: () => void;
  addCardToDeck: (card: LorcanaCard, deckId?: string) => boolean;
  removeCardFromDeck: (cardId: number, deckId?: string) => void;
  updateCardQuantity: (cardId: number, quantity: number, deckId?: string) => void;
  getDeckSummary: (deckId: string) => DeckSummary | null;
  validateDeck: (deck: Deck) => { isValid: boolean; errors: string[] };
  clearCurrentDeck: () => void;
  exportDeck: (deckId: string) => string;
  importDeck: (deckData: string) => Promise<boolean>;
  publishDeck: (deckId: string) => Promise<void>;
  unpublishDeck: (deckId: string) => Promise<void>;
  loadPublicDecks: (searchTerm?: string) => Promise<void>;
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

interface DeckProviderProps {
  children: ReactNode;
}

export const DeckProvider: React.FC<DeckProviderProps> = ({ children }) => {
  const { user, session } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [publicDecks, setPublicDecks] = useState<Deck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user's decks when authenticated
  useEffect(() => {
    if (user && session) {
      loadUserDecks();
    } else {
      setDecks([]);
      setCurrentDeck(null);
    }
  }, [user, session]);

  const loadUserDecks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_DECKS)
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading decks:', error);
      } else if (data) {
        const convertedDecks = data.map((d: UserDeck) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          cards: d.cards as DeckCard[],
          createdAt: new Date(d.created_at),
          updatedAt: new Date(d.updated_at),
          isPublic: d.is_public,
          userId: d.user_id,
          authorEmail: user.email
        }));
        setDecks(convertedDecks);
      }
    } catch (error) {
      console.error('Error loading decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicDecks = async (searchTerm?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from(TABLES.USER_DECKS)
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading public decks:', error);
        console.error('Query error details:', error.message);
      } else if (data) {
        // console.log('Found public decks:', data.length);
        const convertedDecks = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          cards: d.cards as DeckCard[],
          createdAt: new Date(d.created_at),
          updatedAt: new Date(d.updated_at),
          isPublic: d.is_public,
          userId: d.user_id,
          authorEmail: `User ${d.user_id.slice(0, 8)}...` // Show partial user ID instead
        }));
        setPublicDecks(convertedDecks);
      }
    } catch (error) {
      console.error('Error loading public decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async (name: string, description?: string): Promise<string> => {
    if (!user) throw new Error('Authentication required');
    
    const newDeck: Deck = {
      id: uuidv4(),
      name,
      description,
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      userId: user.id,
      authorEmail: user.email
    };

    try {
      const { error } = await supabase
        .from(TABLES.USER_DECKS)
        .insert({
          id: newDeck.id,
          user_id: user.id,
          name: newDeck.name,
          description: newDeck.description,
          cards: newDeck.cards,
          is_public: false
        });

      if (error) {
        console.error('Error creating deck:', error);
        throw error;
      }

      setDecks(prev => [...prev, newDeck]);
      return newDeck.id;
    } catch (error) {
      console.error('Error creating deck:', error);
      throw error;
    }
  };

  const createDeckAndStartEditing = async (name: string, description?: string, initialCard?: LorcanaCard): Promise<Deck> => {
    if (!user) throw new Error('Authentication required');
    
    const initialCards = initialCard ? [{ ...initialCard, quantity: 1 }] : [];
    
    const newDeck: Deck = {
      id: uuidv4(),
      name,
      description,
      cards: initialCards,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      userId: user.id,
      authorEmail: user.email
    };

    try {
      const { error } = await supabase
        .from(TABLES.USER_DECKS)
        .insert({
          id: newDeck.id,
          user_id: user.id,
          name: newDeck.name,
          description: newDeck.description,
          cards: newDeck.cards,
          is_public: false
        });

      if (error) {
        console.error('Error creating deck:', error);
        throw error;
      }

      setDecks(prev => [...prev, newDeck]);
      setCurrentDeck(newDeck);
      setIsEditingDeck(true);
      return newDeck;
    } catch (error) {
      console.error('Error creating deck:', error);
      throw error;
    }
  };

  const updateDeck = async (deck: Deck): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    
    try {
      const { error } = await supabase
        .from(TABLES.USER_DECKS)
        .update({
          name: deck.name,
          description: deck.description,
          cards: deck.cards,
          is_public: deck.isPublic || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deck.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating deck:', error);
        throw error;
      }

      setDecks(prev => prev.map(d => d.id === deck.id ? deck : d));
      if (currentDeck?.id === deck.id) {
        setCurrentDeck(deck);
      }
    } catch (error) {
      console.error('Error updating deck:', error);
      throw error;
    }
  };

  const deleteDeck = async (deckId: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');
    
    try {
      const { error } = await supabase
        .from(TABLES.USER_DECKS)
        .delete()
        .eq('id', deckId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting deck:', error);
        throw error;
      }

      setDecks(prev => prev.filter(d => d.id !== deckId));
      if (currentDeck?.id === deckId) {
        setCurrentDeck(null);
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }
  };

  const duplicateDeck = async (deckId: string): Promise<string> => {
    const deckToDuplicate = decks.find(d => d.id === deckId);
    if (!deckToDuplicate) throw new Error('Deck not found');
    
    const newName = `${deckToDuplicate.name} (Copy)`;
    const newId = await createDeck(newName, deckToDuplicate.description);
    
    const newDeck = decks.find(d => d.id === newId);
    if (newDeck) {
      newDeck.cards = [...deckToDuplicate.cards];
      await updateDeck(newDeck);
    }
    
    return newId;
  };

  const publishDeck = async (deckId: string): Promise<void> => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) throw new Error('Deck not found');
    
    deck.isPublic = true;
    await updateDeck(deck);
  };

  const unpublishDeck = async (deckId: string): Promise<void> => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) throw new Error('Deck not found');
    
    deck.isPublic = false;
    await updateDeck(deck);
  };

  const startEditingDeck = (deckId: string): void => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;
    
    setCurrentDeck(deck);
    setIsEditingDeck(true);
  };

  const startEditingDeckObject = (deck: Deck): void => {
    setCurrentDeck(deck);
    setIsEditingDeck(true);
  };

  const stopEditingDeck = (): void => {
    setIsEditingDeck(false);
    setCurrentDeck(null);
  };

  const addCardToDeck = (card: LorcanaCard, deckId?: string): boolean => {
    const targetDeck = deckId ? decks.find(d => d.id === deckId) : currentDeck;
    if (!targetDeck) return false;

    const existingCard = targetDeck.cards.find(c => c.id === card.id);
    
    if (existingCard) {
      if (existingCard.quantity >= DECK_RULES.MAX_COPIES_PER_CARD) return false;
      existingCard.quantity++;
    } else {
      targetDeck.cards.push({ ...card, quantity: 1 });
    }

    targetDeck.updatedAt = new Date();
    updateDeck(targetDeck);
    return true;
  };

  const removeCardFromDeck = (cardId: number, deckId?: string): void => {
    const targetDeck = deckId ? decks.find(d => d.id === deckId) : currentDeck;
    if (!targetDeck) return;

    targetDeck.cards = targetDeck.cards.filter(c => c.id !== cardId);
    targetDeck.updatedAt = new Date();
    updateDeck(targetDeck);
  };

  const updateCardQuantity = (cardId: number, quantity: number, deckId?: string): void => {
    const targetDeck = deckId ? decks.find(d => d.id === deckId) : currentDeck;
    if (!targetDeck) return;

    const card = targetDeck.cards.find(c => c.id === cardId);
    if (!card) return;

    if (quantity <= 0) {
      removeCardFromDeck(cardId, deckId);
    } else if (quantity <= 4) {
      card.quantity = quantity;
      targetDeck.updatedAt = new Date();
      updateDeck(targetDeck);
    }
  };

  const getDeckSummary = (deckId: string): DeckSummary | null => {
    const deck = decks.find(d => d.id === deckId) || publicDecks.find(d => d.id === deckId);
    if (!deck) return null;

    const inkDistribution: Record<string, number> = {};
    deck.cards.forEach(card => {
      // Split dual-ink colors (e.g., "Amber-Amethyst" -> ["Amber", "Amethyst"])
      const colors = card.color.includes('-') ? card.color.split('-') : [card.color];
      colors.forEach(color => {
        if (!inkDistribution[color]) {
          inkDistribution[color] = 0;
        }
        inkDistribution[color] += card.quantity;
      });
    });

    const validation = validateDeckUtil(deck);

    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cardCount: deck.cards.reduce((sum, card) => sum + card.quantity, 0),
      inkDistribution,
      isValid: validation.isValid,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt
    };
  };

  const validateDeck = (deck: Deck): { isValid: boolean; errors: string[] } => {
    return validateDeckUtil(deck);
  };

  const clearCurrentDeck = (): void => {
    setCurrentDeck(null);
  };

  const exportDeck = (deckId: string): string => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return '';

    const deckData = {
      name: deck.name,
      description: deck.description,
      cards: deck.cards.map(card => ({
        id: card.id,
        name: card.name,
        quantity: card.quantity
      }))
    };

    return JSON.stringify(deckData, null, 2);
  };

  const importDeck = async (deckData: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(deckData);
      if (!parsed.name || !parsed.cards) return false;

      const newId = await createDeck(parsed.name, parsed.description);
      const newDeck = decks.find(d => d.id === newId);
      
      if (newDeck && parsed.cards) {
        // Map imported cards to actual card data
        newDeck.cards = parsed.cards;
        await updateDeck(newDeck);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing deck:', error);
      return false;
    }
  };

  const value: DeckContextType = {
    decks,
    publicDecks,
    currentDeck,
    isEditingDeck,
    loading,
    createDeck,
    createDeckAndStartEditing,
    deleteDeck,
    duplicateDeck,
    updateDeck,
    setCurrentDeck,
    startEditingDeck,
    startEditingDeckObject,
    stopEditingDeck,
    addCardToDeck,
    removeCardFromDeck,
    updateCardQuantity,
    getDeckSummary,
    validateDeck,
    clearCurrentDeck,
    exportDeck,
    importDeck,
    publishDeck,
    unpublishDeck,
    loadPublicDecks
  };

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
};

export const useDeck = (): DeckContextType => {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
};
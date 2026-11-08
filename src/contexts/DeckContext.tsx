import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Deck, LorcanaCard, DeckSummary, DeckCardEntry } from '../types';
import { validateDeck as validateDeckUtil, maxCopiesFor, copiesByName } from '../utils/deckValidation';
import * as api from '../lib/api';
import { useAuth } from './AuthContext';
import { useCardData } from './CardDataContext';
import { useToast } from './ToastContext';

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
  /** A deck by id: yours or loaded already, else fetched (public decks). */
  fetchDeck: (deckId: string) => Promise<Deck | null>;
  setCurrentDeck: (deck: Deck | null) => void;
  startEditingDeck: (deckId: string) => void;
  startEditingDeckObject: (deck: Deck) => void;
  stopEditingDeck: () => void;
  addCardToDeck: (card: LorcanaCard, deckId?: string) => boolean;
  removeCardFromDeck: (cardId: number, deckId?: string) => void;
  updateCardQuantity: (cardId: number, quantity: number, deckId?: string) => void;
  setDeckCards: (cards: DeckCardEntry[], deckId?: string) => void;
  getDeckSummary: (deckId: string) => DeckSummary | null;
  validateDeck: (deck: Deck) => { isValid: boolean; errors: string[] };
  clearCurrentDeck: () => void;
  exportDeck: (deckId: string) => string;
  importDeck: (deckData: string) => Promise<boolean>;
  publishDeck: (deckId: string) => Promise<void>;
  unpublishDeck: (deckId: string) => Promise<void>;
  loadPublicDecks: (searchTerm?: string) => Promise<void>;
  loadMorePublicDecks: () => Promise<void>;
  hasMorePublicDecks: boolean;
  publicDecksLoading: boolean;
  allUserTags: string[];
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

const SAVE_DELAY_MS = 500;
const EDITING_KEY = 'lorebook-editing-deck';

function storedEditingDeck(): string | null {
  try {
    return sessionStorage.getItem(EDITING_KEY);
  } catch {
    return null;
  }
}

function storeEditingDeck(deckId: string | null) {
  try {
    if (deckId) sessionStorage.setItem(EDITING_KEY, deckId);
    else sessionStorage.removeItem(EDITING_KEY);
  } catch {
    // Not persisted; editing still works for this page load.
  }
}
const PUBLIC_DECKS_PAGE_SIZE = 50;

export const DeckProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { allCards, cardsById } = useCardData();
  const { warning: toastWarning, error: toastError } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [publicDecks, setPublicDecks] = useState<Deck[]>([]);
  // Editing survives a reload of the tab.
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(storedEditingDeck);
  const [viewedDeck, setViewedDeck] = useState<Deck | null>(null);
  const [isEditingDeck, setIsEditingDeck] = useState(() => storedEditingDeck() !== null);

  useEffect(() => {
    storeEditingDeck(isEditingDeck ? currentDeckId : null);
  }, [isEditingDeck, currentDeckId]);
  const [loading, setLoading] = useState(false);
  const [hasMorePublicDecks, setHasMorePublicDecks] = useState(false);
  const [publicDecksLoading, setPublicDecksLoading] = useState(false);
  const publicQueryRef = useRef<{ search?: string; offset: number }>({ offset: 0 });

  // Latest decks for rapid card operations, and save timers per deck.
  const decksRef = useRef<Deck[]>([]);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savingRef = useRef<Record<string, Promise<void> | undefined>>({});

  const commit = useCallback((next: Deck[]) => {
    decksRef.current = next;
    setDecks(next);
  }, []);

  const replaceDeck = useCallback((deck: Deck) => {
    commit(decksRef.current.map(d => (d.id === deck.id ? deck : d)));
  }, [commit]);

  const reloadDeck = useCallback(async (deckId: string) => {
    const fresh = await api.getDeck(deckId);
    if (fresh) replaceDeck(fresh);
    return fresh;
  }, [replaceDeck]);

  // Saves a deck's cards, guarded by the version we last saw. If another tab
  // or device saved in between, reload instead of overwriting their changes.
  const saveCards = useCallback(async (deckId: string) => {
    await savingRef.current[deckId];
    const deck = decksRef.current.find(d => d.id === deckId);
    if (!deck) return;
    const run = (async () => {
      try {
        const version = await api.saveDeckCards(deck.id, deck.cards, deck.version);
        const latest = decksRef.current.find(d => d.id === deckId);
        if (latest) replaceDeck({ ...latest, version });
      } catch (error) {
        if (error instanceof api.ApiError && error.isVersionConflict) {
          toastWarning(`"${deck.name}" was changed somewhere else, so it has been reloaded.`);
          await reloadDeck(deckId);
        } else {
          console.error('Saving deck failed:', error);
          toastError(`Couldn't save "${deck.name}". Your changes are still here; try again.`);
        }
      }
    })();
    savingRef.current[deckId] = run;
    await run;
    savingRef.current[deckId] = undefined;
  }, [replaceDeck, reloadDeck, toastWarning, toastError]);

  const scheduleSave = useCallback((deckId: string) => {
    clearTimeout(saveTimersRef.current[deckId]);
    saveTimersRef.current[deckId] = setTimeout(() => {
      delete saveTimersRef.current[deckId];
      saveCards(deckId);
    }, SAVE_DELAY_MS);
  }, [saveCards]);

  const flushSaves = useCallback(() => {
    for (const deckId of Object.keys(saveTimersRef.current)) {
      clearTimeout(saveTimersRef.current[deckId]);
      delete saveTimersRef.current[deckId];
      saveCards(deckId);
    }
  }, [saveCards]);

  // Save straight away when the tab is hidden or closed.
  const flushRef = useRef(flushSaves);
  flushRef.current = flushSaves;
  useEffect(() => {
    const flushNow = () => flushRef.current();
    const onHide = () => { if (document.visibilityState === 'hidden') flushNow(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushNow);
      flushNow();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      commit([]);
      setCurrentDeckId(null);
      setIsEditingDeck(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getUserDecks(userId)
      .then(rows => {
        if (cancelled) return;
        commit(rows);
        // Stop editing a deck that no longer exists.
        setCurrentDeckId(id => (id && !rows.some(d => d.id === id) ? null : id));
        setIsEditingDeck(editing => editing && rows.some(d => d.id === storedEditingDeck()));
      })
      .catch(error => console.error('Loading decks failed:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, authLoading, commit]);

  const fetchPublicPage = useCallback(async (search: string | undefined, offset: number, append: boolean) => {
    setPublicDecksLoading(true);
    try {
      const rows = await api.searchPublicDecks({ search, offset, limit: PUBLIC_DECKS_PAGE_SIZE });
      publicQueryRef.current = { search, offset: offset + rows.length };
      setPublicDecks(prev => (append ? [...prev, ...rows] : rows));
      setHasMorePublicDecks(rows.length >= PUBLIC_DECKS_PAGE_SIZE);
    } catch (error) {
      console.error('Loading public decks failed:', error);
      toastError("Couldn't load community decks.");
    } finally {
      setPublicDecksLoading(false);
    }
  }, [toastError]);

  const loadPublicDecks = useCallback((search?: string) => fetchPublicPage(search, 0, false), [fetchPublicPage]);

  const loadMorePublicDecks = useCallback(async () => {
    if (publicDecksLoading || !hasMorePublicDecks) return;
    await fetchPublicPage(publicQueryRef.current.search, publicQueryRef.current.offset, true);
  }, [fetchPublicPage, publicDecksLoading, hasMorePublicDecks]);

  const findDeck = useCallback((deckId: string) =>
    decksRef.current.find(d => d.id === deckId) ?? publicDecks.find(d => d.id === deckId)
      ?? (viewedDeck?.id === deckId ? viewedDeck : undefined), [publicDecks, viewedDeck]);

  const fetchDeck = useCallback(async (deckId: string) => {
    const known = findDeck(deckId);
    if (known) return known;
    try {
      const deck = await api.getDeck(deckId);
      setViewedDeck(deck);
      return deck;
    } catch (error) {
      console.error('Loading deck failed:', error);
      return null;
    }
  }, [findDeck]);

  const requireUser = useCallback(() => {
    if (!userId) throw new Error('Authentication required');
  }, [userId]);

  const insertDeck = useCallback(async (d: Parameters<typeof api.createDeck>[0]) => {
    requireUser();
    const deck = await api.createDeck(d);
    commit([deck, ...decksRef.current]);
    return deck;
  }, [commit, requireUser]);

  const createDeck = useCallback(async (name: string, description?: string) =>
    (await insertDeck({ name, description })).id, [insertDeck]);

  const createDeckAndStartEditing = useCallback(async (name: string, description?: string, initialCard?: LorcanaCard) => {
    const deck = await insertDeck({
      name,
      description,
      cards: initialCard ? [{ cardId: initialCard.id, quantity: 1 }] : [],
    });
    setCurrentDeckId(deck.id);
    setIsEditingDeck(true);
    return deck;
  }, [insertDeck]);

  const duplicateDeck = useCallback(async (deckId: string) => {
    const source = findDeck(deckId);
    if (!source) throw new Error('Deck not found');
    const deck = await insertDeck({
      name: `${source.name} (Copy)`,
      description: source.description,
      tags: source.tags,
      cards: source.cards,
      avatar: source.avatar,
    });
    return deck.id;
  }, [findDeck, insertDeck]);

  const updateDeck = useCallback(async (deck: Deck) => {
    requireUser();
    const previous = decksRef.current.find(d => d.id === deck.id);
    if (!previous) throw new Error('Deck not found');
    replaceDeck({ ...deck, version: previous.version, updatedAt: new Date() });
    try {
      await api.updateDeckMeta(deck.id, {
        name: deck.name,
        description: deck.description,
        tags: deck.tags ?? [],
        avatar: deck.avatar,
        isPublic: deck.isPublic ?? false,
      });
      if (deck.cards !== previous.cards) {
        clearTimeout(saveTimersRef.current[deck.id]);
        delete saveTimersRef.current[deck.id];
        await saveCards(deck.id);
      }
    } catch (error) {
      replaceDeck(previous);
      throw error;
    }
  }, [replaceDeck, requireUser, saveCards]);

  const deleteDeck = useCallback(async (deckId: string) => {
    requireUser();
    clearTimeout(saveTimersRef.current[deckId]);
    delete saveTimersRef.current[deckId];
    await api.deleteDeck(deckId);
    commit(decksRef.current.filter(d => d.id !== deckId));
    setCurrentDeckId(id => (id === deckId ? null : id));
  }, [commit, requireUser]);

  const publishDeck = useCallback(async (deckId: string) => {
    const deck = decksRef.current.find(d => d.id === deckId);
    if (!deck) throw new Error('Deck not found');
    await updateDeck({ ...deck, isPublic: true });
  }, [updateDeck]);

  const unpublishDeck = useCallback(async (deckId: string) => {
    const deck = decksRef.current.find(d => d.id === deckId);
    if (!deck) throw new Error('Deck not found');
    await updateDeck({ ...deck, isPublic: false });
  }, [updateDeck]);

  const startEditingDeck = useCallback((deckId: string) => {
    if (!decksRef.current.some(d => d.id === deckId)) return;
    setCurrentDeckId(deckId);
    setIsEditingDeck(true);
  }, []);

  const startEditingDeckObject = useCallback((deck: Deck) => startEditingDeck(deck.id), [startEditingDeck]);

  const stopEditingDeck = useCallback(() => {
    flushSaves();
    setIsEditingDeck(false);
    setCurrentDeckId(null);
  }, [flushSaves]);

  // Card operations: change the deck locally right away, save shortly after.
  const editCards = useCallback((deckId: string | undefined, edit: (cards: DeckCardEntry[]) => DeckCardEntry[] | null) => {
    const id = deckId ?? currentDeckId;
    const deck = id ? decksRef.current.find(d => d.id === id) : undefined;
    if (!deck) return false;
    const cards = edit(deck.cards);
    if (!cards) return false;
    replaceDeck({ ...deck, cards, updatedAt: new Date() });
    scheduleSave(deck.id);
    return true;
  }, [currentDeckId, replaceDeck, scheduleSave]);

  const addCardToDeck = useCallback((card: LorcanaCard, deckId?: string) =>
    editCards(deckId, cards => {
      if (copiesByName(cards, cardsById, card.fullName) >= maxCopiesFor(card)) return null;
      return cards.some(c => c.cardId === card.id)
        ? cards.map(c => (c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c))
        : [...cards, { cardId: card.id, quantity: 1 }];
    }), [editCards, cardsById]);

  const removeCardFromDeck = useCallback((cardId: number, deckId?: string) => {
    editCards(deckId, cards => cards.filter(c => c.cardId !== cardId));
  }, [editCards]);

  const updateCardQuantity = useCallback((cardId: number, quantity: number, deckId?: string) => {
    editCards(deckId, cards => {
      const entry = cards.find(c => c.cardId === cardId);
      if (!entry) return null;
      if (quantity <= 0) return cards.filter(c => c.cardId !== cardId);
      const card = cardsById.get(cardId);
      const others = card ? copiesByName(cards, cardsById, card.fullName) - entry.quantity : 0;
      if (card && others + quantity > maxCopiesFor(card)) return null;
      return cards.map(c => (c.cardId === cardId ? { ...c, quantity } : c));
    });
  }, [editCards, cardsById]);

  const setDeckCards = useCallback((cards: DeckCardEntry[], deckId?: string) => {
    editCards(deckId, () => cards);
  }, [editCards]);

  const allUserTags = useMemo(() => {
    const tags = new Set<string>();
    decks.forEach(d => (d.tags ?? []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [decks]);

  const validateDeck = useCallback((deck: Deck) => validateDeckUtil(deck, allCards), [allCards]);

  const getDeckSummary = useCallback((deckId: string): DeckSummary | null => {
    const deck = findDeck(deckId);
    if (!deck) return null;
    const inkDistribution: Record<string, number> = {};
    for (const entry of deck.cards) {
      const card = cardsById.get(entry.cardId);
      if (!card || !card.color) continue;
      for (const color of card.color.split('-')) {
        inkDistribution[color] = (inkDistribution[color] ?? 0) + entry.quantity;
      }
    }
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cardCount: deck.cards.reduce((sum, e) => sum + e.quantity, 0),
      inkDistribution,
      isValid: validateDeckUtil(deck, allCards).isValid,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
  }, [findDeck, cardsById, allCards]);

  const exportDeck = useCallback((deckId: string) => {
    const deck = findDeck(deckId);
    if (!deck) return '';
    return JSON.stringify({
      name: deck.name,
      description: deck.description,
      tags: deck.tags ?? [],
      cards: deck.cards.map(e => ({
        id: e.cardId,
        name: cardsById.get(e.cardId)?.fullName ?? 'Unknown Card',
        quantity: e.quantity,
      })),
    }, null, 2);
  }, [findDeck, cardsById]);

  const importDeck = useCallback(async (deckData: string) => {
    try {
      const parsed = JSON.parse(deckData);
      if (!parsed.name || !Array.isArray(parsed.cards)) return false;
      await insertDeck({
        name: parsed.name,
        description: parsed.description,
        tags: parsed.tags ?? [],
        cards: parsed.cards
          .map((c: { id?: number; cardId?: number; quantity: number }) => ({ cardId: c.cardId ?? c.id, quantity: c.quantity }))
          .filter((c: DeckCardEntry) => cardsById.has(c.cardId) && c.quantity > 0),
      });
      return true;
    } catch (error) {
      console.error('Importing deck failed:', error);
      return false;
    }
  }, [insertDeck, cardsById]);

  const currentDeck = useMemo(() => decks.find(d => d.id === currentDeckId) ?? null, [decks, currentDeckId]);

  const setCurrentDeck = useCallback((deck: Deck | null) => {
    if (deck && !decksRef.current.some(d => d.id === deck.id)) setViewedDeck(deck);
    setCurrentDeckId(deck?.id ?? null);
  }, []);

  const clearCurrentDeck = useCallback(() => setCurrentDeckId(null), []);

  const value = useMemo<DeckContextType>(() => ({
    decks,
    publicDecks,
    currentDeck: currentDeck ?? (viewedDeck && viewedDeck.id === currentDeckId ? viewedDeck : null),
    isEditingDeck,
    loading,
    createDeck,
    createDeckAndStartEditing,
    deleteDeck,
    duplicateDeck,
    updateDeck,
    fetchDeck,
    setCurrentDeck,
    startEditingDeck,
    startEditingDeckObject,
    stopEditingDeck,
    addCardToDeck,
    removeCardFromDeck,
    updateCardQuantity,
    setDeckCards,
    getDeckSummary,
    validateDeck,
    clearCurrentDeck,
    exportDeck,
    importDeck,
    publishDeck,
    unpublishDeck,
    loadPublicDecks,
    loadMorePublicDecks,
    hasMorePublicDecks,
    publicDecksLoading,
    allUserTags,
  }), [decks, publicDecks, currentDeck, viewedDeck, currentDeckId, isEditingDeck, loading, createDeck,
    createDeckAndStartEditing, deleteDeck, duplicateDeck, updateDeck, fetchDeck, setCurrentDeck, startEditingDeck,
    startEditingDeckObject, stopEditingDeck, addCardToDeck, removeCardFromDeck, updateCardQuantity, setDeckCards,
    getDeckSummary, validateDeck, clearCurrentDeck, exportDeck, importDeck, publishDeck, unpublishDeck,
    loadPublicDecks, loadMorePublicDecks, hasMorePublicDecks, publicDecksLoading, allUserTags]);

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
};

export const useDeck = (): DeckContextType => {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
};

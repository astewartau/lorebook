import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { CustomBinder, BinderCardEntry } from '../types';
import * as api from '../lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface BinderContextType {
  /** Your custom binders. */
  binders: CustomBinder[];
  /** Set codes of your published set binders. */
  publishedSets: ReadonlySet<string>;
  currentBinder: CustomBinder | null;
  loading: boolean;
  setCurrentBinder: (binder: CustomBinder | null) => void;
  createBinder: (name: string, description?: string) => Promise<CustomBinder>;
  deleteBinder: (binderId: string) => Promise<void>;
  updateBinder: (binder: CustomBinder) => Promise<void>;
  addCardToBinder: (binderId: string, cardId: number) => void;
  removeCardFromBinder: (binderId: string, cardId: number) => void;
  setCardQuantity: (binderId: string, cardId: number, quantity: number) => void;
  setBinderCards: (binderId: string, cards: BinderCardEntry[]) => void;
  /** Share or stop sharing the binder view of one set of your collection. */
  setSetBinderPublic: (setCode: string, setName: string, isPublic: boolean) => Promise<void>;
}

const BinderContext = createContext<BinderContextType | undefined>(undefined);

const SAVE_DELAY_MS = 500;

export const BinderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { warning: toastWarning, error: toastError } = useToast();
  const [all, setAll] = useState<CustomBinder[]>([]);
  const [currentBinderId, setCurrentBinderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allRef = useRef<CustomBinder[]>([]);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savingRef = useRef<Record<string, Promise<void> | undefined>>({});

  const commit = useCallback((next: CustomBinder[]) => {
    allRef.current = next;
    setAll(next);
  }, []);

  const replace = useCallback((binder: CustomBinder) => {
    commit(allRef.current.map(b => (b.id === binder.id ? binder : b)));
  }, [commit]);

  const reload = useCallback(async () => {
    if (!userId) return;
    commit(await api.getUserBinders(userId));
  }, [userId, commit]);

  useEffect(() => {
    if (!userId) {
      commit([]);
      setCurrentBinderId(null);
      return;
    }
    setLoading(true);
    reload()
      .catch(error => console.error('Loading binders failed:', error))
      .finally(() => setLoading(false));
  }, [userId, reload, commit]);

  const saveCards = useCallback(async (binderId: string) => {
    await savingRef.current[binderId];
    const binder = allRef.current.find(b => b.id === binderId);
    if (!binder) return;
    const run = (async () => {
      try {
        const version = await api.saveBinderCards(binder.id, binder.cards, binder.version);
        const latest = allRef.current.find(b => b.id === binderId);
        if (latest) replace({ ...latest, version });
      } catch (error) {
        if (error instanceof api.ApiError && error.isVersionConflict) {
          toastWarning(`"${binder.name}" was changed somewhere else, so it has been reloaded.`);
          await reload();
        } else {
          console.error('Saving binder failed:', error);
          toastError(`Couldn't save "${binder.name}". Try again.`);
        }
      }
    })();
    savingRef.current[binderId] = run;
    await run;
    savingRef.current[binderId] = undefined;
  }, [replace, reload, toastWarning, toastError]);

  const scheduleSave = useCallback((binderId: string) => {
    clearTimeout(saveTimersRef.current[binderId]);
    saveTimersRef.current[binderId] = setTimeout(() => {
      delete saveTimersRef.current[binderId];
      saveCards(binderId);
    }, SAVE_DELAY_MS);
  }, [saveCards]);

  const flushRef = useRef(() => {});
  flushRef.current = () => {
    for (const id of Object.keys(saveTimersRef.current)) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
      saveCards(id);
    }
  };
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

  const editCards = useCallback((binderId: string, edit: (cards: BinderCardEntry[]) => BinderCardEntry[] | null) => {
    const binder = allRef.current.find(b => b.id === binderId && b.kind === 'custom');
    if (!binder) return;
    const cards = edit(binder.cards);
    if (!cards) return;
    replace({ ...binder, cards, updatedAt: new Date() });
    scheduleSave(binderId);
  }, [replace, scheduleSave]);

  const addCardToBinder = useCallback((binderId: string, cardId: number) => editCards(binderId, cards =>
    cards.some(c => c.cardId === cardId)
      ? cards.map(c => (c.cardId === cardId ? { ...c, quantity: c.quantity + 1 } : c))
      : [...cards, { cardId, quantity: 1 }]), [editCards]);

  const removeCardFromBinder = useCallback((binderId: string, cardId: number) => editCards(binderId, cards => {
    const entry = cards.find(c => c.cardId === cardId);
    if (!entry) return null;
    return entry.quantity <= 1
      ? cards.filter(c => c.cardId !== cardId)
      : cards.map(c => (c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c));
  }), [editCards]);

  const setCardQuantity = useCallback((binderId: string, cardId: number, quantity: number) => editCards(binderId, cards =>
    quantity <= 0
      ? cards.filter(c => c.cardId !== cardId)
      : cards.some(c => c.cardId === cardId)
        ? cards.map(c => (c.cardId === cardId ? { ...c, quantity } : c))
        : [...cards, { cardId, quantity }]), [editCards]);

  const setBinderCards = useCallback((binderId: string, cards: BinderCardEntry[]) =>
    editCards(binderId, () => cards), [editCards]);

  const createBinder = useCallback(async (name: string, description?: string) => {
    if (!userId) throw new Error('Authentication required');
    const binder = await api.createBinder(userId, { kind: 'custom', name, description });
    commit([binder, ...allRef.current]);
    return binder;
  }, [userId, commit]);

  const deleteBinder = useCallback(async (binderId: string) => {
    clearTimeout(saveTimersRef.current[binderId]);
    delete saveTimersRef.current[binderId];
    await api.deleteBinder(binderId);
    commit(allRef.current.filter(b => b.id !== binderId));
    setCurrentBinderId(id => (id === binderId ? null : id));
  }, [commit]);

  const updateBinder = useCallback(async (binder: CustomBinder) => {
    const previous = allRef.current.find(b => b.id === binder.id);
    if (!previous) throw new Error('Binder not found');
    replace({ ...binder, version: previous.version, updatedAt: new Date() });
    try {
      await api.updateBinderMeta(binder.id, { name: binder.name, description: binder.description, isPublic: binder.isPublic });
      if (binder.cards !== previous.cards) {
        clearTimeout(saveTimersRef.current[binder.id]);
        delete saveTimersRef.current[binder.id];
        await saveCards(binder.id);
      }
    } catch (error) {
      replace(previous);
      throw error;
    }
  }, [replace, saveCards]);

  const setSetBinderPublic = useCallback(async (setCode: string, setName: string, isPublic: boolean) => {
    if (!userId) throw new Error('Authentication required');
    const existing = allRef.current.find(b => b.kind === 'set' && b.setCode === setCode);
    if (existing) {
      await api.updateBinderMeta(existing.id, { isPublic });
      replace({ ...existing, isPublic });
    } else if (isPublic) {
      const binder = await api.createBinder(userId, { kind: 'set', setCode, name: setName, isPublic: true });
      commit([binder, ...allRef.current]);
    }
  }, [userId, replace, commit]);

  const binders = useMemo(() => all.filter(b => b.kind === 'custom'), [all]);
  const publishedSets = useMemo(
    () => new Set(all.filter(b => b.kind === 'set' && b.isPublic).map(b => b.setCode!)),
    [all]
  );
  const currentBinder = useMemo(() => binders.find(b => b.id === currentBinderId) ?? null, [binders, currentBinderId]);
  const setCurrentBinder = useCallback((b: CustomBinder | null) => setCurrentBinderId(b?.id ?? null), []);

  const value = useMemo<BinderContextType>(() => ({
    binders,
    publishedSets,
    currentBinder,
    loading,
    setCurrentBinder,
    createBinder,
    deleteBinder,
    updateBinder,
    addCardToBinder,
    removeCardFromBinder,
    setCardQuantity,
    setBinderCards,
    setSetBinderPublic,
  }), [binders, publishedSets, currentBinder, loading, setCurrentBinder, createBinder, deleteBinder, updateBinder,
    addCardToBinder, removeCardFromBinder, setCardQuantity, setBinderCards, setSetBinderPublic]);

  return <BinderContext.Provider value={value}>{children}</BinderContext.Provider>;
};

export const useBinder = (): BinderContextType => {
  const context = useContext(BinderContext);
  if (context === undefined) {
    throw new Error('useBinder must be used within a BinderProvider');
  }
  return context;
};

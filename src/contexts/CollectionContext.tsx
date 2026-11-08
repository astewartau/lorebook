import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { CollectionCardEntry } from '../types';
import * as api from '../lib/api';
import { useAuth } from './AuthContext';
import { useCardData } from './CardDataContext';
import { useProfile } from './ProfileContext';
import { exportCollectionToCSV } from '../utils/collectionExport';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'error';

interface Quantity {
  normal: number;
  foil: number;
}

interface CollectionContextType {
  /** The active collection (yours, or a household's you joined). */
  collectionId: string | null;
  collection: CollectionCardEntry[];
  getCardQuantity: (cardId: number) => { normal: number; foil: number; total: number };
  addCardToCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  removeCardFromCollection: (cardId: number, quantityNormal?: number, quantityFoil?: number) => void;
  setCardQuantity: (cardId: number, quantityNormal: number, quantityFoil: number) => void;
  totalCards: number;
  uniqueCards: number;
  exportCollection: () => string;
  exportCollectionCSV: () => string;
  importCollection: (data: string) => Promise<boolean>;
  importCollectionDirect: (cards: CollectionCardEntry[]) => Promise<boolean>;
  clearCollection: () => Promise<void>;
  reloadCollection: () => Promise<void>;
  syncStatus: SyncStatus;
  /** Number of cards with changes not yet saved. */
  pendingChanges: number;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

const FLUSH_DELAY_MS = 800;
const MAX_RETRY_MS = 60_000;
const REFRESH_AFTER_HIDDEN_MS = 30_000;
const ZERO: Quantity = { normal: 0, foil: 0 };

// Unsent changes survive a closed tab: they are kept in localStorage per
// collection and sent on the next load.
const outboxKey = (collectionId: string) => `lorebook-outbox:${collectionId}`;

function loadOutbox(collectionId: string): Map<number, Quantity> {
  try {
    const raw = localStorage.getItem(outboxKey(collectionId));
    if (raw) return new Map(JSON.parse(raw) as [number, Quantity][]);
  } catch {
    // Unavailable or corrupt storage: start empty.
  }
  return new Map();
}

function saveOutbox(collectionId: string, outbox: Map<number, Quantity>) {
  try {
    if (outbox.size) localStorage.setItem(outboxKey(collectionId), JSON.stringify(Array.from(outbox)));
    else localStorage.removeItem(outboxKey(collectionId));
  } catch {
    // Storage full or blocked: the in-memory outbox still works.
  }
}

function addDelta(outbox: Map<number, Quantity>, cardId: number, d: Quantity) {
  const prev = outbox.get(cardId) ?? ZERO;
  const next = { normal: prev.normal + d.normal, foil: prev.foil + d.foil };
  if (next.normal === 0 && next.foil === 0) outbox.delete(cardId);
  else outbox.set(cardId, next);
}

export const CollectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { userProfile } = useProfile();
  const { allCards } = useCardData();
  const collectionId = user ? userProfile?.activeCollectionId ?? null : null;

  const [quantities, setQuantities] = useState<ReadonlyMap<number, Quantity>>(new Map());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingChanges, setPendingChanges] = useState(0);

  // Refs hold the latest values for the sync loop, which runs outside renders.
  const quantitiesRef = useRef<Map<number, Quantity>>(new Map());
  const outboxRef = useRef<Map<number, Quantity>>(new Map());
  const collectionIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryMsRef = useRef(2000);
  const hiddenAtRef = useRef<number | null>(null);

  const publish = useCallback(() => {
    setQuantities(new Map(quantitiesRef.current));
    setPendingChanges(outboxRef.current.size);
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const cid = collectionIdRef.current;
    if (!cid || inFlightRef.current || outboxRef.current.size === 0) return;

    const batch = outboxRef.current;
    outboxRef.current = new Map();
    inFlightRef.current = true;
    setSyncStatus('saving');

    try {
      const result = await api.adjustCollection(cid, Array.from(batch, ([cardId, d]) => ({ cardId, ...d })));
      if (collectionIdRef.current !== cid) return;
      // Server values, plus anything changed locally since the batch left.
      for (const r of result) {
        const pending = outboxRef.current.get(r.cardId) ?? ZERO;
        const normal = Math.max(0, r.quantityNormal + pending.normal);
        const foil = Math.max(0, r.quantityFoil + pending.foil);
        if (normal || foil) quantitiesRef.current.set(r.cardId, { normal, foil });
        else quantitiesRef.current.delete(r.cardId);
      }
      saveOutbox(cid, outboxRef.current);
      retryMsRef.current = 2000;
      setSyncStatus('idle');
      publish();
    } catch (error) {
      console.error('Saving collection changes failed:', error);
      if (collectionIdRef.current === cid) {
        batch.forEach((d, cardId) => addDelta(outboxRef.current, cardId, d));
        saveOutbox(cid, outboxRef.current);
        setSyncStatus('error');
        const wait = retryMsRef.current;
        retryMsRef.current = Math.min(wait * 2, MAX_RETRY_MS);
        timerRef.current = setTimeout(flush, wait);
      }
    } finally {
      inFlightRef.current = false;
      if (outboxRef.current.size && !timerRef.current && collectionIdRef.current === cid) {
        timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    }
  }, [publish]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY_MS);
  }, [flush]);

  const load = useCallback(async () => {
    const cid = collectionIdRef.current;
    if (!cid) return;
    setSyncStatus('loading');
    try {
      const rows = await api.getCollectionCards(cid);
      if (collectionIdRef.current !== cid) return;
      const map = new Map<number, Quantity>();
      for (const r of rows) map.set(r.cardId, { normal: r.quantityNormal, foil: r.quantityFoil });
      // Unsaved local changes stay on top of what the server has.
      outboxRef.current.forEach((d, cardId) => {
        const q = map.get(cardId) ?? ZERO;
        const next = { normal: Math.max(0, q.normal + d.normal), foil: Math.max(0, q.foil + d.foil) };
        if (next.normal || next.foil) map.set(cardId, next);
        else map.delete(cardId);
      });
      quantitiesRef.current = map;
      setSyncStatus('idle');
      publish();
      if (outboxRef.current.size) scheduleFlush();
    } catch (error) {
      console.error('Loading collection failed:', error);
      if (collectionIdRef.current === cid) setSyncStatus('error');
    }
  }, [publish, scheduleFlush]);

  // Switch collections: send what is pending for the old one, start the new one.
  useEffect(() => {
    collectionIdRef.current = collectionId;
    quantitiesRef.current = new Map();
    outboxRef.current = collectionId ? loadOutbox(collectionId) : new Map();
    retryMsRef.current = 2000;
    publish();
    if (collectionId) load();
    else setSyncStatus('idle');
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const cid = collectionIdRef.current;
      const pending = outboxRef.current;
      if (cid && pending.size) {
        saveOutbox(cid, pending);
        api.adjustCollection(cid, Array.from(pending, ([cardId, d]) => ({ cardId, ...d })))
          .then(() => saveOutbox(cid, new Map()))
          .catch(() => { /* kept in localStorage; sent on next load */ });
      }
    };
  }, [collectionId, load, publish]);

  // Send changes when the tab is hidden; pick up other devices' changes on return.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        flush();
      } else if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > REFRESH_AFTER_HIDDEN_MS) {
        hiddenAtRef.current = null;
        if (!inFlightRef.current) load();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush, load]);

  // Warn before closing with unsent changes (they are also kept in localStorage).
  useEffect(() => {
    if (!pendingChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [pendingChanges]);

  const change = useCallback((cardId: number, target: (q: Quantity) => Quantity) => {
    const cid = collectionIdRef.current;
    if (!cid) return;
    const current = quantitiesRef.current.get(cardId) ?? ZERO;
    const t = target(current);
    const next = { normal: Math.max(0, t.normal), foil: Math.max(0, t.foil) };
    const delta = { normal: next.normal - current.normal, foil: next.foil - current.foil };
    if (!delta.normal && !delta.foil) return;
    if (next.normal || next.foil) quantitiesRef.current.set(cardId, next);
    else quantitiesRef.current.delete(cardId);
    addDelta(outboxRef.current, cardId, delta);
    saveOutbox(cid, outboxRef.current);
    publish();
    scheduleFlush();
  }, [publish, scheduleFlush]);

  const addCardToCollection = useCallback((cardId: number, n = 1, f = 0) =>
    change(cardId, q => ({ normal: q.normal + n, foil: q.foil + f })), [change]);
  const removeCardFromCollection = useCallback((cardId: number, n = 1, f = 0) =>
    change(cardId, q => ({ normal: q.normal - n, foil: q.foil - f })), [change]);
  const setCardQuantity = useCallback((cardId: number, normal: number, foil: number) =>
    change(cardId, () => ({ normal, foil })), [change]);

  const getCardQuantity = useCallback((cardId: number) => {
    const q = quantities.get(cardId) ?? ZERO;
    return { normal: q.normal, foil: q.foil, total: q.normal + q.foil };
  }, [quantities]);

  const collection = useMemo<CollectionCardEntry[]>(
    () => Array.from(quantities, ([cardId, q]) => ({ cardId, quantityNormal: q.normal, quantityFoil: q.foil })),
    [quantities]
  );

  const replaceAll = useCallback(async (cards: CollectionCardEntry[]) => {
    const cid = collectionIdRef.current;
    if (!cid) return false;
    setSyncStatus('saving');
    try {
      // Send pending edits first so the replacement is the last word.
      await flush();
      while (inFlightRef.current) await new Promise(r => setTimeout(r, 50));
      await api.replaceCollection(cid, cards);
      outboxRef.current = new Map();
      saveOutbox(cid, outboxRef.current);
      await load();
      return true;
    } catch (error) {
      console.error('Replacing collection failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [flush, load]);

  const exportCollection = useCallback(() => JSON.stringify({
    version: '2.0',
    timestamp: new Date().toISOString(),
    cards: collection.map(c => ({ cardId: c.cardId, normal: c.quantityNormal, foil: c.quantityFoil })),
  }, null, 2), [collection]);

  const exportCollectionCSV = useCallback(() => exportCollectionToCSV(collection, allCards), [collection, allCards]);

  const importCollection = useCallback(async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version !== '2.0' || !Array.isArray(parsed.cards)) return false;
      return await replaceAll(parsed.cards.map((c: { cardId: number; normal?: number; foil?: number }) => ({
        cardId: c.cardId,
        quantityNormal: c.normal || 0,
        quantityFoil: c.foil || 0,
      })));
    } catch {
      return false;
    }
  }, [replaceAll]);

  const clearCollection = useCallback(async () => {
    await replaceAll([]);
  }, [replaceAll]);

  const value = useMemo<CollectionContextType>(() => {
    let totalCards = 0;
    quantities.forEach(q => { totalCards += q.normal + q.foil; });
    return {
      collectionId,
      collection,
      getCardQuantity,
      addCardToCollection,
      removeCardFromCollection,
      setCardQuantity,
      totalCards,
      uniqueCards: quantities.size,
      exportCollection,
      exportCollectionCSV,
      importCollection,
      importCollectionDirect: replaceAll,
      clearCollection,
      reloadCollection: load,
      syncStatus,
      pendingChanges,
    };
  }, [collectionId, collection, quantities, getCardQuantity, addCardToCollection, removeCardFromCollection,
    setCardQuantity, exportCollection, exportCollectionCSV, importCollection, replaceAll, clearCollection,
    load, syncStatus, pendingChanges]);

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
};

export const useCollection = () => {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
};

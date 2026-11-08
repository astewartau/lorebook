import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from '../../lib/api';
import { useCardData } from '../../contexts/CardDataContext';
import { useToast } from '../../contexts/ToastContext';
import type { Deck, DeckCardEntry } from '../../types';
import { DraftAction, applyDraft, sameCards } from './draft';
import { useDeckCache } from './useDecks';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'retrying';

export const SAVE_DELAY_MS = 500;
const RETRY_MS = [2000, 5000, 10000, 30000];

export interface DeckDraft {
  deckId: string;
  cards: DeckCardEntry[];
  status: SaveStatus;
  dispatch: (a: DraftAction) => void;
  /** Save now (leaving the builder). */
  flush: () => Promise<void>;
}

/**
 * The builder's local copy of a deck's cards. Edits apply instantly and are
 * saved after a short pause with the version we loaded; if another tab or
 * device saved in between, the deck is reloaded instead of overwritten.
 */
export function useDeckDraft(deck: Deck): DeckDraft {
  const { cardsById } = useCardData();
  const toast = useToast();
  const cache = useDeckCache();

  const [cards, setCards] = useState(deck.cards);
  const [status, setStatus] = useState<SaveStatus>('saved');

  // Refs hold the truth for the async save loop.
  const cardsRef = useRef(deck.cards);
  const savedRef = useRef(deck.cards);
  const versionRef = useRef(deck.version ?? 1);
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const attempt = useRef(0);

  const dirty = () => !sameCards(cardsRef.current, savedRef.current);

  // A newer copy from the server (refetch on focus, another tab) replaces ours
  // only while we have nothing unsaved.
  useEffect(() => {
    const v = deck.version ?? 1;
    if (v > versionRef.current && !dirty() && !inFlight.current) {
      versionRef.current = v;
      savedRef.current = deck.cards;
      cardsRef.current = deck.cards;
      setCards(deck.cards);
    }
  }, [deck]);

  const save = useCallback(async (): Promise<void> => {
    clearTimeout(timer.current);
    if (inFlight.current) {
      await inFlight.current;
      if (dirty()) return save();
      return;
    }
    if (!dirty()) {
      setStatus('saved');
      return;
    }
    const sending = cardsRef.current;
    setStatus('saving');
    const run = (async () => {
      try {
        const version = await api.saveDeckCards(deckRef.current.id, sending, versionRef.current);
        versionRef.current = version;
        savedRef.current = sending;
        attempt.current = 0;
        cache.put({ ...deckRef.current, cards: sending, version, updatedAt: new Date() });
      } catch (e) {
        if (e instanceof api.ApiError && e.isVersionConflict) {
          const fresh = await api.getDeck(deckRef.current.id).catch(() => null);
          if (fresh) {
            versionRef.current = fresh.version ?? 1;
            savedRef.current = fresh.cards;
            cardsRef.current = fresh.cards;
            setCards(fresh.cards);
            cache.put(fresh);
          }
          toast.warning(`"${deckRef.current.name}" was changed in another tab or device, so it has been reloaded. Your last change wasn't saved.`, 8000);
          attempt.current = 0;
        } else {
          const wait = RETRY_MS[Math.min(attempt.current, RETRY_MS.length - 1)];
          attempt.current += 1;
          setStatus('retrying');
          timer.current = setTimeout(() => { void save(); }, wait);
          throw e;
        }
      }
    })();
    inFlight.current = run.catch(() => undefined).finally(() => { inFlight.current = null; });
    try {
      await run;
    } catch {
      return; // retry scheduled
    }
    if (dirty()) {
      setStatus('pending');
      timer.current = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
    } else {
      setStatus('saved');
    }
  }, [cache, toast]);

  const dispatch = useCallback((a: DraftAction) => {
    const next = applyDraft(cardsRef.current, a, cardsById);
    if (next === cardsRef.current) return;
    cardsRef.current = next;
    setCards(next);
    setStatus(s => (s === 'retrying' ? s : 'pending'));
    clearTimeout(timer.current);
    if (attempt.current === 0) timer.current = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
  }, [cardsById, save]);

  // Save straight away when the tab is hidden or closed, and on leaving.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const now = () => { if (dirty()) void saveRef.current(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') now(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', now);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', now);
      clearTimeout(timer.current);
      now();
    };
  }, []);

  // Warn before closing the tab while saving keeps failing.
  useEffect(() => {
    if (status !== 'retrying') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [status]);

  return { deckId: deck.id, cards, status, dispatch, flush: save };
}

/** Lets "add to deck" controls inside the builder edit its draft instead of the server copy. */
export const DeckDraftContext = createContext<DeckDraft | null>(null);
export const useActiveDraft = () => useContext(DeckDraftContext);

import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { Deck } from '../../types';
import { useDeckCache } from './useDecks';

export interface DeckMeta {
  name: string;
  description: string;
  tags: string[];
}

const DELAY = 700;

/** The builder's editable name, description and tags, saved after a pause. */
export function useDeckMeta(deck: Deck) {
  const toast = useToast();
  const cache = useDeckCache();
  const [meta, setMeta] = useState<DeckMeta>({ name: deck.name, description: deck.description ?? '', tags: deck.tags ?? [] });
  const [saving, setSaving] = useState(false);
  const pending = useRef<Partial<DeckMeta> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (!patch) return;
    pending.current = null;
    if (patch.name !== undefined && !patch.name.trim()) delete patch.name;
    if (!Object.keys(patch).length) return;
    const clean = { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 100) } : {}) };
    setSaving(true);
    try {
      await api.updateDeckMeta(deckRef.current.id, clean);
      cache.put({ ...deckRef.current, ...clean, updatedAt: new Date() });
    } catch (e) {
      toast.error(`Couldn't save the deck details: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [cache, toast]);

  const update = useCallback((patch: Partial<DeckMeta>) => {
    setMeta(m => ({ ...m, ...patch }));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, DELAY);
  }, [flush]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const now = () => { void flushRef.current(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') now(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', now);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', now);
      now();
    };
  }, []);

  return { meta, update, flush, saving };
}

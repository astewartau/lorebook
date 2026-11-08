import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { BinderCardEntry, CustomBinder } from '../../types';
import { sameCards } from './binderCards';

const SAVE_DELAY_MS = 800;
const RETRY_MS = 4000;

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

/**
 * A custom binder's cards, edited locally and saved shortly after each change
 * with the binder's version number. If someone else saved in between, the
 * latest version is loaded instead of overwriting it.
 */
export function useBinderEditor(binder: CustomBinder | undefined, reload: () => Promise<unknown>) {
  const qc = useQueryClient();
  const toast = useToast();
  const [cards, setCards] = useState<BinderCardEntry[]>([]);
  const [state, setState] = useState<SaveState>('saved');
  const saved = useRef<BinderCardEntry[]>([]);
  const version = useRef<number | undefined>(undefined);
  const current = useRef<BinderCardEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const binderId = binder?.id;

  // Take the server's copy when it loads or changes underneath us (and we have nothing unsaved).
  useEffect(() => {
    if (!binder) return;
    if (version.current !== undefined && binder.version <= version.current) return;
    if (version.current !== undefined && !sameCards(current.current, saved.current)) return;
    version.current = binder.version;
    saved.current = binder.cards;
    current.current = binder.cards;
    setCards(binder.cards);
    setState('saved');
  }, [binder]);

  const save = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!binderId || inFlight.current) return;
    const sending = current.current;
    if (sameCards(sending, saved.current)) {
      setState('saved');
      return;
    }
    inFlight.current = true;
    setState('saving');
    try {
      version.current = await api.saveBinderCards(binderId, sending, version.current);
      saved.current = sending;
      setState(sameCards(current.current, sending) ? 'saved' : 'pending');
      qc.invalidateQueries({ queryKey: ['binders'] });
    } catch (e) {
      if (e instanceof api.ApiError && e.isVersionConflict) {
        toast.warning('This binder was changed somewhere else, so the latest version has been loaded.');
        version.current = undefined;
        saved.current = [];
        current.current = [];
        await reload();
      } else {
        setState('error');
        timer.current = setTimeout(() => { void save(); }, RETRY_MS);
      }
    } finally {
      inFlight.current = false;
      if (!timer.current && !sameCards(current.current, saved.current)) {
        timer.current = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
      }
    }
  }, [binderId, qc, reload, toast]);

  const change = useCallback((fn: (list: BinderCardEntry[]) => BinderCardEntry[]) => {
    const next = fn(current.current);
    current.current = next;
    setCards(next);
    setState('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
  }, [save]);

  // Leaving the page sends what's pending.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (binderId && !sameCards(current.current, saved.current)) {
      api.saveBinderCards(binderId, current.current, version.current)
        .then(() => qc.invalidateQueries({ queryKey: ['binders'] }))
        .catch(() => { /* a conflict or failure here loses only the last moment's edits */ });
    }
  }, [binderId, qc]);

  useEffect(() => {
    if (state === 'saved') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state]);

  return { cards, change, state };
}

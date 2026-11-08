import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { useToast } from '../../contexts/ToastContext';
import type { Deck, LorcanaCard } from '../../types';
import { maxCopiesFor } from '../../utils/deckValidation';
import { DeckArt } from './DeckBits';
import { totalCards } from './deckLogic';
import { applyDeltas, applyDraft, copiesOfName, removeTarget } from './draft';
import { useActiveDraft } from './useDeckDraft';
import { useDeckActions, useUserDecks } from './useDecks';

const DELAY = 400;

/**
 * Quick edits to decks that aren't open in the builder. Each tap updates the
 * cached list at once; taps are batched per deck and saved with the version
 * guard. On a conflict the deck is re-read and the batch replayed onto it.
 */
function useQuickDeckEdits() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { cardsById } = useCardData();
  const toast = useToast();
  const deltas = useRef(new Map<string, Map<number, number>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<string, Promise<void>>());
  const listKey = keys.userDecks(user?.id ?? 'none');

  const readDeck = useCallback((id: string) => qc.getQueryData<Deck[]>(listKey)?.find(d => d.id === id), [qc, listKey]);
  const writeDeck = useCallback((id: string, patch: (d: Deck) => Deck) => {
    qc.setQueryData<Deck[]>(listKey, list => list?.map(d => (d.id === id ? patch(d) : d)));
  }, [qc, listKey]);

  const flush = useCallback((deckId: string) => {
    clearTimeout(timers.current.get(deckId));
    timers.current.delete(deckId);
    const batch = deltas.current.get(deckId);
    if (!batch?.size) return;
    deltas.current.delete(deckId);
    const run = async () => {
      const deck = readDeck(deckId);
      if (!deck) return;
      try {
        const version = await api.saveDeckCards(deckId, deck.cards, deck.version);
        writeDeck(deckId, d => ({ ...d, version, updatedAt: new Date() }));
      } catch (e) {
        if (e instanceof api.ApiError && e.isVersionConflict) {
          try {
            const fresh = await api.getDeck(deckId);
            if (!fresh) throw e;
            // Keep any taps made since this batch started, on top of the replayed batch.
            const later = deltas.current.get(deckId) ?? new Map();
            const cards = applyDeltas(applyDeltas(fresh.cards, batch, cardsById), later, cardsById);
            const version = await api.saveDeckCards(deckId, applyDeltas(fresh.cards, batch, cardsById), fresh.version);
            writeDeck(deckId, () => ({ ...fresh, cards, version, updatedAt: new Date() }));
          } catch (e2) {
            toast.error(`Couldn't update "${deck.name}": ${(e2 as Error).message}`);
            void qc.invalidateQueries({ queryKey: listKey });
          }
        } else {
          toast.error(`Couldn't update "${deck.name}": ${(e as Error).message}`);
          void qc.invalidateQueries({ queryKey: listKey });
        }
      }
      void qc.invalidateQueries({ queryKey: keys.deck(deckId) });
      void qc.invalidateQueries({ queryKey: ['decks', 'public'] });
    };
    const chain = (chains.current.get(deckId) ?? Promise.resolve()).then(run);
    chains.current.set(deckId, chain);
  }, [readDeck, writeDeck, cardsById, toast, qc, listKey]);

  const change = useCallback((deckId: string, card: LorcanaCard, delta: 1 | -1) => {
    const deck = readDeck(deckId);
    if (!deck) return;
    const target = delta > 0 ? card.id : removeTarget(deck.cards, cardsById, card);
    if (target === undefined) return;
    const next = applyDraft(deck.cards, { type: delta > 0 ? 'add' : 'remove', cardId: target }, cardsById);
    if (next === deck.cards) return;
    writeDeck(deckId, d => ({ ...d, cards: next }));
    const batch = deltas.current.get(deckId) ?? new Map<number, number>();
    batch.set(target, (batch.get(target) ?? 0) + delta);
    deltas.current.set(deckId, batch);
    clearTimeout(timers.current.get(deckId));
    timers.current.set(deckId, setTimeout(() => flush(deckId), DELAY));
  }, [readDeck, writeDeck, cardsById, flush]);

  // Save anything waiting when the sheet closes or the tab hides.
  const flushAll = useRef(() => {});
  flushAll.current = () => Array.from(deltas.current.keys()).forEach(flush);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushAll.current(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      flushAll.current();
    };
  }, []);

  return change;
}

function Row({ deck, count, max, onChange, active }: { deck: Deck; count: number; max: number; onChange: (d: 1 | -1) => void; active?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 h-12 px-2">
      <DeckArt deck={deck} className="h-8 w-8 rounded-full shrink-0" />
      <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0 leading-tight hover:text-accent">
        <span className="block truncate text-sm font-medium">{deck.name}</span>
        <span className="block text-xs text-muted tabular-nums">{active ? 'Open in the builder · ' : ''}{totalCards(deck.cards)} cards</span>
      </Link>
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" className="icon-btn h-9 w-9 disabled:opacity-30 disabled:pointer-events-none" aria-label={`Remove one from ${deck.name}`} disabled={count === 0} onClick={() => onChange(-1)}><Minus size={16} /></button>
        <span className={`w-9 text-center text-sm tabular-nums ${count ? 'font-semibold' : 'text-muted'}`} aria-label={`${count} in ${deck.name}`}>
          {count}{max !== Infinity && <span className="text-muted font-normal">/{max}</span>}
        </span>
        <button type="button" className="icon-btn h-9 w-9 disabled:opacity-30 disabled:pointer-events-none" aria-label={`Add one to ${deck.name}`} disabled={count >= max} onClick={() => onChange(1)}><Plus size={16} /></button>
      </div>
    </li>
  );
}

/** "Your decks" in the card detail: this card's count in each deck, with + and −, and a new deck with it. */
export function AddToDeck({ card }: { card: LorcanaCard }) {
  const { user } = useAuth();
  const { cardsById } = useCardData();
  const { data: decks, isLoading } = useUserDecks();
  const draft = useActiveDraft();
  const change = useQuickDeckEdits();
  const { create } = useDeckActions();
  const navigate = useNavigate();
  const [all, setAll] = useState(false);

  if (!user) return null;
  const max = maxCopiesFor(card);
  const list = [...(decks ?? [])].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  // The deck open in the builder comes first and edits its draft.
  if (draft) {
    const i = list.findIndex(d => d.id === draft.deckId);
    if (i > 0) list.unshift(...list.splice(i, 1));
  }
  const shown = all ? list : list.slice(0, 5);

  const newDeck = () => create.mutate({ name: `${card.name} deck`, cards: [{ cardId: card.id, quantity: 1 }] }, {
    onSuccess: deck => navigate(`/decks/${deck.id}/edit`),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="label">Your decks</h3>
        <span className="text-xs text-muted">{max === Infinity ? 'Any number per deck' : `Up to ${max} per deck, any printing`}</span>
      </div>
      {isLoading ? <p className="text-sm text-muted">Loading your decks…</p> : list.length > 0 && (
        <ul className="rounded-lg border border-line bg-surface divide-y divide-line">
          {shown.map(d => {
            const isDraft = draft?.deckId === d.id;
            const cards = isDraft ? draft.cards : d.cards;
            return (
              <Row key={d.id} deck={isDraft ? { ...d, cards } : d} count={copiesOfName(cards, cardsById, card)} max={max} active={isDraft}
                onChange={delta => {
                  if (isDraft) {
                    const target = delta > 0 ? card.id : removeTarget(cards, cardsById, card);
                    if (target !== undefined) draft.dispatch({ type: delta > 0 ? 'add' : 'remove', cardId: target });
                  } else {
                    change(d.id, card, delta);
                  }
                }} />
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn-ghost btn-sm -ml-2 h-9" disabled={create.isPending} onClick={newDeck}>
          <Plus size={16} />New deck with this card
        </button>
        {list.length > 5 && (
          <button type="button" className="text-sm text-accent hover:underline" onClick={() => setAll(a => !a)}>
            {all ? 'Fewer' : `All ${list.length} decks`}
          </button>
        )}
      </div>
    </section>
  );
}

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { Deck, DeckCardEntry } from '../../types';
import { copyName } from './deckLogic';

export function useUserDecks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.userDecks(user?.id ?? 'none'),
    queryFn: () => api.getUserDecks(user!.id),
    enabled: !!user,
  });
}

export function useDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: keys.deck(deckId ?? 'none'),
    queryFn: () => api.getDeck(deckId!),
    enabled: !!deckId,
  });
}

export const PUBLIC_PAGE = 24;

export function usePublicDecks(q: { search: string; inks: string[]; tags: string[] }) {
  return useInfiniteQuery({
    queryKey: keys.publicDecks(q),
    queryFn: ({ pageParam }) => api.searchPublicDecks({ ...q, offset: pageParam, limit: PUBLIC_PAGE }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PUBLIC_PAGE ? undefined : pages.length * PUBLIC_PAGE),
  });
}

/** Puts a deck into every cached place it appears. */
export function useDeckCache() {
  const qc = useQueryClient();
  return {
    put(deck: Deck) {
      qc.setQueryData(keys.deck(deck.id), deck);
      if (deck.userId) {
        qc.setQueryData<Deck[]>(keys.userDecks(deck.userId), list => list?.map(d => (d.id === deck.id ? deck : d)));
      }
    },
    invalidate(deck?: Pick<Deck, 'id' | 'userId'>) {
      if (deck) qc.invalidateQueries({ queryKey: keys.deck(deck.id) });
      qc.invalidateQueries({ queryKey: ['decks', 'user'] });
      qc.invalidateQueries({ queryKey: ['decks', 'public'] });
    },
  };
}

/** Create, duplicate, delete and edit decks, with cache updates and toasts. */
export function useDeckActions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const cache = useDeckCache();

  const create = useMutation({
    mutationFn: (d: { name: string; description?: string; tags?: string[]; cards?: DeckCardEntry[]; avatar?: Deck['avatar'] }) => api.createDeck(d),
    onSuccess: deck => {
      qc.setQueryData(keys.deck(deck.id), deck);
      if (user) qc.setQueryData<Deck[]>(keys.userDecks(user.id), list => (list ? [deck, ...list] : list));
      cache.invalidate();
    },
    onError: (e: Error) => toast.error(`Couldn't create the deck: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: (deck: Deck) => api.deleteDeck(deck.id),
    onSuccess: (_, deck) => {
      if (user) qc.setQueryData<Deck[]>(keys.userDecks(user.id), list => list?.filter(d => d.id !== deck.id));
      qc.removeQueries({ queryKey: keys.deck(deck.id) });
      cache.invalidate();
      toast.success(`Deleted "${deck.name}"`);
    },
    onError: (e: Error) => toast.error(`Couldn't delete the deck: ${e.message}`),
  });

  const updateMeta = useMutation({
    mutationFn: ({ deck, patch }: { deck: Deck; patch: Parameters<typeof api.updateDeckMeta>[1] }) => api.updateDeckMeta(deck.id, patch),
    onMutate: ({ deck, patch }) => {
      const next = { ...deck, ...patch, avatar: patch.avatar === undefined ? deck.avatar : (patch.avatar ?? undefined) } as Deck;
      cache.put(next);
      return { deck };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx) cache.put(ctx.deck);
      toast.error(`Couldn't save: ${e.message}`);
    },
    onSettled: (_d, _e, { deck }) => cache.invalidate(deck),
  });

  /** New empty deck, opened in the builder. */
  const newDeck = async (cards: DeckCardEntry[] = [], name = 'New deck') => {
    const deck = await create.mutateAsync({ name, cards });
    navigate(`/decks/${deck.id}/edit`);
    return deck;
  };

  /** Copy of any deck you can see, opened on its page. */
  const duplicate = async (deck: Deck, opts: { open?: boolean } = {}) => {
    const mine = user ? qc.getQueryData<Deck[]>(keys.userDecks(user.id)) ?? [] : [];
    const copy = await create.mutateAsync({
      name: copyName(deck.name, mine.map(d => d.name)),
      description: deck.description,
      tags: deck.tags,
      cards: deck.cards,
      avatar: deck.avatar,
    });
    toast.success(`Saved a copy as "${copy.name}"`);
    if (opts.open) navigate(`/decks/${copy.id}`);
    return copy;
  };

  return { create, remove, updateMeta, newDeck, duplicate };
}

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

/** Query keys in one place, so invalidation can't miss a spelling. */
export const keys = {
  profile: (userId: string) => ['profile', userId] as const,
  profiles: (search: string) => ['profiles', search] as const,
  userDecks: (userId: string) => ['decks', 'user', userId] as const,
  deck: (deckId: string) => ['decks', 'one', deckId] as const,
  publicDecks: (q: object) => ['decks', 'public', q] as const,
  binders: (userId: string) => ['binders', userId] as const,
  binderView: (binderId: string) => ['binders', 'view', binderId] as const,
  collectionInfo: (collectionId: string) => ['collection', 'info', collectionId] as const,
  invites: (filter: object) => ['invites', filter] as const,
  myInvites: (userId: string) => ['invites', 'mine', userId] as const,
  notifications: () => ['notifications'] as const,
};

import { lazy } from 'react';
import { Navigate, RouteObject, useParams } from 'react-router-dom';
import { AppShell } from './AppShell';
import { NotFound } from '../ui/PageState';

const CardsPage = lazy(() => import('../features/cards/CardsPage'));

const DecksPage = lazy(() => import('../features/decks/DecksPage'));
const DeckPage = lazy(() => import('../features/decks/DeckPage'));
const DeckBuilderPage = lazy(() => import('../features/decks/DeckBuilderPage'));

const CollectionPage = lazy(() => import('../features/collection/CollectionPage'));
const SetPage = lazy(() => import('../features/collection/SetPage'));
const BinderPage = lazy(() => import('../features/collection/BinderPage'));
const SharedBinderPage = lazy(() => import('../features/collection/SharedBinderPage'));
const HouseholdPage = lazy(() => import('../features/collection/HouseholdPage'));

const ProfilePage = lazy(() => import('../features/community/ProfilePage'));
const PlayersPage = lazy(() => import('../features/community/PlayersPage'));

const SettingsPage = lazy(() => import('../features/account/SettingsPage'));
const ResetPasswordPage = lazy(() => import('../features/account/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('../features/account/AuthCallbackPage'));

/** Redirect keeping one path parameter. */
function Move({ to }: { to: (p: Record<string, string | undefined>) => string }) {
  return <Navigate to={to(useParams())} replace />;
}

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/cards" replace /> },
      { path: 'cards', element: <CardsPage />, children: [{ path: ':cardId', element: null }] },

      // Decks: yours (?tab=browse for everyone's published decks), one deck, the builder.
      { path: 'decks', element: <DecksPage /> },
      { path: 'decks/:deckId', element: <DeckPage /> },
      { path: 'decks/:deckId/edit', element: <DeckBuilderPage /> },

      // Collection: overview, one set, a custom binder, sharing with a household.
      { path: 'collection', element: <CollectionPage /> },
      { path: 'collection/sets/:setCode', element: <SetPage /> },
      { path: 'collection/binders/:binderId', element: <BinderPage /> },
      { path: 'collection/household', element: <HouseholdPage /> },
      { path: 'b/:binderId', element: <SharedBinderPage /> },

      { path: 'players', element: <PlayersPage /> },
      { path: 'u/:userId', element: <ProfilePage /> },

      { path: 'settings', element: <SettingsPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },

      // Old addresses.
      { path: 'collections', element: <Navigate to="/collection" replace /> },
      { path: 'collection/binder/custom/:id', element: <Move to={p => `/collection/binders/${p.id}`} /> },
      { path: 'collection/binder/:id', element: <Move to={p => `/collection/sets/${p.id}`} /> },
      { path: 'binder/:id', element: <Move to={p => `/b/${p.id}`} /> },
      { path: 'community', element: <Navigate to="/players" replace /> },
      { path: 'community/:id', element: <Move to={p => `/u/${p.id}`} /> },

      { path: '*', element: <NotFound /> },
    ],
  },
];

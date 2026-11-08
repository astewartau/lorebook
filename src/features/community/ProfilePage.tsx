import { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, EyeOff, MapPin, Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { keys } from '../../app/queryClient';
import * as api from '../../lib/api';
import { CardAvatar } from '../../ui/CardAvatar';
import { PageLoading, PageMessage, Spinner } from '../../ui/PageState';
import { BinderTile, DeckTile } from './DeckTile';
import { plural } from './deckSummary';

const DECK_LIMIT = 100;
type Tab = 'decks' | 'binders';

const joined = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export default function ProfilePage() {
  const { userId = '' } = useParams();
  const { user } = useAuth();
  const own = user?.id === userId;
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: () => api.getProfile(userId), enabled: !!userId });

  if (profile.isPending) return <PageLoading />;
  if (profile.isError) {
    return (
      <PageMessage title="Couldn't load this profile" action={<button type="button" className="btn-primary" onClick={() => profile.refetch()}>Try again</button>}>
        Check your connection and try again.
      </PageMessage>
    );
  }
  const p = profile.data;
  if (!p) {
    return (
      <PageMessage title="Profile not available" action={<Link to="/players" className="btn-primary">Find players</Link>}>
        This player's profile is private, or the link is wrong.
      </PageMessage>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-16">
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 text-center sm:text-left">
        <CardAvatar cardId={p.avatarCardId} crop={p.avatarCropData} fallback={p.displayName} hiRes label={`${p.displayName}'s picture`}
          className="h-28 w-28 sm:h-36 sm:w-36 text-5xl ring-1 ring-line shadow-card" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold break-words">{p.displayName}</h1>
              {p.fullName && p.fullName !== p.displayName && <p className="mt-0.5 text-muted">{p.fullName}</p>}
            </div>
            {own && (
              <Link to="/settings" className="btn-secondary self-center sm:self-start shrink-0"><Pencil size={16} /> Edit profile</Link>
            )}
          </div>
          <ul className="mt-3 flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-1 text-sm text-muted">
            {p.location && <li className="inline-flex items-center gap-1.5"><MapPin size={15} /> {p.location}</li>}
            <li className="inline-flex items-center gap-1.5"><CalendarDays size={15} /> Joined {joined(p.createdAt)}</li>
          </ul>
          {p.bio && <p className="mt-4 max-w-2xl whitespace-pre-line leading-relaxed mx-auto sm:mx-0">{p.bio}</p>}
        </div>
      </header>

      {own && !p.isPublic && (
        <div className="mt-6 panel px-4 py-3 flex items-start gap-3 text-sm">
          <EyeOff size={18} className="text-muted shrink-0 mt-0.5" />
          <p className="flex-1">
            <span className="font-medium">Your profile is private.</span>{' '}
            <span className="text-muted">Only you and people you share a collection with can see this page, and you're not listed on the Players page.</span>{' '}
            <Link to="/settings" className="text-accent hover:underline whitespace-nowrap">Change in settings</Link>
          </p>
        </div>
      )}

      <Shelves userId={p.userId} own={own} name={p.displayName} />
    </div>
  );
}

function Shelves({ userId, own, name }: { userId: string; own: boolean; name: string }) {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'binders' ? 'binders' : 'decks';
  const decks = useQuery({
    queryKey: keys.publicDecks({ ownerId: userId, limit: DECK_LIMIT }),
    queryFn: () => api.searchPublicDecks({ ownerId: userId, limit: DECK_LIMIT }),
  });
  const binders = useQuery({
    queryKey: keys.publicBinders(userId),
    queryFn: () => api.getUserBinders(userId, { publicOnly: true }),
  });

  const count = (q: { data?: unknown[] }, limit?: number) =>
    q.data === undefined ? undefined : limit && q.data.length >= limit ? `${limit}+` : String(q.data.length);
  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: 'decks', label: 'Decks', count: count(decks, DECK_LIMIT) },
    { id: 'binders', label: 'Binders', count: count(binders) },
  ];
  const select = (t: Tab) => setParams(t === 'decks' ? {} : { tab: t }, { replace: true });

  return (
    <section className="mt-10" aria-label="Public decks and binders">
      <div role="tablist" aria-label="Show" className="flex gap-1 border-b border-line">
        {tabs.map(t => (
          <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const next = t.id === 'decks' ? 'binders' : 'decks';
                select(next);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
            tabIndex={tab === t.id ? 0 : -1}
            className={`relative h-11 px-4 inline-flex items-center gap-2 text-sm font-medium ${tab === t.id
              ? 'text-fg after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-accent-fill after:rounded-full' : 'text-muted hover:text-fg'}`}>
            {t.label}
            {t.count !== undefined && <span className="text-xs tabular-nums rounded-full bg-surface-2 px-2 py-0.5 text-muted">{t.count}</span>}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-6">
        {tab === 'decks' ? (
          <Shelf query={decks} what="decks"
            empty={own ? <>You haven't published any decks. Make a deck public from its page to show it here.</> : <>{name} hasn't published any decks yet.</>}
            emptyAction={own ? <Link to="/decks" className="btn-secondary">Your decks</Link> : undefined}>
            {decks.data?.map(d => <DeckTile key={d.id} deck={d} />)}
          </Shelf>
        ) : (
          <Shelf query={binders} what="binders"
            empty={own ? <>You haven't shared any binders. Make a binder public to show it here.</> : <>{name} hasn't shared any binders yet.</>}
            emptyAction={own ? <Link to="/collection" className="btn-secondary">Your collection</Link> : undefined}>
            {binders.data?.map(b => <BinderTile key={b.id} binder={b} />)}
          </Shelf>
        )}
      </div>
      {tab === 'decks' && decks.data && decks.data.length > 0 && (
        <p className="mt-4 text-sm text-muted">{plural(decks.data.length, 'public deck')}{own && ' · private decks are only on your Decks page'}</p>
      )}
    </section>
  );
}

function Shelf({ query, what, empty, emptyAction, children }: {
  query: { isPending: boolean; isError: boolean; data?: unknown[]; refetch: () => unknown };
  what: string;
  empty: ReactNode;
  emptyAction?: ReactNode;
  children: ReactNode;
}) {
  if (query.isPending) return <div className="flex justify-center py-16"><Spinner label={`Loading ${what}`} /></div>;
  if (query.isError) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-muted">Couldn't load the {what}.</p>
        <button type="button" className="btn-secondary" onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  }
  if (!query.data?.length) {
    return (
      <div className="py-14 text-center rounded-xl border border-dashed border-line">
        <p className="text-muted max-w-sm mx-auto px-4">{empty}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }
  return <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">{children}</div>;
}

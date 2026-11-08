import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MapPin, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { keys } from '../../app/queryClient';
import * as api from '../../lib/api';
import { CardAvatar } from '../../ui/CardAvatar';
import { PageMessage, Spinner } from '../../ui/PageState';
import { plural } from './deckSummary';

const LIMIT = 100;

export default function PlayersPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const term = useDebounce(text.trim(), 250);

  // Keep the search in the address so it survives back and forward.
  const inUrl = params.get('q') ?? '';
  useEffect(() => {
    if (term !== inUrl) setParams(term ? { q: term } : {}, { replace: true });
  }, [term, inUrl, setParams]);

  const players = useQuery({
    queryKey: keys.profiles(term),
    queryFn: () => api.searchProfiles(term, LIMIT),
    placeholderData: keepPreviousData,
  });
  const list = players.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-16">
      <h1 className="font-display text-3xl font-semibold">Players</h1>
      <p className="mt-1 text-muted">Find other collectors and see the decks and binders they've shared.</p>

      <div className="mt-6 relative max-w-xl">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input type="search" className="input h-11 pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden" placeholder="Search by name or location"
          aria-label="Search players" value={text} onChange={e => setText(e.target.value)} />
        {text && (
          <button type="button" className="icon-btn h-9 w-9 absolute right-1 top-1/2 -translate-y-1/2" aria-label="Clear search" onClick={() => setText('')}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-6" aria-live="polite" aria-busy={players.isFetching}>
        {players.isPending ? (
          <div className="flex justify-center py-20"><Spinner label="Loading players" /></div>
        ) : players.isError ? (
          <PageMessage title="Couldn't load players" action={<button type="button" className="btn-primary" onClick={() => players.refetch()}>Try again</button>}>
            Check your connection and try again.
          </PageMessage>
        ) : list.length === 0 ? (
          <PageMessage title={term ? 'No players found' : 'No players yet'}
            action={term ? <button type="button" className="btn-secondary" onClick={() => setText('')}>Clear search</button> : undefined}>
            {term ? <>Nobody public matches “{term}”. Private profiles aren't listed.</> : 'Public profiles will appear here.'}
          </PageMessage>
        ) : (
          <>
            <p className="text-sm text-muted mb-3 flex items-center gap-2">
              {list.length >= LIMIT ? `Showing the first ${LIMIT} players` : plural(list.length, 'player')}
              {term && <> matching “{term}”</>}
              {players.isFetching && <Spinner label="Updating" />}
            </p>
            <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${players.isPlaceholderData ? 'opacity-60' : ''}`}>
              {list.map(p => (
                <li key={p.userId}>
                  <Link to={`/u/${p.userId}`} className="panel h-full p-4 flex items-center gap-4 hover:border-accent-fill/60 hover:shadow-card transition group">
                    <CardAvatar cardId={p.avatarCardId} crop={p.avatarCropData} fallback={p.displayName} className="h-14 w-14 text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate group-hover:text-accent">
                        {p.displayName}
                        {p.userId === user?.id && <span className="ml-2 text-xs font-normal text-muted">You</span>}
                      </p>
                      {p.location && <p className="mt-0.5 text-sm text-muted truncate inline-flex items-center gap-1 max-w-full"><MapPin size={13} className="shrink-0" /> <span className="truncate">{p.location}</span></p>}
                      {p.bio && <p className="mt-1 text-sm text-muted line-clamp-1">{p.bio}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

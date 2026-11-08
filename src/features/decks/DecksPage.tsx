import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileUp, Plus, Search, Users, X } from 'lucide-react';
import type { Deck } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { useSignIn } from '../../app/AccountMenu';
import { PageLoading, PageMessage, Spinner } from '../../ui/PageState';
import { InkIcon } from '../../ui/GameIcons';
import { DeckSort, INK_ORDER, allTags, filterDecks } from './deckLogic';
import { DeckGrid, DeckTile } from './DeckTile';
import { DeleteDeckDialog, ImportDeckDialog } from './DeckDialogs';
import { TagLabel } from './DeckBits';
import { useDeckActions, usePublicDecks, useUserDecks } from './useDecks';

type Tab = 'mine' | 'browse';

const SORTS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Card count' },
];

/** Search, ink and tag filters kept in the URL. */
function useDeckParams() {
  const [params, setParams] = useSearchParams();
  const set = (patch: Record<string, string | string[] | null>) => setParams(prev => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) {
      next.delete(k);
      if (Array.isArray(v)) v.forEach(x => next.append(k, x));
      else if (v) next.set(k, v);
    }
    return next;
  }, { replace: true });
  return {
    tab: (['browse', 'mine'].includes(params.get('tab') ?? '') ? params.get('tab') : null) as Tab | null,
    q: params.get('q') ?? '',
    inks: params.getAll('ink'),
    tag: params.get('tag') ?? '',
    sort: (SORTS.some(s => s.value === params.get('sort')) ? params.get('sort') : 'updated') as DeckSort,
    set,
  };
}

function SearchInput({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="relative flex-1 min-w-[12rem]">
      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input type="search" value={text} onChange={e => setText(e.target.value)} aria-label={label} placeholder={placeholder}
        className="input h-10 pl-9 [&::-webkit-search-cancel-button]:hidden" />
      {text && (
        <button type="button" className="icon-btn h-8 w-8 absolute right-1 top-1/2 -translate-y-1/2" aria-label="Clear search" onClick={() => { setText(''); onChange(''); }}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function InkFilter({ value, onChange, hint }: { value: string[]; onChange: (v: string[]) => void; hint: string }) {
  return (
    <div role="group" aria-label={hint} className="flex items-center justify-between sm:justify-start gap-1 w-full sm:w-auto shrink-0">
      {INK_ORDER.map(ink => {
        const on = value.includes(ink);
        return (
          <button key={ink} type="button" aria-pressed={on} title={ink} aria-label={ink}
            onClick={() => onChange(on ? value.filter(i => i !== ink) : [...value, ink])}
            className={`h-10 w-10 sm:h-9 sm:w-9 rounded-full inline-flex items-center justify-center border transition ${on ? 'border-accent-fill bg-accent-fill/15' : 'border-transparent hover:bg-surface-2'} ${value.length && !on ? 'opacity-45' : ''}`}>
            <InkIcon ink={ink} size={22} />
          </button>
        );
      })}
    </div>
  );
}

function TagSelect({ tags, value, onChange }: { tags: string[]; value: string; onChange: (t: string) => void }) {
  if (!tags.length && !value) return null;
  const list = value && !tags.includes(value) ? [value, ...tags] : tags;
  return (
    <select aria-label="Tag" className="input h-10 w-full sm:w-auto sm:max-w-[12rem] pr-8 bg-surface" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Any tag</option>
      {list.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

function YourDecks({ p, actions }: { p: ReturnType<typeof useDeckParams>; actions: React.ReactNode }) {
  const { cardsById, isLoading: cardsLoading } = useCardData();
  const { data: decks, isLoading, error } = useUserDecks();
  const { duplicate } = useDeckActions();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Deck | null>(null);

  const tags = useMemo(() => allTags(decks ?? []), [decks]);
  const shown = useMemo(() => filterDecks(decks ?? [], { q: p.q, inks: p.inks, tags: p.tag ? [p.tag] : [], sort: p.sort }, cardsById),
    [decks, p.q, p.inks, p.tag, p.sort, cardsById]);
  const filtering = !!(p.q || p.inks.length || p.tag);

  let body: React.ReactNode;
  if (error) body = <PageMessage title="Couldn't load your decks">{(error as Error).message}</PageMessage>;
  else if (isLoading || cardsLoading) body = <PageLoading />;
  else if (!decks?.length) {
    body = (
      <PageMessage title="No decks yet" action={actions}>
        Start an empty deck and add cards from the browser, or import a list from Dreamborn, Inktable or a text file.
      </PageMessage>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput value={p.q} onChange={q => p.set({ q })} label="Search your decks" placeholder="Search your decks" />
          <InkFilter value={p.inks} onChange={inks => p.set({ ink: inks })} hint="Decks using these inks" />
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            <TagSelect tags={tags} value={p.tag} onChange={tag => p.set({ tag })} />
            <select aria-label="Sort by" className="input h-10 w-full sm:w-auto pr-8 bg-surface" value={p.sort} onChange={e => p.set({ sort: e.target.value === 'updated' ? null : e.target.value })}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm text-muted mb-3" aria-live="polite">
          {filtering ? `${shown.length} of ${decks.length} decks` : `${decks.length} deck${decks.length === 1 ? '' : 's'}`}
          {filtering && <> · <button type="button" className="text-accent hover:underline" onClick={() => p.set({ q: null, ink: [], tag: null })}>Clear filters</button></>}
        </p>
        {shown.length === 0 ? (
          <PageMessage title="No decks match">Try a different search or fewer filters.</PageMessage>
        ) : (
          <DeckGrid>
            {shown.map((d, i) => (
              <DeckTile key={d.id} deck={d} eager={i < 8}
                onTag={tag => p.set({ tag })}
                onEdit={() => navigate(`/decks/${d.id}/edit`)}
                onDuplicate={() => void duplicate(d)}
                onDelete={() => setDeleting(d)} />
            ))}
          </DeckGrid>
        )}
      </>
    );
  }

  return (
    <>
      {body}
      <DeleteDeckDialog deck={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function BrowseDecks({ p }: { p: ReturnType<typeof useDeckParams> }) {
  const { isLoading: cardsLoading } = useCardData();
  const query = useMemo(() => ({ search: p.q.trim(), inks: p.inks, tags: p.tag ? [p.tag] : [] }), [p.q, p.inks, p.tag]);
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicDecks(query);
  const decks = useMemo(() => data?.pages.flat() ?? [], [data]);
  const tags = useMemo(() => allTags(decks).slice(0, 40), [decks]);
  const filtering = !!(p.q || p.inks.length || p.tag);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput value={p.q} onChange={q => p.set({ q })} label="Search public decks" placeholder="Search by name, description, tag or author" />
        <InkFilter value={p.inks} onChange={inks => p.set({ ink: inks })} hint="Only these inks" />
        <TagSelect tags={tags} value={p.tag} onChange={tag => p.set({ tag })} />
      </div>
      {p.tag && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted">Tagged</span>
          <button type="button" className="chip h-7 text-xs" aria-pressed onClick={() => p.set({ tag: null })} aria-label={`Remove tag filter ${p.tag}`}>
            <TagLabel tag={p.tag} /><X size={12} className="text-muted" />
          </button>
        </div>
      )}
      {error ? <PageMessage title="Couldn't load decks">{(error as Error).message}</PageMessage>
        : isLoading || cardsLoading ? <PageLoading />
          : decks.length === 0 ? (
            <PageMessage title={filtering ? 'No public decks match' : 'No public decks yet'}
              action={filtering ? <button type="button" className="btn-secondary" onClick={() => p.set({ q: null, ink: [], tag: null })}>Clear filters</button> : undefined}>
              {filtering ? 'Try a different search, or fewer inks.' : 'Decks appear here when their owners publish them.'}
            </PageMessage>
          ) : (
            <>
              <p className="text-sm text-muted mb-3" aria-live="polite">
                {decks.length}{hasNextPage ? '+' : ''} public deck{decks.length === 1 ? '' : 's'}
                {p.inks.length > 0 && <> using only {p.inks.join(' and ')}</>}
              </p>
              <DeckGrid>
                {decks.map((d, i) => <DeckTile key={d.id} deck={d} showAuthor eager={i < 8} onTag={tag => p.set({ tag })} />)}
              </DeckGrid>
              <div className="flex justify-center py-8">
                {hasNextPage ? (
                  <button type="button" className="btn-secondary min-w-40" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                    {isFetchingNextPage ? <Spinner label="Loading more" /> : 'Load more'}
                  </button>
                ) : decks.length > 12 && <p className="text-sm text-muted">That's every match.</p>}
              </div>
            </>
          )}
    </>
  );
}

export default function DecksPage() {
  const { user, loading } = useAuth();
  const p = useDeckParams();
  const { openSignIn, signInDialog } = useSignIn();
  const { newDeck, create } = useDeckActions();
  const { data: myDecks } = useUserDecks();
  const [importing, setImporting] = useState(false);
  // Signed out, the page opens on everyone's decks.
  const tab: Tab = p.tab ?? (user || loading ? 'mine' : 'browse');

  const actions = (
    <div className="flex gap-2">
      <button type="button" className="btn-primary" disabled={create.isPending} onClick={() => void newDeck()}><Plus size={18} />New deck</button>
      <button type="button" className="btn-secondary" onClick={() => setImporting(true)}><FileUp size={17} />Import</button>
    </div>
  );

  const tabLink = (t: Tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === t} aria-controls="decks-panel"
      onClick={() => p.set({ tab: t === 'browse' ? 'browse' : user ? null : 'mine', q: null, ink: [], tag: null, sort: null })}
      className={`relative h-11 px-1 text-[15px] font-medium transition-colors ${tab === t ? 'text-fg after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent-fill after:rounded-full' : 'text-muted hover:text-fg'}`}>
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12">
      <header className="pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-end gap-x-6 gap-y-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-semibold">Decks</h1>
          <p className="text-muted mt-1">Build, check and share your decks, or borrow ideas from other players.</p>
        </div>
        {tab === 'mine' && user && !!myDecks?.length && actions}
      </header>

      <div className="mt-5 mb-5 flex items-center gap-6 border-b border-line">
        <div role="tablist" aria-label="Decks" className="flex gap-6">
          {tabLink('mine', 'Your decks')}
          {tabLink('browse', 'Browse')}
        </div>
        <Link to="/players" className="ml-auto inline-flex items-center gap-1.5 h-11 text-sm text-muted hover:text-accent">
          <Users size={16} /><span>Players</span><ArrowRight size={14} />
        </Link>
      </div>

      <div id="decks-panel" role="tabpanel">
        {tab === 'browse' ? <BrowseDecks p={p} />
          : loading ? <PageLoading />
            : user ? <YourDecks p={p} actions={actions} />
              : (
                <PageMessage title="Your decks live here" action={<>
                  <button type="button" className="btn-primary" onClick={openSignIn}>Sign in</button>
                  <button type="button" className="btn-secondary" onClick={() => p.set({ tab: 'browse' })}>Browse public decks</button>
                </>}>
                  Sign in to build decks, check them against your collection and share them.
                </PageMessage>
              )}
      </div>
      {signInDialog}
      <ImportDeckDialog open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}

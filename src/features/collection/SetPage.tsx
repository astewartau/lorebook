import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronLeft, LayoutGrid, Sparkles } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useToast } from '../../contexts/ToastContext';
import { PageLoading, PageMessage } from '../../ui/PageState';
import { RarityIcon } from '../../ui/GameIcons';
import { CardResults } from '../cards/CardResults';
import { CardDetail } from '../cards/CardDetail';
import { Finish, collectAction } from '../cards/CardTile';
import type { LorcanaCard } from '../../types';
import { OwnedFilter, filterOwned, percent, setCards, setProgress } from './progress';
import { BinderSpread } from './BinderSpread';
import { CardPocket } from './CardPocket';
import { ProgressBar, Segmented, SetMark, ShareControl, SyncStatus, copyText, errorMessage, shareUrl } from './parts';
import { useShareSet } from './queries';
import { SignInPrompt } from './SignInPrompt';

type View = 'binder' | 'grid';

export default function SetPage() {
  const { setCode = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { allCards, setsObject, isLoading } = useCardData();
  const { getCardQuantity, addCardToCollection, removeCardFromCollection } = useCollection();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [finish, setFinish] = useState<Finish>('normal');
  const toast = useToast();

  const view: View = params.get('view') === 'grid' ? 'grid' : 'binder';
  const show = (['owned', 'missing', 'foil'] as const).find(v => v === params.get('show')) ?? 'all';
  const cardId = params.get('card');
  const set = setsObject[setCode];
  const setName = set?.name ?? `Set ${setCode}`;

  const cards = useMemo(() => setCards(allCards, setCode), [allCards, setCode]);
  const progress = useMemo(() => setProgress(cards, getCardQuantity), [cards, getCardQuantity]);
  const shown = useMemo(() => filterOwned(cards, show, getCardQuantity), [cards, show, getCardQuantity]);
  const counts = useMemo(() => ({
    all: cards.length,
    owned: progress.owned,
    missing: cards.length - progress.owned,
    foil: filterOwned(cards, 'foil', getCardQuantity).length,
  }), [cards, progress.owned, getCardQuantity]);

  const { binder, mutation: share } = useShareSet(setCode, setName);

  const update = useCallback((changes: Record<string, string | null>, replace = false) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace });
  }, [setParams]);

  const hrefFor = useCallback((card: { id: number }) => {
    const next = new URLSearchParams(params);
    next.set('card', String(card.id));
    return `/collection/sets/${setCode}?${next}`;
  }, [params, setCode]);

  const adjust = useCallback((id: number, n: number, f: number) => {
    if (n + f > 0) addCardToCollection(id, n, f);
    else removeCardFromCollection(id, -n, -f);
  }, [addCardToCollection, removeCardFromCollection]);
  const actionFor = useCallback((card: LorcanaCard, q: { normal: number; foil: number }) =>
    collectAction(card, q.normal, q.foil, finish, adjust), [finish, adjust]);
  const groups = useMemo(() => [{ key: 'all', label: '', cards: shown }], [shown]);

  const toggleShare = async (next: boolean) => {
    try {
      const id = await share.mutateAsync(next);
      if (next) {
        const copied = await copyText(shareUrl(id));
        toast.success(copied ? 'Set shared. Link copied.' : 'Set shared.');
      } else {
        toast.info('The link no longer works.');
      }
    } catch (e) {
      toast.error(`Couldn't change sharing: ${errorMessage(e)}`);
    }
  };

  if (authLoading || isLoading) return <PageLoading />;
  if (!user) return <SignInPrompt />;
  if (!set || cards.length === 0) {
    return <PageMessage title="Set not found" action={<Link to="/collection" className="btn-primary">Back to collection</Link>}>There's no set with this code.</PageMessage>;
  }

  const pct = percent(progress.owned, progress.total);
  const released = set.releaseDate ? new Date(set.releaseDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-10">
      <div className="pt-4">
        <Link to="/collection" className="inline-flex items-center gap-1 h-9 -ml-1 pr-2 text-sm text-muted hover:text-fg">
          <ChevronLeft size={18} />Collection
        </Link>
      </div>

      <header className="mt-2 flex flex-col lg:flex-row lg:items-end gap-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="hidden sm:flex h-20 w-36 shrink-0 items-center justify-center">
            <SetMark code={setCode} name={setName} className="h-20" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-tight">{setName}</h1>
            <p className="text-sm text-muted mt-1">
              {set.type === 'quest' ? "Illumineer's Quest" : `Set ${set.number}`}
              {released && <> · {released}</>} · {progress.total} cards
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SyncStatus />
          <ShareControl isPublic={!!binder?.isPublic} busy={share.isPending} binderId={binder?.id} onChange={toggleShare} what="set" />
        </div>
      </header>

      <section aria-label="Progress" className="mt-5 panel p-4 sm:p-5 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span><span className="text-2xl font-semibold tabular-nums">{progress.owned}</span><span className="text-muted tabular-nums"> / {progress.total}</span></span>
            <span className="text-sm font-medium tabular-nums">{pct}%</span>
          </div>
          <ProgressBar value={progress.owned} max={progress.total} label="Cards owned" className="h-2.5 mt-2" />
          <p className="text-xs text-muted mt-1.5">Cards owned</p>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span><span className="text-2xl font-semibold tabular-nums">{progress.playsets}</span><span className="text-muted tabular-nums"> / {progress.total}</span></span>
            <span className="text-sm text-muted tabular-nums">{progress.copies} copies · {progress.foils} foil</span>
          </div>
          <ProgressBar value={progress.playsets} max={progress.total} label="Playsets complete" className="h-2.5 mt-2" />
          <p className="text-xs text-muted mt-1.5">Playsets (4 copies)</p>
        </div>
        <ul className="grid grid-cols-3 sm:flex sm:flex-wrap gap-x-4 gap-y-2 md:max-w-[22rem]" aria-label="By rarity">
          {progress.rarities.map(r => (
            <li key={r.rarity} className="inline-flex items-center gap-1.5 text-sm tabular-nums" title={`${r.rarity}: ${r.owned} of ${r.total}`}>
              <RarityIcon rarity={r.rarity} size={15} />
              <span><span className={r.owned === r.total ? 'text-success font-medium' : ''}>{r.owned}</span><span className="text-muted">/{r.total}</span></span>
              <span className="sr-only">{r.rarity}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5 mb-4 flex items-center gap-2 flex-wrap">
        <Segmented<View> label="View" value={view} onChange={v => update({ view: v === 'binder' ? null : v })} options={[
          { value: 'binder', label: <><BookOpen size={16} />Binder</> },
          { value: 'grid', label: <><LayoutGrid size={16} />Grid</> },
        ]} />
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          <Segmented<OwnedFilter> label="Show" value={show} onChange={v => { setPage(0); update({ show: v === 'all' ? null : v }); }} options={[
            { value: 'all', label: <>All <span className="text-muted tabular-nums">{counts.all}</span></> },
            { value: 'owned', label: <>Owned <span className="text-muted tabular-nums">{counts.owned}</span></> },
            { value: 'missing', label: <>Missing <span className="text-muted tabular-nums">{counts.missing}</span></> },
            { value: 'foil', label: <><Sparkles size={14} className="text-amber-400" />Foil <span className="text-muted tabular-nums">{counts.foil}</span></> },
          ]} />
        </div>
        {view === 'grid' && (
          <div className="sm:ml-auto">
            <Segmented<Finish> label="Adding" value={finish} onChange={setFinish} options={[
              { value: 'normal', label: 'Normal', title: 'Tapping a card adds a normal copy' },
              { value: 'foil', label: <><Sparkles size={14} className="text-amber-400" />Foil</>, title: 'Tapping a card adds a foil copy' },
            ]} />
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <PageMessage title={show === 'missing' ? 'Set complete' : 'Nothing here yet'} action={
          show !== 'missing' ? <Link to={`/cards?mode=collect&set=${encodeURIComponent(setCode)}`} className="btn-primary">Add cards from this set</Link> : undefined
        }>
          {show === 'missing' ? 'You have every card in this set.' : show === 'foil' ? 'You have no foils from this set.' : 'You have no cards from this set.'}
        </PageMessage>
      ) : view === 'binder' ? (
        <BinderSpread
          items={shown}
          itemKey={c => c.id}
          page={page}
          onPage={setPage}
          keyboard={!cardId}
          label={`${setName} binder`}
          chrome="11rem"
          renderPocket={(c, i) => {
            const q = getCardQuantity(c.id);
            return <CardPocket card={c} count={q.total} foil={q.foil} missing={q.total === 0} eager={i < 18}
              onOpen={() => update({ card: String(c.id) })} />;
          }}
        />
      ) : (
        <>
          <p className="text-sm text-muted mb-3">Tap a card to add a {finish} copy; use − and + to adjust.</p>
          <CardResults groups={groups} view="grid" href={hrefFor} quantity={getCardQuantity} actionFor={actionFor} />
        </>
      )}

      {cardId && (
        <CardDetail cardId={Number(cardId)} list={shown} hrefFor={hrefFor} onClose={() => update({ card: null })} />
      )}
    </div>
  );
}

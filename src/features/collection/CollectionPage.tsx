import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Download, FileUp, Globe, Home, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useSignIn } from '../../app/AccountMenu';
import { Menu, MenuItem, MenuSeparator } from '../../ui/Menu';
import { PageLoading } from '../../ui/PageState';
import { RarityIcon } from '../../ui/GameIcons';
import type { CustomBinder, LorcanaCard } from '../../types';
import { SetInfo, collectionStats, listSets, percent, setProgress } from './progress';
import { ProgressBar, SetMark, Stat, SyncStatus, downloadFile } from './parts';
import { useCollectionInfo, useMyBinders } from './queries';
import { ImportDialog } from './ImportDialog';
import { ClearDialog, NewBinderDialog } from './CollectionDialogs';

const today = () => new Date().toISOString().slice(0, 10);

function Pitch() {
  const { allCards } = useCardData();
  const { openSignIn, signInDialog } = useSignIn();
  const fan = useMemo(() => {
    const picks = allCards.filter(c => c.rarity === 'Enchanted' && !c.promoGrouping);
    return picks.slice(-5);
  }, [allCards]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20 grid gap-10 md:grid-cols-[1.1fr_1fr] items-center">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">Your collection, set by set.</h1>
        <p className="mt-4 text-lg text-muted">Track every card you own, normal and foil, and watch each set fill up in its binder.</p>
        <ul className="mt-6 space-y-2.5 text-sm">
          {[
            [BookOpen, 'A binder for every set, with what you have and what you’re missing'],
            [Globe, 'Share a set or your own binders with a link'],
            [Users, 'One shared collection for your household'],
            [FileUp, 'Bring your cards over from Dreamborn'],
          ].map(([Icon, text]) => {
            const I = Icon as typeof BookOpen;
            return <li key={text as string} className="flex gap-3"><I size={18} className="text-accent shrink-0 mt-0.5" />{text as string}</li>;
          })}
        </ul>
        <div className="mt-8 flex flex-wrap gap-2">
          <button type="button" className="btn-primary h-11 px-5" onClick={openSignIn}>Sign in to start</button>
          <Link to="/cards" className="btn-secondary h-11 px-5">Browse cards</Link>
        </div>
      </div>
      <div className="relative h-72 sm:h-96 hidden sm:block" aria-hidden>
        {fan.map((c, i) => (
          <img key={c.id} src={c.images.thumbnail} alt="" className="absolute top-1/2 left-1/2 w-40 sm:w-48 aspect-card rounded-[4.6%/3.3%] shadow-pop object-cover"
            style={{ transform: `translate(-50%, -50%) translateX(${(i - (fan.length - 1) / 2) * 52}px) rotate(${(i - (fan.length - 1) / 2) * 7}deg)`, zIndex: i }} />
        ))}
      </div>
      {signInDialog}
    </div>
  );
}

function SetRow({ set, cards, quantity }: { set: SetInfo; cards: LorcanaCard[]; quantity: ReturnType<typeof useCollection>['getCardQuantity'] }) {
  const p = useMemo(() => setProgress(cards, quantity), [cards, quantity]);
  const pct = percent(p.owned, p.total);
  return (
    <li>
      <Link to={`/collection/sets/${set.code}`} className="group panel p-4 flex flex-col gap-3 h-full hover:border-muted/60 hover:shadow-card transition-shadow">
        <div className="flex items-center gap-3 min-h-14">
          <div className="w-24 sm:w-28 h-14 shrink-0 flex items-center justify-center">
            <SetMark code={set.code} name={set.name} className="h-14" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold leading-tight truncate">{set.name}</h3>
            <p className="text-xs text-muted">{set.type === 'quest' ? 'Illumineer’s Quest' : `Set ${set.number}`} · {p.total} cards</p>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-semibold tabular-nums ${pct === 100 ? 'text-success' : ''}`}>{pct}%</div>
          </div>
        </div>
        <ProgressBar value={p.owned} max={p.total} label={`${set.name}: cards owned`} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="tabular-nums"><span className="font-medium">{p.owned}</span><span className="text-muted">/{p.total} owned</span></span>
          <span className="tabular-nums text-muted">{p.playsets} playset{p.playsets === 1 ? '' : 's'}</span>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums" aria-label="By rarity">
          {p.rarities.map(r => (
            <li key={r.rarity} className="inline-flex items-center gap-1" title={`${r.rarity}: ${r.owned} of ${r.total}`}>
              <RarityIcon rarity={r.rarity} size={13} />
              <span><span className={r.owned === r.total ? 'text-success' : ''}>{r.owned}</span><span className="text-muted">/{r.total}</span></span>
              <span className="sr-only">{r.rarity}</span>
            </li>
          ))}
        </ul>
      </Link>
    </li>
  );
}

function BinderCard({ binder }: { binder: CustomBinder }) {
  const { getCard } = useCardData();
  const thumbs = binder.cards.slice(0, 3).map(e => getCard(e.cardId)).filter(Boolean) as LorcanaCard[];
  const count = binder.cards.reduce((n, e) => n + e.quantity, 0);
  return (
    <li>
      <Link to={`/collection/binders/${binder.id}`} className="panel p-4 flex items-center gap-4 h-full hover:border-muted/60 hover:shadow-card transition-shadow">
        <div className="relative h-20 w-[4.5rem] shrink-0" aria-hidden>
          {thumbs.length === 0 ? (
            <div className="absolute inset-0 aspect-card rounded-[4.6%/3.3%] border-2 border-dashed border-line" />
          ) : thumbs.map((c, i) => (
            <img key={c.id} src={c.images.thumbnail} alt="" loading="lazy"
              className="absolute top-0 h-20 aspect-card rounded-[4.6%/3.3%] object-cover shadow-card ring-1 ring-black/20"
              style={{ left: i * 8, transform: `rotate(${(i - 1) * 5}deg)`, zIndex: 3 - i }} />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold truncate">{binder.name}</h3>
          <p className="text-sm text-muted">{binder.cards.length} card{binder.cards.length === 1 ? '' : 's'}{count !== binder.cards.length && ` · ${count} copies`}</p>
          {binder.isPublic && <p className="text-xs text-accent mt-1 inline-flex items-center gap-1"><Globe size={12} />Shared</p>}
        </div>
        <ChevronRight size={18} className="text-muted shrink-0" />
      </Link>
    </li>
  );
}

function HouseholdCard({ collectionId, userId }: { collectionId: string | null; userId: string }) {
  const { data: info } = useCollectionInfo(collectionId);
  const others = info?.members.filter(m => m.userId !== userId) ?? [];
  const owner = info?.members.find(m => m.userId === info.ownerId);
  const mine = info?.ownerId === userId;
  return (
    <Link to="/collection/household" className="panel p-4 flex flex-col gap-2 hover:border-muted/60 hover:shadow-card transition-shadow h-full">
      <div className="flex items-center gap-2">
        <Home size={18} className="text-accent" />
        <h2 className="font-semibold flex-1">Household</h2>
        <ChevronRight size={18} className="text-muted" />
      </div>
      {!info ? <p className="text-sm text-muted">Loading…</p> : others.length === 0 ? (
        <p className="text-sm text-muted">{info.inviteCode ? 'Sharing is on. Nobody has joined yet.' : 'Only you. Share this collection so everyone at home tracks the same cards.'}</p>
      ) : (
        <>
          <p className="text-sm">{mine ? <>Shared with {others.map(m => m.displayName).join(', ')}</> : <>You’re using <strong>{owner?.displayName ?? 'someone'}</strong>’s collection</>}</p>
          <div className="flex -space-x-2">
            {info.members.map(m => (
              <span key={m.userId} title={m.displayName}
                className="h-8 w-8 rounded-full bg-surface-3 border-2 border-surface inline-flex items-center justify-center text-xs font-semibold uppercase">
                {m.displayName.slice(0, 1)}
              </span>
            ))}
          </div>
        </>
      )}
    </Link>
  );
}

export default function CollectionPage() {
  const { user, loading } = useAuth();
  const { allCards, setsObject, cardsById, isLoading } = useCardData();
  const { collection, collectionId, getCardQuantity, exportCollection, exportCollectionCSV, syncStatus } = useCollection();
  const { data: binders } = useMyBinders();
  const { data: info } = useCollectionInfo(collectionId);
  const [dialog, setDialog] = useState<'import' | 'clear' | 'binder' | null>(null);

  const sets = useMemo(() => listSets(setsObject, allCards), [setsObject, allCards]);
  const cardsBySet = useMemo(() => {
    const m = new Map<string, LorcanaCard[]>();
    for (const c of allCards) {
      if (c.promoGrouping) continue;
      const list = m.get(c.setCode);
      if (list) list.push(c);
      else m.set(c.setCode, [c]);
    }
    return m;
  }, [allCards]);
  const stats = useMemo(() => collectionStats(collection, cardsById), [collection, cardsById]);
  const custom = binders?.filter(b => b.kind === 'custom') ?? [];
  const sharedSets = binders?.filter(b => b.kind === 'set' && b.isPublic) ?? [];
  const shared = (info?.members.length ?? 1) > 1;

  if (loading || isLoading) return <PageLoading />;
  if (!user) return <Pitch />;
  const loadingCards = syncStatus === 'loading' && collection.length === 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12">
      <header className="pt-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-semibold">Collection</h1>
          {info && shared && <p className="text-sm text-muted mt-0.5 truncate">{info.name} · shared by {info.members.length}</p>}
        </div>
        <SyncStatus />
        <Link to="/cards?mode=collect" className="btn-primary h-10"><Plus size={18} />Add cards</Link>
        <Menu label="More collection actions" triggerClassName="icon-btn border border-line" trigger={<MoreHorizontal size={20} />}>
          {close => (
            <>
              <MenuItem onClick={() => { close(); setDialog('import'); }}><FileUp size={16} />Import…</MenuItem>
              <MenuSeparator />
              <MenuItem onClick={() => { close(); downloadFile(`lorebook-collection-${today()}.json`, exportCollection(), 'application/json'); }}>
                <Download size={16} />Export as JSON
              </MenuItem>
              <MenuItem onClick={() => { close(); downloadFile(`lorebook-collection-${today()}.csv`, exportCollectionCSV(), 'text/csv'); }}>
                <Download size={16} />Export as CSV (Dreamborn)
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger onClick={() => { close(); setDialog('clear'); }}><Trash2 size={16} />Clear collection…</MenuItem>
            </>
          )}
        </Menu>
      </header>

      <div className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.4fr)]">
        <Stat label="Unique cards" value={loadingCards ? '–' : stats.unique.toLocaleString()} />
        <Stat label="Total copies" value={loadingCards ? '–' : stats.copies.toLocaleString()} />
        <Stat label="Foils" value={loadingCards ? '–' : stats.foils.toLocaleString()} />
        <Stat label="Playsets complete" value={loadingCards ? '–' : stats.playsets.toLocaleString()} />
        <div className="col-span-2 lg:col-span-1">
          <HouseholdCard collectionId={collectionId} userId={user.id} />
        </div>
      </div>

      {!loadingCards && stats.unique === 0 && (
        <div className="mt-5 panel p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">Start your collection</h2>
            <p className="text-sm text-muted mt-1">Tap cards in the card browser to add them, or bring your collection over from Dreamborn.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/cards?mode=collect" className="btn-primary">Add cards</Link>
            <button type="button" className="btn-secondary" onClick={() => setDialog('import')}><FileUp size={16} />Import</button>
          </div>
        </div>
      )}

      <section aria-labelledby="binders-h" className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <h2 id="binders-h" className="font-display text-xl font-semibold flex-1">Binders</h2>
          <button type="button" className="btn-secondary btn-sm h-9" onClick={() => setDialog('binder')}><Plus size={16} />New binder</button>
        </div>
        {custom.length === 0 ? (
          <button type="button" onClick={() => setDialog('binder')}
            className="w-full rounded-xl border-2 border-dashed border-line p-5 text-left hover:border-muted/60 flex items-center gap-4">
            <BookOpen size={22} className="text-muted shrink-0" />
            <span>
              <span className="font-medium block">Make your own binder</span>
              <span className="text-sm text-muted">Trade binders, favourite art, cards you’re after: any cards in your own order, shareable with a link.</span>
            </span>
          </button>
        ) : (
          <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {custom.map(b => <BinderCard key={b.id} binder={b} />)}
          </ul>
        )}
        {sharedSets.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Shared sets: {sharedSets.map((b, i) => (
              <span key={b.id}>{i > 0 && ', '}<Link className="text-accent hover:underline" to={`/collection/sets/${b.setCode}`}>{b.name}</Link></span>
            ))}
          </p>
        )}
      </section>

      <section aria-labelledby="sets-h" className="mt-10">
        <h2 id="sets-h" className="font-display text-xl font-semibold mb-3">Sets</h2>
        <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {sets.map(s => <SetRow key={s.code} set={s} cards={cardsBySet.get(s.code) ?? []} quantity={getCardQuantity} />)}
        </ul>
        <p className="mt-3 text-xs text-muted">Completion counts each set’s numbered cards; promos are left out.</p>
      </section>

      <ImportDialog open={dialog === 'import'} onClose={() => setDialog(null)} shared={shared} />
      <ClearDialog open={dialog === 'clear'} onClose={() => setDialog(null)} shared={shared} />
      <NewBinderDialog open={dialog === 'binder'} onClose={() => setDialog(null)} />
    </div>
  );
}

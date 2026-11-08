import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Sparkles } from 'lucide-react';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import { PageLoading, PageMessage } from '../../ui/PageState';
import type { LorcanaCard } from '../../types';
import { BinderSpread } from './BinderSpread';
import { CardPocket } from './CardPocket';
import { ProgressBar, SetMark, Segmented, errorMessage } from './parts';
import { percent, setCards } from './progress';

interface Pocket {
  card: LorcanaCard;
  /** Copies shown: the binder's count (custom) or what the owner has (set). */
  count: number;
  foil: number;
  missing: boolean;
}

type Show = 'all' | 'owned' | 'missing';

export default function SharedBinderPage() {
  const { binderId = '' } = useParams();
  const { user } = useAuth();
  const { allCards, getCard, setsObject, isLoading: cardsLoading } = useCardData();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Pocket | null>(null);
  const [show, setShow] = useState<Show>('all');

  const query = useQuery({
    queryKey: keys.binderView(binderId),
    queryFn: () => api.getBinderView(binderId),
    enabled: !!binderId,
  });
  const view = query.data;

  const pockets = useMemo<Pocket[]>(() => {
    if (!view) return [];
    const owned = new Map(view.owned.map(o => [o.cardId, o]));
    if (view.binder.kind === 'set') {
      return setCards(allCards, view.binder.setCode ?? '').map(card => {
        const o = owned.get(card.id);
        const total = (o?.quantityNormal ?? 0) + (o?.quantityFoil ?? 0);
        return { card, count: total, foil: o?.quantityFoil ?? 0, missing: total === 0 };
      });
    }
    return view.binder.cards.flatMap(e => {
      const card = getCard(e.cardId);
      return card ? [{ card, count: e.quantity, foil: 0, missing: false }] : [];
    });
  }, [view, allCards, getCard]);

  const isSet = view?.binder.kind === 'set';
  const ownedCount = pockets.filter(p => !p.missing).length;
  const shown = useMemo(() => (!isSet || show === 'all' ? pockets : pockets.filter(p => (show === 'owned' ? !p.missing : p.missing))), [pockets, isSet, show]);

  if (query.isLoading || cardsLoading) return <PageLoading />;
  if (query.isError) {
    return <PageMessage title="Couldn't load this binder" action={<button type="button" className="btn-primary" onClick={() => query.refetch()}>Try again</button>}>{errorMessage(query.error)}</PageMessage>;
  }
  if (!view) {
    return (
      <PageMessage title="This binder isn't available" action={<Link to="/cards" className="btn-primary">Browse cards</Link>}>
        Its owner may have stopped sharing it, or the link is wrong.
      </PageMessage>
    );
  }

  const { binder, owner } = view;
  const set = isSet ? setsObject[binder.setCode ?? ''] : undefined;
  const mine = user?.id === binder.userId;
  const ownerName = owner?.displayName ?? 'Someone';
  const copies = pockets.reduce((n, p) => n + p.count, 0);

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12">
      <header className="pt-6 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {isSet && (
            <div className="hidden sm:flex h-20 w-36 shrink-0 items-center justify-center">
              <SetMark code={binder.setCode ?? ''} name={set?.name ?? binder.name} className="h-20" />
            </div>
          )}
          <div className="min-w-0">
            <p className="label">{isSet ? 'Set binder' : 'Binder'}</p>
            <h1 className="font-display text-3xl font-semibold leading-tight break-words">{isSet ? set?.name ?? binder.name : binder.name}</h1>
            <p className="mt-1 text-sm text-muted">
              by {owner ? <Link to={`/u/${owner.userId}`} className="text-accent hover:underline">{ownerName}</Link> : ownerName}
              {' · '}{isSet ? `${ownedCount} of ${pockets.length} cards` : `${pockets.length} cards${copies !== pockets.length ? `, ${copies} copies` : ''}`}
            </p>
            {binder.description && <p className="mt-2 text-muted max-w-2xl whitespace-pre-line">{binder.description}</p>}
          </div>
        </div>
        {mine && (
          <Link to={isSet ? `/collection/sets/${binder.setCode}` : `/collection/binders/${binder.id}`} className="btn-secondary self-start md:self-auto">
            <Pencil size={16} />{isSet ? 'Open in your collection' : 'Edit binder'}
          </Link>
        )}
      </header>

      {isSet && (
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-sm mb-1.5">
              <span>{ownerName} has <strong className="tabular-nums">{ownedCount}</strong> of {pockets.length}</span>
              <span className="tabular-nums font-medium">{percent(ownedCount, pockets.length)}%</span>
            </div>
            <ProgressBar value={ownedCount} max={pockets.length} label="Cards owned" />
          </div>
          <Segmented<Show> label="Show" value={show} onChange={v => { setShow(v); setPage(0); }} options={[
            { value: 'all', label: 'All' },
            { value: 'owned', label: 'Has' },
            { value: 'missing', label: 'Missing' },
          ]} />
        </div>
      )}

      <div className="mt-6">
        {shown.length === 0 ? (
          <PageMessage title={pockets.length === 0 ? 'Nothing in this binder yet' : 'No cards to show'} />
        ) : (
          <BinderSpread items={shown} itemKey={p => p.card.id} page={page} onPage={setPage} keyboard={!open}
            label={`${binder.name} binder`} chrome="11rem"
            renderPocket={(p, i) => (
              <CardPocket card={p.card} count={p.count} foil={p.foil} missing={p.missing} eager={i < 18}
                onOpen={() => setOpen(p)} />
            )} />
        )}
      </div>

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.card.fullName ?? ''} width="max-w-sm">
        {open && (
          <div className="space-y-3">
            <img src={open.card.images.full} alt={open.card.fullName} className="w-full aspect-card rounded-[4.6%/3.3%] object-cover bg-surface-3 shadow-card" />
            <p className="text-sm text-center">
              {isSet
                ? open.missing ? `${ownerName} doesn't have this card yet.` : <>{ownerName} has {open.count}{open.foil > 0 && <> ({open.foil} foil <Sparkles size={12} className="inline text-amber-400 -mt-0.5" />)</>}</>
                : <>{open.count} in this binder</>}
            </p>
            <Link to={`/cards/${open.card.id}`} className="btn-secondary w-full">Card details</Link>
          </div>
        )}
      </Dialog>
    </div>
  );
}

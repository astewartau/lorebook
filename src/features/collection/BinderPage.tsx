import { useCallback, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, CloudUpload, Minus, MoreHorizontal, Pencil, Plus, Trash2, X,
} from 'lucide-react';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { useToast } from '../../contexts/ToastContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Dialog } from '../../ui/Dialog';
import { Sheet } from '../../ui/Sheet';
import { Menu, MenuItem, MenuSeparator } from '../../ui/Menu';
import { PageLoading, PageMessage } from '../../ui/PageState';
import { CardDetail } from '../cards/CardDetail';
import type { LorcanaCard } from '../../types';
import { BinderSpread, useMediaQuery } from './BinderSpread';
import { CardPocket } from './CardPocket';
import { AddCardsPanel } from './AddCardsPanel';
import { ShareControl, copyText, errorMessage, shareUrl } from './parts';
import { SignInPrompt } from './SignInPrompt';
import { SaveState, useBinderEditor } from './useBinderEditor';
import { addCard, moveItem, removeCard, setQuantity } from './binderCards';
import { pageOfItem } from './binderLayout';

function SaveBadge({ state }: { state: SaveState }) {
  if (state === 'saved') return <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted"><Check size={14} />Saved</span>;
  if (state === 'error') return <span role="status" className="inline-flex items-center gap-1.5 text-sm text-danger"><AlertTriangle size={14} />Not saved, retrying</span>;
  return <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted"><CloudUpload size={14} />Saving…</span>;
}

function DetailsDialog({ open, onClose, name, description, onSave }: {
  open: boolean; onClose: () => void; name: string; description: string; onSave: (name: string, description: string) => Promise<void>;
}) {
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title="Binder details">
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        await onSave(n.trim(), d.trim());
        setBusy(false);
      }}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input className="input" required maxLength={100} value={n} onChange={e => setN(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Description</span>
          <textarea className="input h-28 py-2 resize-none" maxLength={2000} value={d} onChange={e => setD(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!n.trim() || busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  );
}

export default function BinderPage() {
  const { binderId = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { getCard, isLoading: cardsLoading } = useCardData();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const editing = params.get('edit') === '1';
  const cardId = params.get('card');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'details' | 'delete' | 'add' | null>(null);
  const [sharing, setSharing] = useState(false);
  const wide = useMediaQuery('(min-width: 1024px)');

  const query = useQuery({
    queryKey: keys.binderView(binderId),
    queryFn: () => api.getBinderView(binderId),
    enabled: !!user && !!binderId,
  });
  const binder = query.data?.binder;
  const { refetch } = query;
  const reload = useCallback(() => refetch(), [refetch]);
  const { cards, change, state } = useBinderEditor(binder?.kind === 'custom' && binder.userId === user?.id ? binder : undefined, reload);

  const items = useMemo(() => cards
    .map(e => ({ entry: e, card: getCard(e.cardId) }))
    .filter((x): x is { entry: typeof x.entry; card: LorcanaCard } => !!x.card), [cards, getCard]);
  const list = useMemo(() => items.map(x => x.card), [items]);
  const inBinder = useMemo(() => new Map(cards.map(e => [e.cardId, e.quantity])), [cards]);
  const copies = cards.reduce((n, e) => n + e.quantity, 0);

  const setParam = useCallback((k: string, v: string | null) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      if (v === null) next.delete(k);
      else next.set(k, v);
      return next;
    });
  }, [setParams]);
  const hrefFor = useCallback((c: { id: number }) => {
    const next = new URLSearchParams(params);
    next.set('card', String(c.id));
    return `/collection/binders/${binderId}?${next}`;
  }, [params, binderId]);

  useEscapeKey(() => setSelected(null), selected !== null && !dialog);

  const refreshMeta = async () => {
    await qc.invalidateQueries({ queryKey: ['binders'] });
  };

  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(cards.length - 1, to));
    change(l => moveItem(l, from, target));
    setSelected(target);
    setPage(pageOfItem(target));
  };

  const add = (id: number) => {
    const existing = cards.findIndex(e => e.cardId === id);
    change(l => addCard(l, id));
    const index = existing === -1 ? cards.length : existing;
    setPage(pageOfItem(index));
  };

  if (authLoading || cardsLoading) return <PageLoading />;
  if (!user) return <SignInPrompt title="Sign in to see your binders" />;
  if (query.isLoading) return <PageLoading />;
  if (query.isError) {
    return <PageMessage title="Couldn't load this binder" action={<button type="button" className="btn-primary" onClick={() => query.refetch()}>Try again</button>}>{errorMessage(query.error)}</PageMessage>;
  }
  if (!binder) {
    return <PageMessage title="Binder not found" action={<Link to="/collection" className="btn-primary">Back to collection</Link>}>It may have been deleted, or it belongs to someone else and isn't shared.</PageMessage>;
  }
  if (binder.kind === 'set') return <Navigate to={`/collection/sets/${binder.setCode}`} replace />;
  if (binder.userId !== user.id) return <Navigate to={`/b/${binder.id}`} replace />;

  const sel = selected !== null && selected < items.length ? items[selected] : null;

  const toggleShare = async (next: boolean) => {
    setSharing(true);
    try {
      await api.updateBinderMeta(binder.id, { isPublic: next });
      await refreshMeta();
      if (next) toast.success((await copyText(shareUrl(binder.id))) ? 'Binder shared. Link copied.' : 'Binder shared.');
      else toast.info('The link no longer works.');
    } catch (e) {
      toast.error(`Couldn't change sharing: ${errorMessage(e)}`);
    } finally {
      setSharing(false);
    }
  };

  const panel = <AddCardsPanel inBinder={inBinder} onAdd={add} />;

  return (
    <div className={`mx-auto max-w-[1600px] px-4 pb-12 ${editing && wide ? 'grid grid-cols-[minmax(0,1fr)_380px] gap-6' : ''}`}>
      <div className="min-w-0">
        <div className="pt-4">
          <Link to="/collection" className="inline-flex items-center gap-1 h-9 -ml-1 pr-2 text-sm text-muted hover:text-fg">
            <ChevronLeft size={18} />Collection
          </Link>
        </div>

        <header className="mt-2 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-tight break-words">{binder.name}</h1>
            {binder.description && <p className="mt-2 text-muted max-w-2xl whitespace-pre-line">{binder.description}</p>}
            <p className="mt-2 text-sm text-muted flex items-center gap-3 flex-wrap">
              <span>{cards.length} card{cards.length === 1 ? '' : 's'}{copies !== cards.length && ` · ${copies} copies`}</span>
              <SaveBadge state={state} />
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareControl isPublic={binder.isPublic} busy={sharing} binderId={binder.id} onChange={toggleShare} />
            <button type="button" className={editing ? 'btn-primary' : 'btn-secondary'}
              onClick={() => { setSelected(null); setParam('edit', editing ? null : '1'); }}>
              {editing ? <><Check size={16} />Done</> : <><Pencil size={16} />Edit cards</>}
            </button>
            <Menu label="More binder actions" triggerClassName="icon-btn border border-line" trigger={<MoreHorizontal size={20} />}>
              {close => (
                <>
                  <MenuItem onClick={() => { close(); setDialog('details'); }}><Pencil size={16} />Rename and describe…</MenuItem>
                  <MenuSeparator />
                  <MenuItem danger onClick={() => { close(); setDialog('delete'); }}><Trash2 size={16} />Delete binder…</MenuItem>
                </>
              )}
            </Menu>
          </div>
        </header>

        {editing && (
          <div className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm flex items-center gap-3 flex-wrap">
            <span className="flex-1 min-w-[12rem] text-muted">
              Tap a card to move it, change how many or remove it. With a mouse you can also drag cards between pockets.
            </span>
            {!wide && <button type="button" className="btn-primary btn-sm h-9" onClick={() => setDialog('add')}><Plus size={16} />Add cards</button>}
          </div>
        )}

        <div className="mt-5">
          {items.length === 0 && (
            <div className="mb-4 text-center">
              <p className="font-medium">This binder is empty.</p>
              <p className="text-sm text-muted">{editing ? (wide ? 'Search on the right to add cards.' : 'Use Add cards to fill it.') : 'Edit it to add cards.'}</p>
              {!editing && <button type="button" className="btn-primary mt-3" onClick={() => setParam('edit', '1')}><Plus size={16} />Add cards</button>}
            </div>
          )}
          <BinderSpread
            items={items}
            itemKey={x => x.card.id}
            page={page}
            onPage={setPage}
            keyboard={!cardId && dialog === null}
            label={`${binder.name} binder`}
            chrome="11rem"
            renderPocket={(x, i) => editing ? (
              <div className={`absolute inset-0 ${dropAt === i && dragFrom !== i ? 'ring-[3px] ring-accent rounded-[4.6%/3.3%]' : ''} ${dragFrom === i ? 'opacity-40' : ''}`}
                draggable
                onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropAt !== i) setDropAt(i); }}
                onDragLeave={() => setDropAt(d => (d === i ? null : d))}
                onDrop={e => { e.preventDefault(); if (dragFrom !== null && dragFrom !== i) move(dragFrom, i); setDragFrom(null); setDropAt(null); }}
                onDragEnd={() => { setDragFrom(null); setDropAt(null); }}>
                <CardPocket card={x.card} count={x.entry.quantity} selected={selected === i} eager={i < 18}
                  label={`${x.card.fullName}, position ${i + 1}, ${x.entry.quantity} in binder${selected === i ? ', selected' : ''}`}
                  onOpen={() => setSelected(s => (s === i ? null : i))} />
              </div>
            ) : (
              <CardPocket card={x.card} count={x.entry.quantity} eager={i < 18}
                label={`${x.card.fullName}, ${x.entry.quantity} in binder`}
                onOpen={() => setParam('card', String(x.card.id))} />
            )}
          />
        </div>
      </div>

      {editing && wide && (
        <aside aria-label="Add cards" className="sticky top-14 self-start h-[calc(100dvh-3.5rem)] pt-4 pb-4">
          <div className="panel h-full flex flex-col overflow-hidden">
            <h2 className="px-4 pt-3 font-display text-lg font-semibold">Add cards</h2>
            {panel}
          </div>
        </aside>
      )}

      {editing && sel && selected !== null && (
        <div role="toolbar" aria-label={`Edit ${sel.card.fullName}`}
          className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[4.5rem] lg:bottom-6 w-[calc(100%-1rem)] max-w-xl panel shadow-pop p-2 flex items-center gap-1 flex-wrap justify-center">
          <span className="w-full sm:w-auto sm:flex-1 min-w-0 px-2 text-sm font-medium truncate text-center sm:text-left">{sel.card.fullName}</span>
          <div className="flex items-center">
            <button type="button" className="icon-btn" aria-label="Move to the start" disabled={selected === 0} onClick={() => move(selected, 0)}><ChevronFirst size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Move earlier" disabled={selected === 0} onClick={() => move(selected, selected - 1)}><ChevronLeft size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Move later" disabled={selected === items.length - 1} onClick={() => move(selected, selected + 1)}><ChevronRight size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Move to the end" disabled={selected === items.length - 1} onClick={() => move(selected, items.length - 1)}><ChevronLast size={18} /></button>
          </div>
          <div className="flex items-center rounded-lg bg-surface-2 mx-1">
            <button type="button" className="icon-btn" aria-label="One fewer" disabled={sel.entry.quantity <= 1}
              onClick={() => change(l => setQuantity(l, sel.card.id, sel.entry.quantity - 1))}><Minus size={16} /></button>
            <span className="w-7 text-center tabular-nums font-semibold" aria-live="polite" aria-label={`${sel.entry.quantity} in binder`}>{sel.entry.quantity}</span>
            <button type="button" className="icon-btn" aria-label="One more" disabled={sel.entry.quantity >= 99}
              onClick={() => change(l => setQuantity(l, sel.card.id, sel.entry.quantity + 1))}><Plus size={16} /></button>
          </div>
          <button type="button" className="icon-btn text-danger hover:text-danger" aria-label="Remove from binder"
            onClick={() => { change(l => removeCard(l, sel.card.id)); setSelected(null); }}><Trash2 size={18} /></button>
          <button type="button" className="icon-btn" aria-label="Deselect" onClick={() => setSelected(null)}><X size={18} /></button>
        </div>
      )}

      <Sheet open={dialog === 'add' && !wide} onClose={() => setDialog(null)} title="Add cards"
        footer={<button type="button" className="btn-primary w-full" onClick={() => setDialog(null)}>Done</button>}>
        {panel}
      </Sheet>

      {dialog === 'details' && (
        <DetailsDialog open onClose={() => setDialog(null)} name={binder.name} description={binder.description ?? ''}
          onSave={async (name, description) => {
            try {
              await api.updateBinderMeta(binder.id, { name, description });
              await refreshMeta();
              setDialog(null);
            } catch (e) {
              toast.error(`Couldn't save: ${errorMessage(e)}`);
            }
          }} />
      )}

      <Dialog open={dialog === 'delete'} onClose={() => setDialog(null)} title="Delete this binder?"
        description={`“${binder.name}” and its list of ${cards.length} cards will be deleted${binder.isPublic ? ', and its link will stop working' : ''}. Your collection isn't changed.`}
        footer={<>
          <button type="button" className="btn-ghost" data-autofocus onClick={() => setDialog(null)}>Cancel</button>
          <button type="button" className="btn-danger" onClick={async () => {
            try {
              await api.deleteBinder(binder.id);
              qc.removeQueries({ queryKey: keys.binderView(binder.id) });
              await qc.invalidateQueries({ queryKey: keys.binders(user.id) });
              toast.success('Binder deleted.');
              navigate('/collection');
            } catch (e) {
              toast.error(`Couldn't delete: ${errorMessage(e)}`);
            }
          }}>Delete binder</button>
        </>}>
        <span />
      </Dialog>

      {cardId && !editing && (
        <CardDetail cardId={Number(cardId)} list={list} hrefFor={hrefFor} onClose={() => setParam('card', null)} />
      )}
    </div>
  );
}

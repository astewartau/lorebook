import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CircleDashed, ClipboardCopy, Copy, Globe, Image as ImageIcon, LayoutGrid, List, Lock, MoreHorizontal, Pencil, Printer, Trash2,
} from 'lucide-react';
import type { Deck, LorcanaCard } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useToast } from '../../contexts/ToastContext';
import { useSignIn } from '../../app/AccountMenu';
import { PageLoading, PageMessage } from '../../ui/PageState';
import { Menu, MenuItem, MenuSeparator } from '../../ui/Menu';
import { CardDetail } from '../cards/CardDetail';
import { DeckGuide } from './DeckGuide';
import { DeckComments } from './DeckComments';
import { useOwnership } from '../cards/useOwnership';
import {
  checkDeck, countsByName, deckInks, deckLines, deckStats, groupByKind, missingSummary, ownershipNeeds, relativeDate,
} from './deckLogic';
import { DeckArt, InkRow, Segmented, StatusBadge, TagList, VisibilityBadge } from './DeckBits';
import { CostCurve, InkSplit, KindBreakdown } from './DeckStats';
import { DeckTextList, DeckVisualList, Ownership } from './DeckCardList';
import { ArtEditorDialog } from './ArtEditorDialog';
import { ExportMenu } from './ExportMenu';
import { PrintDialog } from './PrintDialog';
import { DeleteDeckDialog } from './DeckDialogs';
import { useDeck, useDeckActions } from './useDecks';

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="label">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DeckPage() {
  const { deckId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useProfile();
  const { cardsById, isLoading: cardsLoading } = useCardData();
  const { nameQuantity } = useOwnership();
  const toast = useToast();
  const { updateMeta, duplicate, create } = useDeckActions();
  const { openSignIn, signInDialog } = useSignIn();
  const { data: deck, isLoading, error } = useDeck(deckId);

  const [artOpen, setArtOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const view = params.get('view') === 'visual' ? 'visual' : 'text';

  const lines = useMemo(() => (deck ? deckLines(deck.cards, cardsById) : []), [deck, cardsById]);
  const groups = useMemo(() => groupByKind(lines), [lines]);
  const stats = useMemo(() => deckStats(lines), [lines]);
  const check = useMemo(() => (deck ? checkDeck(deck, cardsById) : null), [deck, cardsById]);
  const byName = useMemo(() => (deck ? countsByName(deck.cards, cardsById) : new Map<string, number>()), [deck, cardsById]);
  const own: Ownership | undefined = useMemo(() => (user ? { needed: n => byName.get(n) ?? 0, owned: nameQuantity } : undefined), [user, byName, nameQuantity]);
  const missing = useMemo(() => missingSummary(ownershipNeeds(lines, nameQuantity)), [lines, nameQuantity]);

  const cardParam = params.get('card');
  const hrefFor = useCallback((c: LorcanaCard) => {
    const next = new URLSearchParams(params);
    next.set('card', String(c.id));
    return `?${next.toString()}`;
  }, [params]);
  const closeCard = () => setParams(prev => { const n = new URLSearchParams(prev); n.delete('card'); return n; });

  if (error) return <PageMessage title="Couldn't load this deck">{(error as Error).message}</PageMessage>;
  if (isLoading || cardsLoading) return <PageLoading />;
  if (!deck) {
    return (
      <PageMessage title="Deck not found" action={<>
        <Link to="/decks?tab=browse" className="btn-primary">Browse public decks</Link>
        {!user && <button type="button" className="btn-secondary" onClick={openSignIn}>Sign in</button>}
        {signInDialog}
      </>}>
        This deck doesn't exist, or it's private{user ? ' and belongs to someone else' : '. If it is yours, sign in to see it'}.
      </PageMessage>
    );
  }

  const mine = !!user && deck.userId === user.id;
  const inks = deckInks(deck.cards, cardsById);
  const total = stats.total;
  const togglePublic = () => updateMeta.mutate({ deck, patch: { isPublic: !deck.isPublic } }, {
    onSuccess: () => toast.success(deck.isPublic ? 'The deck is private again' : 'Published: anyone with the link can see it'),
  });
  const copyMissing = async () => {
    const text = missing.lines.map(l => `${l.missing} ${l.fullName}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied the missing cards');
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16">
      <div className="pt-4">
        <Link to={mine ? '/decks' : '/decks?tab=browse'} className="inline-flex items-center gap-1.5 h-9 text-sm text-muted hover:text-fg">
          <ArrowLeft size={16} />{mine ? 'Your decks' : 'Decks'}
        </Link>
      </div>

      {/* Header */}
      <header className="mt-2 grid md:grid-cols-[minmax(0,420px)_1fr] gap-5 md:gap-8 items-start">
        <div className="relative group">
          <DeckArt deck={deck} full eager className="aspect-[16/9] rounded-xl border border-line shadow-card" />
          {mine && deck.cards.length > 0 && (
            <button type="button" onClick={() => setArtOpen(true)}
              className="absolute bottom-2.5 right-2.5 h-9 px-3 rounded-lg bg-black/60 text-white text-sm inline-flex items-center gap-1.5 backdrop-blur-sm hover:bg-black/75">
              <ImageIcon size={15} />Change art
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight break-words">{deck.name}</h1>
            <p className="mt-1 text-sm text-muted flex flex-wrap items-center gap-x-2 gap-y-1">
              {mine ? <VisibilityBadge isPublic={deck.isPublic} /> : (
                <span>by <Link to={`/u/${deck.userId}`} className="text-accent hover:underline">{deck.ownerName ?? 'Unknown'}</Link></span>
              )}
              <span aria-hidden>·</span>
              <span>Updated {relativeDate(deck.updatedAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <InkRow inks={inks} size={24} />
            <span className="text-sm tabular-nums"><strong className="font-semibold">{total}</strong> cards · {stats.unique} different</span>
            {check && <StatusBadge check={check} />}
          </div>

          {deck.description && <p className="text-[15px] leading-relaxed whitespace-pre-line text-fg/90 max-w-prose">{deck.description}</p>}
          {deck.tags && deck.tags.length > 0 && <TagList tags={deck.tags} size="md" onTag={t => navigate(`/decks?tab=browse&tag=${encodeURIComponent(t)}`)} />}

          <div className="flex flex-wrap gap-2 pt-1">
            {mine ? (
              <>
                <Link to={`/decks/${deck.id}/edit`} className="btn-primary"><Pencil size={17} />Edit deck</Link>
                <button type="button" className="btn-secondary" onClick={togglePublic} disabled={updateMeta.isPending} aria-pressed={!!deck.isPublic}
                  title={deck.isPublic ? 'Anyone with the link can see it' : 'Only you can see it'}>
                  {deck.isPublic ? <><Lock size={16} />Make private</> : <><Globe size={16} />Publish</>}
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary" disabled={create.isPending}
                onClick={() => (user ? void duplicate(deck, { open: true }) : openSignIn())}>
                <Copy size={17} />Copy to my decks
              </button>
            )}
            <ExportMenu deck={deck} playerName={userProfile?.displayName} />
            <button type="button" className="btn-secondary" onClick={() => setPrintOpen(true)} disabled={!total}><Printer size={17} /><span className="hidden min-[400px]:inline">Print</span><span className="sr-only min-[400px]:hidden">Print</span></button>
            {mine && (
              <Menu label="More actions" triggerClassName="icon-btn bg-surface-2 hover:bg-surface-3" trigger={<MoreHorizontal size={18} />}>
                {close => (
                  <>
                    <MenuItem onClick={() => { close(); void duplicate(deck, { open: true }); }}><Copy size={16} /> Duplicate</MenuItem>
                    {deck.cards.length > 0 && <MenuItem onClick={() => { close(); setArtOpen(true); }}><ImageIcon size={16} /> Change art</MenuItem>}
                    <MenuSeparator />
                    <MenuItem danger onClick={() => { close(); setDeleting(true); }}><Trash2 size={16} /> Delete deck</MenuItem>
                  </>
                )}
              </Menu>
            )}
          </div>
        </div>
      </header>

      {check && (check.errors.length > 0 || check.warnings.length > 0) && (
        <ul className="mt-6 space-y-1.5" aria-label="Deck problems">
          {check.errors.map(e => (e.startsWith('Deck needs') ? (
            <li key={e} className="flex gap-2 text-sm rounded-lg px-3 py-2 bg-surface-2 text-fg"><CircleDashed size={16} className="text-muted shrink-0 mt-0.5" />{e}</li>
          ) : (
            <li key={e} className="flex gap-2 text-sm rounded-lg px-3 py-2 bg-danger/10 text-fg"><AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />{e}</li>
          )))}
          {check.warnings.map(w => (
            <li key={w} className="flex gap-2 text-sm rounded-lg px-3 py-2 bg-accent-fill/10 text-fg"><AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />{w}</li>
          ))}
        </ul>
      )}

      <DeckGuide deck={deck} mine={mine} cardHref={hrefFor} />

      {total === 0 ? (
        <PageMessage title="No cards yet" action={mine ? <Link to={`/decks/${deck.id}/edit`} className="btn-primary"><Pencil size={17} />Add cards</Link> : undefined}>
          {mine ? 'Open the builder to add cards from the card browser.' : 'The owner has not added any cards.'}
        </PageMessage>
      ) : (
        <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
          <section aria-label="Cards" className="min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-2xl font-semibold">Cards</h2>
              <Segmented label="Show cards as" value={view} onChange={v => setParams(prev => { const n = new URLSearchParams(prev); if (v === 'visual') n.set('view', 'visual'); else n.delete('view'); return n; }, { replace: true })}
                options={[{ value: 'text', label: <><List size={16} />List</> }, { value: 'visual', label: <><LayoutGrid size={16} />Pictures</> }]} />
            </div>
            {view === 'text'
              ? <DeckTextList groups={groups} hrefFor={hrefFor} own={own} columns />
              : <DeckVisualList groups={groups} hrefFor={hrefFor} own={own} />}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20" aria-label="Statistics">
            <Panel title="Cost curve"><CostCurve stats={stats} /></Panel>
            <Panel title="Inks"><InkSplit stats={stats} /></Panel>
            <Panel title="Card types"><KindBreakdown stats={stats} /></Panel>
            {user && (
              <Panel title="Your collection" action={missing.copies > 0 ? (
                <button type="button" className="text-xs text-accent hover:underline inline-flex items-center gap-1" onClick={() => void copyMissing()}>
                  <ClipboardCopy size={13} />Copy list
                </button>
              ) : undefined}>
                {missing.copies === 0 ? (
                  <p className="text-sm text-success">You own every card in this deck.</p>
                ) : (
                  <>
                    <p className="text-sm mb-2">Missing <strong>{missing.copies}</strong> cop{missing.copies === 1 ? 'y' : 'ies'} of {missing.lines.length} card{missing.lines.length === 1 ? '' : 's'} <span className="text-muted">(any printing counts)</span>.</p>
                    <ul className="text-sm max-h-64 overflow-y-auto -mx-1">
                      {missing.lines.map(l => (
                        <li key={l.fullName}>
                          <Link to={hrefFor(l.card)} className="flex items-center gap-2 px-1 h-8 rounded-md hover:bg-surface-2">
                            <span className="w-7 text-right tabular-nums text-danger font-medium">{l.missing}×</span>
                            <span className="truncate flex-1">{l.fullName}</span>
                            <span className="text-xs text-muted tabular-nums">{l.owned}/{l.needed}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            )}
          </aside>
        </div>
      )}

      <DeckComments deck={deck} cardHref={hrefFor} />

      {cardParam && <CardDetail cardId={Number(cardParam)} list={lines.map(l => l.card)} hrefFor={hrefFor} onClose={closeCard} />}
      {mine && artOpen && (
        <ArtEditorDialog deck={deck} open onClose={() => setArtOpen(false)}
          onSave={avatar => updateMeta.mutate({ deck, patch: { avatar: (avatar ?? null) as unknown as Deck["avatar"] } }, { onSuccess: () => { setArtOpen(false); toast.success('Saved the deck art'); } })} />
      )}
      <PrintDialog deck={deck} open={printOpen} onClose={() => setPrintOpen(false)} />
      <DeleteDeckDialog deck={deleting ? deck : null} onClose={() => setDeleting(false)} onDeleted={() => navigate('/decks', { replace: true })} />
      {signInDialog}
    </div>
  );
}

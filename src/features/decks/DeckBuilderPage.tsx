import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowLeft, ArrowUpNarrowWide, ChevronUp, PanelLeftClose, PanelLeftOpen, SlidersHorizontal } from 'lucide-react';
import type { Deck, LorcanaCard } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCardData } from '../../contexts/CardDataContext';
import { useSignIn } from '../../app/AccountMenu';
import { PageLoading, PageMessage } from '../../ui/PageState';
import { Sheet } from '../../ui/Sheet';
import { maxCopiesFor } from '../../utils/deckValidation';
import { FilterRail } from '../cards/FilterRail';
import { SearchBox } from '../cards/SearchBox';
import { CardResults } from '../cards/CardResults';
import { CardDetail } from '../cards/CardDetail';
import { TileAction } from '../cards/CardTile';
import { filterCards, groupCards, sortCards } from '../cards/filter';
import { BrowserState, Group, SortField, activeFilterCount, clearFilters } from '../cards/browserState';
import { useBrowserState } from '../cards/useBrowserState';
import { useOwnership } from '../cards/useOwnership';
import {
  allTags, checkDeck, countsByName, deckInks, deckLines, deckStats, groupByKind, hasNonCoreCards, missingSummary, ownershipNeeds,
} from './deckLogic';
import { InkRow, Segmented } from './DeckBits';
import { Ownership, Stepper } from './DeckCardList';
import { DeckPanel, SaveIndicator } from './DeckPanel';
import { BottomSheet, useMediaQuery } from './BottomSheet';
import { DeckDraftContext, useDeckDraft } from './useDeckDraft';
import { removeTarget } from './draft';
import { useDeckMeta } from './useDeckMeta';
import { useDeck, useDeckActions, useUserDecks } from './useDecks';

const SORTS: { value: SortField; label: string }[] = [
  { value: 'cost', label: 'Cost' },
  { value: 'name', label: 'Name' },
  { value: 'ink', label: 'Ink' },
  { value: 'set', label: 'Set and number' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'owned', label: 'Copies owned' },
];

const GROUPS: { value: Group; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'cost', label: 'Group by cost' },
  { value: 'ink', label: 'Group by ink' },
  { value: 'type', label: 'Group by type' },
  { value: 'set', label: 'Group by set' },
];

const select = 'input h-9 w-auto pr-8 bg-surface';

function Builder({ deck }: { deck: Deck }) {
  const { allCards, cardsById, setsObject, isLoading } = useCardData();
  const { quantity, nameQuantity } = useOwnership();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { state: s, update } = useBrowserState();
  const draft = useDeckDraft(deck);
  const { meta, update: updateMeta, flush: flushMeta } = useDeckMeta(deck);
  const { data: myDecks } = useUserDecks();
  const wide = useMediaQuery('(min-width: 1024px)');
  const [railOpen, setRailOpen] = useState(() => window.matchMedia('(min-width: 1536px)').matches);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);

  // The browser shows what the deck can use: Core unless the deck already has
  // Infinity-only cards. Only on arrival, so the switch stays the user's.
  const formatSet = useRef(false);
  useEffect(() => {
    if (formatSet.current || isLoading) return;
    formatSet.current = true;
    if (!params.has('format') && hasNonCoreCards(deck.cards, cardsById)) update({ format: 'infinity' });
  }, [isLoading, params, deck.cards, cardsById, update]);

  // Deck side.
  const lines = useMemo(() => deckLines(draft.cards, cardsById), [draft.cards, cardsById]);
  const groups = useMemo(() => groupByKind(lines), [lines]);
  const stats = useMemo(() => deckStats(lines), [lines]);
  const check = useMemo(() => checkDeck({ cards: draft.cards }, cardsById), [draft.cards, cardsById]);
  const inks = useMemo(() => deckInks(draft.cards, cardsById), [draft.cards, cardsById]);
  const byName = useMemo(() => countsByName(draft.cards, cardsById), [draft.cards, cardsById]);
  const own: Ownership | undefined = useMemo(() => (user ? { needed: n => byName.get(n) ?? 0, owned: nameQuantity } : undefined), [user, byName, nameQuantity]);
  const missingCopies = useMemo(() => (user ? missingSummary(ownershipNeeds(lines, nameQuantity)).copies : undefined), [user, lines, nameQuantity]);
  const tagSuggestions = useMemo(() => allTags(myDecks ?? []), [myDecks]);

  const { dispatch } = draft;
  const addCard = useCallback((card: LorcanaCard) => dispatch({ type: 'add', cardId: card.id }), [dispatch]);
  // Removing from a tile takes this printing first, then any other printing of the name.
  const cardsRef = useRef(draft.cards);
  cardsRef.current = draft.cards;
  const removeCard = useCallback((card: LorcanaCard) => {
    const target = removeTarget(cardsRef.current, cardsById, card);
    if (target !== undefined) dispatch({ type: 'remove', cardId: target });
  }, [dispatch, cardsById]);
  const stepper: Stepper = useMemo(() => ({
    add: addCard,
    remove: card => dispatch({ type: 'remove', cardId: card.id }),
    canAdd: card => (byName.get(card.fullName) ?? 0) < maxCopiesFor(card),
  }), [addCard, dispatch, byName]);

  // Browser side.
  const { cards, counts } = useMemo(() => filterCards(allCards, s, quantity, nameQuantity), [allCards, s, quantity, nameQuantity]);
  const sorted = useMemo(() => sortCards(cards, s.sort, s.dir, quantity), [cards, s.sort, s.dir, quantity]);
  const resultGroups = useMemo(() => groupCards(sorted, s.group, code => setsObject[code]?.name ?? `Set ${code}`), [sorted, s.group, setsObject]);

  const browserSearch = useMemo(() => {
    const p = new URLSearchParams(params);
    p.delete('card');
    return p.toString();
  }, [params]);
  const hrefFor = useCallback((c: { id: number }) => `?${browserSearch ? `${browserSearch}&` : ''}card=${c.id}`, [browserSearch]);
  const cardParam = params.get('card');
  const closeCard = () => navigate({ search: browserSearch }, { replace: true });

  const actionFor = useCallback((card: LorcanaCard): TileAction => {
    const n = byName.get(card.fullName) ?? 0;
    const max = maxCopiesFor(card);
    const canAdd = n < max;
    return {
      tap: () => { if (canAdd) addCard(card); },
      tapLabel: canAdd ? `Add ${card.fullName} to the deck (${n} in deck)` : `${card.fullName}: deck has the most allowed (${n})`,
      add: () => addCard(card),
      addLabel: `Add a ${card.fullName}`,
      remove: () => removeCard(card),
      removeLabel: `Remove a ${card.fullName}`,
      canAdd,
      canRemove: n > 0,
      dim: n === 0,
      display: max === Infinity ? <span className={n ? 'text-accent' : 'text-muted'}>{n}</span>
        : <span className={n ? 'text-fg' : 'text-muted'}><span className={n ? 'text-accent font-semibold' : ''}>{n}</span>/{max}</span>,
    };
  }, [byName, addCard, removeCard]);

  const leave = async () => {
    await Promise.all([draft.flush(), flushMeta()]);
    navigate(`/decks/${deck.id}`);
  };

  const filterCount = activeFilterCount(s);
  const rail = <FilterRail state={s} update={update} counts={counts} />;

  const panel = (
    <DeckPanel meta={meta} onMeta={updateMeta} tagSuggestions={tagSuggestions} inks={inks} stats={stats} check={check}
      groups={groups} hrefFor={hrefFor} own={own} stepper={stepper} missingCopies={missingCopies} />
  );

  const doneButton = (
    <button type="button" className="btn-primary btn-sm h-9" onClick={() => void leave()}>Done</button>
  );

  return (
    <DeckDraftContext.Provider value={draft}>
      <div className="lg:flex min-h-[calc(100dvh-3.5rem)]">
        {/* Card browser */}
        <div className="flex-1 min-w-0 px-4 pb-40 sm:pb-24 lg:pb-10">
          <div className="sticky top-14 z-30 bg-bg/90 backdrop-blur -mx-4 px-4 pt-3 pb-3 space-y-2.5 border-b border-line lg:border-0">
            <div className="flex items-center gap-2">
              <button type="button" className="icon-btn h-11 w-11 shrink-0" aria-label="Back to the deck" title="Back to the deck" onClick={() => void leave()}>
                <ArrowLeft size={19} />
              </button>
              <SearchBox value={s.q} onChange={q => update({ q })} />
              <button type="button" className="btn-secondary h-11 shrink-0 lg:hidden" aria-label={`Filters${filterCount ? ` (${filterCount} active)` : ''}`} onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={18} /><span className="hidden sm:inline">Filters</span>
                {filterCount > 0 && <span className="h-5 min-w-5 px-1 rounded-full bg-accent-fill text-on-accent text-xs inline-flex items-center justify-center">{filterCount}</span>}
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 [scrollbar-width:none]">
              <button type="button" className="hidden lg:inline-flex btn-secondary h-9 px-3 shrink-0" aria-pressed={railOpen} onClick={() => setRailOpen(o => !o)}>
                {railOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}Filters
                {filterCount > 0 && <span className="h-5 min-w-5 px-1 rounded-full bg-accent-fill text-on-accent text-xs inline-flex items-center justify-center">{filterCount}</span>}
              </button>
              <Segmented<BrowserState['format']> label="Format" value={s.format} onChange={format => update({ format })} options={[
                { value: 'core', label: 'Core', title: 'Cards legal in Core constructed' },
                { value: 'infinity', label: 'Infinity', title: 'Every card' },
              ]} />
              <div className="flex items-center gap-1 shrink-0">
                <select aria-label="Sort by" className={select} value={s.sort} onChange={e => update({ sort: e.target.value as SortField })}>
                  {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" className="icon-btn h-9 w-9" onClick={() => update({ dir: s.dir === 'asc' ? 'desc' : 'asc' })}
                  aria-label={s.dir === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'}>
                  {s.dir === 'asc' ? <ArrowUpNarrowWide size={18} /> : <ArrowDownWideNarrow size={18} />}
                </button>
              </div>
              <select aria-label="Group" className={`${select} shrink-0`} value={s.group} onChange={e => update({ group: e.target.value as Group })}>
                {GROUPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {(filterCount > 0 || s.q) && (
                <button type="button" className="text-sm text-accent hover:underline whitespace-nowrap px-1" onClick={() => update({ ...clearFilters(s), q: '' })}>Clear</button>
              )}
            </div>
          </div>

          <div className="lg:flex lg:gap-6">
            {wide && railOpen && (
              <aside aria-label="Filters" className="w-64 shrink-0 sticky top-[9.5rem] self-start max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1 pb-6">
                {rail}
              </aside>
            )}
            <div className="flex-1 min-w-0 pt-3">
              {isLoading ? <PageLoading /> : sorted.length === 0 ? (
                <PageMessage title="No cards match" action={<>
                  {s.format === 'core' && <button type="button" className="btn-secondary" onClick={() => update({ format: 'infinity' })}>Search Infinity too</button>}
                  <button type="button" className="btn-secondary" onClick={() => update({ ...clearFilters(s), q: '' })}>Clear search and filters</button>
                </>}>Try a different search or fewer filters.</PageMessage>
              ) : (
                <>
                  <p className="text-sm text-muted mb-3" aria-live="polite">
                    {sorted.length.toLocaleString()} card{sorted.length === 1 ? '' : 's'} · tap a card to add a copy
                  </p>
                  <CardResults groups={resultGroups} view="grid" href={hrefFor} quantity={quantity} actionFor={actionFor} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Deck: a side panel on wide screens, a bottom sheet on small ones */}
        {wide ? (
          <aside aria-label="Deck" className="w-[380px] xl:w-[420px] shrink-0 border-l border-line bg-surface/40 sticky top-14 h-[calc(100dvh-3.5rem)] flex flex-col">
            <div className="flex items-center gap-2 h-12 px-4 border-b border-line shrink-0">
              <Link to={`/decks/${deck.id}`} onClick={e => { e.preventDefault(); void leave(); }} className="text-sm text-muted hover:text-fg truncate">Deck page</Link>
              <span className="ml-auto"><SaveIndicator status={draft.status} /></span>
              {doneButton}
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{panel}</div>
          </aside>
        ) : (
          <>
            <div className="fixed inset-x-0 bottom-16 sm:bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
              <button type="button" className="w-full h-14 px-4 flex items-center gap-3 text-left" aria-haspopup="dialog" onClick={() => setDeckOpen(true)}>
                <span className="font-display text-lg font-semibold tabular-nums">{stats.total}<span className="text-muted text-sm">/60</span></span>
                <InkRow inks={inks} size={18} />
                <span className="flex-1 min-w-0 truncate text-sm">{meta.name}</span>
                <SaveIndicator status={draft.status} />
                <span className="btn-secondary btn-sm h-9 shrink-0"><ChevronUp size={16} />Deck</span>
              </button>
            </div>
            <BottomSheet open={deckOpen} onClose={() => setDeckOpen(false)} title="Deck"
              header={<div className="flex items-center gap-3"><h2 className="font-semibold">Deck</h2><SaveIndicator status={draft.status} /><span className="ml-auto">{doneButton}</span></div>}>
              {panel}
            </BottomSheet>
          </>
        )}
      </div>

      <Sheet open={filtersOpen && !wide} onClose={() => setFiltersOpen(false)} title="Filters" side="left" width="sm:w-[380px]"
        footer={<div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => update(clearFilters(s))}>Clear</button>
          <button type="button" className="btn-primary flex-1" onClick={() => setFiltersOpen(false)}>Show {sorted.length.toLocaleString()} cards</button>
        </div>}>
        <div className="px-4">{rail}</div>
      </Sheet>

      {cardParam && <CardDetail cardId={Number(cardParam)} list={sorted} hrefFor={hrefFor} onClose={closeCard} />}
    </DeckDraftContext.Provider>
  );
}

export default function DeckBuilderPage() {
  const { deckId } = useParams();
  const { user, loading } = useAuth();
  const { data: deck, isLoading, error } = useDeck(deckId);
  const { duplicate, create } = useDeckActions();
  const { openSignIn, signInDialog } = useSignIn();

  if (error) return <PageMessage title="Couldn't load this deck">{(error as Error).message}</PageMessage>;
  if (isLoading || loading) return <PageLoading />;
  if (!user) {
    return (
      <PageMessage title="Sign in to build decks" action={<><button type="button" className="btn-primary" onClick={openSignIn}>Sign in</button>{signInDialog}</>}>
        The deck builder saves to your account.
      </PageMessage>
    );
  }
  if (!deck) {
    return <PageMessage title="Deck not found" action={<Link to="/decks" className="btn-primary">Your decks</Link>}>This deck doesn't exist, or it isn't yours.</PageMessage>;
  }
  if (deck.userId !== user.id) {
    return (
      <PageMessage title="This deck isn't yours" action={<>
        <button type="button" className="btn-primary" disabled={create.isPending} onClick={() => void duplicate(deck, { open: true })}>Copy to my decks</button>
        <Link to={`/decks/${deck.id}`} className="btn-secondary">View the deck</Link>
      </>}>
        You can copy it to your decks and change the copy.
      </PageMessage>
    );
  }
  // Remount on another deck, so the draft starts from it.
  return <Builder key={deck.id} deck={deck} />;
}

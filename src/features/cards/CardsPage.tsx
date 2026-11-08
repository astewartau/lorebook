import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, LayoutGrid, List, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { useSignIn } from '../../app/AccountMenu';
import { PageLoading, PageMessage } from '../../ui/PageState';
import { Sheet } from '../../ui/Sheet';
import { InkIcon } from '../../ui/GameIcons';
import { BrowserState, COST_MAX_CHIP, Group, SortField, activeFilterCount, clearFilters, toggle } from './browserState';
import { filterCards, groupCards, sortCards } from './filter';
import { useBrowserState } from './useBrowserState';
import { useOwnership } from './useOwnership';
import { FilterRail } from './FilterRail';
import { SearchBox } from './SearchBox';
import { CardResults } from './CardResults';
import { CardDetail } from './CardDetail';
import { Finish, collectAction } from './CardTile';
import type { LorcanaCard } from '../../types';

const SORTS: { value: SortField; label: string }[] = [
  { value: 'set', label: 'Set and number' },
  { value: 'name', label: 'Name' },
  { value: 'cost', label: 'Cost' },
  { value: 'ink', label: 'Ink' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'type', label: 'Type' },
  { value: 'owned', label: 'Copies owned' },
];

const GROUPS: { value: Group; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'set', label: 'Group by set' },
  { value: 'ink', label: 'Group by ink' },
  { value: 'cost', label: 'Group by cost' },
  { value: 'type', label: 'Group by type' },
  { value: 'rarity', label: 'Group by rarity' },
];

const select = 'input h-9 w-auto pr-8 bg-surface';

function FormatSwitch({ value, onChange }: { value: BrowserState['format']; onChange: (f: BrowserState['format']) => void }) {
  return (
    <div role="radiogroup" aria-label="Format" className="flex p-1 gap-1 bg-surface-2 rounded-lg shrink-0">
      {(['core', 'infinity'] as const).map(f => (
        <button key={f} type="button" role="radio" aria-checked={value === f} onClick={() => onChange(f)}
          title={f === 'core' ? 'Cards legal in Core constructed' : 'Every card (Infinity)'}
          className={`h-8 px-3 rounded-md text-sm font-medium ${value === f ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
          {f === 'core' ? 'Core' : 'Infinity'}
        </button>
      ))}
    </div>
  );
}

/** One removable chip per active filter. */
function ActiveFilters({ s, update }: { s: BrowserState; update: (p: Partial<BrowserState>) => void }) {
  const { sets } = useCardData();
  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [];
  s.inks.forEach(i => chips.push({ key: `ink-${i}`, label: <><InkIcon ink={i} size={14} />{i}</>, remove: () => update({ inks: toggle(s.inks, i) }) }));
  if (s.inkMode !== 'any') chips.push({ key: 'inkMode', label: s.inkMode === 'only' ? 'Only these inks' : 'Dual ink', remove: () => update({ inkMode: 'any' }) });
  s.costs.forEach(c => chips.push({ key: `cost-${c}`, label: `Cost ${c}${c === COST_MAX_CHIP ? '+' : ''}`, remove: () => update({ costs: toggle(s.costs, c) }) }));
  s.types.forEach(t => chips.push({ key: `type-${t}`, label: t, remove: () => update({ types: toggle(s.types, t) }) }));
  s.rarities.forEach(r => chips.push({ key: `r-${r}`, label: r, remove: () => update({ rarities: toggle(s.rarities, r) }) }));
  s.sets.forEach(code => chips.push({ key: `set-${code}`, label: sets.find(x => x.code === code)?.name ?? `Set ${code}`, remove: () => update({ sets: toggle(s.sets, code) }) }));
  s.stories.forEach(v => chips.push({ key: `st-${v}`, label: v, remove: () => update({ stories: toggle(s.stories, v) }) }));
  s.subtypes.forEach(v => chips.push({ key: `sub-${v}`, label: v, remove: () => update({ subtypes: toggle(s.subtypes, v) }) }));
  if (s.inkable !== 'any') chips.push({ key: 'inkable', label: s.inkable === 'yes' ? 'Inkable' : 'Not inkable', remove: () => update({ inkable: 'any' }) });
  const ownedLabels = { owned: 'Owned', missing: 'Not owned', playset: 'Have a playset', short: 'Short of a playset', any: '' };
  if (s.owned !== 'any') chips.push({ key: 'owned', label: ownedLabels[s.owned], remove: () => update({ owned: 'any' }) });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(c => (
        <button key={c.key} type="button" onClick={c.remove} className="chip h-7 pl-2.5 pr-2 text-xs" aria-label={`Remove filter`}>
          {c.label}<X size={12} className="text-muted" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="text-xs text-accent hover:underline px-1" onClick={() => update(clearFilters(s))}>Clear all</button>
      )}
    </div>
  );
}

export default function CardsPage() {
  const { allCards, isLoading, error, setsObject } = useCardData();
  const { user } = useAuth();
  const { addCardToCollection, removeCardFromCollection } = useCollection();
  const { quantity, nameQuantity } = useOwnership();
  const { state: s, update, search } = useBrowserState();
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { openSignIn, signInDialog } = useSignIn();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [finish, setFinish] = useState<Finish>('normal');

  const { cards, counts } = useMemo(() => filterCards(allCards, s, quantity, nameQuantity), [allCards, s, quantity, nameQuantity]);
  const sorted = useMemo(() => sortCards(cards, s.sort, s.dir, quantity), [cards, s.sort, s.dir, quantity]);
  const groups = useMemo(() => groupCards(sorted, s.group, code => setsObject[code]?.name ?? `Set ${code}`), [sorted, s.group, setsObject]);
  const infinityCount = useMemo(() => (cards.length === 0 && s.format === 'core'
    ? filterCards(allCards, { ...s, format: 'infinity' }, quantity, nameQuantity).cards.length : 0),
  [cards.length, allCards, s, quantity, nameQuantity]);

  const query = search ? `?${search}` : '';
  const href = useCallback((card: { id: number }) => `/cards/${card.id}${query}`, [query]);
  const adjust = useCallback((id: number, n: number, f: number) => {
    if (n + f > 0) addCardToCollection(id, n, f);
    else removeCardFromCollection(id, -n, -f);
  }, [addCardToCollection, removeCardFromCollection]);
  const actionFor = useMemo(() => (s.mode === 'collect' && user
    ? (card: LorcanaCard, q: { normal: number; foil: number }) => collectAction(card, q.normal, q.foil, finish, adjust)
    : undefined), [s.mode, user, finish, adjust]);
  const filterCount = activeFilterCount(s);

  if (error) {
    return <PageMessage title="Couldn't load the cards">{error}</PageMessage>;
  }

  const rail = <FilterRail state={s} update={update} counts={counts} />;

  return (
    <div className="mx-auto max-w-[1600px] px-4 lg:flex lg:gap-8">
      <aside aria-label="Filters" className="hidden lg:block w-72 shrink-0 sticky top-14 self-start max-h-[calc(100dvh-3.5rem)] overflow-y-auto pr-2 pb-8">
        <div className="flex items-center justify-between pt-5">
          <h2 className="font-display text-lg font-semibold">Filters</h2>
          {filterCount > 0 && <button type="button" className="text-sm text-accent hover:underline" onClick={() => update(clearFilters(s))}>Clear</button>}
        </div>
        {rail}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:sticky lg:top-14 z-30 lg:bg-bg/90 lg:backdrop-blur pt-4 pb-3 space-y-3">
          <div className="flex gap-2 sticky top-14 z-30 bg-bg/90 backdrop-blur -mx-4 px-4 py-2 -my-2 lg:static lg:m-0 lg:p-0 lg:bg-transparent lg:backdrop-blur-none">
            <SearchBox value={s.q} onChange={q => update({ q })} />
            <button type="button" className="btn-secondary h-11 lg:hidden shrink-0" aria-label={`Filters${filterCount ? ` (${filterCount} active)` : ""}`} onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal size={18} /><span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && <span className="h-5 min-w-5 px-1 rounded-full bg-accent-fill text-on-accent text-xs inline-flex items-center justify-center">{filterCount}</span>}
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible [scrollbar-width:none]">
            <FormatSwitch value={s.format} onChange={format => update({ format })} />
            <div className="flex items-center gap-1 shrink-0">
              <select aria-label="Sort by" className={select} value={s.sort} onChange={e => update({ sort: e.target.value as SortField })}>
                {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" className="icon-btn h-9 w-9" onClick={() => update({ dir: s.dir === 'asc' ? 'desc' : 'asc' })}
                aria-label={s.dir === 'asc' ? 'Ascending, switch to descending' : 'Descending, switch to ascending'} title={s.dir === 'asc' ? 'Ascending' : 'Descending'}>
                {s.dir === 'asc' ? <ArrowUpNarrowWide size={18} /> : <ArrowDownWideNarrow size={18} />}
              </button>
            </div>
            <select aria-label="Group" className={`${select} hidden sm:block`} value={s.group} onChange={e => update({ group: e.target.value as Group })}>
              {GROUPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div role="radiogroup" aria-label="View" className="flex p-1 gap-1 bg-surface-2 rounded-lg shrink-0">
              {([['grid', LayoutGrid, 'Grid'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" role="radio" aria-checked={s.view === v} aria-label={label} title={label} onClick={() => update({ view: v })}
                  className={`h-8 w-9 inline-flex items-center justify-center rounded-md ${s.view === v ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
                  <Icon size={17} />
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {s.mode === 'collect' && user && (
                <div role="radiogroup" aria-label="Adding" className="flex p-1 gap-1 bg-surface-2 rounded-lg">
                  {(['normal', 'foil'] as const).map(f => (
                    <button key={f} type="button" role="radio" aria-checked={finish === f} onClick={() => setFinish(f)}
                      className={`h-8 px-3 rounded-md text-sm font-medium inline-flex items-center gap-1.5 ${finish === f ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
                      {f === 'foil' && <Sparkles size={14} className="text-amber-400" />}{f === 'normal' ? 'Normal' : 'Foil'}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" aria-pressed={s.mode === 'collect'}
                onClick={() => (user ? update({ mode: s.mode === 'collect' ? 'browse' : 'collect' }) : openSignIn())}
                className={`${s.mode === 'collect' && user ? 'btn-primary' : 'btn-secondary'} h-10 whitespace-nowrap`}
                title="Tap cards to add them to your collection">
                {s.mode === 'collect' && user ? 'Done' : <><span className="sm:hidden">Collect</span><span className="hidden sm:inline">Add to collection</span></>}
              </button>
            </div>
          </div>
          <ActiveFilters s={s} update={update} />
        </div>

        {isLoading ? <PageLoading /> : sorted.length === 0 ? (
          <PageMessage title="No cards match" action={<>
            {infinityCount > 0 && <button type="button" className="btn-primary" onClick={() => update({ format: 'infinity' })}>Show {infinityCount} Infinity card{infinityCount === 1 ? '' : 's'}</button>}
            {(filterCount > 0 || s.q) && <button type="button" className="btn-secondary" onClick={() => update({ ...clearFilters(s), q: '' })}>Clear search and filters</button>}
          </>}>
            {infinityCount > 0 ? 'Nothing here is legal in Core, but some cards match in Infinity.' : 'Try a different search or fewer filters.'}
          </PageMessage>
        ) : (
          <>
            <p className="text-sm text-muted mb-3" aria-live="polite">
              {sorted.length.toLocaleString()} card{sorted.length === 1 ? '' : 's'}
              {s.mode === 'collect' && user && <> · tap a card to add a {finish} copy</>}
            </p>
            <CardResults groups={groups} view={s.view} href={href} quantity={quantity} actionFor={actionFor} />
          </>
        )}
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" side="left" width="sm:w-[380px]"
        footer={<div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => update(clearFilters(s))}>Clear</button>
          <button type="button" className="btn-primary flex-1" onClick={() => setFiltersOpen(false)}>Show {sorted.length.toLocaleString()} cards</button>
        </div>}>
        <div className="px-4">{rail}</div>
      </Sheet>

      {cardId && (
        <CardDetail cardId={Number(cardId)} list={sorted} hrefFor={href}
          onClose={() => navigate(`/cards${query}`, { replace: false })} />
      )}
      {signInDialog}
    </div>
  );
}

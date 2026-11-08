import { ReactNode, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { InkIcon, RarityIcon } from '../../ui/GameIcons';
import { BrowserState, COSTS, COST_MAX_CHIP, INKS, InkMode, Owned, RARITIES, TYPES, toggle } from './browserState';
import { FilterResult } from './filter';

interface Props {
  state: BrowserState;
  update: (patch: Partial<BrowserState>) => void;
  counts: FilterResult['counts'];
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="py-4 border-b border-line last:border-0">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="label">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex p-1 gap-1 bg-surface-2 rounded-lg">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`flex-1 h-7 px-2 rounded-md text-xs font-medium whitespace-nowrap ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Count = ({ n }: { n?: number }) => <span className="text-xs text-muted tabular-nums">{n ?? 0}</span>;

function CheckList({ items, selected, counts, onToggle, searchable }: {
  items: { value: string; label: ReactNode }[]; selected: string[]; counts: Record<string, number>;
  onToggle: (v: string) => void; searchable?: string;
}) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const shown = items.filter(i => !query || i.value.toLowerCase().includes(query.toLowerCase()));
  const limited = all || query ? shown : shown.slice(0, 8);
  return (
    <div className="space-y-1">
      {searchable && (
        <label className="relative block mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input h-8 pl-8 text-sm" placeholder={searchable} value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      )}
      {limited.map(i => (
        <label key={i.value} className={`flex items-center gap-2.5 px-2 h-8 rounded-md cursor-pointer hover:bg-surface-2 text-sm ${!counts[i.value] && !selected.includes(i.value) ? 'opacity-45' : ''}`}>
          <input type="checkbox" className="h-4 w-4 rounded border-line text-accent-fill focus:ring-accent-fill bg-surface"
            checked={selected.includes(i.value)} onChange={() => onToggle(i.value)} />
          <span className="flex-1 truncate">{i.label}</span>
          <Count n={counts[i.value]} />
        </label>
      ))}
      {!all && !query && shown.length > 8 && (
        <button type="button" className="text-sm text-accent hover:underline px-2" onClick={() => setAll(true)}>
          Show all {shown.length}
        </button>
      )}
    </div>
  );
}

export function FilterRail({ state: s, update, counts }: Props) {
  const { sets, stories, subtypes } = useCardData();
  const { user } = useAuth();

  const setItems = useMemo(() => [...sets]
    .filter(set => counts.sets[set.code] || s.sets.includes(set.code))
    .sort((a, b) => b.number - a.number)
    .map(set => ({ value: set.code, label: <><span className="text-muted tabular-nums mr-1.5">{set.code}</span>{set.name}</> })),
  [sets, counts.sets, s.sets]);

  const chip = (key: string | number, pressed: boolean, onClick: () => void, children: ReactNode, title?: string, dim?: boolean) => (
    <button key={key} type="button" aria-pressed={pressed} onClick={onClick} title={title}
      className={`chip ${dim && !pressed ? 'opacity-45' : ''}`}>{children}</button>
  );

  return (
    <div className="text-sm">
      <Section title="Ink">
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {INKS.map(ink => chip(ink, s.inks.includes(ink), () => update({ inks: toggle(s.inks, ink) }),
            <><InkIcon ink={ink} size={18} /><span className="flex-1 text-left">{ink}</span></>, `${ink}: ${counts.inks[ink] ?? 0}`, !counts.inks[ink]))}
        </div>
        <Segmented<InkMode> label="Ink matching" value={s.inkMode} onChange={inkMode => update({ inkMode })}
          options={[{ value: 'any', label: 'Any of these' }, { value: 'only', label: 'Only these' }, { value: 'dual', label: 'Dual ink' }]} />
      </Section>

      <Section title="Cost">
        <div className="grid grid-cols-5 gap-1.5">
          {COSTS.map(c => chip(c, s.costs.includes(c), () => update({ costs: toggle(s.costs, c) }),
            <span className="w-full text-center tabular-nums">{c}{c === COST_MAX_CHIP ? '+' : ''}</span>,
            `${counts.costs[String(c)] ?? 0} cards`, !counts.costs[String(c)]))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => chip(t, s.types.includes(t), () => update({ types: toggle(s.types, t) }),
            <>{t}<Count n={counts.types[t]} /></>, undefined, !counts.types[t]))}
        </div>
      </Section>

      <Section title="Rarity">
        <div className="flex flex-wrap gap-1.5">
          {RARITIES.filter(r => counts.rarities[r] || s.rarities.includes(r)).map(r => chip(r, s.rarities.includes(r), () => update({ rarities: toggle(s.rarities, r) }),
            <><RarityIcon rarity={r} size={14} />{r}</>, `${counts.rarities[r] ?? 0} cards`))}
        </div>
      </Section>

      <Section title="Inkwell">
        <Segmented label="Inkable" value={s.inkable} onChange={inkable => update({ inkable })}
          options={[{ value: 'any', label: 'Any' }, { value: 'yes', label: 'Inkable' }, { value: 'no', label: 'Not inkable' }]} />
      </Section>

      {user && (
        <Section title="Your collection">
          <div className="space-y-0.5">
            {([['any', 'All cards'], ['owned', 'Owned'], ['missing', 'Not owned'], ['playset', 'Have a playset (4+)'], ['short', 'Short of a playset']] as [Owned, string][]).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2.5 px-2 h-8 rounded-md cursor-pointer hover:bg-surface-2">
                <input type="radio" name="owned" className="h-4 w-4 border-line text-accent-fill focus:ring-accent-fill bg-surface"
                  checked={s.owned === v} onChange={() => update({ owned: v })} />
                {label}
              </label>
            ))}
          </div>
        </Section>
      )}

      <Section title="Set">
        <CheckList items={setItems} selected={s.sets} counts={counts.sets} onToggle={v => update({ sets: toggle(s.sets, v) })} />
      </Section>

      <Section title="Franchise">
        <CheckList searchable="Find a franchise" items={stories.map(v => ({ value: v, label: v }))} selected={s.stories}
          counts={counts.stories} onToggle={v => update({ stories: toggle(s.stories, v) })} />
      </Section>

      <Section title="Classification">
        <CheckList searchable="Find a classification" items={subtypes.map(v => ({ value: v, label: v }))} selected={s.subtypes}
          counts={counts.subtypes} onToggle={v => update({ subtypes: toggle(s.subtypes, v) })} />
      </Section>
    </div>
  );
}

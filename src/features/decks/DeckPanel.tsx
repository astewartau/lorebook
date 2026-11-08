import { KeyboardEvent, useId, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CloudOff, Loader2 } from 'lucide-react';
import type { LorcanaCard } from '../../types';
import { DECK_RULES } from '../../constants';
import { normalizeTag } from '../../utils/tagUtils';
import { DeckCheck, DeckGroup, DeckStats } from './deckLogic';
import { InkRow, StatusBadge, TagList } from './DeckBits';
import { CostCurve, InkSplit } from './DeckStats';
import { DeckTextList, Ownership, Stepper } from './DeckCardList';
import type { SaveStatus } from './useDeckDraft';
import type { DeckMeta } from './useDeckMeta';

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const map = {
    saved: { icon: <Check size={14} />, text: 'Saved', cls: 'text-muted' },
    pending: { icon: <Loader2 size={14} className="animate-spin" />, text: 'Saving…', cls: 'text-muted' },
    saving: { icon: <Loader2 size={14} className="animate-spin" />, text: 'Saving…', cls: 'text-muted' },
    retrying: { icon: <CloudOff size={14} />, text: "Couldn't save, retrying", cls: 'text-danger' },
  }[status];
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${map.cls}`}>
      {map.icon}{map.text}
    </span>
  );
}

export function CountMeter({ total }: { total: number }) {
  const pct = Math.min(100, (total / DECK_RULES.MIN_CARDS) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-2xl font-semibold tabular-nums leading-none">
        {total}<span className="text-muted text-lg">/{DECK_RULES.MIN_CARDS}</span>
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-label="Cards in deck"
        aria-valuemin={0} aria-valuemax={DECK_RULES.MIN_CARDS} aria-valuenow={total}>
        <div className={`h-full rounded-full ${total >= DECK_RULES.MIN_CARDS ? 'bg-success' : 'bg-accent-fill'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TagEditor({ tags, onChange, suggestions }: { tags: string[]; onChange: (t: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const t = normalizeTag(raw);
    if (t && !t.endsWith(':') && !tags.includes(t) && tags.length < 12) onChange([...tags, t]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (text.trim()) add(text);
    } else if (e.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };
  return (
    <div className="space-y-2">
      <TagList tags={tags} onRemove={t => onChange(tags.filter(x => x !== t))} />
      <input className="input h-9" list={listId} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
        onBlur={() => text.trim() && add(text)} placeholder={tags.length >= 12 ? 'Up to 12 tags' : 'Add a tag, e.g. aggro or franchise:frozen'}
        disabled={tags.length >= 12} aria-label="Add a tag" />
      <datalist id={listId}>{suggestions.filter(s => !tags.includes(s)).map(s => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

interface Props {
  meta: DeckMeta;
  onMeta: (patch: Partial<DeckMeta>) => void;
  tagSuggestions: string[];
  inks: string[];
  stats: DeckStats;
  check: DeckCheck;
  groups: DeckGroup[];
  hrefFor: (card: LorcanaCard) => string;
  own?: Ownership;
  stepper: Stepper;
  missingCopies?: number;
}

/** The deck side of the builder: name, count, checks, curve and the card list. */
export function DeckPanel({ meta, onMeta, tagSuggestions, inks, stats, check, groups, hrefFor, own, stepper, missingCopies }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nameId = useId();
  const problems = [...check.errors.filter(e => !e.startsWith('Deck needs')).map(e => ({ e, error: true })), ...check.warnings.map(e => ({ e, error: false }))];

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-3">
        <label htmlFor={nameId} className="sr-only">Deck name</label>
        <input id={nameId} value={meta.name} maxLength={100} onChange={e => onMeta({ name: e.target.value })}
          className="w-full -mx-2 px-2 h-11 rounded-lg bg-transparent border border-transparent hover:border-line focus:border-accent-fill focus:outline-none font-display text-2xl font-semibold"
          placeholder="Deck name" />
        <CountMeter total={stats.total} />
        <div className="flex items-center gap-2 flex-wrap">
          <InkRow inks={inks} />
          <StatusBadge check={check} />
          {own && missingCopies !== undefined && (
            <span className={`text-xs ml-auto ${missingCopies ? 'text-muted' : 'text-success'}`}>
              {missingCopies ? `${missingCopies} not owned` : 'All owned'}
            </span>
          )}
        </div>
        {problems.length > 0 && (
          <ul className="space-y-1">
            {problems.map(({ e, error }) => (
              <li key={e} className={`flex gap-2 text-xs rounded-md px-2.5 py-1.5 ${error ? 'bg-danger/10' : 'bg-accent-fill/10'}`}>
                <AlertTriangle size={14} className={`shrink-0 mt-px ${error ? 'text-danger' : 'text-accent'}`} />{e}
              </li>
            ))}
          </ul>
        )}
      </div>

      {stats.total > 0 && (
        <div className="grid gap-4">
          <CostCurve stats={stats} height={56} compact />
          <InkSplit stats={stats} />
        </div>
      )}

      <div>
        <button type="button" className="w-full flex items-center justify-between h-10 text-sm font-medium" aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(o => !o)}>
          <span>Description and tags{!detailsOpen && meta.tags.length > 0 && <span className="text-muted font-normal"> · {meta.tags.length} tag{meta.tags.length === 1 ? '' : 's'}</span>}</span>
          <ChevronDown size={16} className={`transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {detailsOpen && (
          <div className="space-y-3 pt-1">
            <label className="block">
              <span className="sr-only">Description</span>
              <textarea className="input h-auto py-2 resize-y" rows={4} maxLength={5000} value={meta.description}
                onChange={e => onMeta({ description: e.target.value })} placeholder="How the deck plays, key cards, mulligan tips…" />
            </label>
            <TagEditor tags={meta.tags} onChange={tags => onMeta({ tags })} suggestions={tagSuggestions} />
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Tap cards in the browser to add them. Each tap adds one copy, up to four of a name.
        </div>
      ) : (
        <DeckTextList groups={groups} hrefFor={hrefFor} own={own} stepper={stepper} dense />
      )}
    </div>
  );
}

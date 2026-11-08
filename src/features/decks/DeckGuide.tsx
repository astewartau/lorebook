import { useState } from 'react';
import { BookOpenText, Pencil } from 'lucide-react';
import type { Deck, LorcanaCard } from '../../types';
import { Markdown } from '../../ui/Markdown';
import { useDeckActions } from './useDecks';

const MAX = 20000;

const HELP = '**bold**, *italic*, ## headings, - lists, > quotes, tables, [links](https://…), and [[Card Name]] to link a card.';

interface Props {
  deck: Deck;
  mine: boolean;
  cardHref: (card: LorcanaCard) => string;
}

/** The deck's long-form Markdown guide: read it, or write it if it's yours. */
export function DeckGuide({ deck, mine, cardHref }: Props) {
  const { updateMeta } = useDeckActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const guide = deck.guide ?? '';

  if (!guide && !mine) return null;

  const start = () => {
    setDraft(guide);
    setTab('write');
    setEditing(true);
  };
  const save = () => updateMeta.mutate({ deck, patch: { guide: draft.trim() } }, { onSuccess: () => setEditing(false) });

  return (
    <section aria-labelledby="deck-guide" className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 id="deck-guide" className="font-display text-2xl font-semibold">Guide</h2>
        {mine && !editing && guide && <button type="button" className="btn-ghost btn-sm" onClick={start}><Pencil size={15} />Edit guide</button>}
      </div>

      {editing ? (
        <div className="panel overflow-hidden">
          <div role="tablist" aria-label="Guide editor" className="flex gap-1 p-1.5 border-b border-line bg-surface-2/50">
            {(['write', 'preview'] as const).map(t => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`h-8 px-3 rounded-md text-sm font-medium ${tab === t ? 'bg-surface shadow-card' : 'text-muted hover:text-fg'}`}>
                {t === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>
          {tab === 'write' ? (
            <textarea aria-label="Guide (Markdown)" value={draft} maxLength={MAX} onChange={e => setDraft(e.target.value)} rows={16}
              placeholder={'## How it plays\n\nWhat the deck wants to do, key turns, mulligans, matchups…\n\nLink cards like [[Elsa - Snow Queen]].'}
              className="block w-full min-h-[320px] resize-y bg-surface border-0 px-4 py-3 text-[15px] leading-relaxed font-mono focus:ring-0 focus:outline-none" />
          ) : (
            <div className="px-5 py-4 min-h-[320px]">
              {draft.trim() ? <Markdown cardHref={cardHref}>{draft}</Markdown> : <p className="text-muted">Nothing to preview yet.</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-line">
            <p className="text-xs text-muted flex-1 min-w-48">Markdown: {HELP}</p>
            <span className="text-xs text-muted tabular-nums">{draft.length.toLocaleString()} / {MAX.toLocaleString()}</span>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn-primary btn-sm" onClick={save} disabled={updateMeta.isPending}>
              {updateMeta.isPending ? 'Saving…' : 'Save guide'}
            </button>
          </div>
        </div>
      ) : guide ? (
        <div className="panel px-5 py-4 sm:px-7 sm:py-6 max-w-none">
          <Markdown cardHref={cardHref}>{guide}</Markdown>
        </div>
      ) : (
        <button type="button" onClick={start}
          className="w-full panel border-dashed px-5 py-8 flex flex-col items-center gap-2 text-center hover:bg-surface-2 transition-colors">
          <BookOpenText size={24} className="text-muted" />
          <span className="font-medium">Write a guide</span>
          <span className="text-sm text-muted max-w-md">Explain how the deck plays, key cards and matchups. Markdown works, and [[Card Name]] links a card.</span>
        </button>
      )}
    </section>
  );
}

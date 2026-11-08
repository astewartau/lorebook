import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { useOwnership } from '../cards/useOwnership';
import { SearchBox } from '../cards/SearchBox';
import { filterCards, sortCards } from '../cards/filter';
import { DEFAULT_STATE } from '../cards/browserState';
import { InkIcons } from '../../ui/GameIcons';

const LIMIT = 60;

/** Search every card and add it to a binder. */
export function AddCardsPanel({ inBinder, onAdd }: { inBinder: ReadonlyMap<number, number>; onAdd: (cardId: number) => void }) {
  const { allCards } = useCardData();
  const { quantity, nameQuantity } = useOwnership();
  const [q, setQ] = useState('');

  const { results, total } = useMemo(() => {
    const { cards } = filterCards(allCards, { ...DEFAULT_STATE, q, format: 'infinity' }, quantity, nameQuantity);
    return { results: sortCards(cards, 'set', 'desc', quantity).slice(0, LIMIT), total: cards.length };
  }, [allCards, q, quantity, nameQuantity]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-3 border-b border-line">
        <SearchBox value={q} onChange={setQ} />
        <p className="text-xs text-muted mt-2" aria-live="polite">
          {q ? `${total.toLocaleString()} match${total === 1 ? '' : 'es'}${total > LIMIT ? `, showing ${LIMIT}` : ''}` : 'Newest cards first. Search by name, ink, cost and more.'}
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
        {results.map(c => {
          const n = inBinder.get(c.id) ?? 0;
          const owned = quantity(c.id).total;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onAdd(c.id)} aria-label={`Add ${c.fullName} (set ${c.setCode} #${c.number})${n ? `, ${n} in binder` : ''}`}
                className="w-full flex items-center gap-3 p-1.5 pr-2 rounded-lg hover:bg-surface-2 text-left group">
                <img src={c.images.thumbnail} alt="" loading="lazy" className="h-16 aspect-card rounded-[4.6%/3.3%] object-cover shrink-0 bg-surface-3" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{c.name}</span>
                  {c.version && <span className="block text-xs text-muted truncate">{c.version}</span>}
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <InkIcons color={c.color} size={14} />
                    <span className="tabular-nums">{c.promoGrouping ?? `Set ${c.setCode}`} · #{c.number}</span>
                    {owned > 0 && <span>· own {owned}</span>}
                  </span>
                </span>
                {n > 0 && <span className="h-6 min-w-6 px-1.5 rounded-full bg-accent-fill text-on-accent text-xs font-semibold inline-flex items-center justify-center tabular-nums">{n}</span>}
                <span className="h-9 w-9 rounded-lg inline-flex items-center justify-center bg-surface-2 group-hover:bg-surface-3 shrink-0" aria-hidden><Plus size={18} /></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

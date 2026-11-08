import { useDeferredValue, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import type { LorcanaCard } from '../../types';
import { matchCards } from './cardSearch';

const LIMIT = 30;

/** Search every card by name and pick one for a profile picture. */
export function CardPickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (card: LorcanaCard) => void }) {
  const { allCards, sets } = useCardData();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const results = useMemo(() => matchCards(allCards, deferred, LIMIT), [allCards, deferred]);
  const setName = (code: string) => sets.find(s => s.code === code)?.name ?? `Set ${code}`;

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Choose a card" width="max-w-2xl"
      description="Any card's art can be your picture. You can move and zoom it next.">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input className="input h-11 pl-10" type="search" placeholder="Card name, e.g. Stitch" aria-label="Search cards by name"
          value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="mt-4 min-h-[16rem]" aria-live="polite">
        {!deferred.trim() ? (
          <p className="text-sm text-muted text-center pt-16">Start typing to find a card.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted text-center pt-16">No cards are called “{deferred.trim()}”.</p>
        ) : (
          <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {results.map(card => (
              <li key={card.id}>
                <button type="button" onClick={() => { onPick(card); close(); }}
                  className="group w-full text-left rounded-lg focus-visible:outline-offset-2"
                  aria-label={`${card.fullName}, ${setName(card.setCode)}`}>
                  <img src={card.images.thumbnail} alt="" loading="lazy"
                    className="w-full aspect-card rounded-[4.6%/3.3%] bg-surface-2 object-cover shadow-card group-hover:ring-2 group-hover:ring-accent-fill transition" />
                  <span className="mt-1.5 block text-xs font-medium leading-tight line-clamp-2">{card.fullName}</span>
                  <span className="block text-[11px] text-muted truncate">{setName(card.setCode)} · #{card.number}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {results.length >= LIMIT && <p className="mt-3 text-xs text-muted text-center">Showing the first {LIMIT}. Type more of the name to narrow it down.</p>}
      </div>
    </Dialog>
  );
}

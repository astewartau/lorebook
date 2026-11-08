import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import type { LorcanaCard } from '../../types';

interface Props {
  card: LorcanaCard;
  /** Copies to show on the badge; 0 shows the pocket as missing. */
  count: number;
  foil?: number;
  /** Faded: not owned. */
  missing?: boolean;
  /** Highlighted (selected while editing). */
  selected?: boolean;
  onOpen?: () => void;
  label?: string;
  eager?: boolean;
}

/** A card sitting in a binder pocket. Missing cards are faded with their number showing. */
function CardPocketImpl({ card, count, foil = 0, missing, selected, onOpen, label, eager }: Props) {
  const name = label ?? `${card.fullName}, #${card.number}${missing ? ', missing' : `, ${count} cop${count === 1 ? 'y' : 'ies'}`}`;
  return (
    <button type="button" onClick={onOpen} aria-label={name} aria-pressed={selected === undefined ? undefined : selected}
      className={`group absolute inset-0 overflow-hidden rounded-[4.6%/3.3%] transition-transform duration-150
        ${missing ? '' : 'shadow-card hover:-translate-y-0.5 hover:shadow-pop'}
        ${selected ? 'ring-[3px] ring-accent-fill ring-offset-2 ring-offset-surface-2' : ''}`}>
      <img src={card.images.thumbnail} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false}
        className={`h-full w-full object-cover ${missing ? 'opacity-[0.18] grayscale group-hover:opacity-40' : ''}`} />
      {missing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-muted pointer-events-none">
          <span className="text-sm sm:text-base font-semibold tabular-nums">#{card.number}</span>
        </span>
      )}
      {!missing && count > 0 && (
        <span className="absolute top-[5%] right-[5%] min-w-6 h-6 px-1.5 rounded-full bg-black/75 text-white text-xs font-semibold inline-flex items-center justify-center gap-0.5 backdrop-blur-sm">
          {count}{foil > 0 && <Sparkles size={10} className="text-amber-300" aria-hidden />}
        </span>
      )}
    </button>
  );
}

export const CardPocket = memo(CardPocketImpl);

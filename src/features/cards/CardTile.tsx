import { ReactNode, memo } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Sparkles } from 'lucide-react';
import type { LorcanaCard } from '../../types';

export type Finish = 'normal' | 'foil';

/** What tapping a tile and its stepper do: add to the collection, to a deck, and so on. */
export interface TileAction {
  tap: () => void;
  tapLabel: string;
  add: () => void;
  addLabel: string;
  remove: () => void;
  removeLabel: string;
  canAdd: boolean;
  canRemove: boolean;
  /** Shown between the buttons. */
  display: ReactNode;
  /** Fade the image (e.g. not owned, or not in the deck). */
  dim?: boolean;
}

interface Props {
  card: LorcanaCard;
  href: string;
  width: number;
  normal: number;
  foil: number;
  action?: TileAction;
  /** Card rows that are on screen first load their images eagerly. */
  eager?: boolean;
}

export const STEPPER_HEIGHT = 44;

function CardTileImpl({ card, href, width, normal, foil, action, eager }: Props) {
  const total = normal + foil;

  const image = (
    <>
      <img
        src={card.images.thumbnail}
        srcSet={`${card.images.thumbnail} 367w, ${card.images.full} 1468w`}
        sizes={`${width}px`}
        alt={card.fullName}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {total > 0 && !action && (
        <span className="absolute top-[6%] right-[6%] min-w-6 h-6 px-1.5 rounded-full bg-black/75 text-white text-xs font-semibold inline-flex items-center justify-center gap-0.5 backdrop-blur-sm"
          title={`${normal} normal, ${foil} foil`}>
          {total}{foil > 0 && <Sparkles size={10} className="text-amber-300" />}
        </span>
      )}
    </>
  );

  const frame = 'relative block w-full aspect-card overflow-hidden rounded-[4.6%/3.3%] bg-surface-3 shadow-card transition-transform duration-150';

  return (
    <div className="h-full flex flex-col gap-2">
      {action ? (
        <button type="button" className={`${frame} active:scale-[0.98] ${action.dim ? 'opacity-55 hover:opacity-100' : ''}`}
          aria-label={action.tapLabel} onClick={action.tap}>
          {image}
        </button>
      ) : (
        <Link to={href} className={`${frame} hover:-translate-y-0.5 hover:shadow-pop`} aria-label={card.fullName}>
          {image}
        </Link>
      )}
      {action && (
        <div className="flex items-center rounded-lg bg-surface border border-line overflow-hidden" style={{ height: STEPPER_HEIGHT - 8 }}>
          <button type="button" className="h-full w-10 inline-flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
            aria-label={action.removeLabel} disabled={!action.canRemove} onClick={action.remove}>
            <Minus size={16} />
          </button>
          <Link to={href} className="flex-1 text-center text-sm tabular-nums font-medium hover:text-accent truncate" title="Card details">
            {action.display}
          </Link>
          <button type="button" className="h-full w-10 inline-flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30"
            aria-label={action.addLabel} disabled={!action.canAdd} onClick={action.add}>
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/** The tile actions for adding to and removing from the collection. */
export function collectAction(card: LorcanaCard, normal: number, foil: number, finish: Finish,
  adjust: (cardId: number, normal: number, foil: number) => void): TileAction {
  const n = finish === 'normal' ? 1 : 0;
  const f = finish === 'foil' ? 1 : 0;
  const current = finish === 'foil' ? foil : normal;
  return {
    tap: () => adjust(card.id, n, f),
    tapLabel: `Add a ${finish} ${card.fullName}`,
    add: () => adjust(card.id, n, f),
    addLabel: `Add a ${finish} ${card.fullName}`,
    remove: () => adjust(card.id, -n, -f),
    removeLabel: `Remove a ${finish} ${card.fullName}`,
    canAdd: true,
    canRemove: current > 0,
    dim: normal + foil === 0,
    display: <>{normal}{foil > 0 && <span className="text-muted"> + {foil}<Sparkles size={11} className="inline -mt-0.5 ml-0.5 text-amber-400" /></span>}</>,
  };
}

export const CardTile = memo(CardTileImpl);

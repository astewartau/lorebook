import { useCardData } from '../contexts/CardDataContext';

export interface Crop {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  cardId?: number;
  crop?: Crop;
  fallback?: string;
  className?: string;
  /** Use the full-size image (for avatars larger than about 96 px). */
  hiRes?: boolean;
  /** Accessible name; decorative when omitted. */
  label?: string;
}

/**
 * A circular crop of a card's art, used as a profile or deck picture.
 * The crop maths (and the editor that sets it) live in src/features/account/crop.ts.
 */
export function CardAvatar({ cardId, crop, fallback = '?', className = 'h-9 w-9', hiRes, label }: Props) {
  const { getCard } = useCardData();
  const card = cardId !== undefined ? getCard(cardId) : undefined;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  if (!card) {
    return (
      <span {...a11y} className={`${className} rounded-full bg-surface-3 text-muted inline-flex items-center justify-center text-sm font-semibold uppercase select-none`}>
        {fallback.slice(0, 1)}
      </span>
    );
  }
  const c = crop ?? { x: 50, y: 30, scale: 1.6 };
  return (
    <span {...a11y} className={`${className} rounded-full overflow-hidden inline-block bg-surface-3 shrink-0`}>
      <img
        src={hiRes ? card.images.full : card.images.thumbnail}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
        style={{ objectPosition: `${c.x}% ${c.y}%`, transform: `scale(${c.scale})`, transformOrigin: `${c.x}% ${c.y}%` }}
        loading="lazy"
      />
    </span>
  );
}

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
}

/** A circular crop of a card's art, used as a profile or deck picture. */
export function CardAvatar({ cardId, crop, fallback = '?', className = 'h-9 w-9' }: Props) {
  const { getCard } = useCardData();
  const card = cardId !== undefined ? getCard(cardId) : undefined;
  if (!card) {
    return (
      <span className={`${className} rounded-full bg-surface-3 text-muted inline-flex items-center justify-center text-sm font-semibold uppercase`}>
        {fallback.slice(0, 1)}
      </span>
    );
  }
  const c = crop ?? { x: 50, y: 30, scale: 1.6 };
  return (
    <span className={`${className} rounded-full overflow-hidden inline-block bg-surface-3`}>
      <img
        src={card.images.thumbnail}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: `${c.x}% ${c.y}%`, transform: `scale(${c.scale})`, transformOrigin: `${c.x}% ${c.y}%` }}
        loading="lazy"
      />
    </span>
  );
}

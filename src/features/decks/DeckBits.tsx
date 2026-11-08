// Small pieces shared by the deck pages.

import { CSSProperties } from 'react';
import { AlertTriangle, Check, CircleDashed, Globe, Lock, X } from 'lucide-react';
import type { Deck, LorcanaCard } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { InkIcon } from '../../ui/GameIcons';
import { getTagCategory, getTagDisplayName, sortTags } from '../../utils/tagUtils';
import { DeckCheck, deckArtCard } from './deckLogic';

export interface Crop { x: number; y: number; scale: number }

export const DEFAULT_CROP: Crop = { x: 50, y: 22, scale: 1.15 };

export function cropStyle(c: Crop): CSSProperties {
  return { objectPosition: `${c.x}% ${c.y}%`, transform: `scale(${c.scale})`, transformOrigin: `${c.x}% ${c.y}%` };
}

/** A card's art cropped to fill any frame (banner, square or circle). */
export function ArtImage({ card, crop, eager, full }: { card: LorcanaCard; crop?: Crop; eager?: boolean; full?: boolean }) {
  return (
    <img src={full ? card.images.full : card.images.thumbnail} alt="" draggable={false}
      loading={eager ? 'eager' : 'lazy'} decoding="async"
      className="absolute inset-0 h-full w-full object-cover select-none" style={cropStyle(crop ?? DEFAULT_CROP)} />
  );
}

/** The deck's picture: its chosen art, or a stand-in from its cards. */
export function DeckArt({ deck, className = '', eager, full }: { deck: Pick<Deck, 'cards' | 'avatar' | 'name'>; className?: string; eager?: boolean; full?: boolean }) {
  const { cardsById } = useCardData();
  const card = deckArtCard(deck, cardsById);
  const crop = deck.avatar && card?.id === deck.avatar.cardId ? deck.avatar.cropData : undefined;
  return (
    <div className={`relative overflow-hidden bg-surface-3 ${className}`}>
      {card ? <ArtImage card={card} crop={crop} eager={eager} full={full} /> : (
        <span className="absolute inset-0 flex items-center justify-center font-display text-3xl text-muted/60 uppercase" aria-hidden>
          {deck.name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

export function InkRow({ inks, size = 20 }: { inks: string[]; size?: number }) {
  if (!inks.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Inks: ${inks.join(', ')}`} role="img">
      {inks.map(i => <InkIcon key={i} ink={i} size={size} />)}
    </span>
  );
}

const STATUS_STYLE: Record<DeckCheck['status'], string> = {
  core: 'bg-success/15 text-success',
  infinity: 'bg-accent-fill/15 text-accent',
  incomplete: 'bg-surface-2 text-muted',
  invalid: 'bg-danger/15 text-danger',
  empty: 'bg-surface-2 text-muted',
};

const STATUS_TITLE: Record<DeckCheck['status'], string> = {
  core: 'Legal in Core constructed',
  infinity: 'Legal in Infinity, but has cards rotated out of Core',
  incomplete: 'Fewer than 60 cards',
  invalid: 'Breaks a deck-building rule',
  empty: 'No cards yet',
};

export function StatusBadge({ check, className = '' }: { check: DeckCheck; className?: string }) {
  const Icon = check.status === 'core' || check.status === 'infinity' ? Check : check.status === 'invalid' ? AlertTriangle : CircleDashed;
  return (
    <span title={STATUS_TITLE[check.status]}
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium tabular-nums whitespace-nowrap ${STATUS_STYLE[check.status]} ${className}`}>
      <Icon size={12} aria-hidden />{check.status === 'incomplete' ? `${check.label} cards` : check.label}
    </span>
  );
}

export function VisibilityBadge({ isPublic }: { isPublic?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" title={isPublic ? 'Anyone can see this deck' : 'Only you can see this deck'}>
      {isPublic ? <Globe size={13} aria-hidden /> : <Lock size={13} aria-hidden />}{isPublic ? 'Public' : 'Private'}
    </span>
  );
}

/** "franchise:frozen" shows as a muted "franchise" and "frozen". */
export function TagLabel({ tag }: { tag: string }) {
  const cat = getTagCategory(tag);
  return <>{cat && <span className="text-muted">{cat}·</span>}{getTagDisplayName(tag)}</>;
}

export function TagList({ tags, onTag, onRemove, max, size = 'sm' }: {
  tags: string[]; onTag?: (t: string) => void; onRemove?: (t: string) => void; max?: number; size?: 'sm' | 'md';
}) {
  if (!tags.length) return null;
  const sorted = sortTags(tags);
  const shown = max ? sorted.slice(0, max) : sorted;
  const cls = `inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/60 ${size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-sm'}`;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
      {shown.map(t => (
        <li key={t}>
          {onRemove ? (
            <span className={cls}>
              <TagLabel tag={t} />
              <button type="button" className="-mr-1 h-6 w-6 inline-flex items-center justify-center rounded-full text-muted hover:text-fg hover:bg-surface-3" aria-label={`Remove tag ${t}`} onClick={() => onRemove(t)}>
                <X size={12} />
              </button>
            </span>
          ) : onTag ? (
            <button type="button" className={`${cls} hover:border-accent-fill`} onClick={() => onTag(t)} title={`Show decks tagged ${t}`}><TagLabel tag={t} /></button>
          ) : (
            <span className={cls}><TagLabel tag={t} /></span>
          )}
        </li>
      ))}
      {max && sorted.length > max && <li className="text-xs text-muted self-center">+{sorted.length - max}</li>}
    </ul>
  );
}

/** Segmented control matching the card browser's. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: {
  value: T; options: { value: T; label: React.ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 gap-1 bg-surface-2 rounded-lg shrink-0">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} title={o.title}
          className={`${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm'} rounded-md font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${value === o.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

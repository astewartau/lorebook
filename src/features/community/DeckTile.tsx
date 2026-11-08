import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { useCardData } from '../../contexts/CardDataContext';
import { InkIcon } from '../../ui/GameIcons';
import type { CustomBinder, Deck } from '../../types';
import { plural, summariseDeck } from './deckSummary';

function Banner({ cardId }: { cardId?: number }) {
  const { getCard } = useCardData();
  const card = cardId !== undefined ? getCard(cardId) : undefined;
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
      {card ? (
        <img src={card.images.thumbnail} alt="" loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[50%_22%] scale-110 transition-transform duration-300 group-hover:scale-[1.16]" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted"><Layers size={28} /></div>
      )}
    </div>
  );
}

/** A public deck: art banner, name, inks and card count. */
export function DeckTile({ deck }: { deck: Deck }) {
  const { getCard } = useCardData();
  const s = summariseDeck(deck, getCard);
  return (
    <Link to={`/decks/${deck.id}`} className="group panel overflow-hidden flex flex-col hover:border-accent-fill/60 hover:shadow-card transition">
      <Banner cardId={s.bannerCardId} />
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 group-hover:text-accent">{deck.name}</h3>
        <div className="mt-auto flex items-center justify-between gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1" aria-label={s.inks.length ? `Inks: ${s.inks.join(', ')}` : 'No inks yet'}>
            {s.inks.length ? s.inks.map(i => <InkIcon key={i} ink={i} size={20} />) : '—'}
          </span>
          <span className="tabular-nums">{plural(s.cardCount, 'card')}</span>
        </div>
      </div>
    </Link>
  );
}

/** A public binder: banner of its first card, name and size. */
export function BinderTile({ binder }: { binder: CustomBinder }) {
  const { setsObject, allCards } = useCardData();
  const bannerId = binder.cards[0]?.cardId ?? (binder.kind === 'set' ? allCards.find(c => c.setCode === binder.setCode)?.id : undefined);
  const cards = binder.cards.reduce((n, c) => n + c.quantity, 0);
  const kind = binder.kind === 'set' ? (binder.setCode && setsObject[binder.setCode]?.name) || 'Set binder' : 'Binder';
  return (
    <Link to={`/b/${binder.id}`} className="group panel overflow-hidden flex flex-col hover:border-accent-fill/60 hover:shadow-card transition">
      <Banner cardId={bannerId} />
      <div className="p-3.5 flex-1 flex flex-col gap-1">
        <h3 className="font-display text-lg font-semibold leading-snug line-clamp-2 group-hover:text-accent">{binder.name}</h3>
        <p className="text-sm text-muted truncate">{kind}{binder.kind === 'custom' && <> · {plural(cards, 'card')}</>}</p>
      </div>
    </Link>
  );
}

import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, Sparkles, X } from 'lucide-react';
import type { LorcanaCard } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCollection } from '../../contexts/CollectionContext';
import { Sheet } from '../../ui/Sheet';
import { InkIcons, InkableIcon, RarityIcon } from '../../ui/GameIcons';
import { CardRulesText, SymbolText } from '../../ui/CardText';
import { canHaveNormal } from '../../utils/cardDataUtils';
import { maxCopiesFor } from '../../utils/deckValidation';
import { AddToDeck } from '../decks';

interface Props {
  cardId: number;
  /** The cards being browsed, for previous and next. */
  list: LorcanaCard[];
  hrefFor: (card: LorcanaCard) => string;
  onClose: () => void;
}

function Stepper({ label, value, onChange, icon }: { label: string; value: number; onChange: (delta: number) => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 h-12 px-3 rounded-lg bg-surface border border-line">
      <span className="text-sm font-medium inline-flex items-center gap-1.5">{icon}{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" className="icon-btn h-9 w-9" aria-label={`Remove a ${label.toLowerCase()} copy`} disabled={value === 0} onClick={() => onChange(-1)}><Minus size={16} /></button>
        <span className="w-8 text-center tabular-nums font-semibold" aria-live="polite">{value}</span>
        <button type="button" className="icon-btn h-9 w-9" aria-label={`Add a ${label.toLowerCase()} copy`} onClick={() => onChange(1)}><Plus size={16} /></button>
      </div>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value?: number }) =>
  value === undefined ? null : (
    <div className="flex-1 rounded-lg bg-surface-2 px-3 py-2 text-center">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

const Legal = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium ${ok ? 'bg-success/15 text-success' : 'bg-surface-2 text-muted'}`}>
    {ok ? <Check size={13} /> : <X size={13} />}{label}
  </span>
);

export function CardDetail({ cardId, list, hrefFor, onClose }: Props) {
  const { getCard, allCards, setsObject } = useCardData();
  const { user } = useAuth();
  const { getCardQuantity, addCardToCollection, removeCardFromCollection } = useCollection();
  const navigate = useNavigate();
  const card = getCard(cardId);

  const index = list.findIndex(c => c.id === cardId);
  const prev = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;

  const printings = useMemo(() => (card ? allCards.filter(c => c.fullName === card.fullName && c.id !== card.id) : []), [allCards, card]);
  const ownedByName = useMemo(() => (card ? [card, ...printings].reduce((n, c) => n + getCardQuantity(c.id).total, 0) : 0), [card, printings, getCardQuantity]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && prev) navigate(hrefFor(prev), { replace: true });
      if (e.key === 'ArrowRight' && next) navigate(hrefFor(next), { replace: true });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prev, next, navigate, hrefFor]);

  if (!card) {
    return <Sheet open onClose={onClose} title="Card not found"><p className="p-6 text-muted">There's no card with this number.</p></Sheet>;
  }

  const q = getCardQuantity(card.id);
  const set = setsObject[card.setCode];
  const max = maxCopiesFor(card);

  return (
    <Sheet open onClose={onClose} title={card.fullName} hideTitle width="sm:w-[min(960px,100vw)]">
      <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-6 md:gap-8 p-4 md:p-6 md:pt-0">
        <div className="space-y-3">
          <div className="relative">
            <img src={card.images.full} alt={card.fullName} className="w-full rounded-[4.6%/3.3%] shadow-pop bg-surface-3 aspect-card object-cover" />
            {prev && (
              <Link to={hrefFor(prev)} replace aria-label={`Previous: ${prev.fullName}`}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white inline-flex items-center justify-center hover:bg-black/75">
                <ChevronLeft size={22} />
              </Link>
            )}
            {next && (
              <Link to={hrefFor(next)} replace aria-label={`Next: ${next.fullName}`}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white inline-flex items-center justify-center hover:bg-black/75">
                <ChevronRight size={22} />
              </Link>
            )}
          </div>
          <a href={card.images.full} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-fg inline-flex items-center gap-1.5">
            <ExternalLink size={14} /> Full-size image
          </a>
        </div>

        <div className="space-y-6 min-w-0">
          <header>
            <h2 className="font-display text-3xl font-semibold leading-tight">{card.name}</h2>
            {card.version && <p className="text-lg text-muted">{card.version}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-surface-2 font-semibold tabular-nums" title="Cost">
                <SymbolText text="⬡" /> {card.cost}
              </span>
              <InkIcons color={card.color} size={22} />
              <InkableIcon inkable={card.inkwell} size={20} />
              <span className="text-muted">{[card.type, ...(card.subtypes ?? [])].join(' · ')}</span>
            </div>
          </header>

          {(card.strength !== undefined || card.lore !== undefined || card.moveCost !== undefined) && (
            <div className="flex gap-2">
              <Stat label="Strength" value={card.strength} />
              <Stat label="Willpower" value={card.willpower} />
              <Stat label="Lore" value={card.lore} />
              <Stat label="Move cost" value={card.moveCost} />
            </div>
          )}

          <div className="text-[15px] leading-relaxed">
            <CardRulesText card={card} />
            {card.flavorText && <p className="mt-3 italic text-muted whitespace-pre-line">{card.flavorText}</p>}
          </div>

          {user && (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="label">Your collection</h3>
                {printings.length > 0 && <span className="text-xs text-muted">{ownedByName} across all printings</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {canHaveNormal(card.rarity) && (
                  <Stepper label="Normal" value={q.normal}
                    onChange={d => (d > 0 ? addCardToCollection(card.id, 1, 0) : removeCardFromCollection(card.id, 1, 0))} />
                )}
                <Stepper label="Foil" value={q.foil} icon={<Sparkles size={14} className="text-amber-400" />}
                  onChange={d => (d > 0 ? addCardToCollection(card.id, 0, 1) : removeCardFromCollection(card.id, 0, 1))} />
              </div>
            </section>
          )}

          {user && <AddToDeck card={card} />}

          <section className="space-y-2">
            <h3 className="label">Legality</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <Legal ok={card.legal.core} label="Core" />
              <Legal ok={card.legal.infinity} label="Infinity" />
              <span className="text-xs text-muted">{max === Infinity ? 'Any number per deck' : `Up to ${max} per deck`}</span>
            </div>
          </section>

          <section className="text-sm text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><RarityIcon rarity={card.rarity} />{card.rarity}</span>
            <span>{set?.name ?? `Set ${card.setCode}`} · #{card.number}{card.promoGrouping ? ` (${card.promoGrouping})` : ''}</span>
            {card.artists?.length ? <span>Art by {card.artists.join(', ')}</span> : null}
          </section>

          {printings.length > 0 && (
            <section className="space-y-2">
              <h3 className="label">Other printings</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {printings.map(p => (
                  <Link key={p.id} to={hrefFor(p)} replace className="shrink-0 w-24 group" title={`${setsObject[p.setCode]?.name ?? p.setCode} · ${p.rarity}`}>
                    <img src={p.images.thumbnail} alt={`${p.fullName}, ${p.rarity}`} loading="lazy"
                      className="w-full aspect-card rounded-md object-cover shadow-card group-hover:-translate-y-0.5 transition-transform" />
                    <span className="block mt-1 text-xs text-muted truncate">{p.rarity}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Sheet>
  );
}

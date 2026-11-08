import { Link } from 'react-router-dom';
import { Check, Minus, Plus } from 'lucide-react';
import type { LorcanaCard } from '../../types';
import { InkIcons } from '../../ui/GameIcons';
import { DeckGroup } from './deckLogic';

export interface Ownership {
  /** Copies by full name in the deck, all printings. */
  needed: (fullName: string) => number;
  owned: (fullName: string) => number;
}

export interface Stepper {
  add: (card: LorcanaCard) => void;
  remove: (card: LorcanaCard) => void;
  canAdd: (card: LorcanaCard) => boolean;
}

export function OwnedMark({ fullName, own }: { fullName: string; own: Ownership }) {
  const need = own.needed(fullName);
  const have = own.owned(fullName);
  if (have >= need) {
    return (
      <span className="inline-flex items-center justify-end w-12 text-success" title={`You own ${have} (needs ${need}, any printing)`}>
        <Check size={15} aria-hidden /><span className="sr-only">Owned</span>
      </span>
    );
  }
  return (
    <span className={`w-12 text-right text-xs tabular-nums whitespace-nowrap ${have === 0 ? 'text-muted' : 'text-accent'}`} title={`You own ${have} of the ${need} this deck uses (any printing)`}>
      <span className="sr-only">Owned </span>{have}/{need}
    </span>
  );
}

export const CostPip = ({ cost }: { cost: number }) => (
  <span className="h-6 w-6 shrink-0 rounded-full bg-surface-2 border border-line text-xs font-semibold tabular-nums inline-flex items-center justify-center" title={`Cost ${cost}`}>
    {cost}
  </span>
);

/** Text list grouped by type: quantity (or a stepper), cost, art, name, inks, ownership. */
export function DeckTextList({ groups, hrefFor, own, stepper, dense, columns }: {
  groups: DeckGroup[];
  hrefFor: (card: LorcanaCard) => string;
  own?: Ownership;
  stepper?: Stepper;
  dense?: boolean;
  /** Flow groups into columns on wide screens. */
  columns?: boolean;
}) {
  return (
    <div className={columns ? 'md:columns-2 gap-8' : ''}>
      {groups.map(g => (
        <section key={g.kind} className="break-inside-avoid mb-5" aria-label={`${g.label}, ${g.count}`}>
          <h3 className="flex items-baseline gap-2 px-1 pb-1.5 mb-1 border-b border-line">
            <span className="font-display text-base font-semibold">{g.label}</span>
            <span className="text-sm text-muted tabular-nums">{g.count}</span>
          </h3>
          <ul>
            {g.lines.map(({ card, quantity }) => (
              <li key={card.id} className={`flex items-center gap-2 ${dense ? 'h-10' : 'h-11'} px-1 rounded-lg hover:bg-surface-2/70`}>
                {stepper ? (
                  <span className="flex items-center shrink-0 -ml-1">
                    <button type="button" className="icon-btn h-9 w-8" aria-label={`Remove a ${card.fullName}`} onClick={() => stepper.remove(card)}><Minus size={15} /></button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-label={`${quantity} copies`}>{quantity}</span>
                    <button type="button" className="icon-btn h-9 w-8 disabled:opacity-30 disabled:pointer-events-none" aria-label={`Add a ${card.fullName}`} disabled={!stepper.canAdd(card)} onClick={() => stepper.add(card)}><Plus size={15} /></button>
                  </span>
                ) : (
                  <span className="w-6 text-right text-sm font-semibold tabular-nums shrink-0">{quantity}<span className="sr-only"> copies of</span></span>
                )}
                <CostPip cost={card.cost} />
                <Link to={hrefFor(card)} className="flex-1 min-w-0 flex items-center gap-2 group">
                  <span className="h-8 w-8 rounded-md overflow-hidden bg-surface-3 shrink-0 hidden min-[360px]:block">
                    <img src={card.images.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_20%] scale-[1.9] origin-[50%_20%]" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-medium group-hover:text-accent">{card.name}</span>
                    {card.version && <span className="block truncate text-xs text-muted">{card.version}</span>}
                  </span>
                </Link>
                <InkIcons color={card.color} size={16} />
                {own && <OwnedMark fullName={card.fullName} own={own} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const STACK_STEP = 8;

/** Card images, each stacked as many times as it is in the deck. */
export function DeckVisualList({ groups, hrefFor, own }: { groups: DeckGroup[]; hrefFor: (card: LorcanaCard) => string; own?: Ownership }) {
  return (
    <div className="space-y-6">
      {groups.map(g => (
        <section key={g.kind} aria-label={`${g.label}, ${g.count}`}>
          <h3 className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-lg font-semibold">{g.label}</span>
            <span className="text-sm text-muted tabular-nums">{g.count}</span>
          </h3>
          <ul className="grid gap-x-3 gap-y-4 grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {g.lines.map(({ card, quantity }) => {
              const layers = Math.min(quantity, 4);
              const short = own ? own.owned(card.fullName) < own.needed(card.fullName) : false;
              return (
                <li key={card.id}>
                  <Link to={hrefFor(card)} className="block group" aria-label={`${quantity} × ${card.fullName}${short ? ', not enough owned' : ''}`}
                    style={{ paddingBottom: (layers - 1) * STACK_STEP }}>
                    <span className="relative block">
                      {Array.from({ length: layers - 1 }, (_, i) => (
                        <span key={i} aria-hidden className="absolute inset-x-0 aspect-card rounded-[4.6%/3.3%] overflow-hidden bg-surface-3 shadow-card border border-black/20"
                          style={{ top: (layers - 1 - i) * STACK_STEP }}>
                          <img src={card.images.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover brightness-[.7]" />
                        </span>
                      ))}
                      <span className="relative block aspect-card rounded-[4.6%/3.3%] overflow-hidden bg-surface-3 shadow-card transition-transform group-hover:-translate-y-0.5">
                        <img src={card.images.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                    </span>
                  </Link>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-surface-2 font-semibold tabular-nums inline-flex items-center justify-center">{quantity}×</span>
                    {short && own && <span className="text-accent tabular-nums" title="Owned of needed, any printing">{own.owned(card.fullName)}/{own.needed(card.fullName)} owned</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

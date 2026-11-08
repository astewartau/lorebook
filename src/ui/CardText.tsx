import { Fragment, ReactNode } from 'react';
import { CircleDot, Diamond, Hexagon, RotateCw, Shield, Swords } from 'lucide-react';
import type { LorcanaCard } from '../types';

// LorcanaJSON writes game symbols as these characters.
const SYMBOLS: Record<string, { icon: typeof Diamond; label: string }> = {
  '⟳': { icon: RotateCw, label: 'exert' },
  '⬡': { icon: Hexagon, label: 'ink' },
  '¤': { icon: Swords, label: 'strength' },
  '⛉': { icon: Shield, label: 'willpower' },
  '◊': { icon: Diamond, label: 'lore' },
  '◉': { icon: CircleDot, label: 'inkwell' },
};
const PATTERN = /([⟳⬡¤⛉◊◉])/;

/** Text with game symbols drawn as small labelled icons. */
export function SymbolText({ text }: { text: string }) {
  return (
    <>
      {text.split(PATTERN).map((part, i) => {
        const sym = SYMBOLS[part];
        if (!sym) return <Fragment key={i}>{part}</Fragment>;
        const Icon = sym.icon;
        return (
          <span key={i} role="img" aria-label={sym.label} title={sym.label} className="inline-flex align-[-2px] mx-px">
            <Icon size={14} strokeWidth={2.25} />
          </span>
        );
      })}
    </>
  );
}

/** A card's rules text: keywords, then named abilities with their names in small caps. */
export function CardRulesText({ card }: { card: LorcanaCard }) {
  const abilities = card.abilities ?? [];
  if (!abilities.length) {
    return card.fullText ? <p className="whitespace-pre-line"><SymbolText text={card.fullText} /></p> : null;
  }
  const blocks: ReactNode[] = abilities.map((a, i) => {
    const text = a.fullText ?? a.effect ?? '';
    if (a.type !== 'keyword' && a.name && text.startsWith(a.name)) {
      return (
        <p key={i}>
          <span className="font-semibold tracking-wide text-[0.85em] uppercase">{a.name}</span>
          <SymbolText text={text.slice(a.name.length)} />
        </p>
      );
    }
    return <p key={i} className="whitespace-pre-line"><SymbolText text={text} /></p>;
  });
  return <div className="space-y-2">{blocks}</div>;
}

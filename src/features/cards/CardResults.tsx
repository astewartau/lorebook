import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LorcanaCard } from '../../types';
import { InkIcons, RarityIcon } from '../../ui/GameIcons';
import { CardGroup } from './filter';
import { CardTile, STEPPER_HEIGHT, TileAction } from './CardTile';
import { Row, VirtualRows, useWidth } from './VirtualRows';

interface Props {
  groups: CardGroup[];
  view: 'grid' | 'list';
  href: (card: LorcanaCard) => string;
  quantity: (cardId: number) => { normal: number; foil: number; total: number };
  /** Per-card tap and stepper behaviour (collecting, deck building). Without it, tiles open the card. */
  actionFor?: (card: LorcanaCard, q: { normal: number; foil: number }) => TileAction;
}

type ResultRow = Row & ({ kind: 'header'; label: string; count: number } | { kind: 'cards'; cards: LorcanaCard[]; first: boolean });

const GAP = 14;
const HEADER = 52;
const LIST_ROW = 56;

export function CardResults({ groups, view, href, quantity, actionFor }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const minTile = width < 500 ? 150 : 180;
  const columns = view === 'list' ? 1 : Math.max(2, Math.floor((width + GAP) / (minTile + GAP)));
  const tileWidth = view === 'list' ? width : Math.floor((width - GAP * (columns - 1)) / columns);
  const rowHeight = view === 'list'
    ? LIST_ROW
    : Math.round(tileWidth * 512 / 367) + (actionFor ? STEPPER_HEIGHT : 0) + GAP;

  const rows = useMemo(() => {
    const out: ResultRow[] = [];
    let index = 0;
    for (const g of groups) {
      if (g.label) out.push({ kind: 'header', key: `h-${g.key}`, height: HEADER, label: g.label, count: g.cards.length });
      for (let i = 0; i < g.cards.length; i += columns) {
        out.push({ kind: 'cards', key: `${g.key}-${i}`, height: rowHeight, cards: g.cards.slice(i, i + columns), first: index++ < 2 });
      }
    }
    return out;
  }, [groups, columns, rowHeight]);

  return (
    <div ref={ref}>
      {width > 0 && (
        <VirtualRows rows={rows} render={row => {
          if (row.kind === 'header') {
            return (
              <div className="h-full flex items-end pb-3 gap-3">
                <h2 className="font-display text-lg font-semibold">{row.label}</h2>
                <span className="text-sm text-muted pb-0.5">{row.count}</span>
              </div>
            );
          }
          if (view === 'list') {
            const c = row.cards[0];
            return <ListRow card={c} href={href(c)} q={quantity(c.id)} />;
          }
          return (
            <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: GAP, height: rowHeight - GAP }}>
              {row.cards.map(c => {
                const q = quantity(c.id);
                return <CardTile key={c.id} card={c} href={href(c)} width={tileWidth} normal={q.normal} foil={q.foil} action={actionFor?.(c, q)} eager={row.first} />;
              })}
            </div>
          );
        }} />
      )}
    </div>
  );
}

function ListRow({ card, href, q }: { card: LorcanaCard; href: string; q: { normal: number; foil: number; total: number } }) {
  return (
    <Link to={href} className="h-full flex items-center gap-3 px-2 border-b border-line hover:bg-surface-2 rounded-md">
      <span className="h-10 w-10 rounded-md overflow-hidden bg-surface-3 shrink-0">
        <img src={card.images.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_20%] scale-[1.9] origin-[50%_20%]" />
      </span>
      <span className="w-8 text-center font-semibold tabular-nums">{card.cost}</span>
      <InkIcons color={card.color} size={18} />
      <span className="flex-1 min-w-0">
        <span className="block truncate font-medium">{card.name}</span>
        {card.version && <span className="block truncate text-xs text-muted">{card.version}</span>}
      </span>
      <span className="hidden md:block w-28 text-sm text-muted truncate">{card.type}</span>
      <span className="hidden sm:inline-flex w-6 justify-center"><RarityIcon rarity={card.rarity} /></span>
      <span className="hidden sm:block w-20 text-sm text-muted tabular-nums text-right">{card.setCode} · {card.number}</span>
      <span className="w-12 text-right text-sm tabular-nums">
        {q.total > 0 ? <>{q.total}{q.foil > 0 && <Sparkles size={11} className="inline ml-0.5 -mt-0.5 text-amber-400" />}</> : <span className="text-muted">–</span>}
      </span>
    </Link>
  );
}

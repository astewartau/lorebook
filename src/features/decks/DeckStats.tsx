import { InkIcon } from '../../ui/GameIcons';
import { CURVE_MAX, DeckStats } from './deckLogic';

const INK_FILL: Record<string, string> = {
  Amber: 'bg-ink-amber', Amethyst: 'bg-ink-amethyst', Emerald: 'bg-ink-emerald',
  Ruby: 'bg-ink-ruby', Sapphire: 'bg-ink-sapphire', Steel: 'bg-ink-steel',
};

/** Bars per cost; the solid part is inkable, the pale part is not. */
export function CostCurve({ stats, height = 112, compact }: { stats: DeckStats; height?: number; compact?: boolean }) {
  const max = Math.max(1, ...stats.curve.map(c => c.inkable + c.uninkable));
  const summary = stats.curve.map(c => `cost ${c.cost}${c.cost === CURVE_MAX ? ' or more' : ''}: ${c.inkable + c.uninkable}`).join(', ');
  return (
    <figure>
      <div role="img" aria-label={`Cost curve. ${summary}.`} className="flex items-end gap-1.5" style={{ height: height + 20 }}>
        {stats.curve.map(c => {
          const n = c.inkable + c.uninkable;
          return (
            <div key={c.cost} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`Cost ${c.cost}${c.cost === CURVE_MAX ? '+' : ''}: ${n} (${c.inkable} inkable)`}>
              <span className={`text-xs tabular-nums mb-1 ${n ? 'text-fg font-medium' : 'text-muted/60'}`}>{n}</span>
              <div className="w-full flex flex-col justify-end rounded-t-[5px] overflow-hidden" style={{ height: (n / max) * height }}>
                {c.uninkable > 0 && <div className="bg-accent-fill/35" style={{ height: `${(c.uninkable / n) * 100}%` }} />}
                {c.inkable > 0 && <div className="bg-accent-fill" style={{ height: `${(c.inkable / n) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 border-t border-line pt-1" aria-hidden>
        {stats.curve.map(c => <span key={c.cost} className="flex-1 text-center text-xs text-muted tabular-nums">{c.cost}{c.cost === CURVE_MAX ? '+' : ''}</span>)}
      </div>
      {!compact && (
        <figcaption className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-fill" />Inkable</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-fill/35" />Not inkable</span>
          <span className="ml-auto">Average cost {stats.averageCost}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** One bar split by ink, with counts. Dual-ink cards count for both. */
export function InkSplit({ stats }: { stats: DeckStats }) {
  const sum = stats.inks.reduce((n, i) => n + i.count, 0);
  if (!sum) return <p className="text-sm text-muted">No cards yet.</p>;
  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5" aria-hidden>
        {stats.inks.map(i => <div key={i.ink} className={INK_FILL[i.ink] ?? 'bg-muted'} style={{ width: `${(i.count / sum) * 100}%` }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {stats.inks.map(i => (
          <li key={i.ink} className="inline-flex items-center gap-1.5">
            <InkIcon ink={i.ink} size={18} />{i.ink}<span className="text-muted tabular-nums">{i.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KindBreakdown({ stats }: { stats: DeckStats }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {stats.kinds.map(k => (
        <div key={k.kind} className="flex justify-between gap-2">
          <dt className="text-muted">{k.label}</dt><dd className="tabular-nums font-medium">{k.count}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-2">
        <dt className="text-muted">Inkable</dt>
        <dd className="tabular-nums font-medium">{stats.inkable}<span className="text-muted font-normal">/{stats.total}</span></dd>
      </div>
    </dl>
  );
}

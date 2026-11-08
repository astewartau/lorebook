import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import { CURVE_MAX, deckInks, deckLines, deckStats, groupByKind, totalCards } from './deckLogic';
import { validateDeck } from '../../utils/deckValidation';
import { Segmented } from './DeckBits';

type Layout = 'proxies' | 'list' | 'images';

// Print-only styles: the app and any open dialog are hidden, only #print-root
// prints, always black on white whatever the screen theme.
const PRINT_CSS = `
@media print {
  @page { margin: 10mm; }
  :root { color-scheme: light !important; }
  html, body { background: #fff !important; color: #111 !important; }
  body > *:not(#print-root) { display: none !important; }
  #print-root { display: block !important; width: 100%; color: #111; background: #fff;
    font-family: 'Inter Variable', system-ui, sans-serif; font-size: 10pt; line-height: 1.35;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #print-root * { box-sizing: border-box; }

  .lp-proxies { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; justify-content: center; }
  .lp-proxies.gap { gap: 1mm; }
  .lp-proxies img { width: 63mm; height: 88mm; object-fit: cover; display: block; break-inside: avoid; }
  .lp-proxies.lines img { outline: 0.2mm solid #999; }

  .lp-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 8mm;
    border-bottom: 0.6mm solid #111; padding-bottom: 3mm; margin-bottom: 5mm; }
  .lp-head h1 { font-family: 'Fraunces Variable', Georgia, serif; font-size: 22pt; font-weight: 600; line-height: 1.1; margin: 0; }
  .lp-head .meta { margin-top: 1.5mm; color: #444; font-size: 9.5pt; }
  .lp-head .total { text-align: right; white-space: nowrap; }
  .lp-head .total b { display: block; font-size: 20pt; line-height: 1; }
  .lp-head .total span { font-size: 8.5pt; color: #555; text-transform: uppercase; letter-spacing: .06em; }

  .lp-list { column-count: 2; column-gap: 9mm; }
  .lp-group { break-inside: avoid; margin: 0 0 5mm; }
  .lp-group h2 { display: flex; justify-content: space-between; font-size: 8.5pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: .07em; color: #333; margin: 0 0 1.5mm; padding-bottom: 1mm; border-bottom: 0.3mm solid #bbb; }
  .lp-row { display: grid; grid-template-columns: 6mm 6mm 1fr auto; align-items: baseline; column-gap: 2mm;
    padding: 0.9mm 0; border-bottom: 0.2mm solid #eee; break-inside: avoid; }
  .lp-row .q { font-weight: 700; text-align: right; }
  .lp-row .c { justify-self: center; width: 5mm; height: 5mm; border: 0.3mm solid #666; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center; font-size: 7.5pt; font-weight: 600; }
  .lp-row .n { min-width: 0; }
  .lp-row .n b { font-weight: 600; }
  .lp-row .n i { font-style: normal; color: #555; }
  .lp-row .s { color: #777; font-size: 8pt; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .lp-summary { display: flex; flex-wrap: wrap; gap: 2mm 7mm; margin-top: 2mm; padding-top: 3mm; border-top: 0.3mm solid #bbb;
    font-size: 8.5pt; color: #333; }
  .lp-summary b { font-weight: 600; color: #111; }
  .lp-foot { margin-top: 6mm; font-size: 7.5pt; color: #888; text-align: center; }

  .lp-images { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3mm; }
  .lp-images figure { position: relative; margin: 0; break-inside: avoid; }
  .lp-images img { width: 100%; aspect-ratio: 367 / 512; object-fit: cover; border-radius: 2mm; display: block; }
  .lp-images figcaption { position: absolute; left: 50%; bottom: 2mm; transform: translateX(-50%);
    background: #111; color: #fff; font-size: 10pt; font-weight: 700; padding: 0.6mm 2.6mm; border-radius: 99px;
    border: 0.4mm solid #fff; }
}`;

function preload(urls: string[]) {
  return Promise.all(Array.from(new Set(urls)).map(src => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  })));
}

/** Print proxies (one real-size card per copy), a deck list, or a picture sheet. */
export function PrintDialog({ deck, open, onClose }: { deck: Deck; open: boolean; onClose: () => void }) {
  const { cardsById } = useCardData();
  const [layout, setLayout] = useState<Layout>('proxies');
  const [cutLines, setCutLines] = useState(true);
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => groupByKind(deckLines(deck.cards, cardsById)), [deck.cards, cardsById]);
  const copies = useMemo(() => groups.flatMap(g => g.lines.flatMap(l => Array.from({ length: l.quantity }, () => l.card))), [groups]);
  const total = totalCards(deck.cards);
  const pages = Math.ceil(copies.length / 9);

  const print = async () => {
    setBusy(true);
    if (layout !== 'list') await preload(copies.map(c => c.images.full));
    setBusy(false);
    // Let the print tree render with loaded images first.
    requestAnimationFrame(() => window.print());
  };

  const printRoot = typeof document !== 'undefined' ? document.getElementById('print-root') : null;

  const inks = useMemo(() => deckInks(deck.cards, cardsById), [deck.cards, cardsById]);
  const stats = useMemo(() => deckStats(groups.flatMap(g => g.lines)), [groups]);
  const legality = useMemo(() => {
    const v = validateDeck(deck, cardsById);
    return v.coreLegal ? 'Core legal' : v.isValid ? 'Infinity only' : 'Not yet legal';
  }, [deck, cardsById]);
  const printed = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  const head = (
    <div className="lp-head">
      <div>
        <h1>{deck.name}</h1>
        <div className="meta">
          {[inks.join(' / '), legality, deck.ownerName ? `by ${deck.ownerName}` : null, printed].filter(Boolean).join('  ·  ')}
        </div>
      </div>
      <div className="total"><b>{total}</b><span>cards</span></div>
    </div>
  );

  const content = (
    <>
      <style>{PRINT_CSS}</style>
      {layout === 'proxies' && (
        <div className={`lp-proxies ${cutLines ? 'lines gap' : ''}`}>
          {copies.map((c, i) => <img key={i} src={c.images.full} alt={c.fullName} />)}
        </div>
      )}
      {layout === 'list' && (
        <>
          {head}
          <div className="lp-list">
            {groups.map(g => (
              <section key={g.kind} className="lp-group">
                <h2><span>{g.label}</span><span>{g.count}</span></h2>
                {g.lines.map(l => (
                  <div key={l.card.id} className="lp-row">
                    <span className="q">{l.quantity}</span>
                    <span className="c">{l.card.cost}</span>
                    <span className="n"><b>{l.card.name}</b>{l.card.version && <i> – {l.card.version}</i>}</span>
                    <span className="s">{l.card.setCode}·{l.card.number}</span>
                  </div>
                ))}
              </section>
            ))}
          </div>
          <div className="lp-summary">
            <span><b>Curve</b> {stats.curve.map(c => `${c.cost === CURVE_MAX ? `${c.cost}+` : c.cost}: ${c.inkable + c.uninkable}`).join('   ')}</span>
            <span><b>Inkable</b> {stats.curve.reduce((n, c) => n + c.inkable, 0)} of {total}</span>
            <span><b>Inks</b> {stats.inks.map(i => `${i.ink} ${i.count}`).join(', ')}</span>
          </div>
          <p className="lp-foot">Printed from Lorebook</p>
        </>
      )}
      {layout === 'images' && (
        <>
          {head}
          <div className="lp-images">
            {groups.flatMap(g => g.lines).map(l => (
              <figure key={l.card.id}><img src={l.card.images.full} alt={l.card.fullName} /><figcaption>×{l.quantity}</figcaption></figure>
            ))}
          </div>
          <p className="lp-foot">Printed from Lorebook</p>
        </>
      )}
    </>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Print" width="max-w-lg"
        footer={<>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" disabled={!total || busy} onClick={() => void print()}>
            <Printer size={17} />{busy ? 'Loading images…' : 'Print'}
          </button>
        </>}>
        <div className="space-y-4">
          <Segmented label="What to print" value={layout} onChange={setLayout} options={[
            { value: 'proxies', label: 'Proxies' },
            { value: 'list', label: 'Deck list' },
            { value: 'images', label: 'Card sheet' },
          ]} />
          {layout === 'proxies' && (
            <>
              <p className="text-sm text-muted">
                Every copy at real card size (63 × 88 mm), nine to a page: {copies.length} cards on {pages} page{pages === 1 ? '' : 's'}.
                Print at 100% scale (not “fit to page”). Proxies are for playtesting, not for sanctioned play.
              </p>
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" checked={cutLines} onChange={e => setCutLines(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-accent-fill focus:ring-accent-fill bg-surface" />
                Thin cutting lines between cards
              </label>
              <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto rounded-lg bg-surface-2 p-2" aria-hidden>
                {copies.slice(0, 60).map((c, i) => <img key={i} src={c.images.thumbnail} alt="" loading="lazy" className="w-full aspect-card rounded-sm object-cover" />)}
              </div>
            </>
          )}
          {layout === 'list' && <p className="text-sm text-muted">A tidy two-column list grouped by type, with cost and set numbers, plus the curve. Good for deck registration.</p>}
          {layout === 'images' && <p className="text-sm text-muted">One picture of each different card with its quantity, five to a row.</p>}
        </div>
      </Dialog>
      {open && printRoot && createPortal(content, printRoot)}
    </>
  );
}

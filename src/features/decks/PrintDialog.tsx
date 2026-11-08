import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import { deckLines, groupByKind, totalCards } from './deckLogic';
import { Segmented } from './DeckBits';

type Layout = 'proxies' | 'list' | 'images';

// Print-only styles: the app and any open dialog are hidden, only #print-root prints.
const PRINT_CSS = `
@media print {
  @page { margin: 8mm; }
  body > *:not(#print-root) { display: none !important; }
  #print-root { display: block !important; color: #000; font-family: 'Inter Variable', system-ui, sans-serif; }
  .lp-proxies { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; justify-content: center; }
  .lp-proxies.gap { gap: 1mm; }
  .lp-proxies img { width: 63mm; height: 88mm; object-fit: cover; display: block; break-inside: avoid; }
  .lp-proxies.lines img { outline: 0.2mm solid #999; }
  .lp-head { border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 12px; }
  .lp-head h1 { font-size: 20px; margin: 0; }
  .lp-head p { font-size: 11px; margin: 2px 0 0; color: #444; }
  .lp-list { columns: 2; column-gap: 24px; font-size: 11px; }
  .lp-group { break-inside: avoid; margin-bottom: 10px; }
  .lp-group h2 { font-size: 12px; margin: 0 0 3px; border-bottom: 1px solid #ccc; }
  .lp-row { display: flex; gap: 8px; padding: 1px 0; }
  .lp-row b { width: 18px; text-align: right; }
  .lp-row span { color: #777; margin-left: auto; white-space: nowrap; }
  .lp-images { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .lp-images figure { margin: 0; break-inside: avoid; text-align: center; font-size: 10px; font-weight: 600; }
  .lp-images img { width: 100%; border-radius: 3px; display: block; }
  .lp-foot { margin-top: 12px; font-size: 9px; color: #888; text-align: center; }
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

  const head = (
    <div className="lp-head">
      <h1>{deck.name}</h1>
      <p>{total} cards{deck.ownerName ? ` · by ${deck.ownerName}` : ''}</p>
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
              <div key={g.kind} className="lp-group">
                <h2>{g.label} ({g.count})</h2>
                {g.lines.map(l => (
                  <div key={l.card.id} className="lp-row"><b>{l.quantity}</b>{l.card.fullName}<span>{l.card.setCode} #{l.card.number} · {l.card.cost}</span></div>
                ))}
              </div>
            ))}
          </div>
          <p className="lp-foot">Printed from Lorebook</p>
        </>
      )}
      {layout === 'images' && (
        <>
          {head}
          <div className="lp-images">
            {groups.flatMap(g => g.lines).map(l => (
              <figure key={l.card.id}><img src={l.card.images.full} alt={l.card.fullName} /><figcaption>{l.quantity}×</figcaption></figure>
            ))}
          </div>
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
          {layout === 'list' && <p className="text-sm text-muted">A two-column list grouped by type, with set numbers, for deck registration or sleeving.</p>}
          {layout === 'images' && <p className="text-sm text-muted">One picture per different card with its quantity, five to a row.</p>}
        </div>
      </Dialog>
      {open && printRoot && createPortal(content, printRoot)}
    </>
  );
}

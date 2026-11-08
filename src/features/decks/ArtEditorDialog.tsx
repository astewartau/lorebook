import { PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from 'react';
import { Move } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { Dialog } from '../../ui/Dialog';
import { ArtImage, Crop, DEFAULT_CROP } from './DeckBits';
import { deckArtCard, deckLines, groupByKind } from './deckLogic';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-muted mb-1"><span>{label}</span><span className="tabular-nums">{format(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-6 accent-[rgb(var(--accent-fill))]" />
    </label>
  );
}

/** Pick one of the deck's cards as its picture and frame it: drag to move, slide to zoom. */
export function ArtEditorDialog({ deck, open, onClose, onSave }: {
  deck: Deck; open: boolean; onClose: () => void; onSave: (avatar: Deck['avatar'] | null) => void;
}) {
  const { cardsById } = useCardData();
  const current = deckArtCard(deck, cardsById);
  const [cardId, setCardId] = useState<number | undefined>(deck.avatar?.cardId ?? current?.id);
  const [crop, setCrop] = useState<Crop>(deck.avatar?.cropData ?? DEFAULT_CROP);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);

  const choices = useMemo(() => {
    const seen = new Set<string>();
    return groupByKind(deckLines(deck.cards, cardsById)).flatMap(g => g.lines.map(l => l.card)).filter(c => {
      if (seen.has(c.images.thumbnail)) return false;
      seen.add(c.images.thumbnail);
      return true;
    });
  }, [deck.cards, cardsById]);
  const card = cardId !== undefined ? cardsById.get(cardId) : undefined;

  const onDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, crop };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const el = frame.current;
    if (!d || !el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    // The portrait art covers the wide frame: most of the slack is vertical.
    const slackY = Math.max(w * (512 / 367) - h, h * 0.3);
    const slackX = w * 0.3;
    setCrop({
      ...d.crop,
      x: clamp(d.crop.x - ((e.clientX - d.x) / slackX) * 100 / d.crop.scale, 0, 100),
      y: clamp(d.crop.y - ((e.clientY - d.y) / slackY) * 100 / d.crop.scale, 0, 100),
    });
  };
  const onUp = () => { drag.current = null; };

  return (
    <Dialog open={open} onClose={onClose} title="Deck art" width="max-w-3xl"
      description="Choose a card from the deck, then drag the picture to frame it."
      footer={<>
        <button type="button" className="btn-ghost mr-auto" onClick={() => onSave(null)} disabled={!deck.avatar}>Use the default</button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!card} onClick={() => card && onSave({ cardId: card.id, cropData: crop })}>Save</button>
      </>}>
      <div className="grid md:grid-cols-[1fr_220px] gap-5">
        <div className="space-y-4 min-w-0">
          <div ref={frame} className="relative aspect-[16/9] rounded-xl overflow-hidden bg-surface-3 cursor-grab active:cursor-grabbing touch-none border border-line"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            role="img" aria-label="Banner preview; drag to move the picture">
            {card && <ArtImage card={card} crop={crop} full eager />}
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-xs px-2 py-1 pointer-events-none">
              <Move size={12} />Drag
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-surface-3 shrink-0 border border-line" aria-label="Small preview" role="img">
              {card && <ArtImage card={card} crop={crop} />}
            </div>
            <div className="flex-1 grid gap-2">
              <Slider label="Zoom" value={crop.scale} min={1} max={3} step={0.05} onChange={scale => setCrop(c => ({ ...c, scale }))} format={v => `${Math.round(v * 100)}%`} />
              <div className="grid grid-cols-2 gap-3">
                <Slider label="Left – right" value={crop.x} min={0} max={100} step={1} onChange={x => setCrop(c => ({ ...c, x }))} format={v => `${Math.round(v)}%`} />
                <Slider label="Top – bottom" value={crop.y} min={0} max={100} step={1} onChange={y => setCrop(c => ({ ...c, y }))} format={v => `${Math.round(v)}%`} />
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="label mb-2">Cards in this deck</h3>
          {choices.length === 0 ? <p className="text-sm text-muted">Add cards to the deck first.</p> : (
            <ul className="grid grid-cols-4 md:grid-cols-3 gap-2 max-h-[340px] overflow-y-auto p-0.5">
              {choices.map(c => (
                <li key={c.id}>
                  <button type="button" aria-pressed={c.id === cardId} aria-label={c.fullName} title={c.fullName}
                    onClick={() => { setCardId(c.id); setCrop(DEFAULT_CROP); }}
                    className={`block w-full aspect-card rounded-md overflow-hidden bg-surface-3 ring-offset-2 ring-offset-surface ${c.id === cardId ? 'ring-2 ring-accent-fill' : 'opacity-80 hover:opacity-100'}`}>
                    <img src={c.images.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}

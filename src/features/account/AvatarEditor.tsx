import { KeyboardEvent, PointerEvent, useEffect, useRef } from 'react';
import { Move, ZoomIn, ZoomOut } from 'lucide-react';
import { CardAvatar } from '../../ui/CardAvatar';
import { Crop, MAX_SCALE, MIN_SCALE, panCrop, zoomCrop } from './crop';

interface Props {
  cardId: number;
  crop: Crop;
  onChange: (crop: Crop) => void;
  /** Accessible name of the card, for the editor's label. */
  cardName: string;
}

/** Drag to move the card inside the circle; zoom with the slider, the wheel or + and -. */
export function AvatarEditor({ cardId, crop, onChange, cardName }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  // Latest crop for the event handlers, which fire faster than renders.
  const current = useRef(crop);
  current.current = crop;

  const set = (c: Crop) => {
    current.current = c;
    onChange(c);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const size = e.currentTarget.clientWidth || 1;
    set(panCrop(current.current, (e.clientX - d.x) / size, (e.clientY - d.y) / size));
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const endDrag = () => { drag.current = null; };

  // Wheel zoom needs a non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = current.current;
      set(zoomCrop(c, c.scale * Math.exp(-e.deltaY / 400)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  // `set` only touches refs and the latest onChange.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.025;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      set(panCrop(crop, ...moves[e.key]));
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      set(zoomCrop(crop, crop.scale + 0.2));
    } else if (e.key === '-') {
      e.preventDefault();
      set(zoomCrop(crop, crop.scale - 0.2));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={area} tabIndex={0} role="group" aria-roledescription="picture position"
        aria-label={`Position of ${cardName} in your picture. Drag, or use the arrow keys to move it and plus or minus to zoom.`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onKeyDown}
        className="relative h-56 w-56 sm:h-60 sm:w-60 rounded-full cursor-grab active:cursor-grabbing touch-none select-none ring-1 ring-line shadow-card focus-visible:outline-offset-4">
        <CardAvatar cardId={cardId} crop={crop} className="h-full w-full" hiRes />
        <span aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
          <Move size={12} /> Drag to move
        </span>
      </div>

      <div className="w-full max-w-[16rem] flex items-center gap-2">
        <button type="button" className="icon-btn h-9 w-9 shrink-0" aria-label="Zoom out" onClick={() => set(zoomCrop(crop, crop.scale - 0.25))}
          disabled={crop.scale <= MIN_SCALE}><ZoomOut size={18} /></button>
        <input type="range" aria-label="Zoom" min={MIN_SCALE} max={MAX_SCALE} step={0.01} value={crop.scale}
          aria-valuetext={`${Math.round(crop.scale * 100)}%`}
          onChange={e => set(zoomCrop(crop, Number(e.target.value)))}
          className="flex-1 h-9 accent-[rgb(var(--accent-fill))] cursor-pointer" />
        <button type="button" className="icon-btn h-9 w-9 shrink-0" aria-label="Zoom in" onClick={() => set(zoomCrop(crop, crop.scale + 0.25))}
          disabled={crop.scale >= MAX_SCALE}><ZoomIn size={18} /></button>
      </div>
    </div>
  );
}

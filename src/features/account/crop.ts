// Avatar crop maths. A crop is stored as { x, y, scale } and drawn by
// CardAvatar: the card image fills a square with object-fit: cover, positioned
// at x% y%, then scaled by `scale` around the point x% y% of the square.
//
// In units of the square's side, with a = card width / height (< 1):
//   u = (x/100)(1 - 1/s) + qx / s          (horizontal, 0..1 of the card)
//   v = (y/100)(1 - a/s) + qy * a / s      (vertical, 0..1 of the card)
// gives the point of the card shown at (qx, qy) in the square. With s >= 1 and
// x, y in 0..100 the card always covers the whole circle.

export interface Crop {
  x: number;
  y: number;
  scale: number;
}

/** Card images are 367 x 512 (thumbnail) or 1468 x 2048 (full): the same shape. */
export const CARD_ASPECT = 367 / 512;
export const MIN_SCALE = 1;
export const MAX_SCALE = 5;
/** What CardAvatar shows when a card has no saved crop: the art, slightly zoomed. */
export const DEFAULT_CROP: Crop = { x: 50, y: 30, scale: 1.6 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => Math.round(n * 100) / 100;

export function clampCrop(c: Crop): Crop {
  return {
    x: round(clamp(Number.isFinite(c.x) ? c.x : 50, 0, 100)),
    y: round(clamp(Number.isFinite(c.y) ? c.y : 50, 0, 100)),
    scale: round(clamp(Number.isFinite(c.scale) ? c.scale : 1, MIN_SCALE, MAX_SCALE)),
  };
}

/** The point of the card (u, v in 0..1) shown at (qx, qy) of the square (0..1). */
export function pointAt(c: Crop, qx: number, qy: number, aspect = CARD_ASPECT) {
  const s = c.scale;
  return {
    u: (c.x / 100) * (1 - 1 / s) + qx / s,
    v: (c.y / 100) * (1 - aspect / s) + (qy * aspect) / s,
  };
}

/** The part of the card inside the square, as fractions of the card's width and height. */
export function visibleRegion(c: Crop, aspect = CARD_ASPECT) {
  const { u, v } = pointAt(c, 0, 0, aspect);
  return { left: u, top: v, width: 1 / c.scale, height: aspect / c.scale };
}

/**
 * Moves the picture by (dx, dy), given as fractions of the square's side, so
 * the point under the pointer follows it. Stops at the card's edges.
 */
export function panCrop(c: Crop, dx: number, dy: number, aspect = CARD_ASPECT): Crop {
  const s = c.scale;
  // At scale 1 the card exactly fills the width: there is nothing to pan sideways.
  const x = s > 1 ? c.x - (100 * dx) / (s - 1) : c.x;
  const y = s > aspect ? c.y - (100 * aspect * dy) / (s - aspect) : c.y;
  return clampCrop({ x, y, scale: s });
}

/** Changes the zoom keeping the centre of the square on the same point of the card. */
export function zoomCrop(c: Crop, scale: number, aspect = CARD_ASPECT): Crop {
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  const { u, v } = pointAt(c, 0.5, 0.5, aspect);
  const x = s > 1 ? (100 * (u - 0.5 / s)) / (1 - 1 / s) : c.x;
  const y = (100 * (v - (0.5 * aspect) / s)) / (1 - aspect / s);
  return clampCrop({ x, y, scale: s });
}

/** Saved crops from older versions may be missing or out of range. */
export function normaliseCrop(c: Partial<Crop> | null | undefined): Crop {
  if (!c) return { ...DEFAULT_CROP };
  return clampCrop({ x: c.x ?? DEFAULT_CROP.x, y: c.y ?? DEFAULT_CROP.y, scale: c.scale ?? DEFAULT_CROP.scale });
}

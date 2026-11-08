import { describe, expect, it } from 'vitest';
import { CARD_ASPECT, DEFAULT_CROP, MAX_SCALE, clampCrop, normaliseCrop, panCrop, pointAt, visibleRegion, zoomCrop } from './crop';

const a = CARD_ASPECT;
const close = (n: number, m: number) => expect(n).toBeCloseTo(m, 1);

describe('visibleRegion', () => {
  it('shows the full width and the top of the card at scale 1, y 0', () => {
    const r = visibleRegion({ x: 50, y: 0, scale: 1 });
    close(r.left, 0);
    close(r.width, 1);
    close(r.top, 0);
    close(r.height, a);
  });

  it('shows the bottom at y 100', () => {
    const r = visibleRegion({ x: 50, y: 100, scale: 1 });
    close(r.top + r.height, 1);
  });

  it('stays inside the card for any crop', () => {
    for (const scale of [1, 1.3, 2, 5]) {
      for (const x of [0, 30, 100]) {
        for (const y of [0, 55, 100]) {
          const r = visibleRegion({ x, y, scale });
          expect(r.left).toBeGreaterThanOrEqual(-1e-9);
          expect(r.top).toBeGreaterThanOrEqual(-1e-9);
          expect(r.left + r.width).toBeLessThanOrEqual(1 + 1e-9);
          expect(r.top + r.height).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });
});

describe('panCrop', () => {
  it('keeps the point under the pointer under it', () => {
    const c = { x: 40, y: 40, scale: 2.5 };
    const before = pointAt(c, 0.5, 0.5);
    const moved = panCrop(c, 0.1, -0.05);
    const after = pointAt(moved, 0.6, 0.45);
    close(after.u * 100, before.u * 100);
    close(after.v * 100, before.v * 100);
  });

  it('dragging right shows more of the left of the card', () => {
    const c = { x: 50, y: 50, scale: 2 };
    expect(panCrop(c, 0.1, 0).x).toBeLessThan(50);
    expect(panCrop(c, 0, 0.1).y).toBeLessThan(50);
  });

  it('cannot pan sideways at scale 1 and stops at the edges', () => {
    expect(panCrop({ x: 50, y: 50, scale: 1 }, 0.3, 0).x).toBe(50);
    expect(panCrop({ x: 50, y: 50, scale: 2 }, -5, 5)).toEqual({ x: 100, y: 0, scale: 2 });
  });
});

describe('zoomCrop', () => {
  it('keeps the centre on the same point of the card', () => {
    const c = { x: 30, y: 25, scale: 1.5 };
    const before = pointAt(c, 0.5, 0.5);
    const z = zoomCrop(c, 3);
    expect(z.scale).toBe(3);
    const after = pointAt(z, 0.5, 0.5);
    close(after.u * 100, before.u * 100);
    close(after.v * 100, before.v * 100);
  });

  it('limits the zoom', () => {
    expect(zoomCrop(DEFAULT_CROP, 99).scale).toBe(MAX_SCALE);
    expect(zoomCrop(DEFAULT_CROP, 0.2).scale).toBe(1);
  });
});

describe('normaliseCrop', () => {
  it('fills in missing or bad values', () => {
    expect(normaliseCrop(undefined)).toEqual(DEFAULT_CROP);
    expect(normaliseCrop({ x: 120, y: -4, scale: 0.5 })).toEqual({ x: 100, y: 0, scale: 1 });
    expect(clampCrop({ x: NaN, y: 10, scale: 2 }).x).toBe(50);
  });
});

import { artkalColors } from '@/data/artkal-colors';
import { rgbToLab } from './color-convert';
import { LabKDTree } from './kd-tree';

// Pre-compute Lab values for all Artkal colors
const artkalLabs = artkalColors.map((c) => rgbToLab(c.r, c.g, c.b));

// Build k-d tree once
const tree = new LabKDTree(
  artkalLabs.map((lab, i) => ({ lab, index: i }))
);

// Memoization cache keyed by quantized RGB (6 bits per channel = 262144 possible keys)
const cache = new Map<number, number>();

function quantizeKey(r: number, g: number, b: number): number {
  const rq = r >> 2;
  const gq = g >> 2;
  const bq = b >> 2;
  return (rq << 12) | (gq << 6) | bq;
}

export function findNearestArtkalColor(r: number, g: number, b: number): number {
  const key = quantizeKey(r, g, b);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const lab = rgbToLab(r, g, b);
  const result = tree.nearest(lab);

  cache.set(key, result.index);
  return result.index;
}

export function clearColorCache(): void {
  cache.clear();
}

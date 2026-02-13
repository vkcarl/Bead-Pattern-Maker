import type { Pattern, RGB } from '@/types';
import { findNearestColor } from './color-match';

// Area-average downsampling: averages all source pixels that map to each target pixel
// Returns null for fully transparent blocks
function downsample(
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): (RGB | null)[][] {
  const grid: (RGB | null)[][] = [];
  const blockW = sourceWidth / targetWidth;
  const blockH = sourceHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    const row: (RGB | null)[] = [];
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx0 = Math.floor(tx * blockW);
      const sy0 = Math.floor(ty * blockH);
      const sx1 = Math.min(Math.floor((tx + 1) * blockW), sourceWidth);
      const sy1 = Math.min(Math.floor((ty + 1) * blockH), sourceHeight);

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * sourceWidth + sx) * 4;
          const alpha = sourceData[i + 3] / 255;
          rSum += sourceData[i] * alpha;
          gSum += sourceData[i + 1] * alpha;
          bSum += sourceData[i + 2] * alpha;
          aSum += alpha;
          count++;
        }
      }

      // Average alpha of the block: if mostly transparent, treat as empty
      const avgAlpha = count > 0 ? aSum / count : 0;
      if (avgAlpha >= 0.5) {
        row.push({
          r: Math.round(rSum / aSum),
          g: Math.round(gSum / aSum),
          b: Math.round(bSum / aSum),
        });
      } else {
        // Mostly transparent block - no bead
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

export function processImage(
  imageDataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Pattern> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create offscreen canvas at original size
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Fit mode: preserve aspect ratio, fit within target bounds
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const fitW = Math.max(1, Math.round(img.width * scale));
      const fitH = Math.max(1, Math.round(img.height * scale));

      // Downsample to fitted size
      const rgbGrid = downsample(
        imageData.data,
        img.width,
        img.height,
        fitW,
        fitH
      );

      // Map to palette colors
      const fitGrid: number[][] = rgbGrid.map((row) =>
        row.map((pixel) => pixel === null ? -1 : findNearestColor(pixel.r, pixel.g, pixel.b))
      );

      // Place centered in full target grid, padding with -1 (empty)
      const offsetX = Math.floor((targetWidth - fitW) / 2);
      const offsetY = Math.floor((targetHeight - fitH) / 2);
      const grid: number[][] = Array.from({ length: targetHeight }, (_, r) =>
        Array.from({ length: targetWidth }, (_, c) => {
          const fr = r - offsetY;
          const fc = c - offsetX;
          return (fr >= 0 && fr < fitH && fc >= 0 && fc < fitW) ? fitGrid[fr][fc] : -1;
        })
      );

      resolve({ width: targetWidth, height: targetHeight, grid });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

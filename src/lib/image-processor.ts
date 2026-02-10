import type { Pattern, RGB } from '@/types';
import { findNearestArtkalColor } from './color-match';

// Area-average downsampling: averages all source pixels that map to each target pixel
function downsample(
  sourceData: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): RGB[][] {
  const grid: RGB[][] = [];
  const blockW = sourceWidth / targetWidth;
  const blockH = sourceHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    const row: RGB[] = [];
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

      if (aSum > 0) {
        row.push({
          r: Math.round(rSum / aSum),
          g: Math.round(gSum / aSum),
          b: Math.round(bSum / aSum),
        });
      } else {
        // Fully transparent pixel - use white
        row.push({ r: 255, g: 255, b: 255 });
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

      // Downsample to target grid size
      const rgbGrid = downsample(
        imageData.data,
        img.width,
        img.height,
        targetWidth,
        targetHeight
      );

      // Map each pixel to nearest Artkal color
      const grid: number[][] = rgbGrid.map((row) =>
        row.map((pixel) => findNearestArtkalColor(pixel.r, pixel.g, pixel.b))
      );

      resolve({ width: targetWidth, height: targetHeight, grid });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

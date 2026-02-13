import type { Pattern, BeadColor } from '@/types';
import { relativeLuminance } from '@/lib/color-convert';
import { getCurrentPaletteColors } from '@/lib/palette';

// Convert mm to pixels at 300 DPI
function mmToPx(mm: number): number {
  return Math.round(mm / 25.4 * 300);
}

export function exportPatternAsPNG(pattern: Pattern, colors?: BeadColor[], beadSizeMm: number = 2.6): void {
  // 使用传入的颜色数组或获取当前色板
  const paletteColors = colors || getCurrentPaletteColors();

  const cellSize = mmToPx(beadSizeMm);
  const canvas = document.createElement('canvas');
  canvas.width = pattern.width * cellSize;
  canvas.height = pattern.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const colorIndex = pattern.grid[row][col];
      if (colorIndex < 0 || colorIndex >= paletteColors.length) continue;

      const color = paletteColors[colorIndex];
      const x = col * cellSize;
      const y = row * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      // Bead
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Hole
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // Grid
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // Board dividers
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  for (let i = 10; i < pattern.width; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, pattern.height * cellSize);
    ctx.stroke();
  }
  for (let i = 10; i < pattern.height; i += 10) {
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(pattern.width * cellSize, i * cellSize);
    ctx.stroke();
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bead-pattern-${pattern.width}x${pattern.height}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function exportPatternWithCodesPNG(pattern: Pattern, colors?: BeadColor[], beadSizeMm: number = 2.6): void {
  // 使用传入的颜色数组或获取当前色板
  const paletteColors = colors || getCurrentPaletteColors();

  const cellSize = mmToPx(beadSizeMm);
  const canvas = document.createElement('canvas');
  canvas.width = pattern.width * cellSize;
  canvas.height = pattern.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const colorIndex = pattern.grid[row][col];
      if (colorIndex < 0 || colorIndex >= paletteColors.length) continue;

      const color = paletteColors[colorIndex];
      const x = col * cellSize;
      const y = row * cellSize;
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Code label
      const lum = relativeLuminance(color.r, color.g, color.b);
      ctx.fillStyle = lum > 0.18 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${Math.round(cellSize * 0.27)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.id, cx, cy);

      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bead-pattern-codes-${pattern.width}x${pattern.height}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

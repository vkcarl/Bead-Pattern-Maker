import type { Pattern, BeadColor } from '@/types';
import { relativeLuminance } from '@/lib/color-convert';
import { getCurrentPaletteColors } from '@/lib/palette';

/**
 * 导出拼豆图案为 PNG（无色号）
 * @param pattern 图案数据
 * @param colors 颜色数组
 * @param cellSizePx 每个豆子的像素大小（默认 40px，越大越清晰）
 */
export function exportPatternAsPNG(pattern: Pattern, colors?: BeadColor[], cellSizePx: number = 40): void {
  const paletteColors = colors || getCurrentPaletteColors();

  const cellSize = Math.max(8, Math.round(cellSizePx));
  const canvas = document.createElement('canvas');
  canvas.width = pattern.width * cellSize;
  canvas.height = pattern.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 开启抗锯齿（canvas 默认开启，确保不被关闭）
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 白色背景
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

      // 豆子主体
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // 豆子孔
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // 网格线
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = Math.max(0.5, cellSize * 0.02);
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 每 10 颗豆子的分板线
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(1, cellSize * 0.04);
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

  // 外边框
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = Math.max(1, cellSize * 0.03);
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

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

/**
 * 导出拼豆图案为 PNG（含色号）
 * @param pattern 图案数据
 * @param colors 颜色数组
 * @param cellSizePx 每个豆子的像素大小（默认 40px，越大越清晰）
 */
export function exportPatternWithCodesPNG(pattern: Pattern, colors?: BeadColor[], cellSizePx: number = 40): void {
  const paletteColors = colors || getCurrentPaletteColors();

  const cellSize = Math.max(8, Math.round(cellSizePx));
  const canvas = document.createElement('canvas');
  canvas.width = pattern.width * cellSize;
  canvas.height = pattern.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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

      // 豆子主体
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // 色号标签（仅在豆子足够大时显示）
      if (cellSize >= 16) {
        const lum = relativeLuminance(color.r, color.g, color.b);
        ctx.fillStyle = lum > 0.18 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.round(cellSize * 0.27)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(color.id, cx, cy);
      }

      // 网格线
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = Math.max(0.5, cellSize * 0.02);
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 每 10 颗豆子的分板线
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(1, cellSize * 0.04);
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

  // 外边框
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = Math.max(1, cellSize * 0.03);
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

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

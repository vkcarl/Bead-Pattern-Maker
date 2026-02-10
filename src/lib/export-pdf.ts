import { jsPDF } from 'jspdf';
import type { Pattern, BeadCount, BeadColor } from '@/types';
import { getCurrentPaletteColors } from '@/lib/palette';

function computeStats(pattern: Pattern, colors: BeadColor[]): BeadCount[] {
  const counts = new Map<number, number>();
  for (const row of pattern.grid) {
    for (const colorIndex of row) {
      if (colorIndex >= 0 && colorIndex < colors.length) {
        counts.set(colorIndex, (counts.get(colorIndex) || 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([colorIndex, count]) => ({
      colorIndex,
      color: colors[colorIndex],
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function exportPatternAsPDF(pattern: Pattern, colors?: BeadColor[]): void {
  // 使用传入的颜色数组或获取当前色板
  const paletteColors = colors || getCurrentPaletteColors();
  
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Title
  doc.setFontSize(14);
  doc.text(`Bead Pattern (${pattern.width} x ${pattern.height})`, margin, margin + 5);
  doc.setFontSize(8);
  doc.text(`${paletteColors.length} colors palette`, margin, margin + 10);

  // Calculate cell size to fit page
  const availW = pageW - 2 * margin;
  const availH = pageH - 2 * margin - 15;
  const cellSize = Math.min(availW / pattern.width, availH / pattern.height, 4);

  const gridW = pattern.width * cellSize;
  const gridH = pattern.height * cellSize;
  const offsetX = margin + (availW - gridW) / 2;
  const offsetY = margin + 15;

  // Draw beads
  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const colorIndex = pattern.grid[row][col];
      if (colorIndex < 0 || colorIndex >= paletteColors.length) continue;

      const color = paletteColors[colorIndex];
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      doc.setFillColor(color.r, color.g, color.b);
      doc.rect(x, y, cellSize, cellSize, 'F');

      // Grid
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.05);
      doc.rect(x, y, cellSize, cellSize, 'S');

      // Bead code if cell large enough
      if (cellSize >= 2.5) {
        const lum = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
        if (lum > 0.5) {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(255, 255, 255);
        }
        doc.setFontSize(cellSize * 1.8);
        doc.text(color.id, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.15, { align: 'center' });
      }
    }
  }

  // Board divider lines
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  for (let i = 29; i < pattern.width; i += 29) {
    const x = offsetX + i * cellSize;
    doc.line(x, offsetY, x, offsetY + gridH);
  }
  for (let i = 29; i < pattern.height; i += 29) {
    const y = offsetY + i * cellSize;
    doc.line(offsetX, y, offsetX + gridW, y);
  }

  // Outer border
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  doc.rect(offsetX, offsetY, gridW, gridH, 'S');

  // Color legend on page 2
  doc.addPage('portrait');
  doc.setFontSize(12);
  doc.text('Color Legend', margin, margin + 5);

  const stats = computeStats(pattern, paletteColors);
  const startY = margin + 12;
  const rowH = 5;
  const colWidths = { swatch: 5, id: 12, name: 45, count: 15 };

  // Header
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  let hx = margin;
  doc.text('Color', hx + colWidths.swatch + 1, startY);
  hx += colWidths.swatch + colWidths.id;
  doc.text('Name', hx, startY);
  hx += colWidths.name;
  doc.text('Count', hx, startY);

  doc.setTextColor(0, 0, 0);
  let cy = startY + rowH;

  for (const stat of stats) {
    if (cy > pageH - margin) {
      doc.addPage('portrait');
      cy = margin + 5;
    }

    let cx = margin;

    // Color swatch
    doc.setFillColor(stat.color.r, stat.color.g, stat.color.b);
    doc.rect(cx, cy - 3, 4, 4, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    doc.rect(cx, cy - 3, 4, 4, 'S');
    cx += colWidths.swatch;

    // ID
    doc.setFontSize(7);
    doc.text(stat.color.id, cx, cy);
    cx += colWidths.id;

    // Name
    doc.text(stat.color.name, cx, cy);
    cx += colWidths.name;

    // Count
    doc.text(String(stat.count), cx, cy);

    cy += rowH;
  }

  // Total
  cy += 2;
  doc.setFontSize(8);
  const total = stats.reduce((s, st) => s + st.count, 0);
  doc.text(`Total: ${stats.length} colors, ${total} beads`, margin, cy);

  doc.save(`bead-pattern-${pattern.width}x${pattern.height}.pdf`);
}

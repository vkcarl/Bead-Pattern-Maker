import { jsPDF } from 'jspdf';
import type { Pattern, BeadCount, BeadColor } from '@/types';
import { getCurrentPaletteColors } from '@/lib/palette';

/**
 * 使用 Canvas 渲染中文文字并返回图片数据
 * 这是解决 jsPDF 中文乱码最可靠的方法
 */
function renderChineseText(
  text: string,
  fontSize: number,
  color: string = '#000000',
  fontFamily: string = 'Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif'
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // 设置字体来测量文本宽度
  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  // 设置画布大小（留出一些边距）
  const padding = 2;
  canvas.width = Math.ceil(metrics.width) + padding * 2;
  canvas.height = Math.ceil(fontSize * 1.3) + padding * 2;
  
  // 重新设置字体（canvas resize 后会重置）
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, padding, padding);
  
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * 在 PDF 中添加中文文字（通过图片方式）
 */
function addChineseText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string = '#000000'
): number {
  const rendered = renderChineseText(text, fontSize * 4, color); // 4倍渲染以提高清晰度
  const scale = fontSize / (fontSize * 4);
  const imgWidth = rendered.width * scale * 0.26; // mm 转换系数
  const imgHeight = rendered.height * scale * 0.26;
  
  doc.addImage(rendered.dataUrl, 'PNG', x, y - imgHeight * 0.75, imgWidth, imgHeight);
  
  return imgWidth; // 返回宽度，用于后续文字定位
}

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

export async function exportPatternAsPDF(pattern: Pattern, colors?: BeadColor[], beadSizeMm: number = 2.6): Promise<void> {
  // 使用传入的颜色数组或获取当前色板
  const paletteColors = colors || getCurrentPaletteColors();

  // 图案页：每格固定物理尺寸，页面大小自适应
  const cellSize = beadSizeMm;
  const margin = 10;
  const gridW = pattern.width * cellSize;
  const gridH = pattern.height * cellSize;
  const pageW = gridW + 2 * margin;
  const pageH = gridH + 2 * margin + 15; // 额外 15mm 给标题

  const doc = new jsPDF({
    orientation: pageW >= pageH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageW, pageH],
  });

  // Title - 使用 Canvas 渲染中文
  addChineseText(doc, `拼豆图案 (${pattern.width} x ${pattern.height})`, margin, margin + 5, 14);
  addChineseText(doc, `${paletteColors.length} 色色板 · 豆子 ${beadSizeMm}mm`, margin, margin + 10, 8);

  const offsetX = margin;
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
      // 降低阈值到 1.5mm，让更多格子能显示色号
      if (cellSize >= 1.5) {
        const lum = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
        if (lum > 0.5) {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(255, 255, 255);
        }
        doc.setFont('helvetica', 'normal');
        
        // 根据色号ID的字符长度动态调整字体大小，防止超出格子
        const idLength = color.id.length;
        let fontScale: number;
        if (idLength <= 2) {
          fontScale = 1.8; // 2字符或更少
        } else if (idLength === 3) {
          fontScale = 1.3; // 3字符（如C14）
        } else {
          fontScale = 1.0; // 4字符或更多
        }
        
        // 确保字体大小在合理范围内，最小 2pt，最大 8pt
        const fontSize = Math.max(2, Math.min(8, cellSize * fontScale));
        doc.setFontSize(fontSize);
        doc.text(color.id, x + cellSize / 2, y + cellSize / 2 + cellSize * 0.15, { align: 'center' });
      }
    }
  }

  // Board divider lines
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  for (let i = 10; i < pattern.width; i += 10) {
    const x = offsetX + i * cellSize;
    doc.line(x, offsetY, x, offsetY + gridH);
  }
  for (let i = 10; i < pattern.height; i += 10) {
    const y = offsetY + i * cellSize;
    doc.line(offsetX, y, offsetX + gridW, y);
  }

  // Outer border
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.2);
  doc.rect(offsetX, offsetY, gridW, gridH, 'S');

  // Color legend on page 2 (A4 portrait)
  doc.addPage([210, 297], 'portrait');

  const legendPageW = 210;
  const legendPageH = 297;
  
  // 标题
  addChineseText(doc, '颜色图例', margin, margin + 5, 12);

  const stats = computeStats(pattern, paletteColors);
  const startY = margin + 12;
  const rowH = 5;
  const colWidths = { swatch: 5, id: 12, name: 45, count: 15 };

  // Header - 使用 Canvas 渲染中文表头
  let hx = margin;
  addChineseText(doc, '颜色', hx + colWidths.swatch + 1, startY, 7, '#666666');
  hx += colWidths.swatch + colWidths.id;
  addChineseText(doc, '名称', hx, startY, 7, '#666666');
  hx += colWidths.name;
  addChineseText(doc, '数量', hx, startY, 7, '#666666');

  doc.setTextColor(0, 0, 0);
  let cy = startY + rowH;

  for (const stat of stats) {
    if (cy > legendPageH - margin) {
      doc.addPage([210, 297], 'portrait');
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

    // ID - 英文数字用 jsPDF 原生渲染
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(stat.color.id, cx, cy);
    cx += colWidths.id;

    // Name - 中文用 Canvas 渲染
    addChineseText(doc, stat.color.name, cx, cy, 7);
    cx += colWidths.name;

    // Count - 数字用 jsPDF 原生渲染
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(String(stat.count), cx, cy);

    cy += rowH;
  }

  // Total
  cy += 2;
  const total = stats.reduce((s, st) => s + st.count, 0);
  addChineseText(doc, `总计: ${stats.length} 种颜色, ${total} 颗拼豆`, margin, cy, 8);

  doc.save(`bead-pattern-${pattern.width}x${pattern.height}.pdf`);
}

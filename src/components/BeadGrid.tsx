'use client';

import { useRef, useEffect, useCallback } from 'react';
import { relativeLuminance } from '@/lib/color-convert';
import type { Pattern, BeadColor } from '@/types';

interface BeadGridProps {
  pattern: Pattern;
  colors: BeadColor[]; // 当前色板的颜色数组
  zoom: number;
  panX: number;
  panY: number;
  showGridLines: boolean;
  showBeadCodes: boolean;
  selectedTool: 'select' | 'paint';
  selectedColorIndex: number | null;
  onCellClick: (row: number, col: number) => void;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onPanChange?: (x: number, y: number) => void;
  // 当需要居中显示时调用，传入计算好的居中 pan 值
  onRequestCenter?: (centerX: number, centerY: number) => void;
  // 是否需要居中（生成新图案时设为 true）
  shouldCenter?: boolean;
}

const BASE_CELL_SIZE = 20;
// 无限画布：在图案周围添加大量虚拟空间，支持自由滚动
// 这个值决定了图案在各个方向上可以滚动多远
const CANVAS_PADDING = 2000;

export function BeadGrid({
  pattern,
  colors,
  zoom,
  panX,
  panY,
  showGridLines,
  showBeadCodes,
  selectedTool,
  selectedColorIndex,
  onCellClick,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onPanChange,
  onRequestCenter,
  shouldCenter,
}: BeadGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollSyncing = useRef(false);

  const cellSize = BASE_CELL_SIZE * zoom;
  const totalW = pattern.width * cellSize;
  const totalH = pattern.height * cellSize;
  
  // 无限画布：内容尺寸 = 图案尺寸 + 两侧的虚拟空间
  // 这样即使图案很小，也能在各个方向上自由滚动
  const contentW = totalW + CANVAS_PADDING * 2;
  const contentH = totalH + CANVAS_PADDING * 2;

  // Sync panX/panY → scroll position
  // panX/panY 表示图案相对于视口的偏移
  // scrollLeft/scrollTop 表示滚动条的位置
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    isScrollSyncing.current = true;
    scrollEl.scrollLeft = -panX + CANVAS_PADDING;
    scrollEl.scrollTop = -panY + CANVAS_PADDING;
    // Reset flag after browser processes the scroll
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  }, [panX, panY]);

  // Handle native scroll → update pan
  const handleScroll = useCallback(() => {
    if (isScrollSyncing.current) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl || !onPanChange) return;
    const newPanX = -(scrollEl.scrollLeft - CANVAS_PADDING);
    const newPanY = -(scrollEl.scrollTop - CANVAS_PADDING);
    onPanChange(newPanX, newPanY);
  }, [onPanChange]);

  // Render the grid to canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollEl = scrollRef.current;
    if (!canvas || !scrollEl) return;

    const dpr = window.devicePixelRatio || 1;
    const viewW = scrollEl.clientWidth;
    const viewH = scrollEl.clientHeight;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewW, viewH);

    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, viewW, viewH);

    // Derive offset from scroll position
    const offsetX = -(scrollEl.scrollLeft - CANVAS_PADDING);
    const offsetY = -(scrollEl.scrollTop - CANVAS_PADDING);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Viewport culling bounds
    const startCol = Math.max(0, Math.floor(-offsetX / cellSize));
    const startRow = Math.max(0, Math.floor(-offsetY / cellSize));
    const endCol = Math.min(pattern.width, Math.ceil((viewW - offsetX) / cellSize));
    const endRow = Math.min(pattern.height, Math.ceil((viewH - offsetY) / cellSize));

    // Draw beads
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const colorIndex = pattern.grid[row][col];
        if (colorIndex < 0 || colorIndex >= colors.length) continue;

        const color = colors[colorIndex];
        const x = col * cellSize;
        const y = row * cellSize;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        // Bead body
        ctx.fillStyle = color.hex;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Bead hole
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Grid lines
        if (showGridLines) {
          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }

        // Bead codes
        if (showBeadCodes && cellSize >= 24) {
          const lum = relativeLuminance(color.r, color.g, color.b);
          ctx.fillStyle = lum > 0.18 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)';
          ctx.font = `bold ${Math.max(7, cellSize * 0.22)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(color.id, cx, cy);
        }
      }
    }

    // Board divider lines (every 29 beads)
    if (showGridLines) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      for (let i = 29; i < pattern.width; i += 29) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, pattern.height * cellSize);
        ctx.stroke();
      }
      for (let i = 29; i < pattern.height; i += 29) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(pattern.width * cellSize, i * cellSize);
        ctx.stroke();
      }

      // Outer border
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, pattern.width * cellSize, pattern.height * cellSize);
    }

    ctx.restore();
  }, [pattern, colors, zoom, panX, panY, cellSize, showGridLines, showBeadCodes]);

  // Re-render on state change
  useEffect(() => {
    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Resize observer
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(render);
    });
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [render]);

  // 居中显示图案
  // 当 shouldCenter 为 true 时，计算使图案居中的 pan 值并回调
  useEffect(() => {
    if (!shouldCenter || !onRequestCenter) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // 等待 DOM 更新后获取实际视口尺寸
    requestAnimationFrame(() => {
      const viewW = scrollEl.clientWidth;
      const viewH = scrollEl.clientHeight;
      
      // 计算使图案居中的 pan 值
      // 居中意味着：图案中心 = 视口中心
      // 图案左上角位置 = (视口宽度 - 图案宽度) / 2
      const centerPanX = (viewW - totalW) / 2;
      const centerPanY = (viewH - totalH) / 2;
      
      onRequestCenter(centerPanX, centerPanY);
    });
  }, [shouldCenter, onRequestCenter, totalW, totalH]);

  // Re-render on scroll (for viewport culling)
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => requestAnimationFrame(render);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [render]);

  // Click handler - identify cell from coordinates
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.altKey) return; // Alt+click is pan
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;

      const rect = scrollEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const offsetX = -(scrollEl.scrollLeft - CANVAS_PADDING);
      const offsetY = -(scrollEl.scrollTop - CANVAS_PADDING);

      const col = Math.floor((mouseX - offsetX) / cellSize);
      const row = Math.floor((mouseY - offsetY) / cellSize);

      if (row >= 0 && row < pattern.height && col >= 0 && col < pattern.width) {
        onCellClick(row, col);
      }
    },
    [cellSize, pattern, onCellClick]
  );

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-auto relative"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onScroll={handleScroll}
    >
      {/* Spacer div to create scrollable area */}
      <div style={{ width: contentW, height: contentH, pointerEvents: 'none' }} />
      {/* Canvas stays fixed in viewport via sticky positioning */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`sticky top-0 left-0 ${selectedTool === 'paint' ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ marginTop: -contentH }}
      />
    </div>
  );
}

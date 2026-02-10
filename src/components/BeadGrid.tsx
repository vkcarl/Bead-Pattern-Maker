'use client';

import { useRef, useEffect, useCallback } from 'react';
import { artkalColors } from '@/data/artkal-colors';
import { relativeLuminance } from '@/lib/color-convert';
import type { Pattern } from '@/types';

interface BeadGridProps {
  pattern: Pattern;
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
}

const BASE_CELL_SIZE = 20;
const SCROLL_PADDING = 40; // Extra space around the pattern

export function BeadGrid({
  pattern,
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
}: BeadGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollSyncing = useRef(false);

  const cellSize = BASE_CELL_SIZE * zoom;
  const totalW = pattern.width * cellSize;
  const totalH = pattern.height * cellSize;
  // Content size with padding on all sides
  const contentW = totalW + SCROLL_PADDING * 2;
  const contentH = totalH + SCROLL_PADDING * 2;

  // Sync panX/panY → scroll position
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    isScrollSyncing.current = true;
    scrollEl.scrollLeft = -panX + SCROLL_PADDING;
    scrollEl.scrollTop = -panY + SCROLL_PADDING;
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
    const newPanX = -(scrollEl.scrollLeft - SCROLL_PADDING);
    const newPanY = -(scrollEl.scrollTop - SCROLL_PADDING);
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
    const offsetX = -(scrollEl.scrollLeft - SCROLL_PADDING);
    const offsetY = -(scrollEl.scrollTop - SCROLL_PADDING);

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
        if (colorIndex < 0) continue;

        const color = artkalColors[colorIndex];
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
  }, [pattern, zoom, panX, panY, cellSize, showGridLines, showBeadCodes]);

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

      const offsetX = -(scrollEl.scrollLeft - SCROLL_PADDING);
      const offsetY = -(scrollEl.scrollTop - SCROLL_PADDING);

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

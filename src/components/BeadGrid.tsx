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
}

const BASE_CELL_SIZE = 20;

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
}: BeadGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render the grid to canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(panX, panY);

    const cellSize = BASE_CELL_SIZE * zoom;

    // Viewport culling bounds
    const startCol = Math.max(0, Math.floor(-panX / cellSize));
    const startRow = Math.max(0, Math.floor(-panY / cellSize));
    const endCol = Math.min(pattern.width, Math.ceil((rect.width - panX) / cellSize));
    const endRow = Math.min(pattern.height, Math.ceil((rect.height - panY) / cellSize));

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
  }, [pattern, zoom, panX, panY, showGridLines, showBeadCodes]);

  // Re-render on state change
  useEffect(() => {
    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(render);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Click handler - identify cell from coordinates
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.altKey) return; // Alt+click is pan
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cellSize = BASE_CELL_SIZE * zoom;
      const col = Math.floor((mouseX - panX) / cellSize);
      const row = Math.floor((mouseY - panY) / cellSize);

      if (row >= 0 && row < pattern.height && col >= 0 && col < pattern.width) {
        onCellClick(row, col);
      }
    },
    [zoom, panX, panY, pattern, onCellClick]
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={selectedTool === 'paint' ? 'cursor-crosshair' : 'cursor-default'}
      />
    </div>
  );
}

'use client';

import { useRef, useEffect, useCallback, RefObject } from 'react';
import { relativeLuminance } from '@/lib/color-convert';
import type { Pattern, BeadColor } from '@/types';
import { zoomMousePosition } from '@/hooks/useZoomPan';

interface BeadGridProps {
  pattern: Pattern;
  colors: BeadColor[]; // 当前色板的颜色数组
  zoom: number;
  showGridLines: boolean;
  showBeadCodes: boolean;
  selectedTool: 'select' | 'paint' | 'eyedropper';
  selectedColorIndex: number | null;
  onCellClick: (row: number, col: number) => void;
  onEyedropperPick?: (colorIndex: number) => void; // 取色笔取色回调
  onWheel: (e: WheelEvent) => void; // 改为原生 WheelEvent
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  // 当需要居中显示时设为 true
  shouldCenter?: boolean;
  // 居中完成后的回调
  onCentered?: () => void;
  // 从外部传入的 scrollRef，以便与 useZoomPan 共享
  scrollRef: RefObject<HTMLDivElement | null>;
}

const BASE_CELL_SIZE = 20;
// 无限画布：在图案周围添加大量虚拟空间，支持自由滚动
const CANVAS_PADDING = 2000;

export function BeadGrid({
  pattern,
  colors,
  zoom,
  showGridLines,
  showBeadCodes,
  selectedTool,
  selectedColorIndex,
  onCellClick,
  onEyedropperPick,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  shouldCenter,
  onCentered,
  scrollRef,
}: BeadGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 保存上一次的 zoom 值，用于检测 zoom 变化
  const prevZoomRef = useRef(zoom);
  // 标记是否正在进行缩放，用于跳过 scroll 事件导致的渲染
  const isZoomingRef = useRef(false);

  const cellSize = BASE_CELL_SIZE * zoom;
  const totalW = pattern.width * cellSize;
  const totalH = pattern.height * cellSize;
  
  // 无限画布：内容尺寸 = 图案尺寸 + 两侧的虚拟空间
  const contentW = totalW + CANVAS_PADDING * 2;
  const contentH = totalH + CANVAS_PADDING * 2;

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

    // 从滚动位置计算偏移量
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

    // Board divider lines (every 10 beads)
    if (showGridLines) {
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

      // Outer border
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, pattern.width * cellSize, pattern.height * cellSize);
    }

    ctx.restore();
  }, [pattern, colors, zoom, cellSize, showGridLines, showBeadCodes, scrollRef]);

  // 当 zoom 变化时，调整滚动位置以保持鼠标指向的点不变
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const prevZoom = prevZoomRef.current;
    
    // 如果 zoom 没有变化，跳过
    if (prevZoom === zoom) return;

    // 标记正在缩放
    isZoomingRef.current = true;

    const scale = zoom / prevZoom;

    // 获取当前滚动位置和视口尺寸
    const scrollLeft = scrollEl.scrollLeft;
    const scrollTop = scrollEl.scrollTop;
    const viewW = scrollEl.clientWidth;
    const viewH = scrollEl.clientHeight;

    // 判断是否有鼠标位置（用户通过滚轮缩放）
    // 如果有鼠标位置，以鼠标为中心缩放；否则以视口中心缩放
    let anchorX: number;
    let anchorY: number;
    
    if (zoomMousePosition.isSet) {
      // 使用鼠标位置作为锚点
      anchorX = zoomMousePosition.x;
      anchorY = zoomMousePosition.y;
      // 重置标记
      zoomMousePosition.isSet = false;
    } else {
      // 使用视口中心作为锚点（例如通过按钮缩放）
      anchorX = viewW / 2;
      anchorY = viewH / 2;
    }

    // 锚点相对于内容原点的坐标（当前 zoom 级别）
    const contentX = scrollLeft + anchorX - CANVAS_PADDING;
    const contentY = scrollTop + anchorY - CANVAS_PADDING;

    // 缩放后锚点的新坐标
    const newContentX = contentX * scale;
    const newContentY = contentY * scale;

    // 计算新的滚动位置，使锚点保持在同一视口位置
    const newScrollLeft = newContentX - anchorX + CANVAS_PADDING;
    const newScrollTop = newContentY - anchorY + CANVAS_PADDING;

    // 更新 prevZoomRef
    prevZoomRef.current = zoom;

    // 设置滚动位置
    scrollEl.scrollLeft = newScrollLeft;
    scrollEl.scrollTop = newScrollTop;
    
    // 渲染新内容
    render();
    
    // 延迟重置缩放标记
    setTimeout(() => {
      isZoomingRef.current = false;
    }, 50);
  }, [zoom, scrollRef, render]);

  // Re-render on state change (but not on zoom change, which is handled above)
  useEffect(() => {
    // 如果正在缩放，跳过（由 zoom effect 处理渲染）
    if (isZoomingRef.current) return;
    
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
  }, [render, scrollRef]);

  // 居中显示图案
  useEffect(() => {
    if (!shouldCenter || !onCentered) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // 等待 DOM 更新后获取实际视口尺寸
    requestAnimationFrame(() => {
      const viewW = scrollEl.clientWidth;
      const viewH = scrollEl.clientHeight;
      
      // 计算使图案居中的滚动位置
      // 居中意味着：图案中心 = 视口中心
      // scrollLeft = CANVAS_PADDING - (viewW - totalW) / 2
      const centerScrollLeft = CANVAS_PADDING - (viewW - totalW) / 2;
      const centerScrollTop = CANVAS_PADDING - (viewH - totalH) / 2;
      
      scrollEl.scrollLeft = centerScrollLeft;
      scrollEl.scrollTop = centerScrollTop;
      
      // 通知居中完成
      onCentered();
      
      // 居中后重新渲染
      requestAnimationFrame(render);
    });
  }, [shouldCenter, onCentered, totalW, totalH, scrollRef, render]);

  // Re-render on scroll (for viewport culling)
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      // 如果正在缩放，跳过
      if (isZoomingRef.current) return;
      requestAnimationFrame(render);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [render, scrollRef]);

  // 添加 non-passive wheel 事件监听器，以便能够 preventDefault
  // React 的 onWheel 是 passive 的，无法阻止默认滚动行为
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    const handleWheel = (e: WheelEvent) => {
      onWheel(e);
    };
    
    // 关键：{ passive: false } 允许调用 preventDefault()
    scrollEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollEl.removeEventListener('wheel', handleWheel);
  }, [onWheel, scrollRef]);

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
        // 取色笔工具：点击时获取该位置的颜色
        if (selectedTool === 'eyedropper') {
          const colorIndex = pattern.grid[row][col];
          if (colorIndex >= 0 && colorIndex < colors.length && onEyedropperPick) {
            onEyedropperPick(colorIndex);
          }
        } else {
          onCellClick(row, col);
        }
      }
    },
    [cellSize, pattern, colors, selectedTool, onCellClick, onEyedropperPick, scrollRef]
  );

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-auto relative"
      // 不使用 React onWheel，因为它是 passive 的，无法 preventDefault
      // wheel 事件在 useEffect 中通过原生 addEventListener 添加
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Spacer div to create scrollable area */}
      <div style={{ width: contentW, height: contentH, pointerEvents: 'none' }} />
      {/* Canvas stays fixed in viewport via sticky positioning */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`sticky top-0 left-0 ${
          selectedTool === 'paint' ? 'cursor-crosshair' : 
          selectedTool === 'eyedropper' ? 'cursor-cell' : 'cursor-default'
        }`}
        style={{ marginTop: -contentH }}
      />
    </div>
  );
}

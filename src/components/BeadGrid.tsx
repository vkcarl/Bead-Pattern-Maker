'use client';

import { useRef, useEffect, useCallback, useState, RefObject } from 'react';
import { relativeLuminance } from '@/lib/color-convert';
import type { Pattern, BeadColor, BrushShape } from '@/types';
import { zoomMousePosition } from '@/hooks/useZoomPan';

interface BeadGridProps {
  pattern: Pattern;
  colors: BeadColor[]; // 当前色板的颜色数组
  zoom: number;
  showGridLines: boolean;
  showBeadCodes: boolean;
  selectedTool: 'select' | 'paint' | 'eyedropper' | 'flood-erase';
  selectedColorIndex: number | null;
  highlightColorIndex: number | null; // 高亮颜色索引（仅取色笔设置）
  brushShape: BrushShape;
  onCellClick: (row: number, col: number) => void;
  onEyedropperPick?: (colorIndex: number) => void; // 取色笔取色回调
  onFloodErase?: (row: number, col: number) => void; // 色块消除回调
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
  // 原图参考层
  referenceImage?: string | null; // 原图 data URL
  referenceOverlay?: boolean; // 是否显示参考层
  referenceOpacity?: number; // 参考层透明度 (0~1)
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
  highlightColorIndex,
  brushShape,
  onCellClick,
  onEyedropperPick,
  onFloodErase,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  shouldCenter,
  onCentered,
  scrollRef,
  referenceImage,
  referenceOverlay = false,
  referenceOpacity = 0.35,
}: BeadGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refImgRef = useRef<HTMLImageElement | null>(null);
  // 保存上一次的 zoom 值，用于检测 zoom 变化
  const prevZoomRef = useRef(zoom);
  // 标记是否正在进行缩放，用于跳过 scroll 事件导致的渲染
  const isZoomingRef = useRef(false);
  // 鼠标悬停位置（用于画笔预览高亮）
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  const cellSize = BASE_CELL_SIZE * zoom;
  const totalW = pattern.width * cellSize;
  const totalH = pattern.height * cellSize;
  
  // 无限画布：内容尺寸 = 图案尺寸 + 两侧的虚拟空间
  const contentW = totalW + CANVAS_PADDING * 2;
  const contentH = totalH + CANVAS_PADDING * 2;

  // 根据画笔形状计算高亮单元格
  const getHighlightCells = useCallback(
    (row: number, col: number): Set<string> => {
      const cells = new Set<string>();
      if (selectedTool !== 'paint') return cells;
      switch (brushShape) {
        case 'dot':
          cells.add(`${row},${col}`);
          break;
        case 'row':
          for (let c = 0; c < pattern.width; c++) {
            cells.add(`${row},${c}`);
          }
          break;
        case 'col':
          for (let r = 0; r < pattern.height; r++) {
            cells.add(`${r},${col}`);
          }
          break;
        case 'grid3x3':
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = row + dr;
              const nc = col + dc;
              if (nr >= 0 && nr < pattern.height && nc >= 0 && nc < pattern.width) {
                cells.add(`${nr},${nc}`);
              }
            }
          }
          break;
      }
      return cells;
    },
    [selectedTool, brushShape, pattern.width, pattern.height]
  );

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
    // 计算当前高亮的单元格集合
    const highlightSet = hoverCell && selectedTool === 'paint' && brushShape !== 'dot'
      ? getHighlightCells(hoverCell.row, hoverCell.col)
      : null;

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

        // 选中颜色高亮：为所有使用当前高亮颜色的豆子绘制格子边缘高亮
        if (highlightColorIndex !== null && highlightColorIndex >= 0 && colorIndex === highlightColorIndex) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        // 画笔范围高亮预览
        if (highlightSet && highlightSet.has(`${row},${col}`)) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
          ctx.stroke();
        }

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
  }, [pattern, colors, zoom, cellSize, showGridLines, showBeadCodes, scrollRef, hoverCell, selectedTool, brushShape, getHighlightCells, highlightColorIndex]);

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

  // Canvas 上的鼠标移动事件，用于画笔预览高亮
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (selectedTool !== 'paint' || brushShape === 'dot') {
        if (hoverCell) setHoverCell(null);
        return;
      }
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
        if (!hoverCell || hoverCell.row !== row || hoverCell.col !== col) {
          setHoverCell({ row, col });
        }
      } else {
        if (hoverCell) setHoverCell(null);
      }
    },
    [selectedTool, brushShape, cellSize, pattern, scrollRef, hoverCell]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    if (hoverCell) setHoverCell(null);
  }, [hoverCell]);

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
        } else if (selectedTool === 'flood-erase') {
          // 色块消除工具：点击时消除连通同色豆子
          if (onFloodErase) {
            onFloodErase(row, col);
          }
        } else {
          onCellClick(row, col);
        }
      }
    },
    [cellSize, pattern, colors, selectedTool, onCellClick, onEyedropperPick, onFloodErase, scrollRef]
  );

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-auto relative"
      // 不使用 React onWheel，因为它是 passive 的，无法 preventDefault
      // wheel 事件在 useEffect 中通过原生 addEventListener 添加
      onMouseDown={onMouseDown}
      onMouseMove={(e) => {
        onMouseMove(e);
        handleCanvasMouseMove(e);
      }}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        onMouseUp();
        handleCanvasMouseLeave();
      }}
    >
      {/* Spacer div to create scrollable area */}
      <div style={{ width: contentW, height: contentH, pointerEvents: 'none' }} />
      {/* Canvas stays fixed in viewport via sticky positioning */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`sticky top-0 left-0 ${
          selectedTool === 'paint' ? 'cursor-crosshair' : 
          selectedTool === 'eyedropper' ? 'cursor-cell' :
          selectedTool === 'flood-erase' ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{ marginTop: -contentH }}
      />
      {/* 原图参考层叠加 */}
      {referenceOverlay && referenceImage && (
        <ReferenceOverlay
          src={referenceImage}
          opacity={referenceOpacity}
          cellSize={cellSize}
          patternWidth={pattern.width}
          patternHeight={pattern.height}
          scrollRef={scrollRef}
          contentH={contentH}
          imgRef={refImgRef}
        />
      )}
    </div>
  );
}

/**
 * 原图参考层叠加组件
 * 将原图以半透明方式叠加在拼豆网格上方，帮助用户"对着原图画"
 * 使用 sticky 定位与 Canvas 对齐，通过 CSS 控制透明度
 * pointer-events: none 确保不干扰下方的绘制交互
 */
function ReferenceOverlay({
  src,
  opacity,
  cellSize,
  patternWidth,
  patternHeight,
  scrollRef,
  contentH,
  imgRef,
}: {
  src: string;
  opacity: number;
  cellSize: number;
  patternWidth: number;
  patternHeight: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  contentH: number;
  imgRef: React.MutableRefObject<HTMLImageElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 原图渲染到 canvas 上，与拼豆网格精确对齐
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const scrollEl = scrollRef.current;
    const img = imgRef.current;
    if (!canvas || !scrollEl || !img || !img.complete) return;

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

    // 计算偏移量（与 BeadGrid 的 render 逻辑一致）
    const offsetX = -(scrollEl.scrollLeft - CANVAS_PADDING);
    const offsetY = -(scrollEl.scrollTop - CANVAS_PADDING);

    // 原图绘制区域 = 拼豆网格区域
    const totalW = patternWidth * cellSize;
    const totalH = patternHeight * cellSize;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, offsetX, offsetY, totalW, totalH);
    ctx.restore();
  }, [cellSize, patternWidth, patternHeight, opacity, scrollRef, imgRef]);

  // 加载原图
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      render();
    };
    img.src = src;
  }, [src, imgRef, render]);

  // 响应滚动和缩放重新渲染
  useEffect(() => {
    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // 监听滚动事件重新渲染
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => requestAnimationFrame(render);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [render, scrollRef]);

  // 监听窗口大小变化
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const observer = new ResizeObserver(() => requestAnimationFrame(render));
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [render, scrollRef]);

  return (
    <canvas
      ref={canvasRef}
      className="sticky top-0 left-0 pointer-events-none"
      style={{ marginTop: -contentH, zIndex: 10 }}
    />
  );
}

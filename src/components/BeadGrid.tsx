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
  onPaint: (points: Cell[]) => void; // 画笔涂色，points 为轨迹经过的格子
  onPaintStrokeStart: () => void; // 一次笔画开始（按下 / 长按生效）
  onPaintStrokeEnd: () => void; // 一次笔画结束（松开）
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
// 触屏长按多久进入连续涂色
const LONG_PRESS_MS = 1000;
// 长按判定期间手指移动超过该距离视为滚动，取消长按
const TOUCH_MOVE_TOLERANCE = 10;

type Cell = { row: number; col: number };

// Bresenham 直线：返回 from → to 经过的所有格子（含两端），避免快速拖动时漏格
function lineCells(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [];
  let x = from.col;
  let y = from.row;
  const dx = Math.abs(to.col - x);
  const dy = -Math.abs(to.row - y);
  const sx = x < to.col ? 1 : -1;
  const sy = y < to.row ? 1 : -1;
  let err = dx + dy;
  while (true) {
    cells.push({ row: y, col: x });
    if (x === to.col && y === to.row) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return cells;
}

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
  onPaint,
  onPaintStrokeStart,
  onPaintStrokeEnd,
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

  // 屏幕坐标 → 格子坐标（可能超出图案范围）
  const getCellFromClient = useCallback(
    (clientX: number, clientY: number): Cell | null => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return null;
      const rect = scrollEl.getBoundingClientRect();
      const offsetX = -(scrollEl.scrollLeft - CANVAS_PADDING);
      const offsetY = -(scrollEl.scrollTop - CANVAS_PADDING);
      return {
        col: Math.floor((clientX - rect.left - offsetX) / cellSize),
        row: Math.floor((clientY - rect.top - offsetY) / cellSize),
      };
    },
    [cellSize, scrollRef]
  );

  const isInPattern = useCallback(
    (cell: Cell) => cell.row >= 0 && cell.row < pattern.height && cell.col >= 0 && cell.col < pattern.width,
    [pattern.width, pattern.height]
  );

  // 画笔范围预览高亮（仅非单点画笔）
  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const cell = selectedTool === 'paint' && brushShape !== 'dot' ? getCellFromClient(clientX, clientY) : null;
      const next = cell && isInPattern(cell) ? cell : null;
      setHoverCell(prev => {
        if (prev === next) return prev;
        if (prev && next && prev.row === next.row && prev.col === next.col) return prev;
        return next;
      });
    },
    [selectedTool, brushShape, getCellFromClient, isInPattern]
  );

  const clearHover = useCallback(() => setHoverCell(null), []);

  // ===== 画笔笔画：桌面端按下即画、拖动连续涂色；触屏端轻点单格、长按 1s 后拖动连续涂色 =====
  const paintCallbacksRef = useRef({ onPaint, onPaintStrokeStart, onPaintStrokeEnd });
  useEffect(() => {
    paintCallbacksRef.current = { onPaint, onPaintStrokeStart, onPaintStrokeEnd };
  }, [onPaint, onPaintStrokeStart, onPaintStrokeEnd]);

  const strokeRef = useRef<{ pointerId: number; isTouch: boolean; last: Cell } | null>(null);
  const pendingTouchRef = useRef<{ pointerId: number; x: number; y: number; cell: Cell; timer: number } | null>(null);
  const activeTouchesRef = useRef(new Set<number>());

  const paintPoints = useCallback(
    (points: Cell[]) => {
      const inside = points.filter(isInPattern);
      if (inside.length > 0) paintCallbacksRef.current.onPaint(inside);
    },
    [isInPattern]
  );

  const startStroke = useCallback(
    (pointerId: number, isTouch: boolean, cell: Cell) => {
      paintCallbacksRef.current.onPaintStrokeStart();
      strokeRef.current = { pointerId, isTouch, last: cell };
      paintPoints([cell]);
    },
    [paintPoints]
  );

  const endStroke = useCallback(() => {
    if (!strokeRef.current) return;
    if (strokeRef.current.isTouch) setHoverCell(null);
    strokeRef.current = null;
    paintCallbacksRef.current.onPaintStrokeEnd();
  }, []);

  const cancelPendingTouch = useCallback(() => {
    if (!pendingTouchRef.current) return;
    window.clearTimeout(pendingTouchRef.current.timer);
    pendingTouchRef.current = null;
  }, []);

  useEffect(() => () => cancelPendingTouch(), [cancelPendingTouch]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (selectedTool !== 'paint') return;

      if (e.pointerType === 'touch') {
        activeTouchesRef.current.add(e.pointerId);
        // 多指操作（如双指缩放）不触发涂色
        if (activeTouchesRef.current.size > 1 || strokeRef.current) {
          cancelPendingTouch();
          return;
        }
        const cell = getCellFromClient(e.clientX, e.clientY);
        if (!cell) return;
        const timer = window.setTimeout(() => {
          const pending = pendingTouchRef.current;
          pendingTouchRef.current = null;
          if (!pending) return;
          navigator.vibrate?.(15);
          startStroke(pending.pointerId, true, pending.cell);
        }, LONG_PRESS_MS);
        pendingTouchRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, cell, timer };
        return;
      }

      if (e.button !== 0 || e.altKey) return; // 中键 / Alt+拖动 为平移
      const cell = getCellFromClient(e.clientX, e.clientY);
      if (!cell) return;
      // 阻止拖动时选中页面文字
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      startStroke(e.pointerId, false, cell);
    },
    [selectedTool, getCellFromClient, startStroke, cancelPendingTouch]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const stroke = strokeRef.current;
      if (e.pointerType !== 'touch' || stroke?.pointerId === e.pointerId) {
        updateHover(e.clientX, e.clientY);
      }

      const pending = pendingTouchRef.current;
      if (pending && pending.pointerId === e.pointerId) {
        // 长按生效前移动视为滚动画布
        if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > TOUCH_MOVE_TOLERANCE) {
          cancelPendingTouch();
        }
        return;
      }

      if (!stroke || stroke.pointerId !== e.pointerId) return;
      const cell = getCellFromClient(e.clientX, e.clientY);
      if (!cell || (cell.row === stroke.last.row && cell.col === stroke.last.col)) return;
      paintPoints(lineCells(stroke.last, cell).slice(1));
      stroke.last = cell;
    },
    [updateHover, cancelPendingTouch, getCellFromClient, paintPoints]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activeTouchesRef.current.delete(e.pointerId);
      const pending = pendingTouchRef.current;
      if (pending && pending.pointerId === e.pointerId) {
        // 未到长按时间就松开：视为轻点，只画一格
        cancelPendingTouch();
        startStroke(pending.pointerId, true, pending.cell);
        endStroke();
        return;
      }
      if (strokeRef.current?.pointerId === e.pointerId) endStroke();
    },
    [cancelPendingTouch, startStroke, endStroke]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activeTouchesRef.current.delete(e.pointerId);
      if (pendingTouchRef.current?.pointerId === e.pointerId) cancelPendingTouch();
      if (strokeRef.current?.pointerId === e.pointerId) endStroke();
    },
    [cancelPendingTouch, endStroke]
  );

  // 触屏连续涂色时阻止画布滚动；需非 passive 监听才能 preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouchMove = (e: TouchEvent) => {
      if (strokeRef.current?.isTouch) e.preventDefault();
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => canvas.removeEventListener('touchmove', onTouchMove);
  }, []);

  // 长按期间屏蔽系统长按菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (pendingTouchRef.current || strokeRef.current?.isTouch) e.preventDefault();
  }, []);

  // 取色笔 / 色块消除的点击处理（画笔由 pointer 事件处理）
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.altKey) return; // Alt+click is pan
      if (selectedTool !== 'eyedropper' && selectedTool !== 'flood-erase') return;
      const cell = getCellFromClient(e.clientX, e.clientY);
      if (!cell || !isInPattern(cell)) return;
      const { row, col } = cell;

      if (selectedTool === 'eyedropper') {
        const colorIndex = pattern.grid[row][col];
        if (colorIndex >= 0 && colorIndex < colors.length && onEyedropperPick) {
          onEyedropperPick(colorIndex);
        }
      } else if (onFloodErase) {
        onFloodErase(row, col);
      }
    },
    [pattern, colors, selectedTool, getCellFromClient, isInPattern, onEyedropperPick, onFloodErase]
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
      onMouseLeave={() => {
        onMouseUp();
        clearHover();
      }}
    >
      {/* Spacer div to create scrollable area */}
      <div style={{ width: contentW, height: contentH, pointerEvents: 'none' }} />
      {/* Canvas stays fixed in viewport via sticky positioning */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
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

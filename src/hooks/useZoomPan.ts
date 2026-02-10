'use client';
import { useCallback, useRef, RefObject } from 'react';
import type { PatternAction } from '@/types';

// 无限画布的 padding，需要与 BeadGrid 中保持一致
const CANVAS_PADDING = 2000;

interface UseZoomPanOptions {
  zoom: number;
  dispatch: React.Dispatch<PatternAction>;
  scrollRef: RefObject<HTMLDivElement | null>;
}

// 保存鼠标位置，供缩放时使用（实现以鼠标为中心的缩放）
export const zoomMousePosition = { x: 0, y: 0, isSet: false };

export function useZoomPan({ zoom, dispatch, scrollRef }: UseZoomPanOptions) {
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e: WheelEvent) => {
    // 关键：阻止默认行为，防止同时触发滚动
    e.preventDefault();

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Cmd/Ctrl + wheel → zoom (以鼠标为中心缩放)
    if (e.metaKey || e.ctrlKey) {
      const rect = scrollEl.getBoundingClientRect();
      // 鼠标在视口内的位置
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 保存鼠标位置，供 BeadGrid 的 zoom effect 使用
      zoomMousePosition.x = mouseX;
      zoomMousePosition.y = mouseY;
      zoomMousePosition.isSet = true;

      // 计算新的 zoom 值
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.1, Math.min(15, zoom * zoomFactor));

      // 只更新 zoom 状态，滚动位置调整由 BeadGrid 处理
      dispatch({ type: 'SET_ZOOM', payload: newZoom });

      return;
    }

    // Shift + wheel → 左右移动
    if (e.shiftKey) {
      const delta = e.deltaY || e.deltaX;
      scrollEl.scrollLeft += delta;
      return;
    }

    // Plain wheel → 上下移动
    scrollEl.scrollTop += e.deltaY;
  }, [zoom, dispatch, scrollRef]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click for panning
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    // 直接修改滚动位置，而不是通过状态
    scrollEl.scrollLeft -= dx;
    scrollEl.scrollTop -= dy;
  }, [scrollRef]);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return { onWheel, onMouseDown, onMouseMove, onMouseUp, isPanning };
}

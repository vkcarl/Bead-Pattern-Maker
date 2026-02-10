'use client';
import { useCallback, useRef } from 'react';
import type { PatternAction } from '@/types';

interface UseZoomPanOptions {
  zoom: number;
  panX: number;
  panY: number;
  dispatch: React.Dispatch<PatternAction>;
}

export function useZoomPan({ zoom, panX, panY, dispatch }: UseZoomPanOptions) {
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    // Cmd/Ctrl + wheel → zoom (缩放)
    if (e.metaKey || e.ctrlKey) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.3, Math.min(15, zoom * zoomFactor));

      // Zoom centered on cursor
      const scale = newZoom / zoom;
      const newPanX = mouseX - scale * (mouseX - panX);
      const newPanY = mouseY - scale * (mouseY - panY);

      dispatch({ type: 'SET_ZOOM', payload: newZoom });
      dispatch({ type: 'SET_PAN', payload: { x: newPanX, y: newPanY } });
      return;
    }

    // Shift + wheel → 左右移动
    if (e.shiftKey) {
      const delta = e.deltaY || e.deltaX;
      dispatch({ type: 'SET_PAN', payload: { x: panX - delta, y: panY } });
      return;
    }

    // Plain wheel → 上下移动
    dispatch({ type: 'SET_PAN', payload: { x: panX, y: panY - e.deltaY } });
  }, [zoom, panX, panY, dispatch]);

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
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    dispatch({ type: 'SET_PAN', payload: { x: panX + dx, y: panY + dy } });
  }, [panX, panY, dispatch]);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return { onWheel, onMouseDown, onMouseMove, onMouseUp, isPanning };
}

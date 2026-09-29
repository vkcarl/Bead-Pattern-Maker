'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'paint_drag_tip_seen';
const SHOW_MS = 5000;
const FADE_MS = 300;

type Phase = 'hidden' | 'enter' | 'show' | 'leave';

/**
 * 首次选中画笔工具时的连续涂色提示
 * 浮现 5s 后自动淡出，只展示一次（localStorage 记录）
 */
export function PaintDragTip({ active }: { active: boolean }) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (!active || phase !== 'hidden') return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const raf = requestAnimationFrame(() => {
      setIsTouch(window.matchMedia('(pointer: coarse)').matches);
      setPhase('enter');
    });
    return () => cancelAnimationFrame(raf);
  }, [active, phase]);

  useEffect(() => {
    if (phase === 'enter') {
      // 先以初始样式挂载一帧，再切到可见态，过渡动画才会生效
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          try {
            localStorage.setItem(STORAGE_KEY, '1');
          } catch {
            // 静默失败
          }
          setPhase('show');
        });
      });
      return () => cancelAnimationFrame(raf);
    }
    if (phase === 'show') {
      const timer = window.setTimeout(() => setPhase('leave'), SHOW_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'leave') {
      const timer = window.setTimeout(() => setPhase('hidden'), FADE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  if (phase === 'hidden') return null;

  // 切走画笔时提前淡出
  const visible = phase === 'show' && active;

  return (
    <div
      role="status"
      className={`pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 px-3.5 py-2 rounded-full bg-gray-800/90 text-white text-xs shadow-lg backdrop-blur-sm whitespace-nowrap transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <svg className="w-4 h-4 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
      <span>
        {isTouch ? '长按 1 秒后拖动，可连续涂色经过的格子' : '按住鼠标左键拖动，可连续涂色经过的格子'}
      </span>
    </div>
  );
}

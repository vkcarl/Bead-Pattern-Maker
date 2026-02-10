'use client';
import { useMemo } from 'react';
import type { Pattern, BeadCount, BeadColor } from '@/types';

interface BeadStatsProps {
  pattern: Pattern;
  colors: BeadColor[]; // 当前色板的颜色数组
}

export function BeadStats({ pattern, colors }: BeadStatsProps) {
  const stats: BeadCount[] = useMemo(() => {
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
  }, [pattern, colors]);

  const totalBeads = useMemo(() => stats.reduce((sum, s) => sum + s.count, 0), [stats]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">用量统计</h3>
        <span className="text-xs text-gray-500">{stats.length} 色 / {totalBeads} 颗</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {stats.map(({ color, count }) => (
          <div key={color.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-gray-50">
            <div
              className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-gray-500 w-8 flex-shrink-0">{color.id}</span>
            <span className="text-gray-700 flex-1 truncate">{color.name}</span>
            <span className="text-gray-900 font-medium tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

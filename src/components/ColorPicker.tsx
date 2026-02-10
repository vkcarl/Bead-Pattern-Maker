'use client';
import { useState, useMemo } from 'react';
import type { Pattern, BeadColor } from '@/types';

interface ColorPickerProps {
  pattern: Pattern | null;
  colors: BeadColor[]; // 当前色板的颜色数组
  selectedColorIndex: number | null;
  onSelectColor: (index: number) => void;
}

export function ColorPicker({ pattern, colors, selectedColorIndex, onSelectColor }: ColorPickerProps) {
  const [search, setSearch] = useState('');

  const usedColorIndices = useMemo(() => {
    if (!pattern) return new Set<number>();
    const used = new Set<number>();
    for (const row of pattern.grid) {
      for (const idx of row) {
        if (idx >= 0 && idx < colors.length) used.add(idx);
      }
    }
    return used;
  }, [pattern, colors.length]);

  const filteredColors = useMemo(() => {
    if (!search) return colors;
    const q = search.toLowerCase();
    return colors.filter(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [search, colors]);

  const usedColors = useMemo(() => {
    return colors.filter((_, i) => usedColorIndices.has(i));
  }, [colors, usedColorIndices]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">调色板</h3>
      <input
        type="text"
        placeholder="搜索颜色名称或编号..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-xs border rounded-md"
      />
      {!search && usedColors.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">已使用</p>
          <div className="flex flex-wrap gap-1">
            {usedColors.map(c => {
              const idx = colors.indexOf(c);
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectColor(idx)}
                  title={`${c.id} ${c.name}`}
                  className={`w-5 h-5 rounded-sm border-2 transition-transform hover:scale-125 ${
                    selectedColorIndex === idx ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>
      )}
      <div>
        {!search && <p className="text-xs text-gray-400 mb-1">全部颜色</p>}
        <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
          {filteredColors.map(c => {
            const idx = colors.indexOf(c);
            return (
              <button
                key={c.id}
                onClick={() => onSelectColor(idx)}
                title={`${c.id} ${c.name}`}
                className={`w-5 h-5 rounded-sm border-2 transition-transform hover:scale-125 ${
                  selectedColorIndex === idx ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

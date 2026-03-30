'use client';
import { useState, useMemo } from 'react';
import type { Pattern, BeadColor } from '@/types';

interface ColorPickerProps {
  pattern: Pattern | null;
  colors: BeadColor[]; // 当前色板的颜色数组
  selectedColorIndex: number | null;
  highlightColorIndex: number | null; // 高亮颜色索引（取色笔设置）
  onSelectColor: (index: number) => void;
  onClearHighlight: () => void; // 取消高亮回调
}

export function ColorPicker({ pattern, colors, selectedColorIndex, highlightColorIndex, onSelectColor, onClearHighlight }: ColorPickerProps) {
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
      {/* Eraser - special "color" to remove beads */}
      <button
        onClick={() => onSelectColor(-1)}
        title="擦除豆子"
        className={`flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-xs transition-colors ${
          selectedColorIndex === -1
            ? 'bg-blue-50 border border-blue-500 text-blue-700'
            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span className="w-5 h-5 rounded-sm border border-gray-300 flex items-center justify-center bg-white relative overflow-hidden">
          <span className="absolute w-[141%] h-px bg-red-400 rotate-45" />
        </span>
        <span>擦除豆子</span>
      </button>
      <input
        type="text"
        placeholder="搜索颜色名称或编号..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-xs border rounded-md"
      />
      {/* 已选中颜色提示 */}
      {selectedColorIndex !== null && selectedColorIndex >= 0 && selectedColorIndex < colors.length && (
        <div className="flex items-center gap-2 py-1.5 px-2 bg-blue-50 rounded-md border border-blue-200">
          <span
            className="w-5 h-5 rounded-sm border-2 border-blue-500 ring-1 ring-blue-300 flex-shrink-0"
            style={{ backgroundColor: colors[selectedColorIndex].hex }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-700 font-medium truncate">已选中颜色</p>
            <p className="text-xs text-blue-600 truncate">{colors[selectedColorIndex].id} {colors[selectedColorIndex].name}</p>
          </div>
        </div>
      )}
      {/* 高亮颜色提示及取消按钮 */}
      {highlightColorIndex !== null && highlightColorIndex >= 0 && highlightColorIndex < colors.length && (
        <div className="flex items-center gap-2 py-1.5 px-2 bg-amber-50 rounded-md border border-amber-200">
          <span
            className="w-5 h-5 rounded-sm border-2 border-amber-500 ring-1 ring-amber-300 flex-shrink-0"
            style={{ backgroundColor: colors[highlightColorIndex].hex }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700 font-medium truncate">高亮中</p>
            <p className="text-xs text-amber-600 truncate">{colors[highlightColorIndex].id} {colors[highlightColorIndex].name}</p>
          </div>
          <button
            onClick={onClearHighlight}
            title="取消高亮"
            className="flex-shrink-0 p-1 rounded hover:bg-amber-100 text-amber-500 hover:text-amber-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
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

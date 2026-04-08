'use client';
import { useState, useMemo, useCallback } from 'react';
import type { Pattern, BeadColor } from '@/types';

interface ColorReplacerProps {
  pattern: Pattern;
  colors: BeadColor[];
  highlightColorIndex: number | null;
  onReplace: (sourceIndex: number, targetIndex: number) => void;
  onHighlight: (colorIndex: number) => void;
  onClearHighlight: () => void;
  onSelectColor: (colorIndex: number) => void;
}

export function ColorReplacer({ pattern, colors, highlightColorIndex, onReplace, onHighlight, onClearHighlight, onSelectColor }: ColorReplacerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<'source' | 'target'>('source');

  // 统计当前图案中使用的颜色及数量
  const usedColorStats = useMemo(() => {
    const stats = new Map<number, number>();
    for (const row of pattern.grid) {
      for (const idx of row) {
        if (idx >= 0 && idx < colors.length) {
          stats.set(idx, (stats.get(idx) || 0) + 1);
        }
      }
    }
    // 按数量降序排列
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([colorIndex, count]) => ({ colorIndex, count }));
  }, [pattern, colors]);

  // 搜索过滤
  const filteredColors = useMemo(() => {
    if (!search) return colors;
    const q = search.toLowerCase();
    return colors.filter(c => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [search, colors]);

  const handleReplace = useCallback(() => {
    if (sourceIndex === null || targetIndex === null) return;
    onReplace(sourceIndex, targetIndex);
    // 替换完成后重置状态
    setSourceIndex(null);
    setTargetIndex(null);
    setStep('source');
    setSearch('');
    onClearHighlight();
  }, [sourceIndex, targetIndex, onReplace, onClearHighlight]);

  const handleReset = useCallback(() => {
    setSourceIndex(null);
    setTargetIndex(null);
    setStep('source');
    setSearch('');
    onClearHighlight();
  }, [onClearHighlight]);

  const handleSelectColor = useCallback((idx: number) => {
    if (step === 'source') {
      setSourceIndex(idx);
      setStep('target');
      setSearch('');
      // 选中源颜色时触发高亮显示
      onHighlight(idx);
    } else {
      setTargetIndex(idx);
      setSearch('');
      // 选择目标颜色时同步更新侧边栏的"已选中颜色"
      if (idx >= 0) {
        onSelectColor(idx);
      }
    }
  }, [step, onHighlight, onSelectColor]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-1.5 px-3 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
        全局颜色替换
      </button>
    );
  }

  return (
    <div className="space-y-2 p-2.5 bg-indigo-50 rounded-lg border border-indigo-200">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-indigo-700">全局颜色替换</h3>
        <button
          onClick={() => { setIsOpen(false); handleReset(); }}
          className="p-0.5 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 已选择的颜色展示 */}
      <div className="flex items-center gap-2">
        {/* 源颜色 */}
        <button
          onClick={() => { setStep('source'); setSearch(''); }}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors ${
            step === 'source' ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-white/50'
          }`}
        >
          {sourceIndex !== null && sourceIndex >= 0 && sourceIndex < colors.length ? (
            <>
              <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ backgroundColor: colors[sourceIndex].hex }} />
              <span className="truncate text-gray-700">{colors[sourceIndex].id}</span>
            </>
          ) : (
            <span className="text-gray-400">选择源颜色</span>
          )}
        </button>

        {/* 箭头 */}
        <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>

        {/* 目标颜色 */}
        <button
          onClick={() => { if (sourceIndex !== null) { setStep('target'); setSearch(''); } }}
          className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors ${
            step === 'target' ? 'border-indigo-400 bg-white' : 'border-gray-200 bg-white/50'
          } ${sourceIndex === null ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {targetIndex !== null && targetIndex >= 0 && targetIndex < colors.length ? (
            <>
              <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0" style={{ backgroundColor: colors[targetIndex].hex }} />
              <span className="truncate text-gray-700">{colors[targetIndex].id}</span>
            </>
          ) : targetIndex === -1 ? (
            <>
              <span className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0 bg-white relative overflow-hidden">
                <span className="absolute w-[141%] h-px bg-red-400 rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </span>
              <span className="truncate text-gray-700">擦除</span>
            </>
          ) : (
            <span className="text-gray-400">选择目标颜色</span>
          )}
        </button>
      </div>

      {/* 步骤提示 */}
      <p className="text-[11px] text-indigo-500">
        {step === 'source' ? '第1步：选择要被替换的颜色' : '第2步：选择替换后的颜色'}
      </p>

      {/* 选择源颜色时，优先展示已使用的颜色 */}
      {step === 'source' && usedColorStats.length > 0 && !search && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">图案中使用的颜色（点击选择）</p>
          <div className="flex flex-wrap gap-1">
            {usedColorStats.map(({ colorIndex, count }) => (
              <button
                key={colorIndex}
                onClick={() => handleSelectColor(colorIndex)}
                title={`${colors[colorIndex].id} ${colors[colorIndex].name} (${count}颗)`}
                className={`w-6 h-6 rounded-sm border-2 transition-transform hover:scale-125 relative ${
                  sourceIndex === colorIndex ? 'border-indigo-500 ring-1 ring-indigo-300'
                  : highlightColorIndex === colorIndex ? 'border-amber-500 ring-1 ring-amber-300'
                  : 'border-gray-200'
                }`}
                style={{ backgroundColor: colors[colorIndex].hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 选择目标颜色时，提供擦除选项 + 搜索 */}
      {step === 'target' && (
        <>
          <button
            onClick={() => { setTargetIndex(-1); setSearch(''); }}
            className={`flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-xs transition-colors ${
              targetIndex === -1
                ? 'bg-white border border-indigo-500 text-indigo-700'
                : 'border border-gray-200 text-gray-600 hover:bg-white'
            }`}
          >
            <span className="w-4 h-4 rounded-sm border border-gray-300 flex items-center justify-center bg-white relative overflow-hidden">
              <span className="absolute w-[141%] h-px bg-red-400 rotate-45" />
            </span>
            <span>替换为空（擦除）</span>
          </button>
        </>
      )}

      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索颜色名称或编号..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-xs border rounded-md"
      />

      {/* 颜色列表 */}
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
        {filteredColors.map(c => {
          const idx = colors.indexOf(c);
          const isSelected = step === 'source' ? sourceIndex === idx : targetIndex === idx;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectColor(idx)}
              title={`${c.id} ${c.name}`}
              className={`w-5 h-5 rounded-sm border-2 transition-transform hover:scale-125 ${
                isSelected ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-gray-200'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 py-1.5 px-3 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          重置
        </button>
        <button
          onClick={handleReplace}
          disabled={sourceIndex === null || targetIndex === null}
          className="flex-1 py-1.5 px-3 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          替换全部
        </button>
      </div>

      <p className="text-[10px] text-gray-400 leading-tight">
        将图案中所有源颜色替换为目标颜色，支持撤销 (Ctrl+Z)
      </p>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { BeadColor } from '@/types';

interface PaletteSubsetSelectorProps {
  colors: BeadColor[];
  enabled: boolean;
  selectedIndices: Set<number>;
  onToggleEnabled: () => void;
  onToggleColor: (index: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onAutoLimit: (count: number) => void;
  isAutoLimiting: boolean; // 是否正在自动限色
  hasImage: boolean; // 是否已上传图片
}

export function PaletteSubsetSelector({
  colors,
  enabled,
  selectedIndices,
  onToggleEnabled,
  onToggleColor,
  onSelectAll,
  onSelectNone,
  onAutoLimit,
  isAutoLimiting,
  hasImage,
}: PaletteSubsetSelectorProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false); // 整个面板是否展开
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false); // 颜色选择器是否展开
  const [searchQuery, setSearchQuery] = useState('');

  // 搜索过滤
  const filteredColors = useMemo(() => {
    if (!searchQuery.trim()) return colors.map((c, i) => ({ color: c, index: i }));
    const q = searchQuery.toLowerCase().trim();
    return colors
      .map((c, i) => ({ color: c, index: i }))
      .filter(({ color }) =>
        color.id.toLowerCase().includes(q) ||
        color.name.toLowerCase().includes(q) ||
        color.hex.toLowerCase().includes(q) ||
        (color.category && color.category.toLowerCase().includes(q))
      );
  }, [colors, searchQuery]);

  // 按分类分组
  const groupedColors = useMemo(() => {
    const groups = new Map<string, { color: BeadColor; index: number }[]>();
    for (const item of filteredColors) {
      const category = item.color.category || '其他';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(item);
    }
    return groups;
  }, [filteredColors]);

  const selectedCount = selectedIndices.size;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 面板头部：开关 + 摘要 + 收缩按钮 */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
        onClick={() => enabled && setIsPanelOpen(!isPanelOpen)}
      >
        <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={() => {
              onToggleEnabled();
              // 开启时自动展开面板，关闭时自动收起
              if (!enabled) setIsPanelOpen(true);
              else setIsPanelOpen(false);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">限色生成</span>
        </label>
        <div className="flex items-center gap-2">
          {enabled && (
            <span className="text-xs text-gray-500">
              已选 {selectedCount} / {colors.length} 色
            </span>
          )}
          {enabled && (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* 已选颜色缩略预览（面板收起时显示） */}
      {enabled && !isPanelOpen && selectedCount > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-white">
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedIndices)
              .sort((a, b) => a - b)
              .slice(0, 24)
              .map(idx => (
                <div
                  key={idx}
                  className="w-4 h-4 rounded-sm border border-gray-200"
                  style={{ backgroundColor: colors[idx].hex }}
                  title={`${colors[idx].id} ${colors[idx].name}`}
                />
              ))}
            {selectedCount > 24 && (
              <span className="text-[10px] text-gray-400 self-center">+{selectedCount - 24}</span>
            )}
          </div>
        </div>
      )}

      {/* 可收缩的面板内容 */}
      {enabled && isPanelOpen && (
        <div className="px-3 py-2 border-t border-gray-100 bg-white space-y-2">
          <p className="text-[11px] text-gray-400 leading-tight">
            只使用选中的颜色生成图案，减少近似色让画面更干净
          </p>

          {/* 自动限色按钮 */}
          <div className="space-y-1.5">
            <span className="text-xs text-gray-600">自动推荐</span>
            <div className="flex gap-1.5">
              {[8, 16, 24, 32].map(count => (
                <button
                  key={count}
                  onClick={() => onAutoLimit(count)}
                  disabled={!hasImage || isAutoLimiting}
                  className="flex-1 py-1 px-2 text-xs rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={!hasImage ? '请先上传图片' : `分析图像，推荐 ${count} 色`}
                >
                  {isAutoLimiting ? '...' : `${count}色`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              {!hasImage ? '上传图片后可使用自动推荐' : '根据图像主色调自动推荐最佳颜色子集'}
            </p>
          </div>

          {/* 快捷操作 */}
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              全选
            </button>
            <button
              onClick={onSelectNone}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              全不选
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
            >
              {isColorPickerOpen ? '收起' : '展开选色'}
              <svg
                className={`w-3 h-3 transition-transform ${isColorPickerOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* 已选颜色预览（选色面板收起时显示） */}
          {!isColorPickerOpen && selectedCount > 0 && (
            <div className="flex flex-wrap gap-1">
              {Array.from(selectedIndices)
                .sort((a, b) => a - b)
                .slice(0, 30)
                .map(idx => (
                  <button
                    key={idx}
                    onClick={() => onToggleColor(idx)}
                    className="w-5 h-5 rounded border border-gray-300 hover:ring-2 hover:ring-red-300 transition-all"
                    style={{ backgroundColor: colors[idx].hex }}
                    title={`${colors[idx].id} ${colors[idx].name} - 点击取消选择`}
                  />
                ))}
              {selectedCount > 30 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{selectedCount - 30}
                </span>
              )}
            </div>
          )}

          {/* 展开的颜色选择面板 */}
          {isColorPickerOpen && (
            <div className="space-y-2">
              {/* 搜索框 */}
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索颜色（色号/名称）..."
                className="w-full px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* 颜色网格 */}
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                {groupedColors.size === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">无匹配颜色</p>
                ) : (
                  Array.from(groupedColors.entries()).map(([category, items]) => (
                    <div key={category} className="mb-2 last:mb-0">
                      {groupedColors.size > 1 && (
                        <div className="text-[10px] text-gray-500 mb-1 font-medium">{category}</div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {items.map(({ color, index }) => {
                          const isSelected = selectedIndices.has(index);
                          return (
                            <button
                              key={index}
                              onClick={() => onToggleColor(index)}
                              className={`w-6 h-6 rounded border-2 transition-all relative ${
                                isSelected
                                  ? 'border-blue-500 ring-1 ring-blue-300'
                                  : 'border-gray-200 hover:border-gray-400 opacity-50'
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={`${color.id} ${color.name}${isSelected ? ' ✓' : ''}`}
                            >
                              {isSelected && (
                                <svg
                                  className="absolute inset-0 m-auto w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke={isLightColor(color) ? '#333' : '#fff'}
                                  strokeWidth={3}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 判断颜色是否为浅色（用于决定勾选图标颜色） */
function isLightColor(color: BeadColor): boolean {
  // 使用相对亮度公式
  const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  return luminance > 160;
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ColorPalette } from '@/types';
import { PaletteManager } from '@/lib/palette';

interface PaletteSelectorProps {
  currentPaletteId: string;
  onSelectPalette: (paletteId: string) => void;
  onImportClick: () => void;
  onDeletePalette?: (paletteId: string) => void; // 删除色板后的回调
  refreshKey?: number; // 用于触发色板列表刷新
}

export function PaletteSelector({
  currentPaletteId,
  onSelectPalette,
  onImportClick,
  onDeletePalette,
  refreshKey = 0,
}: PaletteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // refreshKey 变化时重新获取色板列表
  const palettes = useMemo(() => {
    PaletteManager.refreshCache(); // 刷新缓存以获取最新数据
    return PaletteManager.getAllPalettes();
  }, [refreshKey]);
  
  const currentPalette = useMemo(
    () => palettes.find(p => p.id === currentPaletteId) || palettes[0],
    [palettes, currentPaletteId]
  );

  const handleSelect = useCallback((palette: ColorPalette) => {
    onSelectPalette(palette.id);
    setIsOpen(false);
  }, [onSelectPalette]);

  const handleDelete = useCallback((e: React.MouseEvent, paletteId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个色板吗？')) {
      PaletteManager.deleteCustomPalette(paletteId);
      // 如果删除的是当前色板，切换到默认色板
      if (paletteId === currentPaletteId) {
        onSelectPalette(palettes[0].id);
      }
      // 通知父组件触发刷新
      onDeletePalette?.(paletteId);
    }
  }, [currentPaletteId, onSelectPalette, onDeletePalette, palettes]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">色板</h3>
        <button
          onClick={onImportClick}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          导入色板
        </button>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 text-left text-sm bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {currentPalette.colors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </div>
              <div>
                <div className="font-medium">{currentPalette.name}</div>
                <div className="text-xs text-gray-500">
                  {currentPalette.brand} · {currentPalette.colors.length} 色
                </div>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <>
            {/* 点击外部关闭 */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 下拉菜单 */}
            <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {palettes.map(palette => (
                <div
                  key={palette.id}
                  onClick={() => handleSelect(palette)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group cursor-pointer ${
                    palette.id === currentPaletteId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {palette.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full border border-white"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        {palette.name}
                        {palette.isBuiltIn && (
                          <span className="text-xs text-gray-400">(内置)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {palette.brand} · {palette.colors.length} 色
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {palette.id === currentPaletteId && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    
                    {!palette.isBuiltIn && (
                      <button
                        onClick={(e) => handleDelete(e, palette.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除色板"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

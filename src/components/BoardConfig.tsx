'use client';
import { useState, useEffect } from 'react';
import type { EdgeEnhanceMode } from '@/types';

interface BoardConfigProps {
  width: number;
  height: number;
  hasImage: boolean;
  isProcessing: boolean;
  autoRemoveBackground: boolean;
  edgeEnhance: EdgeEnhanceMode;
  onToggleAutoRemoveBg: () => void;
  onEdgeEnhanceChange: (mode: EdgeEnhanceMode) => void;
  onSizeChange: (width: number, height: number) => void;
  onConvert: () => void;
}

const PRESETS = [
  { label: '32×32', w: 32, h: 32 },
  { label: '40×40', w: 40, h: 40 },
  { label: '52×52', w: 52, h: 52 },
  { label: '104×104', w: 104, h: 104 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

const EDGE_ENHANCE_OPTIONS: { value: EdgeEnhanceMode; label: string; desc: string }[] = [
  { value: 'off', label: '关闭', desc: '不做轮廓强化' },
{ value: 'edge-aware', label: '边缘感知', desc: '让线条和轮廓在缩小后依然清晰' },
];

export function BoardConfig({ width, height, hasImage, isProcessing, autoRemoveBackground, edgeEnhance, onToggleAutoRemoveBg, onEdgeEnhanceChange, onSizeChange, onConvert }: BoardConfigProps) {
  const [isCustom, setIsCustom] = useState(false);
  // Local string state so users can freely type/clear the input
  const [localW, setLocalW] = useState(String(width));
  const [localH, setLocalH] = useState(String(height));

  // Sync external value → local when changed via presets
  useEffect(() => { setLocalW(String(width)); }, [width]);
  useEffect(() => { setLocalH(String(height)); }, [height]);

  // 监听外部尺寸变化，自动更新isCustom状态
  useEffect(() => {
    const isPreset = PRESETS.some(preset => preset.w === width && preset.h === height);
    setIsCustom(!isPreset);
  }, [width, height]);

  const commitWidth = () => {
    const n = Number(localW);
    if (!localW || isNaN(n)) {
      setLocalW(String(width));
      return;
    }
    const clamped = clamp(Math.round(n), 5, 200);
    setLocalW(String(clamped));
    onSizeChange(clamped, height);
  };

  const commitHeight = () => {
    const n = Number(localH);
    if (!localH || isNaN(n)) {
      setLocalH(String(height));
      return;
    }
    const clamped = clamp(Math.round(n), 5, 200);
    setLocalH(String(clamped));
    onSizeChange(width, clamped);
  };

  const selectPreset = (w: number, h: number) => {
    setIsCustom(false);
    onSizeChange(w, h);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">拼豆板尺寸</h3>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => selectPreset(p.w, p.h)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              !isCustom && width === p.w && height === p.h
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setIsCustom(true)}
        className={`w-full px-3 py-1.5 text-xs rounded-lg border transition-colors ${
          isCustom ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
        }`}
      >
        自定义尺寸
      </button>
      {isCustom && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={5}
            max={200}
            value={localW}
            onChange={e => setLocalW(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={e => { if (e.key === 'Enter') commitWidth(); }}
            className="w-20 px-2 py-1 text-xs border rounded-md text-center"
          />
          <span className="text-gray-400 text-xs">×</span>
          <input
            type="number"
            min={5}
            max={200}
            value={localH}
            onChange={e => setLocalH(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={e => { if (e.key === 'Enter') commitHeight(); }}
            className="w-20 px-2 py-1 text-xs border rounded-md text-center"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRemoveBackground}
            onChange={onToggleAutoRemoveBg}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-600">自动去除背景</span>
        </label>
        <p className="text-[11px] text-gray-400 leading-tight pl-6">去除背景效果不佳时建议使用常用的修图软件将原图转为透明背景的png图片后再进行拼豆图案生成</p>
      </div>
      {/* 轮廓强化选项 */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-600">轮廓强化</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {EDGE_ENHANCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onEdgeEnhanceChange(opt.value)}
              className={`px-2 py-1.5 text-[11px] rounded-md border transition-colors ${
                edgeEnhance === opt.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-500'
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 leading-tight">
          {edgeEnhance === 'off' && '不做额外的轮廓处理'}
{edgeEnhance === 'edge-aware' && '图片缩小为拼豆尺寸时，自动识别原图中的线条和轮廓，优先保留这些细节，避免它们被"糊掉"'}
        </p>
      </div>
      <button
        onClick={onConvert}
        disabled={!hasImage || isProcessing}
        className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? '转换中...' : '生成拼豆图案'}
      </button>
    </div>
  );
}

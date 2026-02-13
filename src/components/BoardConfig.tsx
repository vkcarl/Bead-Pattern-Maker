'use client';
import { useState, useEffect } from 'react';

interface BoardConfigProps {
  width: number;
  height: number;
  hasImage: boolean;
  isProcessing: boolean;
  autoRemoveBackground: boolean;
  onToggleAutoRemoveBg: () => void;
  onSizeChange: (width: number, height: number) => void;
  onConvert: () => void;
}

const PRESETS = [
  { label: '29×29', w: 29, h: 29 },
  { label: '58×29', w: 58, h: 29 },
  { label: '29×58', w: 29, h: 58 },
  { label: '58×58', w: 58, h: 58 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function BoardConfig({ width, height, hasImage, isProcessing, autoRemoveBackground, onToggleAutoRemoveBg, onSizeChange, onConvert }: BoardConfigProps) {
  const [isCustom, setIsCustom] = useState(false);
  // Local string state so users can freely type/clear the input
  const [localW, setLocalW] = useState(String(width));
  const [localH, setLocalH] = useState(String(height));

  // Sync external value → local when changed via presets
  useEffect(() => { setLocalW(String(width)); }, [width]);
  useEffect(() => { setLocalH(String(height)); }, [height]);

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

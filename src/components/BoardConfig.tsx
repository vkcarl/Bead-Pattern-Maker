'use client';
import { useState } from 'react';

interface BoardConfigProps {
  width: number;
  height: number;
  hasImage: boolean;
  isProcessing: boolean;
  onSizeChange: (width: number, height: number) => void;
  onConvert: () => void;
}

const PRESETS = [
  { label: '29×29', w: 29, h: 29 },
  { label: '58×29', w: 58, h: 29 },
  { label: '29×58', w: 29, h: 58 },
  { label: '58×58', w: 58, h: 58 },
];

export function BoardConfig({ width, height, hasImage, isProcessing, onSizeChange, onConvert }: BoardConfigProps) {
  const [isCustom, setIsCustom] = useState(false);

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
            value={width}
            onChange={e => onSizeChange(Math.max(5, Math.min(200, Number(e.target.value))), height)}
            className="w-20 px-2 py-1 text-xs border rounded-md text-center"
          />
          <span className="text-gray-400 text-xs">×</span>
          <input
            type="number"
            min={5}
            max={200}
            value={height}
            onChange={e => onSizeChange(width, Math.max(5, Math.min(200, Number(e.target.value))))}
            className="w-20 px-2 py-1 text-xs border rounded-md text-center"
          />
        </div>
      )}
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

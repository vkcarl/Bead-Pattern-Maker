'use client';
import { useState } from 'react';
import type { Pattern } from '@/types';

// PNG 导出分辨率预设（每豆像素大小）
const PNG_RESOLUTION_PRESETS = [
  { label: '标准', value: 20, desc: '适合预览' },
  { label: '高清', value: 40, desc: '推荐' },
  { label: '超清', value: 80, desc: '大图案慎用' },
] as const;

// PDF 豆子物理尺寸预设（毫米）
const PDF_BEAD_SIZES = [
  { label: '2.6mm', value: 2.6 },
  { label: '5mm', value: 5 },
] as const;

interface ExportPanelProps {
  pattern: Pattern | null;
  onExportPDF: (beadSizeMm: number) => void;
  onExportPNG: (cellSizePx: number) => void;
}

export function ExportPanel({ pattern, onExportPDF, onExportPNG }: ExportPanelProps) {
  const [cellSizePx, setCellSizePx] = useState<number>(40);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [pdfBeadSize, setPdfBeadSize] = useState<number>(2.6);

  if (!pattern) return null;

  // 计算 PNG 预估输出尺寸
  const outputW = pattern.width * cellSizePx;
  const outputH = pattern.height * cellSizePx;
  // PNG 是无损压缩格式，拼豆图案大色块重复多，压缩率高
  // 用经验系数 0.07（约 7%）估算实际文件大小，比原始 RGBA 内存更接近真实值
  const estimatedMB = ((outputW * outputH * 4 * 0.07) / 1024 / 1024).toFixed(1);

  const handlePresetClick = (value: number) => {
    setCellSizePx(value);
    setIsCustom(false);
    setCustomInput('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomInput(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 8 && num <= 200) {
      setCellSizePx(num);
    }
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    setCustomInput(String(cellSizePx));
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">导出</h3>

      {/* PNG 分辨率选择 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">PNG 清晰度</span>
          <span className="text-xs text-gray-400 tabular-nums">{cellSizePx}px/豆</span>
        </div>
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {PNG_RESOLUTION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className={`flex-1 px-1.5 py-1 text-xs transition-colors border-r border-gray-300 last:border-r-0 ${
                !isCustom && cellSizePx === preset.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title={preset.desc}
            >
              {preset.label}
            </button>
          ))}
          {/* 自定义输入 */}
          <div className={`flex items-center border-l border-gray-300 px-1.5 ${isCustom ? 'bg-blue-50' : ''}`}>
            <input
              type="number"
              min={8}
              max={200}
              value={isCustom ? customInput : ''}
              placeholder="自定"
              onFocus={handleCustomFocus}
              onChange={handleCustomChange}
              className={`w-10 text-xs text-center bg-transparent outline-none ${isCustom ? 'text-blue-700 font-medium' : 'text-gray-400'}`}
            />
          </div>
        </div>
        {/* 输出尺寸预估 */}
        <p className="text-[11px] text-gray-400 leading-tight">
          输出：{outputW} × {outputH}px
          {parseFloat(estimatedMB) > 1.5 && (
            <span className="text-amber-500 ml-1">（约 {estimatedMB}MB）</span>
          )}
        </p>
      </div>

      {/* PDF 豆子尺寸选择 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">PDF 豆子尺寸</span>
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {PDF_BEAD_SIZES.map((size) => (
            <button
              key={size.value}
              onClick={() => setPdfBeadSize(size.value)}
              className={`px-2.5 py-1 text-xs transition-colors border-r border-gray-300 last:border-r-0 ${
                pdfBeadSize === size.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onExportPDF(pdfBeadSize)}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PDF
        </button>
        <button
          onClick={() => onExportPNG(cellSizePx)}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PNG
        </button>
      </div>
    </div>
  );
}

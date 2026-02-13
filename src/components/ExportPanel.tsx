'use client';
import { useState } from 'react';
import type { Pattern } from '@/types';

export type BeadSize = 2.6 | 5;

interface ExportPanelProps {
  pattern: Pattern | null;
  onExportPDF: (beadSize: BeadSize) => void;
  onExportPNG: (beadSize: BeadSize) => void;
}

export function ExportPanel({ pattern, onExportPDF, onExportPNG }: ExportPanelProps) {
  const [beadSize, setBeadSize] = useState<BeadSize>(2.6);

  if (!pattern) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">导出</h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">豆子尺寸</span>
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          <button
            onClick={() => setBeadSize(2.6)}
            className={`px-2.5 py-1 text-xs transition-colors ${
              beadSize === 2.6
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            2.6mm
          </button>
          <button
            onClick={() => setBeadSize(5)}
            className={`px-2.5 py-1 text-xs border-l border-gray-300 transition-colors ${
              beadSize === 5
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            5mm
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onExportPDF(beadSize)}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PDF
        </button>
        <button
          onClick={() => onExportPNG(beadSize)}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PNG
        </button>
      </div>
    </div>
  );
}

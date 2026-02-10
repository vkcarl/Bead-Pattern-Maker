'use client';
import type { Pattern } from '@/types';

interface ExportPanelProps {
  pattern: Pattern | null;
  onExportPDF: () => void;
  onExportPNG: () => void;
}

export function ExportPanel({ pattern, onExportPDF, onExportPNG }: ExportPanelProps) {
  if (!pattern) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">导出</h3>
      <div className="flex gap-2">
        <button
          onClick={onExportPDF}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PDF
        </button>
        <button
          onClick={onExportPNG}
          className="flex-1 py-1.5 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          导出 PNG
        </button>
      </div>
    </div>
  );
}

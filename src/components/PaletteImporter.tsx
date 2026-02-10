'use client';

import { useState, useCallback, useRef } from 'react';
import type { BeadColor } from '@/types';
import { parseFile, validateAndNormalize, createCustomPalette, PaletteManager, ValidationResult } from '@/lib/palette';

interface PaletteImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (paletteId: string) => void;
}

type ImportStep = 'upload' | 'preview' | 'confirm';

export function PaletteImporter({
  isOpen,
  onClose,
  onImportSuccess,
}: PaletteImporterProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [paletteName, setPaletteName] = useState('');
  const [paletteBrand, setPaletteBrand] = useState('');
  const [paletteDescription, setPaletteDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setError(null);
    setValidationResult(null);
    setPaletteName('');
    setPaletteBrand('');
    setPaletteDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const content = await file.text();
      const entries = parseFile(content, file.name);
      const result = validateAndNormalize(entries);

      setValidationResult(result);

      if (result.valid) {
        // 自动设置默认名称
        const baseName = file.name.replace(/\.(json|csv)$/i, '');
        setPaletteName(baseName);
        setStep('preview');
      } else {
        setError(result.errors.join('\n'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!validationResult?.valid || !paletteName.trim()) return;

    const palette = createCustomPalette(
      validationResult.colors,
      paletteName.trim(),
      paletteBrand.trim() || '自定义',
      paletteDescription.trim() || undefined
    );

    PaletteManager.addCustomPalette(palette);
    onImportSuccess(palette.id);
    handleClose();
  }, [validationResult, paletteName, paletteBrand, paletteDescription, onImportSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">导入色板</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                支持导入 JSON 或 CSV 格式的色板文件。
              </p>

              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-2">
                <p className="font-medium text-gray-700">支持的格式：</p>
                <div>
                  <p className="font-medium">JSON 格式：</p>
                  <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`[
  { "id": "001", "name": "白色", "hex": "#FFFFFF" },
  { "id": "002", "name": "黑色", "r": 0, "g": 0, "b": 0 }
]`}
                  </pre>
                </div>
                <div>
                  <p className="font-medium">CSV 格式：</p>
                  <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`id,name,hex
001,白色,#FFFFFF
002,黑色,#000000`}
                  </pre>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">点击选择文件</p>
                <p className="mt-1 text-xs text-gray-400">支持 .json, .csv 格式</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && validationResult && (
            <div className="space-y-4">
              {/* 颜色预览 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  预览 ({validationResult.colors.length} 色)
                </p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                  {validationResult.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.id}: ${color.name}`}
                    />
                  ))}
                </div>
              </div>

              {/* 警告信息 */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  {validationResult.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              {/* 色板信息表单 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    色板名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paletteName}
                    onChange={e => setPaletteName(e.target.value)}
                    placeholder="例如：我的自定义色板"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    品牌名称
                  </label>
                  <input
                    type="text"
                    value={paletteBrand}
                    onChange={e => setPaletteBrand(e.target.value)}
                    placeholder="例如：Perler, Hama..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <textarea
                    value={paletteDescription}
                    onChange={e => setPaletteDescription(e.target.value)}
                    placeholder="色板的描述信息..."
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setValidationResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                返回
              </button>
              <button
                onClick={handleConfirm}
                disabled={!paletteName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                导入色板
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

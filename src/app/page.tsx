'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { usePatternState } from '@/hooks/usePatternState';
import { useZoomPan } from '@/hooks/useZoomPan';
import { useImageUpload } from '@/hooks/useImageUpload';
import { processImage } from '@/lib/image-processor';
import { exportPatternAsPDF } from '@/lib/export-pdf';
import { exportPatternAsPNG, exportPatternWithCodesPNG } from '@/lib/export-image';
import { PaletteManager, setActivePaletteById } from '@/lib/palette';

import { ImageUploader } from '@/components/ImageUploader';
import { BoardConfig } from '@/components/BoardConfig';
import { BeadGrid } from '@/components/BeadGrid';
import { BeadStats } from '@/components/BeadStats';
import { Toolbar } from '@/components/Toolbar';
import { ColorPicker } from '@/components/ColorPicker';
import { ExportPanel } from '@/components/ExportPanel';
import { PaletteSelector } from '@/components/PaletteSelector';
import { PaletteImporter } from '@/components/PaletteImporter';

export default function Home() {
  const { state, dispatch, canUndo, canRedo, undo, redo } = usePatternState();
  const { onWheel, onMouseDown, onMouseMove, onMouseUp } = useZoomPan({
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    dispatch,
  });
  const { onDrop, onDragOver, onFileSelect } = useImageUpload(dispatch);

  // 色板导入弹窗状态
  const [showImporter, setShowImporter] = useState(false);
  // 用于触发色板列表刷新的 key
  const [paletteRefreshKey, setPaletteRefreshKey] = useState(0);

  // 获取当前色板的颜色数组
  const currentPalette = useMemo(() => {
    return PaletteManager.getPaletteById(state.currentPaletteId) || PaletteManager.getCurrentPalette();
  }, [state.currentPaletteId]);

  const currentColors = useMemo(() => currentPalette.colors, [currentPalette]);

  // 切换色板时同步更新颜色匹配器
  useEffect(() => {
    setActivePaletteById(state.currentPaletteId);
  }, [state.currentPaletteId]);

  // Scroll-based pan update (from native scrollbars)
  const handlePanChange = useCallback(
    (x: number, y: number) => dispatch({ type: 'SET_PAN', payload: { x, y } }),
    [dispatch]
  );

  // 居中显示图案的回调
  const handleRequestCenter = useCallback(
    (centerX: number, centerY: number) => {
      dispatch({ type: 'SET_PAN', payload: { x: centerX, y: centerY } });
    },
    [dispatch]
  );

  // Convert image to bead pattern
  const handleConvert = useCallback(async () => {
    if (!state.originalImage) return;
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      const pattern = await processImage(state.originalImage, state.boardWidth, state.boardHeight);
      dispatch({ type: 'GENERATE_PATTERN', payload: pattern });
    } catch {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [state.originalImage, state.boardWidth, state.boardHeight, dispatch]);

  // Cell click handler (paint mode)
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (state.selectedTool === 'paint' && state.selectedColorIndex !== null) {
        dispatch({
          type: 'SET_CELL',
          payload: { row, col, colorIndex: state.selectedColorIndex },
        });
      }
    },
    [state.selectedTool, state.selectedColorIndex, dispatch]
  );

  // Export handlers
  const handleExportPDF = useCallback(() => {
    if (state.pattern) exportPatternAsPDF(state.pattern, currentColors);
  }, [state.pattern, currentColors]);

  const handleExportPNG = useCallback(() => {
    if (state.pattern) exportPatternWithCodesPNG(state.pattern, currentColors);
  }, [state.pattern, currentColors]);

  // 色板选择处理
  const handleSelectPalette = useCallback((paletteId: string) => {
    dispatch({ type: 'SET_PALETTE', payload: paletteId });
  }, [dispatch]);

  // 色板导入成功处理
  const handleImportSuccess = useCallback((paletteId: string) => {
    setPaletteRefreshKey(k => k + 1); // 触发色板列表刷新
    dispatch({ type: 'SET_PALETTE', payload: paletteId });
  }, [dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_TOOL', payload: 'select' });
      }
      if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_TOOL', payload: 'paint' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, dispatch]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm flex-shrink-0">
        <h1 className="text-base font-semibold text-gray-800">
          拼豆图案转换器
        </h1>
        <span className="text-xs text-gray-400">{currentPalette.name}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r overflow-y-auto flex-shrink-0 p-4 space-y-5">
          {/* Palette selector */}
          <PaletteSelector
            currentPaletteId={state.currentPaletteId}
            onSelectPalette={handleSelectPalette}
            onImportClick={() => setShowImporter(true)}
            onDeletePalette={() => setPaletteRefreshKey(k => k + 1)}
            refreshKey={paletteRefreshKey}
          />

          {/* Upload section */}
          {!state.originalImage ? (
            <ImageUploader onDrop={onDrop} onDragOver={onDragOver} onFileSelect={onFileSelect} />
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <img
                  src={state.originalImage}
                  alt="原图"
                  className="w-full rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => dispatch({ type: 'CLEAR_IMAGE' })}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
                  title="移除图片"
                >
                  x
                </button>
              </div>
            </div>
          )}

          {/* Board config */}
          <BoardConfig
            width={state.boardWidth}
            height={state.boardHeight}
            hasImage={!!state.originalImage}
            isProcessing={state.isProcessing}
            onSizeChange={(w, h) => dispatch({ type: 'SET_BOARD_SIZE', payload: { width: w, height: h } })}
            onConvert={handleConvert}
          />

          {/* Color picker (only after pattern generated) */}
          {state.pattern && (
            <ColorPicker
              pattern={state.pattern}
              colors={currentColors}
              selectedColorIndex={state.selectedColorIndex}
              onSelectColor={(idx) => dispatch({ type: 'SET_SELECTED_COLOR', payload: idx })}
            />
          )}

          {/* Bead stats */}
          {state.pattern && <BeadStats pattern={state.pattern} colors={currentColors} />}

          {/* Export */}
          <ExportPanel
            pattern={state.pattern}
            onExportPDF={handleExportPDF}
            onExportPNG={handleExportPNG}
          />
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {state.pattern ? (
            <>
              <Toolbar
                zoom={state.zoom}
                showGridLines={state.showGridLines}
                showBeadCodes={state.showBeadCodes}
                canUndo={canUndo}
                canRedo={canRedo}
                selectedTool={state.selectedTool}
                onZoomIn={() => dispatch({ type: 'SET_ZOOM', payload: state.zoom * 1.25 })}
                onZoomOut={() => dispatch({ type: 'SET_ZOOM', payload: state.zoom / 1.25 })}
                onZoomReset={() => {
                  dispatch({ type: 'SET_ZOOM', payload: 1 });
                  dispatch({ type: 'SET_PAN', payload: { x: 0, y: 0 } });
                }}
                onUndo={undo}
                onRedo={redo}
                onToggleGridLines={() => dispatch({ type: 'TOGGLE_GRID_LINES' })}
                onToggleBeadCodes={() => dispatch({ type: 'TOGGLE_BEAD_CODES' })}
                onSelectTool={(tool) => dispatch({ type: 'SET_TOOL', payload: tool })}
              />
              <div className="flex-1 overflow-hidden">
                <BeadGrid
                  pattern={state.pattern}
                  colors={currentColors}
                  zoom={state.zoom}
                  panX={state.panX}
                  panY={state.panY}
                  showGridLines={state.showGridLines}
                  showBeadCodes={state.showBeadCodes}
                  selectedTool={state.selectedTool}
                  selectedColorIndex={state.selectedColorIndex}
                  onCellClick={handleCellClick}
                  onWheel={onWheel}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onPanChange={handlePanChange}
                  onRequestCenter={handleRequestCenter}
                  shouldCenter={state.shouldCenter}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center space-y-3">
                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-sm">上传图片并点击「生成拼豆图案」开始</p>
                <p className="text-xs text-gray-300">支持滚轮缩放 / Alt+拖拽平移 / 快捷键 V B Ctrl+Z/Y</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Palette importer modal */}
      <PaletteImporter
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}

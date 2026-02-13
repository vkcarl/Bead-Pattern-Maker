'use client';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { usePatternState } from '@/hooks/usePatternState';
import { useZoomPan } from '@/hooks/useZoomPan';
import { useImageUpload } from '@/hooks/useImageUpload';
import { processImage } from '@/lib/image-processor';
import { removeBackground } from '@/lib/flood-fill';
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
  // scrollRef 需要在这里创建，以便 useZoomPan 和 BeadGrid 共享
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onWheel, onMouseDown, onMouseMove, onMouseUp } = useZoomPan({
    zoom: state.zoom,
    dispatch,
    scrollRef,
  });
  const { onDrop, onDragOver, onFileSelect } = useImageUpload(dispatch);

  // 色板导入弹窗状态
  const [showImporter, setShowImporter] = useState(false);
  // 用于触发色板列表刷新的 key
  const [paletteRefreshKey, setPaletteRefreshKey] = useState(0);
  // 背景去除 toggle 状态
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const preRemovalGridRef = useRef<number[][] | null>(null);
  // 手机端侧边栏折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 获取当前色板的颜色数组
  const currentPalette = useMemo(() => {
    return PaletteManager.getPaletteById(state.currentPaletteId) || PaletteManager.getCurrentPalette();
  }, [state.currentPaletteId]);

  const currentColors = useMemo(() => currentPalette.colors, [currentPalette]);

  // 切换色板时同步更新颜色匹配器
  useEffect(() => {
    setActivePaletteById(state.currentPaletteId);
  }, [state.currentPaletteId]);

  // 居中显示图案的回调
  const handleCentered = useCallback(
    () => {
      dispatch({ type: 'CLEAR_SHOULD_CENTER' });
    },
    [dispatch]
  );

  // Convert image to bead pattern
  const handleConvert = useCallback(async () => {
    if (!state.originalImage) return;
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      const pattern = await processImage(state.originalImage, state.boardWidth, state.boardHeight);
      if (state.autoRemoveBackground) {
        // 保存去背景前的 grid，以便 toggle 恢复
        preRemovalGridRef.current = pattern.grid.map(r => [...r]);
        pattern.grid = removeBackground(pattern.grid, pattern.width, pattern.height);
        setBackgroundRemoved(true);
      } else {
        preRemovalGridRef.current = null;
        setBackgroundRemoved(false);
      }
      dispatch({ type: 'GENERATE_PATTERN', payload: pattern });
    } catch {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [state.originalImage, state.boardWidth, state.boardHeight, state.autoRemoveBackground, dispatch]);

  // 切换背景去除状态
  const handleToggleBackground = useCallback(() => {
    if (!state.pattern) return;
    if (!backgroundRemoved) {
      // 保存当前 grid，执行去背景
      preRemovalGridRef.current = state.pattern.grid.map(r => [...r]);
      dispatch({ type: 'REMOVE_BACKGROUND' });
      setBackgroundRemoved(true);
    } else {
      // 恢复去背景前的 grid
      if (preRemovalGridRef.current) {
        dispatch({ type: 'RESTORE_BACKGROUND', payload: preRemovalGridRef.current });
        preRemovalGridRef.current = null;
      }
      setBackgroundRemoved(false);
    }
  }, [state.pattern, backgroundRemoved, dispatch]);

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

  // 取色笔取色处理
  const handleEyedropperPick = useCallback(
    (colorIndex: number) => {
      // 取色后更新选中的颜色
      dispatch({ type: 'SET_EYEDROPPER_COLOR', payload: colorIndex });
    },
    [dispatch]
  );

  // Export handlers
  const handleExportPDF = useCallback(async (beadSize: number) => {
    if (state.pattern) await exportPatternAsPDF(state.pattern, currentColors, beadSize);
  }, [state.pattern, currentColors]);

  const handleExportPNG = useCallback((beadSize: number) => {
    if (state.pattern) exportPatternWithCodesPNG(state.pattern, currentColors, beadSize);
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

  // 加载示例图片
  const handleLoadExample = useCallback(async (src: string) => {
    const res = await fetch(src);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        dispatch({ type: 'SET_IMAGE', payload: dataUrl });
        // 根据示例图设置对应的拼豆板尺寸
        if (src === '/example1.jpg') {
          dispatch({ type: 'SET_BOARD_SIZE', payload: { width: 52, height: 52 } });
        } else if (src === '/example2.png') {
          dispatch({ type: 'SET_BOARD_SIZE', payload: { width: 60, height: 60 } });
        }
      }
    };
    reader.readAsDataURL(blob);
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
      if (e.key === 'i' && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: 'SET_TOOL', payload: 'eyedropper' });
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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-white border-b md:border-b-0 md:border-r flex-shrink-0 md:w-72 md:overflow-y-auto">
          {/* 手机端折叠按钮 */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-50 text-blue-700 active:bg-blue-100 border-b border-blue-100 md:hidden"
          >
            <span>{sidebarCollapsed ? '展开设置面板' : '收起设置面板'}</span>
            <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* 侧边栏内容 */}
          <div className={`${sidebarCollapsed ? 'hidden' : 'max-h-[35vh] overflow-y-auto'} md:block md:max-h-none md:overflow-y-auto p-4 space-y-5`}>
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
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500 shrink-0 leading-tight">快速<br/>尝试</span>
                <button onClick={() => handleLoadExample('/example1.jpg')} className="w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                  <img src="/example1.jpg" alt="示例1" className="w-full h-full object-cover" />
                </button>
                <button onClick={() => handleLoadExample('/example2.png')} className="w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
                  <img src="/example2.png" alt="示例2" className="w-full h-full object-cover" />
                </button>
              </div>
              <ImageUploader onDrop={onDrop} onDragOver={onDragOver} onFileSelect={onFileSelect} />
            </div>
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
            autoRemoveBackground={state.autoRemoveBackground}
            onToggleAutoRemoveBg={() => dispatch({ type: 'TOGGLE_AUTO_REMOVE_BG' })}
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
          </div>
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
                  // 重置时触发居中
                  const scrollEl = scrollRef.current;
                  if (scrollEl) {
                    const CANVAS_PADDING = 2000;
                    const cellSize = 20; // BASE_CELL_SIZE
                    const totalW = state.pattern!.width * cellSize;
                    const totalH = state.pattern!.height * cellSize;
                    const viewW = scrollEl.clientWidth;
                    const viewH = scrollEl.clientHeight;
                    scrollEl.scrollLeft = CANVAS_PADDING - (viewW - totalW) / 2;
                    scrollEl.scrollTop = CANVAS_PADDING - (viewH - totalH) / 2;
                  }
                }}
                onUndo={undo}
                onRedo={redo}
                onToggleGridLines={() => dispatch({ type: 'TOGGLE_GRID_LINES' })}
                onToggleBeadCodes={() => dispatch({ type: 'TOGGLE_BEAD_CODES' })}
                onSelectTool={(tool) => dispatch({ type: 'SET_TOOL', payload: tool })}
                backgroundRemoved={backgroundRemoved}
                onToggleBackground={handleToggleBackground}
              />
              <div className="flex-1 overflow-hidden">
                <BeadGrid
                  pattern={state.pattern}
                  colors={currentColors}
                  zoom={state.zoom}
                  showGridLines={state.showGridLines}
                  showBeadCodes={state.showBeadCodes}
                  selectedTool={state.selectedTool}
                  selectedColorIndex={state.selectedColorIndex}
                  onCellClick={handleCellClick}
                  onEyedropperPick={handleEyedropperPick}
                  onWheel={onWheel}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  shouldCenter={state.shouldCenter}
                  onCentered={handleCentered}
                  scrollRef={scrollRef}
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
                <p className="text-xs text-gray-300">支持Ctrl(Win)/Cmd(Mac) + 滚轮缩放 / Shift + 滚轮水平平移 </p>
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

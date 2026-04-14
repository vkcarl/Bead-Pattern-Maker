'use client';

import type { BrushShape } from '@/types';

interface ToolbarProps {
  zoom: number;
  showGridLines: boolean;
  showBeadCodes: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedTool: 'select' | 'paint' | 'eyedropper' | 'flood-erase';
  brushShape: BrushShape;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGridLines: () => void;
  onToggleBeadCodes: () => void;
  onSelectTool: (tool: 'select' | 'paint' | 'eyedropper' | 'flood-erase') => void;
  onSelectBrushShape: (shape: BrushShape) => void;
  backgroundRemoved: boolean;
  onToggleBackground: () => void;
  // 原图参考层
  hasReferenceImage?: boolean;
  referenceOverlayLocked?: boolean;
  referenceOpacity?: number;
  onToggleReferenceLock?: () => void;
  onReferenceOpacityChange?: (opacity: number) => void;
}

function ToolButton({ active, disabled, onClick, title, children }: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-1.5 rounded-md text-xs transition-colors ${
          active
            ? 'bg-blue-100 text-blue-700'
            : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 rounded bg-gray-800 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity delay-0 group-hover:delay-200 z-50 shadow-lg">
        {title}
      </span>
    </div>
  );
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="flex items-center flex-wrap gap-1 px-3 py-1.5 bg-white border-b text-xs">
      {/* Tool mode */}
      <ToolButton active={props.selectedTool === 'select'} onClick={() => props.onSelectTool('select')} title="选择 (V)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /></svg>
      </ToolButton>
      <ToolButton active={props.selectedTool === 'paint'} onClick={() => props.onSelectTool('paint')} title="画笔 (B)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
      </ToolButton>

      {/* 画笔形状选择（仅在画笔工具激活时显示） */}
      {props.selectedTool === 'paint' && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-50 rounded-md">
            <ToolButton active={props.brushShape === 'dot'} onClick={() => props.onSelectBrushShape('dot')} title="单点画笔 (1)">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="8" r="3" />
              </svg>
            </ToolButton>
            <ToolButton active={props.brushShape === 'row'} onClick={() => props.onSelectBrushShape('row')} title="整行画笔 (2)">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="2" />
                <circle cx="8" cy="8" r="2" />
                <circle cx="13" cy="8" r="2" />
              </svg>
            </ToolButton>
            <ToolButton active={props.brushShape === 'col'} onClick={() => props.onSelectBrushShape('col')} title="整列画笔 (3)">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="2" />
                <circle cx="8" cy="8" r="2" />
                <circle cx="8" cy="13" r="2" />
              </svg>
            </ToolButton>
            <ToolButton active={props.brushShape === 'grid3x3'} onClick={() => props.onSelectBrushShape('grid3x3')} title="九宫格画笔 (4)">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="3" r="1.5" />
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="13" cy="3" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
                <circle cx="3" cy="13" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
                <circle cx="13" cy="13" r="1.5" />
              </svg>
            </ToolButton>
          </div>
        </>
      )}
      <ToolButton active={props.selectedTool === 'eyedropper'} onClick={() => props.onSelectTool('eyedropper')} title="取色笔 (I)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21l3-3m0 0l8.5-8.5a2.12 2.12 0 00-3-3L7 15m3 3l-3 3m0 0H4v-3" />
          <circle cx="17" cy="7" r="2" />
        </svg>
      </ToolButton>
      <ToolButton active={props.selectedTool === 'flood-erase'} onClick={() => props.onSelectTool('flood-erase')} title="色块消除 (E)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M18.364 5.636l-1.06 1.06M21 12h-1.5M18.364 18.364l-1.06-1.06M12 19.5V21M7.757 17.303l-1.061 1.061M4.5 12H3M7.757 6.697L6.696 5.636" />
          <circle cx="12" cy="12" r="4" strokeDasharray="3 2" />
        </svg>
      </ToolButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Undo/Redo */}
      <ToolButton disabled={!props.canUndo} onClick={props.onUndo} title="撤销 (Ctrl+Z)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
      </ToolButton>
      <ToolButton disabled={!props.canRedo} onClick={props.onRedo} title="重做 (Ctrl+Y)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>
      </ToolButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Remove background toggle */}
      <ToolButton active={props.backgroundRemoved} onClick={props.onToggleBackground} title={props.backgroundRemoved ? '恢复背景' : '去除背景'}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </ToolButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Zoom */}
      <ToolButton onClick={props.onZoomOut} title="缩小 (-)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>
      </ToolButton>
      <div className="relative group">
        <button onClick={props.onZoomReset} className="text-xs text-gray-500 px-1.5 min-w-[3rem] text-center hover:text-gray-700">
          {Math.round(props.zoom * 100)}%
        </button>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 rounded bg-gray-800 text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity delay-0 group-hover:delay-200 z-50 shadow-lg">
          重置缩放
        </span>
      </div>
      <ToolButton onClick={props.onZoomIn} title="放大 (+)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" /></svg>
      </ToolButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Toggles */}
      <ToolButton active={props.showGridLines} onClick={props.onToggleGridLines} title="网格线">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
      </ToolButton>
      <ToolButton active={props.showBeadCodes} onClick={props.onToggleBeadCodes} title="显示编号">
        <span className="font-mono font-bold">A</span>
      </ToolButton>

      {/* 原图参考层 */}
      {props.hasReferenceImage && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <ToolButton
            active={props.referenceOverlayLocked}
            onClick={() => props.onToggleReferenceLock?.()}
            title={props.referenceOverlayLocked ? '关闭参考层常驻显示' : '开启参考层常驻显示（或按住空格临时查看）'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </ToolButton>
          {props.referenceOverlayLocked && (
            <div className="flex items-center gap-1 px-1">
              <input
                type="range"
                min={5}
                max={80}
                step={5}
                value={Math.round((props.referenceOpacity ?? 0.35) * 100)}
                onChange={e => props.onReferenceOpacityChange?.(Number(e.target.value) / 100)}
                className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title={`透明度 ${Math.round((props.referenceOpacity ?? 0.35) * 100)}%`}
              />
              <span className="text-[10px] text-gray-400 tabular-nums w-7">{Math.round((props.referenceOpacity ?? 0.35) * 100)}%</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

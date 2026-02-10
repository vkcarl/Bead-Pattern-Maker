'use client';

interface ToolbarProps {
  zoom: number;
  showGridLines: boolean;
  showBeadCodes: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedTool: 'select' | 'paint';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGridLines: () => void;
  onToggleBeadCodes: () => void;
  onSelectTool: (tool: 'select' | 'paint') => void;
}

function ToolButton({ active, disabled, onClick, title, children }: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
  );
}

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b text-xs">
      {/* Tool mode */}
      <ToolButton active={props.selectedTool === 'select'} onClick={() => props.onSelectTool('select')} title="选择 (V)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /></svg>
      </ToolButton>
      <ToolButton active={props.selectedTool === 'paint'} onClick={() => props.onSelectTool('paint')} title="画笔 (B)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
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

      {/* Zoom */}
      <ToolButton onClick={props.onZoomOut} title="缩小 (-)">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>
      </ToolButton>
      <button onClick={props.onZoomReset} className="text-xs text-gray-500 px-1.5 min-w-[3rem] text-center hover:text-gray-700" title="重置缩放">
        {Math.round(props.zoom * 100)}%
      </button>
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
    </div>
  );
}

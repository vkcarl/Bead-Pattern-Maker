'use client';
import { useReducer, useCallback } from 'react';
import type { PatternState, PatternAction, Pattern } from '@/types';
import { DEFAULT_PALETTE_ID } from '@/data/palettes';
import { removeBackground } from '@/lib/flood-fill';

const MAX_HISTORY = 50;

const initialState: PatternState = {
  originalImage: null,
  pattern: null,
  history: [],
  historyIndex: -1,
  boardWidth: 52,
  boardHeight: 52,
  zoom: 1,
  selectedTool: 'select',
  selectedColorIndex: null,
  showGridLines: true,
  showBeadCodes: false,
  isProcessing: false,
  shouldCenter: false, // 是否需要居中显示图案
  currentPaletteId: DEFAULT_PALETTE_ID, // 当前选中的色板 ID
  autoRemoveBackground: false, // 默认关闭自动去除背景
};

function patternReducer(state: PatternState, action: PatternAction): PatternState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, originalImage: action.payload, pattern: null, history: [], historyIndex: -1 };
    case 'CLEAR_IMAGE':
      return { ...initialState, currentPaletteId: state.currentPaletteId };
    case 'GENERATE_PATTERN': {
      const newHistory = [action.payload];
      // 生成新图案时，设置 shouldCenter 为 true，触发居中显示
      return { ...state, pattern: action.payload, history: newHistory, historyIndex: 0, isProcessing: false, zoom: 1, shouldCenter: true };
    }
    case 'SET_CELL': {
      if (!state.pattern) return state;
      const { row, col, colorIndex } = action.payload;
      if (state.pattern.grid[row][col] === colorIndex) return state;
      const newGrid = state.pattern.grid.map(r => [...r]);
      newGrid[row][col] = colorIndex;
      const newPattern: Pattern = { ...state.pattern, grid: newGrid };
      const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
      truncatedHistory.push(newPattern);
      if (truncatedHistory.length > MAX_HISTORY) truncatedHistory.shift();
      return { ...state, pattern: newPattern, history: truncatedHistory, historyIndex: truncatedHistory.length - 1 };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return { ...state, pattern: state.history[newIndex], historyIndex: newIndex };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return { ...state, pattern: state.history[newIndex], historyIndex: newIndex };
    }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(15, action.payload)) };
    case 'CLEAR_SHOULD_CENTER':
      return { ...state, shouldCenter: false };
    case 'SET_BOARD_SIZE':
      return { ...state, boardWidth: action.payload.width, boardHeight: action.payload.height };
    case 'SET_TOOL':
      return { ...state, selectedTool: action.payload };
    case 'SET_EYEDROPPER_COLOR':
      // 取色笔选中颜色后，更新selectedColorIndex但不切换工具
      return { ...state, selectedColorIndex: action.payload };
    case 'SET_SELECTED_COLOR':
      return { ...state, selectedColorIndex: action.payload, selectedTool: 'paint' };
    case 'TOGGLE_GRID_LINES':
      return { ...state, showGridLines: !state.showGridLines };
    case 'TOGGLE_BEAD_CODES':
      return { ...state, showBeadCodes: !state.showBeadCodes };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_PALETTE':
      // 切换色板时，清除当前图案和历史记录，因为颜色索引会失效
      return {
        ...state,
        currentPaletteId: action.payload,
        pattern: null,
        history: [],
        historyIndex: -1,
        selectedColorIndex: null,
      };
    case 'REMOVE_BACKGROUND': {
      if (!state.pattern) return state;
      const newGrid = removeBackground(state.pattern.grid, state.pattern.width, state.pattern.height);
      const newPattern: Pattern = { ...state.pattern, grid: newGrid };
      const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
      truncatedHistory.push(newPattern);
      if (truncatedHistory.length > MAX_HISTORY) truncatedHistory.shift();
      return { ...state, pattern: newPattern, history: truncatedHistory, historyIndex: truncatedHistory.length - 1 };
    }
    case 'RESTORE_BACKGROUND': {
      if (!state.pattern) return state;
      const restoredPattern: Pattern = { ...state.pattern, grid: action.payload };
      const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
      truncatedHistory.push(restoredPattern);
      if (truncatedHistory.length > MAX_HISTORY) truncatedHistory.shift();
      return { ...state, pattern: restoredPattern, history: truncatedHistory, historyIndex: truncatedHistory.length - 1 };
    }
    case 'TOGGLE_AUTO_REMOVE_BG':
      return { ...state, autoRemoveBackground: !state.autoRemoveBackground };
    default:
      return state;
  }
}

export function usePatternState() {
  const [state, dispatch] = useReducer(patternReducer, initialState);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  return { state, dispatch, canUndo, canRedo, undo, redo };
}

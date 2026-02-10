export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export interface ArtkalColor {
  id: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  series: string;
}

export interface Pattern {
  width: number;
  height: number;
  grid: number[][]; // grid[row][col] = colorIndex into artkalColors (-1 = empty)
}

export interface BeadCount {
  colorIndex: number;
  color: ArtkalColor;
  count: number;
}

export interface PatternState {
  originalImage: string | null;
  pattern: Pattern | null;
  history: Pattern[];
  historyIndex: number;
  boardWidth: number;
  boardHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  selectedTool: 'select' | 'paint';
  selectedColorIndex: number | null;
  showGridLines: boolean;
  showBeadCodes: boolean;
  isProcessing: boolean;
}

export type PatternAction =
  | { type: 'SET_IMAGE'; payload: string }
  | { type: 'CLEAR_IMAGE' }
  | { type: 'GENERATE_PATTERN'; payload: Pattern }
  | { type: 'SET_CELL'; payload: { row: number; col: number; colorIndex: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'SET_BOARD_SIZE'; payload: { width: number; height: number } }
  | { type: 'SET_TOOL'; payload: 'select' | 'paint' }
  | { type: 'SET_SELECTED_COLOR'; payload: number }
  | { type: 'TOGGLE_GRID_LINES' }
  | { type: 'TOGGLE_BEAD_CODES' }
  | { type: 'SET_PROCESSING'; payload: boolean };

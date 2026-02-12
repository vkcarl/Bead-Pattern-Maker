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

/**
 * 通用珠子颜色定义
 * 适用于任何品牌的拼豆色板
 */
export interface BeadColor {
  id: string;           // 色号，如 "C01", "P01", "H01"
  name: string;         // 颜色名称
  hex: string;          // 十六进制色值，如 "#F8F8F8"
  r: number;            // RGB 红色分量 (0-255)
  g: number;            // RGB 绿色分量 (0-255)
  b: number;            // RGB 蓝色分量 (0-255)
  category?: string;    // 可选：颜色分类，如 "普通"、"珠光"、"夜光"
  series?: string;      // 可选：系列，如 "C"、"CE"（兼容旧数据）
}

/**
 * 色板定义
 * 代表一个品牌/系列的完整色板
 */
export interface ColorPalette {
  id: string;           // 色板唯一标识，如 "artkal-c", "perler-standard"
  name: string;         // 显示名称，如 "Artkal C 系列"
  brand: string;        // 品牌名，如 "Artkal", "Perler", "Hama"
  description?: string; // 可选描述
  colors: BeadColor[];  // 颜色列表
  isBuiltIn: boolean;   // 是否为内置色板
  createdAt?: number;   // 用户导入的色板可记录创建时间
}

/**
 * 用户导入的色板原始格式
 * 支持 CSV/JSON 格式导入
 */
export interface ImportedColorEntry {
  id: string;           // 色号（必填）
  name: string;         // 颜色名称（必填）
  hex?: string;         // 十六进制色值（hex 或 rgb 二选一）
  r?: number;           // RGB 红色分量
  g?: number;           // RGB 绿色分量
  b?: number;           // RGB 蓝色分量
  category?: string;    // 可选分类
}

// 向后兼容：ArtkalColor 作为 BeadColor 的别名
export type ArtkalColor = BeadColor;

export interface Pattern {
  width: number;
  height: number;
  grid: number[][]; // grid[row][col] = colorIndex into current palette colors (-1 = empty)
}

export interface BeadCount {
  colorIndex: number;
  color: BeadColor;
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
  selectedTool: 'select' | 'paint';
  selectedColorIndex: number | null;
  showGridLines: boolean;
  showBeadCodes: boolean;
  isProcessing: boolean;
  shouldCenter: boolean; // 是否需要居中显示图案
  currentPaletteId: string; // 当前选中的色板 ID
  autoRemoveBackground: boolean; // 生成图案时是否自动去除背景
}

export type PatternAction =
  | { type: 'SET_IMAGE'; payload: string }
  | { type: 'CLEAR_IMAGE' }
  | { type: 'GENERATE_PATTERN'; payload: Pattern }
  | { type: 'SET_CELL'; payload: { row: number; col: number; colorIndex: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'CLEAR_SHOULD_CENTER' }
  | { type: 'SET_BOARD_SIZE'; payload: { width: number; height: number } }
  | { type: 'SET_TOOL'; payload: 'select' | 'paint' }
  | { type: 'SET_SELECTED_COLOR'; payload: number }
  | { type: 'TOGGLE_GRID_LINES' }
  | { type: 'TOGGLE_BEAD_CODES' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_PALETTE'; payload: string }
  | { type: 'REMOVE_BACKGROUND' }
  | { type: 'RESTORE_BACKGROUND'; payload: number[][] }
  | { type: 'TOGGLE_AUTO_REMOVE_BG' };

/**
 * 色板模块统一导出
 */

export { PaletteManager, getCurrentPalette, getCurrentPaletteColors, getPaletteColors } from './palette-manager';
export { parseJSON, parseCSV, parseFile, validateAndNormalize, createCustomPalette } from './palette-parser';
export type { ValidationResult } from './palette-parser';

// 从 color-match 模块重导出色板激活相关函数
export { setActivePalette, setActivePaletteById, getActivePalette } from '@/lib/color-match';
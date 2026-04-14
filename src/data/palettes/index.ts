/**
 * 色板数据统一导出
 * 
 * 这个文件负责：
 * 1. 导出所有内置色板
 * 2. 提供色板 ID 常量
 * 3. 提供默认色板设置
 */

import type { ColorPalette, BeadColor } from '@/types';
import { artkalCColors } from './artkal-c';
import { mardColors } from './mard';
import { mard221Colors } from './mard-221';

// 色板 ID 常量
export const PALETTE_IDS = {
  MARD: 'mard',
  MARD_221: 'mard-221',
  ARTKAL_C: 'artkal-c',
} as const;

// 默认色板 ID
export const DEFAULT_PALETTE_ID = PALETTE_IDS.MARD;

// Artkal C 系列色板定义
export const artkalCPalette: ColorPalette = {
  id: PALETTE_IDS.ARTKAL_C,
  name: 'Artkal C 系列',
  brand: 'Artkal',
  description: 'Artkal C-series 5mm 拼豆，共 174 色 (C01-C157 + CE01-CE17)',
  colors: artkalCColors,
  isBuiltIn: true,
};

// Mard 系列色板定义
export const mardPalette: ColorPalette = {
  id: PALETTE_IDS.MARD,
  name: 'Mard 295色',
  brand: 'Mard',
  description: 'Mard · 295色（含珠光/夜光/透明/荧光/中国风系列）',
  colors: mardColors,
  isBuiltIn: true,
};

// Mard 221色 基础色板定义
export const mard221Palette: ColorPalette = {
  id: PALETTE_IDS.MARD_221,
  name: 'Mard 221色',
  brand: 'Mard',
  description: 'Mard · 221色（A-M 基础系列）',
  colors: mard221Colors,
  isBuiltIn: true,
};

// 所有内置色板列表
export const builtInPalettes: ColorPalette[] = [
  mardPalette,
  mard221Palette,
  artkalCPalette,
];

// 根据 ID 获取内置色板
export function getBuiltInPalette(id: string): ColorPalette | undefined {
  return builtInPalettes.find(p => p.id === id);
}

// 导出 artkalCColors 以保持向后兼容
export { artkalCColors };

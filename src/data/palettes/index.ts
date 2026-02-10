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

// 色板 ID 常量
export const PALETTE_IDS = {
  ARTKAL_C: 'artkal-c',
} as const;

// 默认色板 ID
export const DEFAULT_PALETTE_ID = PALETTE_IDS.ARTKAL_C;

// Artkal C 系列色板定义
export const artkalCPalette: ColorPalette = {
  id: PALETTE_IDS.ARTKAL_C,
  name: 'Artkal C 系列',
  brand: 'Artkal',
  description: 'Artkal C-series 5mm 拼豆，共 174 色 (C01-C157 + CE01-CE17)',
  colors: artkalCColors,
  isBuiltIn: true,
};

// 所有内置色板列表
export const builtInPalettes: ColorPalette[] = [
  artkalCPalette,
];

// 根据 ID 获取内置色板
export function getBuiltInPalette(id: string): ColorPalette | undefined {
  return builtInPalettes.find(p => p.id === id);
}

// 导出 artkalCColors 以保持向后兼容
export { artkalCColors };

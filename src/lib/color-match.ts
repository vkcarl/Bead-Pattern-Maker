/**
 * 颜色匹配器
 * 
 * 支持动态切换色板的颜色匹配模块
 * - 基于当前色板构建 k-d 树
 * - 使用 6-bit 量化 RGB 缓存优化性能
 * - 支持动态切换色板时重建索引
 */

import type { BeadColor, ColorPalette } from '@/types';
import { rgbToLab } from './color-convert';
import { LabKDTree } from './kd-tree';
import { getCurrentPalette } from './palette';

// 当前激活的色板
let activePalette: ColorPalette | null = null;

// 当前色板的 Lab 值数组
let paletteLabValues: { L: number; a: number; b: number }[] = [];

// k-d 树实例
let tree: LabKDTree | null = null;

// 量化缓存：6 bits per channel = 262144 possible keys
const cache = new Map<number, number>();

/**
 * 初始化或更新颜色匹配器
 */
function initializeMatcher(palette: ColorPalette): void {
  activePalette = palette;
  
  // 计算所有颜色的 Lab 值
  paletteLabValues = palette.colors.map(c => rgbToLab(c.r, c.g, c.b));
  
  // 构建 k-d 树
  tree = new LabKDTree(
    paletteLabValues.map((lab, index) => ({ lab, index }))
  );
  
  // 清空缓存
  cache.clear();
}

/**
 * 确保匹配器已初始化
 */
function ensureInitialized(): void {
  if (!activePalette || !tree) {
    initializeMatcher(getCurrentPalette());
  }
}

/**
 * 量化 RGB 值为缓存键
 * 6 bits per channel = 64 levels per channel
 */
function quantizeKey(r: number, g: number, b: number): number {
  const rq = r >> 2;
  const gq = g >> 2;
  const bq = b >> 2;
  return (rq << 12) | (gq << 6) | bq;
}

/**
 * 查找最近的颜色索引
 * 
 * @param r - 红色分量 (0-255)
 * @param g - 绿色分量 (0-255)
 * @param b - 蓝色分量 (0-255)
 * @returns 色板中最近颜色的索引
 */
export function findNearestColor(r: number, g: number, b: number): number {
  ensureInitialized();
  
  const key = quantizeKey(r, g, b);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  
  const lab = rgbToLab(r, g, b);
  const result = tree!.nearest(lab);
  
  cache.set(key, result.index);
  return result.index;
}

/**
 * 获取当前色板中指定索引的颜色
 */
export function getColor(index: number): BeadColor | undefined {
  ensureInitialized();
  return activePalette?.colors[index];
}

/**
 * 获取当前色板的所有颜色
 */
export function getColors(): BeadColor[] {
  ensureInitialized();
  return activePalette?.colors || [];
}

/**
 * 获取当前激活的色板
 */
export function getActivePalette(): ColorPalette {
  ensureInitialized();
  return activePalette!;
}

/**
 * 设置激活的色板
 * 
 * @param palette - 要激活的色板
 */
export function setActivePalette(palette: ColorPalette): void {
  initializeMatcher(palette);
}

/**
 * 根据色板 ID 设置激活的色板
 * 
 * @param paletteId - 色板 ID
 * @returns 是否设置成功
 */
export function setActivePaletteById(paletteId: string): boolean {
  const { PaletteManager } = require('./palette');
  const palette = PaletteManager.getPaletteById(paletteId);
  if (!palette) return false;
  initializeMatcher(palette);
  return true;
}

/**
 * 清除颜色缓存
 * 当色板切换时会自动清除，一般不需要手动调用
 */
export function clearColorCache(): void {
  cache.clear();
}

/**
 * 重置匹配器状态
 * 下次调用会重新初始化
 */
export function resetMatcher(): void {
  activePalette = null;
  paletteLabValues = [];
  tree = null;
  cache.clear();
}

// ============================================
// 向后兼容的导出
// ============================================

/**
 * @deprecated 使用 findNearestColor 代替
 */
export function findNearestArtkalColor(r: number, g: number, b: number): number {
  return findNearestColor(r, g, b);
}

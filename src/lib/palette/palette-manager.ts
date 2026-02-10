/**
 * 色板管理器
 * 
 * 负责管理内置色板和用户导入的色板
 * - 内置色板存储在代码中
 * - 用户导入的色板存储在 localStorage
 */

import type { ColorPalette, BeadColor } from '@/types';
import { builtInPalettes, DEFAULT_PALETTE_ID, getBuiltInPalette } from '@/data/palettes';

const STORAGE_KEY = 'bead-converter-custom-palettes';
const CURRENT_PALETTE_KEY = 'bead-converter-current-palette';

/**
 * 从 localStorage 加载用户自定义色板
 */
function loadCustomPalettes(): ColorPalette[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ColorPalette[];
  } catch {
    console.error('Failed to load custom palettes from localStorage');
    return [];
  }
}

/**
 * 保存用户自定义色板到 localStorage
 */
function saveCustomPalettes(palettes: ColorPalette[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  } catch (e) {
    console.error('Failed to save custom palettes to localStorage', e);
  }
}

/**
 * 从 localStorage 加载当前选中的色板 ID
 */
function loadCurrentPaletteId(): string {
  if (typeof window === 'undefined') return DEFAULT_PALETTE_ID;
  try {
    return localStorage.getItem(CURRENT_PALETTE_KEY) || DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}

/**
 * 保存当前选中的色板 ID 到 localStorage
 */
function saveCurrentPaletteId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENT_PALETTE_KEY, id);
  } catch (e) {
    console.error('Failed to save current palette ID to localStorage', e);
  }
}

// 缓存自定义色板
let customPalettesCache: ColorPalette[] | null = null;

/**
 * 色板管理器类
 */
class PaletteManagerClass {
  /**
   * 获取所有可用色板（内置 + 用户自定义）
   */
  getAllPalettes(): ColorPalette[] {
    if (customPalettesCache === null) {
      customPalettesCache = loadCustomPalettes();
    }
    return [...builtInPalettes, ...customPalettesCache];
  }

  /**
   * 获取所有内置色板
   */
  getBuiltInPalettes(): ColorPalette[] {
    return builtInPalettes;
  }

  /**
   * 获取所有用户自定义色板
   */
  getCustomPalettes(): ColorPalette[] {
    if (customPalettesCache === null) {
      customPalettesCache = loadCustomPalettes();
    }
    return customPalettesCache;
  }

  /**
   * 根据 ID 获取色板
   */
  getPaletteById(id: string): ColorPalette | undefined {
    // 先查内置色板
    const builtIn = getBuiltInPalette(id);
    if (builtIn) return builtIn;

    // 再查自定义色板
    if (customPalettesCache === null) {
      customPalettesCache = loadCustomPalettes();
    }
    return customPalettesCache.find(p => p.id === id);
  }

  /**
   * 获取当前选中的色板 ID
   */
  getCurrentPaletteId(): string {
    return loadCurrentPaletteId();
  }

  /**
   * 获取当前选中的色板
   */
  getCurrentPalette(): ColorPalette {
    const id = this.getCurrentPaletteId();
    const palette = this.getPaletteById(id);
    if (!palette) {
      // 如果找不到，返回默认色板
      return this.getPaletteById(DEFAULT_PALETTE_ID)!;
    }
    return palette;
  }

  /**
   * 设置当前选中的色板
   */
  setCurrentPalette(id: string): boolean {
    const palette = this.getPaletteById(id);
    if (!palette) return false;
    saveCurrentPaletteId(id);
    return true;
  }

  /**
   * 添加用户自定义色板
   */
  addCustomPalette(palette: ColorPalette): void {
    if (customPalettesCache === null) {
      customPalettesCache = loadCustomPalettes();
    }

    // 检查是否已存在相同 ID 的色板
    const existingIndex = customPalettesCache.findIndex(p => p.id === palette.id);
    if (existingIndex >= 0) {
      // 更新现有色板
      customPalettesCache[existingIndex] = palette;
    } else {
      // 添加新色板
      customPalettesCache.push(palette);
    }

    saveCustomPalettes(customPalettesCache);
  }

  /**
   * 删除用户自定义色板
   */
  deleteCustomPalette(id: string): boolean {
    // 不能删除内置色板
    if (getBuiltInPalette(id)) return false;

    if (customPalettesCache === null) {
      customPalettesCache = loadCustomPalettes();
    }

    const index = customPalettesCache.findIndex(p => p.id === id);
    if (index < 0) return false;

    customPalettesCache.splice(index, 1);
    saveCustomPalettes(customPalettesCache);

    // 如果删除的是当前选中的色板，切换到默认色板
    if (this.getCurrentPaletteId() === id) {
      this.setCurrentPalette(DEFAULT_PALETTE_ID);
    }

    return true;
  }

  /**
   * 导出色板为 JSON 字符串
   */
  exportPaletteAsJSON(id: string): string | null {
    const palette = this.getPaletteById(id);
    if (!palette) return null;

    // 导出时只导出颜色数据
    const exportData = {
      name: palette.name,
      brand: palette.brand,
      description: palette.description,
      colors: palette.colors.map(c => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
        r: c.r,
        g: c.g,
        b: c.b,
        category: c.category,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出色板为 CSV 字符串
   */
  exportPaletteAsCSV(id: string): string | null {
    const palette = this.getPaletteById(id);
    if (!palette) return null;

    const header = 'id,name,hex,r,g,b,category';
    const rows = palette.colors.map(c => 
      `${c.id},${c.name},${c.hex},${c.r},${c.g},${c.b},${c.category || ''}`
    );

    return [header, ...rows].join('\n');
  }

  /**
   * 刷新缓存（用于测试或手动刷新）
   */
  refreshCache(): void {
    customPalettesCache = null;
  }
}

// 导出单例
export const PaletteManager = new PaletteManagerClass();

// 导出便捷函数
export function getCurrentPalette(): ColorPalette {
  return PaletteManager.getCurrentPalette();
}

export function getCurrentPaletteColors(): BeadColor[] {
  return PaletteManager.getCurrentPalette().colors;
}

export function getPaletteColors(paletteId: string): BeadColor[] {
  const palette = PaletteManager.getPaletteById(paletteId);
  return palette?.colors || [];
}

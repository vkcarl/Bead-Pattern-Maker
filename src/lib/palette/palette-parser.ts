/**
 * 色板解析器
 * 
 * 支持从 JSON 和 CSV 格式导入色板数据
 */

import type { BeadColor, ColorPalette, ImportedColorEntry } from '@/types';

/**
 * 解析 JSON 格式的色板数据
 */
export function parseJSON(content: string): ImportedColorEntry[] {
  try {
    const data = JSON.parse(content);
    
    // 支持两种格式：
    // 1. 直接是颜色数组
    // 2. 带有 colors 字段的对象
    const colors = Array.isArray(data) ? data : data.colors;
    
    if (!Array.isArray(colors)) {
      throw new Error('Invalid JSON format: expected array or object with colors field');
    }
    
    return colors.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      hex: item.hex ? String(item.hex) : undefined,
      r: typeof item.r === 'number' ? item.r : undefined,
      g: typeof item.g === 'number' ? item.g : undefined,
      b: typeof item.b === 'number' ? item.b : undefined,
      category: item.category ? String(item.category) : undefined,
    }));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Invalid JSON format: failed to parse');
    }
    throw e;
  }
}

/**
 * 解析 CSV 格式的色板数据
 * 支持的格式：
 * - id,name,hex
 * - id,name,r,g,b
 * - id,name,hex,r,g,b,category
 */
export function parseCSV(content: string): ImportedColorEntry[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // 解析表头
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // 验证必需字段
  const idIndex = header.indexOf('id');
  const nameIndex = header.indexOf('name');
  
  if (idIndex < 0 || nameIndex < 0) {
    throw new Error('CSV must have "id" and "name" columns');
  }
  
  // 可选字段索引
  const hexIndex = header.indexOf('hex');
  const rIndex = header.indexOf('r');
  const gIndex = header.indexOf('g');
  const bIndex = header.indexOf('b');
  const categoryIndex = header.indexOf('category');

  // 解析数据行
  const entries: ImportedColorEntry[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 跳过空行
    
    const values = parseCSVLine(line);
    
    const entry: ImportedColorEntry = {
      id: values[idIndex]?.trim() || '',
      name: values[nameIndex]?.trim() || '',
    };
    
    if (hexIndex >= 0 && values[hexIndex]) {
      entry.hex = values[hexIndex].trim();
    }
    
    if (rIndex >= 0 && values[rIndex]) {
      entry.r = parseInt(values[rIndex], 10);
    }
    
    if (gIndex >= 0 && values[gIndex]) {
      entry.g = parseInt(values[gIndex], 10);
    }
    
    if (bIndex >= 0 && values[bIndex]) {
      entry.b = parseInt(values[bIndex], 10);
    }
    
    if (categoryIndex >= 0 && values[categoryIndex]) {
      entry.category = values[categoryIndex].trim();
    }
    
    entries.push(entry);
  }
  
  return entries;
}

/**
 * 解析 CSV 行，处理引号包裹的字段
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * 将 hex 颜色值转换为 RGB
 */
function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  // 移除 # 前缀
  const cleanHex = hex.replace(/^#/, '');
  
  // 支持 3 位和 6 位格式
  let fullHex: string;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  } else if (cleanHex.length === 6) {
    fullHex = cleanHex;
  } else {
    return null;
  }
  
  const num = parseInt(fullHex, 16);
  if (isNaN(num)) return null;
  
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * 将 RGB 转换为 hex 颜色值
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * 校验结果
 */
export interface ValidationResult {
  valid: boolean;
  colors: BeadColor[];
  errors: string[];
  warnings: string[];
}

/**
 * 校验并标准化导入的颜色数据
 */
export function validateAndNormalize(entries: ImportedColorEntry[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const colors: BeadColor[] = [];
  const seenIds = new Set<string>();
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rowNum = i + 1;
    
    // 检查必填字段
    if (!entry.id) {
      errors.push(`Row ${rowNum}: Missing required field "id"`);
      continue;
    }
    
    if (!entry.name) {
      errors.push(`Row ${rowNum}: Missing required field "name"`);
      continue;
    }
    
    // 检查重复 ID
    if (seenIds.has(entry.id)) {
      errors.push(`Row ${rowNum}: Duplicate color ID "${entry.id}"`);
      continue;
    }
    seenIds.add(entry.id);
    
    // 处理颜色值
    let r: number, g: number, b: number, hex: string;
    
    if (entry.hex) {
      // 从 hex 解析 RGB
      const rgb = hexToRGB(entry.hex);
      if (!rgb) {
        errors.push(`Row ${rowNum}: Invalid hex color "${entry.hex}"`);
        continue;
      }
      r = rgb.r;
      g = rgb.g;
      b = rgb.b;
      hex = entry.hex.startsWith('#') ? entry.hex.toUpperCase() : `#${entry.hex.toUpperCase()}`;
    } else if (
      typeof entry.r === 'number' &&
      typeof entry.g === 'number' &&
      typeof entry.b === 'number'
    ) {
      // 使用 RGB 值
      r = entry.r;
      g = entry.g;
      b = entry.b;
      
      // 验证 RGB 范围
      if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        errors.push(`Row ${rowNum}: RGB values must be between 0 and 255`);
        continue;
      }
      
      hex = rgbToHex(r, g, b);
    } else {
      errors.push(`Row ${rowNum}: Must provide either "hex" or "r,g,b" values`);
      continue;
    }
    
    // 创建标准化的颜色对象
    const color: BeadColor = {
      id: entry.id,
      name: entry.name,
      hex,
      r,
      g,
      b,
    };
    
    if (entry.category) {
      color.category = entry.category;
    }
    
    colors.push(color);
  }
  
  // 添加警告
  if (colors.length === 0 && errors.length === 0) {
    errors.push('No valid colors found');
  }
  
  if (colors.length > 500) {
    warnings.push(`Large palette with ${colors.length} colors may affect performance`);
  }
  
  return {
    valid: errors.length === 0 && colors.length > 0,
    colors,
    errors,
    warnings,
  };
}

/**
 * 创建用户自定义色板
 */
export function createCustomPalette(
  colors: BeadColor[],
  name: string,
  brand: string,
  description?: string
): ColorPalette {
  // 生成唯一 ID
  const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    name,
    brand,
    description,
    colors,
    isBuiltIn: false,
    createdAt: Date.now(),
  };
}

/**
 * 自动检测文件格式并解析
 */
export function parseFile(content: string, filename: string): ImportedColorEntry[] {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (ext === 'json') {
    return parseJSON(content);
  } else if (ext === 'csv') {
    return parseCSV(content);
  } else {
    // 尝试自动检测
    const trimmed = content.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      return parseJSON(content);
    } else {
      return parseCSV(content);
    }
  }
}

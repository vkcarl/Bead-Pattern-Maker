/**
 * 向后兼容层
 * 
 * 此文件保留以确保现有代码能够继续工作
 * 新代码应该使用 @/data/palettes 中的色板数据
 */

import { artkalCColors } from './palettes/artkal-c';
import type { ArtkalColor } from '@/types';

// 重导出 artkalCColors 作为 artkalColors 以保持向后兼容
export const artkalColors: ArtkalColor[] = artkalCColors;

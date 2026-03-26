/**
 * 杂色消除模块
 * 
 * 对已生成的拼豆图案进行非重叠的 3×3 分块扫描，
 * 如果块内所有颜色与众数颜色的 CIEDE2000 色差均小于阈值，
 * 则将该块内所有豆子统一为众数颜色。
 * 
 * 采用"逐区域"策略：图案被划分为互不重叠的块，
 * 每个块独立处理，已处理的豆子不会影响其他块的判断，
 * 避免颜色"滚雪球"式侵蚀。
 */

import type { Pattern, BeadColor } from '@/types';
import { rgbToLab } from './color-convert';
import { ciede2000 } from './color-diff';

const BLOCK_SIZE = 3;

/**
 * 对拼豆图案执行杂色消除
 * 
 * @param pattern - 当前拼豆图案
 * @param colors - 当前色板的颜色数组
 * @param threshold - CIEDE2000 色差阈值（0~30），0 表示不消除，值越大消除越激进
 * @returns 杂色消除后的新 grid（不修改原 grid）
 */
export function denoisePattern(
  pattern: Pattern,
  colors: BeadColor[],
  threshold: number
): number[][] {
  if (threshold <= 0) {
    // 阈值为 0，不做任何处理
    return pattern.grid.map(row => [...row]);
  }

  const { width, height, grid } = pattern;

  // 预计算所有色板颜色的 Lab 值，避免重复转换
  const labCache = new Map<number, { L: number; a: number; b: number }>();
  const getLabForIndex = (colorIndex: number) => {
    if (colorIndex < 0) return null; // 空格子
    let lab = labCache.get(colorIndex);
    if (!lab) {
      const c = colors[colorIndex];
      if (!c) return null;
      lab = rgbToLab(c.r, c.g, c.b);
      labCache.set(colorIndex, lab);
    }
    return lab;
  };

  // 复制一份 grid 用于输出
  const result = grid.map(row => [...row]);

  // 非重叠分块扫描：步长等于块大小，每个块独立处理
  for (let blockRow = 0; blockRow < height; blockRow += BLOCK_SIZE) {
    for (let blockCol = 0; blockCol < width; blockCol += BLOCK_SIZE) {
      // 计算当前块的实际范围（处理边缘不足 BLOCK_SIZE 的情况）
      const rowEnd = Math.min(blockRow + BLOCK_SIZE, height);
      const colEnd = Math.min(blockCol + BLOCK_SIZE, width);

      // 收集块内所有非空格子的颜色索引及其位置
      const blockCells: { row: number; col: number; colorIndex: number }[] = [];
      for (let r = blockRow; r < rowEnd; r++) {
        for (let c = blockCol; c < colEnd; c++) {
          const ci = grid[r][c]; // 始终从原始 grid 读取，不受其他块影响
          if (ci >= 0) {
            blockCells.push({ row: r, col: c, colorIndex: ci });
          }
        }
      }

      // 如果块内有效颜色不足 2 个，跳过
      if (blockCells.length < 2) continue;

      // 统计颜色频率，找到众数颜色
      const freq = new Map<number, number>();
      let modeColor = blockCells[0].colorIndex;
      let modeCount = 0;
      for (const cell of blockCells) {
        const count = (freq.get(cell.colorIndex) || 0) + 1;
        freq.set(cell.colorIndex, count);
        if (count > modeCount) {
          modeCount = count;
          modeColor = cell.colorIndex;
        }
      }

      // 如果所有颜色都一样，跳过
      if (freq.size === 1) continue;

      // 计算块内所有颜色与众数颜色的 CIEDE2000 色差
      const modeLab = getLabForIndex(modeColor);
      if (!modeLab) continue;

      let allWithinThreshold = true;
      for (const cell of blockCells) {
        if (cell.colorIndex === modeColor) continue;
        const lab = getLabForIndex(cell.colorIndex);
        if (!lab) {
          allWithinThreshold = false;
          break;
        }
        const diff = ciede2000(modeLab, lab);
        if (diff > threshold) {
          allWithinThreshold = false;
          break;
        }
      }

      // 如果所有颜色都在阈值内，统一为众数颜色
      if (allWithinThreshold) {
        for (const cell of blockCells) {
          result[cell.row][cell.col] = modeColor;
        }
      }
    }
  }

  return result;
}

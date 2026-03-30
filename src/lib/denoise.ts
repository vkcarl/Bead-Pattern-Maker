/**
 * 杂色消除模块
 * 
 * 采用"渐变碎片统一"策略：
 * 杂色的本质是渐变区域因分辨率不足而产生的近似色碎片——
 * 这些区域内颜色分布均匀，没有明显主导色，但彼此色差很小。
 * 
 * 对每个豆子检查其 3×3 邻域，找到邻域内的众数颜色。
 * 如果当前豆子不是众数颜色，且它与众数的色差在阈值内，
 * 且众数占比在 [下限, 上限] 范围内（即颜色分布较"碎"），
 * 则将该豆子替换为众数颜色。
 * 
 * 当众数占比过高时（某种颜色占绝对主导），少数派豆子
 * 更可能是有意义的细节（如嘴巴、眼睛），不应消除。
 * 
 * 始终从原始 grid 读取、写入 result，避免"滚雪球"式侵蚀。
 */

import type { Pattern, BeadColor } from '@/types';
import { rgbToLab } from './color-convert';
import { ciede2000 } from './color-diff';

/** 邻域半径：1 表示 3×3 */
const RADIUS = 1;
/** 众数占比下限：低于此值说明颜色过于分散，可能是多色交界处，不替换 */
const MODE_RATIO_MIN = 0.22;
/** 众数占比上限：高于此值说明某色占绝对主导，少数派可能是有意义的细节，不替换 */
const MODE_RATIO_MAX = 0.5;

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

  // 逐像素扫描，对每个豆子检查其邻域
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const currentColor = grid[row][col];
      // 跳过空格子
      if (currentColor < 0) continue;

      // 收集 3×3 邻域内所有非空邻居的颜色（包含自身）
      const neighborColors: number[] = [];
      for (let dr = -RADIUS; dr <= RADIUS; dr++) {
        for (let dc = -RADIUS; dc <= RADIUS; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
          const ci = grid[nr][nc]; // 始终从原始 grid 读取
          if (ci >= 0) {
            neighborColors.push(ci);
          }
        }
      }

      // 邻居不足 2 个，跳过
      if (neighborColors.length < 2) continue;

      // 统计邻域内颜色频率，找到众数颜色
      const freq = new Map<number, number>();
      let modeColor = neighborColors[0];
      let modeCount = 0;
      for (const ci of neighborColors) {
        const count = (freq.get(ci) || 0) + 1;
        freq.set(ci, count);
        if (count > modeCount) {
          modeCount = count;
          modeColor = ci;
        }
      }

      // 如果当前豆子已经是众数颜色，不需要处理
      if (currentColor === modeColor) continue;

      // 检查众数占比是否在合理范围内：
      // - 太低（< 22%）：颜色过于分散，可能是多色交界处，不替换
      // - 太高（> 50%）：某色占绝对主导，少数派可能是有意义的细节，不替换
      // - 在范围内：颜色分布较"碎"，是渐变碎片区域，应该统一
      const modeRatio = modeCount / neighborColors.length;
      if (modeRatio < MODE_RATIO_MIN || modeRatio > MODE_RATIO_MAX) continue;

      // 计算当前豆子与众数颜色的 CIEDE2000 色差
      const currentLab = getLabForIndex(currentColor);
      const modeLab = getLabForIndex(modeColor);
      if (!currentLab || !modeLab) continue;

      const diff = ciede2000(currentLab, modeLab);
      if (diff <= threshold) {
        // 当前豆子处于渐变碎片区域，统一为众数颜色
        result[row][col] = modeColor;
      }
    }
  }

  return result;
}

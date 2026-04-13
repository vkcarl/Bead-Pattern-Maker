/**
 * 边缘检测模块
 * 
 * 提供两种轮廓强化策略：
 * 1. 边缘感知降采样：在缩放时，边缘像素使用最近邻插值（保留锐利边缘），
 *    非边缘像素使用区域平均（保留色调）
 * 2. 自动描边后处理：扫描拼豆 grid，在相邻颜色差异大的位置插入深色轮廓
 */

import type { RGB, BeadColor } from '@/types';
import { rgbToLab } from './color-convert';
import { ciede2000 } from './color-diff';

/**
 * 对图像数据执行 Sobel 边缘检测，返回每个像素的边缘强度（0~255）
 * 
 * @param imageData - 原始图像像素数据 (RGBA)
 * @param width - 图像宽度
 * @param height - 图像高度
 * @returns 边缘强度图，值范围 0~255
 */
export function sobelEdgeDetect(
  imageData: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  // 先转为灰度图
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = imageData[idx + 3] / 255;
    // 加权灰度（ITU-R BT.601）
    gray[i] = (0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2]) * alpha;
  }

  const edgeMap = new Float32Array(width * height);

  // Sobel 卷积核
  // Gx:              Gy:
  // -1  0  1         -1 -2 -1
  // -2  0  2          0  0  0
  // -1  0  1          1  2  1

  let maxMagnitude = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edgeMap[y * width + x] = magnitude;
      if (magnitude > maxMagnitude) maxMagnitude = magnitude;
    }
  }

  // 归一化到 0~255
  if (maxMagnitude > 0) {
    for (let i = 0; i < edgeMap.length; i++) {
      edgeMap[i] = (edgeMap[i] / maxMagnitude) * 255;
    }
  }

  return edgeMap;
}

/**
 * 边缘感知降采样
 * 
 * 对每个目标像素对应的源区域：
 * - 计算区域内的平均边缘强度
 * - 如果边缘强度高于阈值，使用"最大边缘像素"的颜色（最近邻，保留锐利边缘）
 * - 否则使用区域平均颜色（保留色调平滑过渡）
 * 
 * @param sourceData - 原始图像像素数据 (RGBA)
 * @param edgeMap - Sobel 边缘强度图
 * @param sourceWidth - 源图像宽度
 * @param sourceHeight - 源图像高度
 * @param targetWidth - 目标宽度
 * @param targetHeight - 目标高度
 * @param edgeThreshold - 边缘阈值 (0~255)，越低越敏感
 * @returns 降采样后的 RGB 网格
 */
export function edgeAwareDownsample(
  sourceData: Uint8ClampedArray,
  edgeMap: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  edgeThreshold: number = 80
): (RGB | null)[][] {
  const grid: (RGB | null)[][] = [];
  const blockW = sourceWidth / targetWidth;
  const blockH = sourceHeight / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    const row: (RGB | null)[] = [];
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx0 = Math.floor(tx * blockW);
      const sy0 = Math.floor(ty * blockH);
      const sx1 = Math.min(Math.floor((tx + 1) * blockW), sourceWidth);
      const sy1 = Math.min(Math.floor((ty + 1) * blockH), sourceHeight);

      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
      let maxEdge = 0;
      let maxEdgeX = sx0, maxEdgeY = sy0;

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * sourceWidth + sx) * 4;
          const alpha = sourceData[i + 3] / 255;
          rSum += sourceData[i] * alpha;
          gSum += sourceData[i + 1] * alpha;
          bSum += sourceData[i + 2] * alpha;
          aSum += alpha;
          count++;

          // 追踪区域内边缘最强的像素
          const edgeVal = edgeMap[sy * sourceWidth + sx];
          if (edgeVal > maxEdge) {
            maxEdge = edgeVal;
            maxEdgeX = sx;
            maxEdgeY = sy;
          }
        }
      }

      // 平均透明度：如果大部分透明，视为空
      const avgAlpha = count > 0 ? aSum / count : 0;
      if (avgAlpha < 0.5) {
        row.push(null);
        continue;
      }

      // 判断该区域是否为边缘区域
      if (maxEdge > edgeThreshold) {
        // 边缘区域：使用边缘最强像素的颜色（最近邻，保留锐利边缘）
        const ei = (maxEdgeY * sourceWidth + maxEdgeX) * 4;
        const eAlpha = sourceData[ei + 3] / 255;
        if (eAlpha > 0.5) {
          row.push({
            r: Math.round(sourceData[ei] / eAlpha),
            g: Math.round(sourceData[ei + 1] / eAlpha),
            b: Math.round(sourceData[ei + 2] / eAlpha),
          });
        } else {
          // 边缘像素本身透明，回退到区域平均
          row.push({
            r: Math.round(rSum / aSum),
            g: Math.round(gSum / aSum),
            b: Math.round(bSum / aSum),
          });
        }
      } else {
        // 非边缘区域：使用区域平均颜色（保留色调）
        row.push({
          r: Math.round(rSum / aSum),
          g: Math.round(gSum / aSum),
          b: Math.round(bSum / aSum),
        });
      }
    }
    grid.push(row);
  }
  return grid;
}

/**
 * 自动描边后处理
 * 
 * 扫描拼豆 grid，在相邻颜色差异大的位置（色块边界）用深色勾勒轮廓。
 * 只替换边界处较浅的一侧像素，避免轮廓线过粗。
 * 
 * @param grid - 拼豆图案的颜色索引网格
 * @param width - 网格宽度
 * @param height - 网格高度
 * @param colors - 当前色板颜色数组
 * @param threshold - 色差阈值（CIEDE2000），超过此值视为边界
 * @param outlineColorIndex - 描边使用的颜色索引（-1 表示自动选择最深色）
 * @param subsetIndices - 可选：色板子集索引
 * @returns 描边后的新 grid
 */
export function autoOutline(
  grid: number[][],
  width: number,
  height: number,
  colors: BeadColor[],
  threshold: number = 15,
  outlineColorIndex: number = -1,
  subsetIndices?: number[]
): number[][] {
  // 预计算所有颜色的 Lab 值
  const labCache = new Map<number, { L: number; a: number; b: number }>();
  const getLabForIndex = (colorIndex: number) => {
    if (colorIndex < 0) return null;
    let lab = labCache.get(colorIndex);
    if (!lab) {
      const c = colors[colorIndex];
      if (!c) return null;
      lab = rgbToLab(c.r, c.g, c.b);
      labCache.set(colorIndex, lab);
    }
    return lab;
  };

  // 确定描边颜色：自动选择色板中最深的颜色（亮度最低）
  let outlineIdx = outlineColorIndex;
  if (outlineIdx < 0) {
    // 如果有子集限制，从子集中选择
    const candidateIndices = subsetIndices && subsetIndices.length > 0
      ? subsetIndices
      : colors.map((_, i) => i);

    let minLuminance = Infinity;
    for (const idx of candidateIndices) {
      const lab = getLabForIndex(idx);
      if (lab && lab.L < minLuminance) {
        minLuminance = lab.L;
        outlineIdx = idx;
      }
    }
  }

  // 如果找不到合适的描边颜色，返回原 grid
  if (outlineIdx < 0) return grid.map(row => [...row]);

  const outlineLab = getLabForIndex(outlineIdx);
  if (!outlineLab) return grid.map(row => [...row]);

  // 复制 grid
  const result = grid.map(row => [...row]);

  // 标记哪些像素是边界像素（需要描边）
  // 边界定义：与至少一个相邻像素（上下左右）的色差超过阈值
  const isBoundary: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false)
  );

  const directions = [
    [0, 1],   // 右
    [1, 0],   // 下
    [0, -1],  // 左
    [-1, 0],  // 上
  ];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const currentIdx = grid[row][col];
      if (currentIdx < 0) continue; // 跳过空格子

      const currentLab = getLabForIndex(currentIdx);
      if (!currentLab) continue;

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;

        const neighborIdx = grid[nr][nc];
        // 与空格子相邻也算边界
        if (neighborIdx < 0) {
          isBoundary[row][col] = true;
          break;
        }

        if (neighborIdx === currentIdx) continue;

        const neighborLab = getLabForIndex(neighborIdx);
        if (!neighborLab) continue;

        const diff = ciede2000(currentLab, neighborLab);
        if (diff > threshold) {
          isBoundary[row][col] = true;
          break;
        }
      }
    }
  }

  // 对边界像素，选择较浅的一侧替换为描边颜色
  // 策略：如果当前像素是边界像素，且它比描边颜色更浅（亮度更高），
  // 且它不是已经很深的颜色，则替换为描边颜色
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!isBoundary[row][col]) continue;

      const currentIdx = grid[row][col];
      if (currentIdx < 0) continue;
      // 已经是描边颜色，跳过
      if (currentIdx === outlineIdx) continue;

      const currentLab = getLabForIndex(currentIdx);
      if (!currentLab) continue;

      // 检查当前像素是否在边界的"较浅侧"
      // 通过比较与所有相邻像素的关系来判断
      let hasDarkerNeighbor = false;
      let hasLighterNeighbor = false;

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;

        const neighborIdx = grid[nr][nc];
        if (neighborIdx < 0 || neighborIdx === currentIdx) continue;

        const neighborLab = getLabForIndex(neighborIdx);
        if (!neighborLab) continue;

        const diff = ciede2000(currentLab, neighborLab);
        if (diff > threshold) {
          if (neighborLab.L < currentLab.L) {
            hasDarkerNeighbor = true;
          } else {
            hasLighterNeighbor = true;
          }
        }
      }

      // 只在较浅侧描边：当前像素比邻居亮，说明它在浅色侧
      // 或者当前像素与空格子相邻（轮廓边缘）
      if (hasDarkerNeighbor || (!hasLighterNeighbor && isBoundary[row][col])) {
        // 确保描边颜色比当前颜色更深，避免"反向描边"
        if (outlineLab.L < currentLab.L) {
          result[row][col] = outlineIdx;
        }
      }
    }
  }

  return result;
}

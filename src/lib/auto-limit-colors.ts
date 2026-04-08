/**
 * 自动限色模块
 * 
 * 分析图像主色调，从色板中推荐最合适的 N 种颜色子集。
 * 
 * 流程：
 * 1. 对原图进行降采样（加速处理）
 * 2. 使用 k-means++ 聚类提取主色调
 * 3. 从色板中为每个聚类中心匹配最近的颜色
 * 4. 去重后返回推荐的色板索引
 */

import type { BeadColor } from '@/types';
import { rgbToLab } from './color-convert';
import { ciede2000 } from './color-diff';

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * 从图像 DataURL 中提取像素数据（降采样）
 */
function extractPixels(imageDataUrl: string, maxSamples: number = 5000): Promise<RGB[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 降采样到较小尺寸以加速
      const scale = Math.min(1, Math.sqrt(maxSamples / (img.width * img.height)));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels: RGB[] = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const alpha = imageData.data[i + 3];
        // 跳过透明像素
        if (alpha < 128) continue;
        pixels.push({
          r: imageData.data[i],
          g: imageData.data[i + 1],
          b: imageData.data[i + 2],
        });
      }
      resolve(pixels);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * k-means++ 初始化：选择初始聚类中心
 */
function kmeansppInit(pixels: RGB[], k: number): RGB[] {
  const centers: RGB[] = [];
  // 随机选第一个中心
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centers.push({ ...pixels[firstIdx] });

  for (let c = 1; c < k; c++) {
    // 计算每个像素到最近中心的距离
    const distances = pixels.map(p => {
      let minDist = Infinity;
      for (const center of centers) {
        const dr = p.r - center.r;
        const dg = p.g - center.g;
        const db = p.b - center.b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    });

    // 按距离加权随机选择下一个中心
    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;
    
    let rand = Math.random() * totalDist;
    let selectedIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      rand -= distances[i];
      if (rand <= 0) {
        selectedIdx = i;
        break;
      }
    }
    centers.push({ ...pixels[selectedIdx] });
  }

  return centers;
}

/**
 * k-means 聚类
 * 
 * @param pixels - 像素数组
 * @param k - 聚类数量
 * @param maxIter - 最大迭代次数
 * @returns 聚类中心和每个聚类的像素数量
 */
function kmeans(
  pixels: RGB[],
  k: number,
  maxIter: number = 20
): { centers: RGB[]; counts: number[] } {
  if (pixels.length === 0) return { centers: [], counts: [] };
  if (pixels.length <= k) {
    return {
      centers: pixels.map(p => ({ ...p })),
      counts: pixels.map(() => 1),
    };
  }

  let centers = kmeansppInit(pixels, k);
  let assignments = new Int32Array(pixels.length);

  for (let iter = 0; iter < maxIter; iter++) {
    // 分配步骤：将每个像素分配到最近的中心
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centers.length; c++) {
        const dr = p.r - centers[c].r;
        const dg = p.g - centers[c].g;
        const db = p.b - centers[c].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // 更新步骤：重新计算每个聚类的中心
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
    for (let i = 0; i < pixels.length; i++) {
      const cluster = assignments[i];
      sums[cluster].r += pixels[i].r;
      sums[cluster].g += pixels[i].g;
      sums[cluster].b += pixels[i].b;
      sums[cluster].count++;
    }

    centers = sums.map((s, idx) => {
      if (s.count === 0) return centers[idx]; // 保持空聚类的中心不变
      return {
        r: Math.round(s.r / s.count),
        g: Math.round(s.g / s.count),
        b: Math.round(s.b / s.count),
      };
    });
  }

  // 计算每个聚类的像素数量
  const counts = new Array(centers.length).fill(0);
  for (let i = 0; i < assignments.length; i++) {
    counts[assignments[i]]++;
  }

  return { centers, counts };
}

/**
 * 从色板中为每个聚类中心找到最近的颜色
 * 
 * @param centers - 聚类中心 RGB 值
 * @param counts - 每个聚类的像素数量
 * @param colors - 色板颜色数组
 * @returns 推荐的色板索引数组（按重要性排序，去重）
 */
function matchCentersTopalette(
  centers: RGB[],
  counts: number[],
  colors: BeadColor[]
): number[] {
  // 预计算色板的 Lab 值
  const paletteLabs = colors.map(c => rgbToLab(c.r, c.g, c.b));

  // 按像素数量降序排列聚类中心
  const sortedIndices = centers
    .map((_, i) => i)
    .sort((a, b) => counts[b] - counts[a]);

  const selectedIndices = new Set<number>();

  for (const centerIdx of sortedIndices) {
    const center = centers[centerIdx];
    const centerLab = rgbToLab(center.r, center.g, center.b);

    // 找到色板中最近的颜色
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < paletteLabs.length; i++) {
      const dist = ciede2000(centerLab, paletteLabs[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    selectedIndices.add(bestIdx);

    // 同时添加第二近的颜色（增加色彩丰富度）
    let secondBestIdx = -1;
    let secondBestDist = Infinity;
    for (let i = 0; i < paletteLabs.length; i++) {
      if (i === bestIdx) continue;
      const dist = ciede2000(centerLab, paletteLabs[i]);
      if (dist < secondBestDist) {
        secondBestDist = dist;
        secondBestIdx = i;
      }
    }
    if (secondBestIdx >= 0 && secondBestDist < 15) {
      // 只有当第二近的颜色足够接近时才添加
      selectedIndices.add(secondBestIdx);
    }
  }

  return Array.from(selectedIndices);
}

/**
 * 自动限色：分析图像并推荐色板子集
 * 
 * @param imageDataUrl - 图像 DataURL
 * @param colors - 当前色板的颜色数组
 * @param targetColorCount - 目标颜色数量（8/16/24）
 * @returns 推荐的色板索引数组
 */
export async function autoLimitColors(
  imageDataUrl: string,
  colors: BeadColor[],
  targetColorCount: number
): Promise<number[]> {
  // 提取像素
  const pixels = await extractPixels(imageDataUrl);
  if (pixels.length === 0) return [];

  // k-means 聚类，聚类数量略多于目标以增加覆盖度
  const k = Math.min(Math.ceil(targetColorCount * 1.5), pixels.length);
  const { centers, counts } = kmeans(pixels, k);

  // 从色板中匹配最近的颜色
  let recommended = matchCentersTopalette(centers, counts, colors);

  // 如果推荐的颜色数量超过目标，按重要性截取
  if (recommended.length > targetColorCount) {
    recommended = recommended.slice(0, targetColorCount);
  }

  // 确保包含黑色和白色（如果色板中有的话），因为它们通常是必需的
  const blackIdx = colors.findIndex(c => c.r < 30 && c.g < 30 && c.b < 30);
  const whiteIdx = colors.findIndex(c => c.r > 240 && c.g > 240 && c.b > 240);
  if (blackIdx >= 0 && !recommended.includes(blackIdx)) {
    recommended.push(blackIdx);
  }
  if (whiteIdx >= 0 && !recommended.includes(whiteIdx)) {
    recommended.push(whiteIdx);
  }

  return recommended;
}

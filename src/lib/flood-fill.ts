/**
 * 找出一组 cell 中占比超过阈值的主色（背景色）
 * 返回该 colorIndex，如果没有任何颜色超过阈值则返回 -1
 */
function findDominantColor(cells: number[], threshold: number): number {
  const counts = new Map<number, number>();
  for (const c of cells) {
    if (c < 0) continue; // 跳过空 cell
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  if (counts.size === 0) return -1;

  let maxColor = -1;
  let maxCount = 0;
  for (const [color, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxColor = color;
    }
  }

  return maxCount / cells.length >= threshold ? maxColor : -1;
}

/**
 * 边缘多源 BFS 去除背景
 *
 * 1. 对四条边分别统计颜色分布，找出占比 >= 60% 的主色（背景色）
 * 2. 收集四条边上所有匹配该边背景色的 cell 作为 BFS 种子
 * 3. 多源 BFS 同时出发，将所有可达的同色连通区域设为 -1（空）
 */
export function removeBackground(
  grid: number[][],
  width: number,
  height: number
): number[][] {
  const THRESHOLD = 0.6;
  const result = grid.map((row) => [...row]);
  const visited = new Uint8Array(width * height);

  // 四条边的 cell 值
  const topEdge = result[0];
  const bottomEdge = result[height - 1];
  const leftEdge = result.map((row) => row[0]);
  const rightEdge = result.map((row) => row[width - 1]);

  // 找出每条边的背景色
  const topBg = findDominantColor(topEdge, THRESHOLD);
  const bottomBg = findDominantColor(bottomEdge, THRESHOLD);
  const leftBg = findDominantColor(leftEdge, THRESHOLD);
  const rightBg = findDominantColor(rightEdge, THRESHOLD);

  // 收集所有种子点：边缘上匹配该边背景色的 cell
  const seeds: [number, number, number][] = []; // [row, col, targetColor]

  // 上边
  if (topBg >= 0) {
    for (let c = 0; c < width; c++) {
      if (result[0][c] === topBg) seeds.push([0, c, topBg]);
    }
  }
  // 下边
  if (bottomBg >= 0) {
    for (let c = 0; c < width; c++) {
      if (result[height - 1][c] === bottomBg) seeds.push([height - 1, c, bottomBg]);
    }
  }
  // 左边
  if (leftBg >= 0) {
    for (let r = 0; r < height; r++) {
      if (result[r][0] === leftBg) seeds.push([r, 0, leftBg]);
    }
  }
  // 右边
  if (rightBg >= 0) {
    for (let c = width - 1, r = 0; r < height; r++) {
      if (result[r][c] === rightBg) seeds.push([r, c, rightBg]);
    }
  }

  // 多源 BFS：每个种子以自己的 targetColor 向内扩展
  for (const [sr, sc, targetColor] of seeds) {
    const key = sr * width + sc;
    if (visited[key]) continue;

    visited[key] = 1;
    const queue: [number, number][] = [[sr, sc]];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      result[r][c] = -1;

      const neighbors: [number, number][] = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];

      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
        const nKey = nr * width + nc;
        if (visited[nKey]) continue;
        if (result[nr][nc] !== targetColor) continue;

        visited[nKey] = 1;
        queue.push([nr, nc]);
      }
    }
  }

  return result;
}

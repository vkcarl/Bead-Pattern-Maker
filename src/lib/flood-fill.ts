/**
 * 四角洪水填充去除背景
 * 从 grid 的四个角分别出发，BFS 遍历所有与该角相同 colorIndex 的连通区域，
 * 将命中的 cell 设为 -1（空）。
 */
export function removeBackground(
  grid: number[][],
  width: number,
  height: number
): number[][] {
  // 深拷贝 grid
  const result = grid.map((row) => [...row]);
  const visited = new Uint8Array(width * height);

  const corners: [number, number][] = [
    [0, 0],
    [0, width - 1],
    [height - 1, 0],
    [height - 1, width - 1],
  ];

  for (const [startRow, startCol] of corners) {
    const targetColor = result[startRow][startCol];
    // 跳过已经是空的角
    if (targetColor < 0) continue;

    const key = startRow * width + startCol;
    if (visited[key]) continue;

    // BFS
    const queue: [number, number][] = [[startRow, startCol]];
    visited[key] = 1;

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

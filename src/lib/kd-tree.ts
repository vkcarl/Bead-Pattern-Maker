import type { Lab } from '@/types';
import { ciede2000 } from './color-diff';

interface KDNode {
  lab: Lab;
  index: number;
  left: KDNode | null;
  right: KDNode | null;
  splitAxis: number; // 0=L, 1=a, 2=b
}

const LAB_KEYS: (keyof Lab)[] = ['L', 'a', 'b'];

export class LabKDTree {
  private root: KDNode | null;

  constructor(colors: { lab: Lab; index: number }[]) {
    this.root = this.build(colors, 0);
  }

  private build(
    colors: { lab: Lab; index: number }[],
    depth: number
  ): KDNode | null {
    if (colors.length === 0) return null;

    const axis = depth % 3;
    const key = LAB_KEYS[axis];

    colors.sort((a, b) => a.lab[key] - b.lab[key]);
    const mid = Math.floor(colors.length / 2);

    return {
      lab: colors[mid].lab,
      index: colors[mid].index,
      splitAxis: axis,
      left: this.build(colors.slice(0, mid), depth + 1),
      right: this.build(colors.slice(mid + 1), depth + 1),
    };
  }

  nearest(target: Lab): { index: number; distance: number } {
    let bestIndex = -1;
    let bestDist = Infinity;

    const search = (node: KDNode | null) => {
      if (!node) return;

      const dist = ciede2000(target, node.lab);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = node.index;
      }

      const axis = node.splitAxis;
      const key = LAB_KEYS[axis];
      const diff = target[key] - node.lab[key];

      // Search the closer subtree first
      const first = diff < 0 ? node.left : node.right;
      const second = diff < 0 ? node.right : node.left;

      search(first);

      // Only search the other subtree if it could contain a closer point
      // Use absolute diff in the split dimension as a lower bound
      if (Math.abs(diff) < bestDist) {
        search(second);
      }
    };

    search(this.root);
    return { index: bestIndex, distance: bestDist };
  }
}

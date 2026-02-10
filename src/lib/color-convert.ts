import type { Lab, RGB } from '@/types';

// sRGB to linear (remove gamma)
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Linear RGB to XYZ (D65 illuminant)
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
  const z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl;
  return [x, y, z];
}

// XYZ to CIELAB
function xyzToLab(x: number, y: number, z: number): Lab {
  // D65 reference white
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;

  const epsilon = 0.008856;
  const kappa = 903.3;

  const f = (t: number) =>
    t > epsilon ? Math.cbrt(t) : (kappa * t + 16) / 116;

  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Relative luminance for contrast decisions
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

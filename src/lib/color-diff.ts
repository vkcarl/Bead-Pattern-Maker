import type { Lab } from '@/types';

// CIEDE2000 color difference formula
// Reference: "The CIEDE2000 Color-Difference Formula" by Sharma, Wu, Dalal (2005)
export function ciede2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;
  const POW25_7 = 6103515625; // 25^7

  // Step 1: Calculate C'ab and h'ab
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab_mean = (C1 + C2) / 2;
  const Cab_mean_pow7 = Math.pow(Cab_mean, 7);

  const G = 0.5 * (1 - Math.sqrt(Cab_mean_pow7 / (Cab_mean_pow7 + POW25_7)));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = Math.atan2(b1, a1p) * DEG;
  if (h1p < 0) h1p += 360;
  let h2p = Math.atan2(b2, a2p) * DEG;
  if (h2p < 0) h2p += 360;

  // Step 2: Calculate delta L', delta C', delta H'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);

  // Step 3: Calculate CIEDE2000 weighting functions
  const Lp_mean = (L1 + L2) / 2;
  const Cp_mean = (C1p + C2p) / 2;

  let hp_mean: number;
  if (C1p * C2p === 0) {
    hp_mean = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp_mean = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hp_mean = (h1p + h2p + 360) / 2;
  } else {
    hp_mean = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos((hp_mean - 30) * RAD) +
    0.24 * Math.cos(2 * hp_mean * RAD) +
    0.32 * Math.cos((3 * hp_mean + 6) * RAD) -
    0.20 * Math.cos((4 * hp_mean - 63) * RAD);

  const Lp_mean_minus50_sq = (Lp_mean - 50) * (Lp_mean - 50);
  const SL = 1 + 0.015 * Lp_mean_minus50_sq / Math.sqrt(20 + Lp_mean_minus50_sq);
  const SC = 1 + 0.045 * Cp_mean;
  const SH = 1 + 0.015 * Cp_mean * T;

  const Cp_mean_pow7 = Math.pow(Cp_mean, 7);
  const RC = 2 * Math.sqrt(Cp_mean_pow7 / (Cp_mean_pow7 + POW25_7));

  const dtheta = 30 * Math.exp(-((hp_mean - 275) / 25) * ((hp_mean - 275) / 25));
  const RT = -Math.sin(2 * dtheta * RAD) * RC;

  // Step 4: Final calculation (kL = kC = kH = 1 for standard conditions)
  const dE = Math.sqrt(
    (dLp / SL) * (dLp / SL) +
    (dCp / SC) * (dCp / SC) +
    (dHp / SH) * (dHp / SH) +
    RT * (dCp / SC) * (dHp / SH)
  );

  return dE;
}

/**
 * portionMultiplier.ts — Portion Multiplier Calculator
 *
 * Combines plate size and food coverage to produce a multiplier
 * that adjusts base ingredient weights for more accurate estimation.
 *
 * Larger plates and higher food coverage → larger multiplier.
 */

import type { PlateSize } from './plateDetector';

export interface PortionMultiplierResult {
  multiplier: number;
}

// ─── Multiplier reference table ─────────────────────────────────────────────
//
// Plate size defines the baseline capacity.
// Coverage determines how much of that capacity is used.
//
// Values at 25%, 50%, 75% coverage anchor points — we interpolate between them.

interface CoverageAnchors {
  low: number;   // 25% coverage
  mid: number;   // 50% coverage
  high: number;  // 75% coverage
}

const MULTIPLIER_TABLE: Record<PlateSize, CoverageAnchors> = {
  small:  { low: 0.6, mid: 0.9, high: 1.2 },
  medium: { low: 0.8, mid: 1.1, high: 1.4 },
  large:  { low: 1.0, mid: 1.4, high: 1.8 },
};

/**
 * Linear interpolation between anchor points.
 */
function interpolate(coverage: number, anchors: CoverageAnchors): number {
  // Clamp coverage to [0.1, 0.95]
  const c = Math.min(Math.max(coverage, 0.1), 0.95);

  if (c <= 0.25) {
    // Extrapolate below 25%: scale down from low anchor
    const ratio = c / 0.25;
    return anchors.low * ratio;
  } else if (c <= 0.50) {
    // Interpolate between 25% and 50%
    const t = (c - 0.25) / 0.25;
    return anchors.low + t * (anchors.mid - anchors.low);
  } else if (c <= 0.75) {
    // Interpolate between 50% and 75%
    const t = (c - 0.50) / 0.25;
    return anchors.mid + t * (anchors.high - anchors.mid);
  } else {
    // Extrapolate above 75%: continue the slope from mid→high
    const slope = (anchors.high - anchors.mid) / 0.25;
    return anchors.high + slope * (c - 0.75);
  }
}

/**
 * Calculate the portion multiplier from plate size and food coverage.
 *
 * @param plateSize — detected plate size
 * @param foodCoverage — fraction of plate covered by food (0.0–1.0)
 * @returns multiplier to apply to base ingredient weights
 */
export function calculatePortionMultiplier(
  plateSize: PlateSize,
  foodCoverage: number,
): PortionMultiplierResult {
  const anchors = MULTIPLIER_TABLE[plateSize] ?? MULTIPLIER_TABLE.medium;
  const raw = interpolate(foodCoverage, anchors);

  // Round to 1 decimal place, clamp to reasonable range [0.3, 2.5]
  const multiplier = Math.round(Math.min(Math.max(raw, 0.3), 2.5) * 10) / 10;

  return { multiplier };
}

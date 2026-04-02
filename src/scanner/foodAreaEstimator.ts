/**
 * foodAreaEstimator.ts — Food Coverage Estimation
 *
 * Estimates what percentage of the plate is covered by food
 * using lightweight heuristics from the detection output.
 * No image processing — uses ingredient count, types, and portions.
 */

export interface FoodCoverageResult {
  foodCoverage: number; // 0.0 – 1.0
}

interface DetectedItem {
  label: string;
  confidence: number;
  [key: string]: unknown;
}

// Foods that typically fill a large area of the plate
const HIGH_COVERAGE_FOODS = [
  'pizza', 'pasta', 'rice', 'arroz', 'salad', 'ensalada',
  'steak', 'filete', 'burger', 'hamburguesa', 'burrito',
  'omelette', 'tortilla', 'casserole',
];

// Foods that typically occupy small areas
const LOW_COVERAGE_FOODS = [
  'sauce', 'salsa', 'dressing', 'aderezo', 'sugar', 'azúcar',
  'honey', 'miel', 'butter', 'mantequilla', 'syrup', 'jarabe',
  'cream', 'crema', 'olive', 'aceituna', 'ketchup',
];

/**
 * Estimate food coverage on the plate based on detection results.
 *
 * Heuristic approach:
 *  - Each detected food item contributes a base coverage amount
 *  - High-coverage foods (pizza, pasta) contribute more
 *  - Low-coverage foods (sauces, condiments) contribute less
 *  - More items generally means more coverage
 *  - Capped at 0.95 (plate is never 100% covered in practice)
 */
export function estimateFoodCoverage(detectedObjects: DetectedItem[]): FoodCoverageResult {
  if (!detectedObjects || detectedObjects.length === 0) {
    return { foodCoverage: 0.5 }; // default assumption
  }

  let totalCoverage = 0;
  const labels = detectedObjects.map(o => o.label.toLowerCase());

  for (const label of labels) {
    const isHighCoverage = HIGH_COVERAGE_FOODS.some(h => label.includes(h));
    const isLowCoverage = LOW_COVERAGE_FOODS.some(l => label.includes(l));

    if (isHighCoverage) {
      totalCoverage += 0.35;
    } else if (isLowCoverage) {
      totalCoverage += 0.05;
    } else {
      // Standard food item
      totalCoverage += 0.15;
    }
  }

  // Clamp between 0.15 and 0.95
  const foodCoverage = Math.round(Math.min(Math.max(totalCoverage, 0.15), 0.95) * 100) / 100;

  return { foodCoverage };
}

/**
 * plateDetector.ts — Plate Size Detection
 *
 * Infers plate size from detected objects using lightweight heuristics
 * based on container type, food count, and food type keywords.
 * No heavy CV models — uses existing scanner output.
 */

export type PlateSize = 'small' | 'medium' | 'large';

export interface PlateDetection {
  plateDetected: boolean;
  plateSize: PlateSize;
  confidence: number;
}

interface DetectedItem {
  label: string;
  confidence: number;
  container?: string | null;
  [key: string]: unknown;
}

// Keywords that suggest a larger serving context
const LARGE_MEAL_HINTS = [
  'steak', 'filete', 'bistec', 'burger', 'hamburguesa',
  'pizza', 'pasta', 'burrito', 'platter', 'bandeja',
];

const SMALL_MEAL_HINTS = [
  'snack', 'appetizer', 'side', 'toast', 'tostada',
  'cookie', 'galleta', 'cracker',
];

/**
 * Detect plate presence and estimate its size from scanner output.
 *
 * Uses three signals:
 *  1. Explicit container detection (plate/plato in labels)
 *  2. Number of detected food items (more items → larger plate)
 *  3. Food type keywords (steak → large plate, toast → small plate)
 */
export function detectPlate(detectedObjects: DetectedItem[]): PlateDetection {
  if (!detectedObjects || detectedObjects.length === 0) {
    return { plateDetected: false, plateSize: 'medium', confidence: 0 };
  }

  const labels = detectedObjects.map(o => o.label.toLowerCase());

  // Check for explicit plate/container detection
  const hasPlateContainer = detectedObjects.some(
    o => o.container === 'plate' || o.container === 'plato'
  );
  const hasPlateLabel = labels.some(
    l => l.includes('plate') || l.includes('plato')
  );
  const plateDetected = hasPlateContainer || hasPlateLabel;

  // Bowl/cup signals — these aren't plates
  const hasBowlOrCup = detectedObjects.some(
    o => o.container === 'bowl' || o.container === 'cup' ||
         o.container === 'glass' || o.container === 'can' ||
         o.container === 'bottle'
  );

  if (!plateDetected && hasBowlOrCup) {
    return { plateDetected: false, plateSize: 'medium', confidence: 0.3 };
  }

  // Estimate plate size from food signals
  const itemCount = detectedObjects.length;
  const hasLargeMealHint = labels.some(l => LARGE_MEAL_HINTS.some(h => l.includes(h)));
  const hasSmallMealHint = labels.some(l => SMALL_MEAL_HINTS.some(h => l.includes(h)));

  let plateSize: PlateSize;
  let confidence: number;

  if (hasLargeMealHint || itemCount >= 5) {
    plateSize = 'large';
    confidence = hasLargeMealHint ? 0.75 : 0.6;
  } else if (hasSmallMealHint || itemCount <= 1) {
    plateSize = 'small';
    confidence = hasSmallMealHint ? 0.7 : 0.5;
  } else {
    plateSize = 'medium';
    confidence = 0.65;
  }

  // Boost confidence if plate was explicitly detected
  if (plateDetected) {
    confidence = Math.min(confidence + 0.15, 0.95);
  }

  return {
    plateDetected: plateDetected || (!hasBowlOrCup && itemCount >= 2),
    plateSize,
    confidence,
  };
}

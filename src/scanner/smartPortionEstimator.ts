/**
 * smartPortionEstimator.ts — Smart Portion Estimation via Container Detection
 *
 * Analyzes detected objects from the food scanner to infer container type
 * and estimate portion size. Designed to integrate with the existing
 * PortionSelector for user override and calculateNutrition for scaling.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetectedObject {
  label: string;
  confidence: number;
  [key: string]: unknown;
}

export type ContainerType = 'cup' | 'bowl' | 'plate' | 'unknown';
export type PortionSize = 'small' | 'medium' | 'large';

export interface PortionEstimate {
  container: ContainerType;
  estimatedVolume: number;
  unit: 'ml' | 'g';
  suggestedSize: PortionSize;
  confidence: number;
}

// ─── Container Volume Maps ───────────────────────────────────────────────────

interface ContainerSizes {
  small: number;
  medium: number;
  large: number;
  unit: 'ml' | 'g';
}

const CONTAINER_MAP: Record<ContainerType, ContainerSizes | null> = {
  cup: {
    small: 250,
    medium: 350,
    large: 500,
    unit: 'ml',
  },
  bowl: {
    small: 300,
    medium: 450,
    large: 650,
    unit: 'ml',
  },
  plate: {
    small: 400,
    medium: 600,
    large: 900,
    unit: 'g',
  },
  unknown: null,
};

// ─── Container Detection Keywords ────────────────────────────────────────────

const CONTAINER_KEYWORDS: { type: ContainerType; keywords: string[] }[] = [
  { type: 'cup',   keywords: ['cup', 'mug', 'taza', 'vaso', 'glass', 'copa', 'can', 'lata', 'bottle', 'botella'] },
  { type: 'bowl',  keywords: ['bowl', 'tazón', 'bol', 'plato hondo', 'soup'] },
  { type: 'plate', keywords: ['plate', 'plato', 'dish', 'bandeja', 'tray'] },
];

// Food items that hint at a container type
const FOOD_CONTAINER_HINTS: { keywords: string[]; container: ContainerType }[] = [
  { keywords: ['coffee', 'café', 'tea', 'té', 'latte', 'cappuccino', 'espresso', 'juice', 'jugo', 'smoothie', 'shake', 'milk', 'leche', 'soda', 'water', 'agua'], container: 'cup' },
  { keywords: ['soup', 'sopa', 'cereal', 'oatmeal', 'avena', 'stew', 'guiso', 'ramen', 'noodles', 'fideos', 'salad', 'ensalada', 'yogurt'], container: 'bowl' },
  { keywords: ['steak', 'filete', 'chicken breast', 'pechuga', 'rice', 'arroz', 'pasta', 'pizza', 'burger', 'hamburguesa', 'sandwich', 'sándwich', 'fries', 'papas'], container: 'plate' },
];

// ─── Size Heuristics ─────────────────────────────────────────────────────────

/**
 * Infer portion size from the number and type of detected items.
 * More items generally suggest a larger portion.
 */
function inferSize(objects: DetectedObject[], container: ContainerType): PortionSize {
  const count = objects.length;
  // Ice, toppings, extras suggest a larger drink/bowl
  const hasExtras = objects.some(o =>
    ['ice', 'hielo', 'cream', 'crema', 'syrup', 'jarabe', 'whipped', 'topping'].some(k =>
      o.label.toLowerCase().includes(k)
    )
  );

  if (count >= 4 || hasExtras) return 'large';
  if (count <= 1) return 'small';
  return 'medium';
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Estimate portion size from an array of detected objects.
 *
 * @param detectedObjects — objects detected by the food scanner
 * @returns PortionEstimate with container, volume, size, and confidence
 */
export function estimateSmartPortion(detectedObjects: DetectedObject[]): PortionEstimate {
  if (!detectedObjects || detectedObjects.length === 0) {
    return {
      container: 'unknown',
      estimatedVolume: 350,
      unit: 'ml',
      suggestedSize: 'medium',
      confidence: 0,
    };
  }

  // Step 1: Detect container from labels
  let container: ContainerType = 'unknown';
  let containerConfidence = 0;

  for (const obj of detectedObjects) {
    const label = obj.label.toLowerCase();
    for (const entry of CONTAINER_KEYWORDS) {
      if (entry.keywords.some(k => label.includes(k))) {
        container = entry.type;
        containerConfidence = obj.confidence;
        break;
      }
    }
    if (container !== 'unknown') break;
  }

  // Step 2: If no direct container detected, infer from food types
  if (container === 'unknown') {
    for (const obj of detectedObjects) {
      const label = obj.label.toLowerCase();
      for (const hint of FOOD_CONTAINER_HINTS) {
        if (hint.keywords.some(k => label.includes(k))) {
          container = hint.container;
          containerConfidence = obj.confidence * 0.7; // lower confidence for inferred
          break;
        }
      }
      if (container !== 'unknown') break;
    }
  }

  // Step 3: Determine size
  const suggestedSize = inferSize(detectedObjects, container);

  // Step 4: Look up volume
  const sizes = CONTAINER_MAP[container];
  let estimatedVolume: number;
  let unit: 'ml' | 'g';

  if (sizes) {
    estimatedVolume = sizes[suggestedSize];
    unit = sizes.unit;
  } else {
    // Unknown container: use cup medium defaults
    estimatedVolume = 350;
    unit = 'ml';
  }

  // Step 5: Calculate overall confidence
  const avgConfidence = detectedObjects.reduce((sum, o) => sum + o.confidence, 0) / detectedObjects.length;
  const confidence = container !== 'unknown'
    ? Math.round(Math.min(containerConfidence * 0.6 + avgConfidence * 0.4, 1) * 100) / 100
    : Math.round(avgConfidence * 0.5 * 100) / 100;

  return {
    container,
    estimatedVolume,
    unit,
    suggestedSize,
    confidence,
  };
}

/**
 * Format a portion estimate for display.
 *
 * @returns e.g. "Estimated portion: Medium (350ml)"
 */
export function formatPortionEstimate(estimate: PortionEstimate, lang: 'en' | 'es' = 'en'): string {
  const sizeLabels = {
    en: { small: 'Small', medium: 'Medium', large: 'Large' },
    es: { small: 'Pequeño', medium: 'Mediano', large: 'Grande' },
  };
  const prefix = lang === 'es' ? 'Porción estimada' : 'Estimated portion';
  const sizeLabel = sizeLabels[lang][estimate.suggestedSize];
  return `${prefix}: ${sizeLabel} (${estimate.estimatedVolume}${estimate.unit})`;
}

/**
 * Calculate a scale factor from the estimated volume.
 * Used to scale ingredient quantities before passing to calculateNutrition.
 *
 * @param estimatedVolume — volume from the portion estimate
 * @param baseVolume — the reference volume (default 100 for per-100g/ml values)
 * @returns multiplier for ingredient amounts
 */
export function getPortionScaleFactor(estimatedVolume: number, baseVolume: number = 100): number {
  if (baseVolume <= 0) return 1;
  return estimatedVolume / baseVolume;
}

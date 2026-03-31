/**
 * portionEstimator.js — Volume + Portion Estimation
 *
 * Estimates portion sizes based on container detection and
 * provides standard size presets with override capability.
 */

/**
 * @typedef {Object} PortionSize
 * @property {string} id      — unique identifier
 * @property {string} label   — display label (en)
 * @property {string} labelEs — display label (es)
 * @property {number} ml      — volume in milliliters
 * @property {number} grams   — estimated weight in grams (for solids)
 */

export const PORTION_SIZES = [
  { id: 'small',  label: 'Small',  labelEs: 'Pequeño', ml: 250, grams: 200 },
  { id: 'medium', label: 'Medium', labelEs: 'Mediano', ml: 350, grams: 300 },
  { id: 'large',  label: 'Large',  labelEs: 'Grande',  ml: 500, grams: 450 },
];

// Default container volumes in ml
const CONTAINER_VOLUMES = {
  cup:     250,
  glass:   300,
  bowl:    400,
  plate:   350,  // weight-based estimation in grams
  bottle:  500,
  can:     330,
};

// Density multipliers (ml → grams) for ingredient categories
const DENSITY = {
  beverage:   1.0,   // 1ml ≈ 1g
  dairy:      1.03,
  grain:      0.85,  // cooked rice is lighter per volume
  protein:    1.05,
  fruit:      0.9,
  sweetener:  1.3,
  supplement: 0.5,
  zero:       0.92,  // ice
  food:       1.0,   // default
};

/**
 * Estimate portion size based on detected container and ingredients.
 *
 * @param {string|null} container — detected container type (from segmentFood)
 * @param {import('./ingredientParser').ParsedIngredient[]} ingredients
 * @returns {{ portionId: string, totalMl: number, scaleFactor: number }}
 */
export function estimatePortion(container, ingredients = []) {
  // Determine base volume from container
  let baseMl = CONTAINER_VOLUMES[container] ?? 350; // default medium

  // Find the closest standard portion
  let closestPortion = PORTION_SIZES[1]; // default medium
  let minDiff = Infinity;
  for (const p of PORTION_SIZES) {
    const diff = Math.abs(p.ml - baseMl);
    if (diff < minDiff) {
      minDiff = diff;
      closestPortion = p;
    }
  }

  // Scale factor: how much of a "100g/100ml serving" does this portion represent
  // For a 350ml drink, if an ingredient's default is 150ml, scale = 350/150 = 2.33
  const scaleFactor = baseMl / 100;

  return {
    portionId:   closestPortion.id,
    totalMl:     baseMl,
    scaleFactor,
  };
}

/**
 * Calculate the scale factor for a specific ingredient given a portion size.
 *
 * @param {import('./ingredientParser').ParsedIngredient} ingredient
 * @param {number} portionMl — total portion volume in ml
 * @param {number} [customQty] — user-overridden quantity
 * @returns {number} — multiplier to apply to per-100g values
 */
export function getIngredientScale(ingredient, portionMl, customQty) {
  if (customQty !== undefined && customQty >= 0) {
    // User manually set quantity — use it directly
    return customQty / 100;
  }

  // Auto-scale: ingredient proportion of total portion
  const density = DENSITY[ingredient.category] ?? 1.0;
  const estimatedGrams = portionMl * density;

  // Use the ingredient's default quantity as the estimate
  return ingredient.defaultQty / 100;
}

/**
 * Get portion label for display.
 *
 * @param {string} portionId
 * @param {string} lang — 'en' | 'es'
 * @returns {string}
 */
export function getPortionLabel(portionId, lang = 'en') {
  const p = PORTION_SIZES.find(s => s.id === portionId);
  if (!p) return `${portionId}`;
  const label = lang === 'es' ? p.labelEs : p.label;
  return `${label} (${p.ml}ml)`;
}

/**
 * calculateNutrition.js — Dynamic Nutrition Engine
 *
 * Scales ingredients by portion size and sums all macros.
 * Designed for real-time recalculation as users adjust ingredients.
 */

/**
 * @typedef {Object} NutritionResult
 * @property {number} calories — total calories
 * @property {number} protein  — total protein in g
 * @property {number} carbs    — total carbs in g
 * @property {number} fat      — total fat in g
 * @property {number} fiber    — total fiber in g
 * @property {Array}  breakdown — per-ingredient contribution
 */

/**
 * Calculate scaled nutrition for a single ingredient.
 *
 * @param {import('../scanner/ingredientParser').ParsedIngredient} ingredient
 * @param {number} quantity — actual quantity in g or ml
 * @returns {{ calories: number, protein: number, carbs: number, fat: number, fiber: number }}
 */
export function scaleIngredient(ingredient, quantity) {
  if (!ingredient || quantity <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  const ratio = quantity / 100;
  return {
    calories: round(ingredient.baseCalories * ratio),
    protein:  round(ingredient.protein * ratio, 1),
    carbs:    round(ingredient.carbs * ratio, 1),
    fat:      round(ingredient.fat * ratio, 1),
    fiber:    round(ingredient.fiber * ratio, 1),
  };
}

/**
 * Calculate total nutrition from all enabled ingredients.
 *
 * @param {Array<{ ingredient: import('../scanner/ingredientParser').ParsedIngredient, quantity: number }>} items
 *   Each item has an ingredient and its actual quantity in g/ml.
 * @returns {NutritionResult}
 */
export function calculateNutrition(items) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const breakdown = [];

  for (const { ingredient, quantity } of items) {
    if (!ingredient.enabled || quantity <= 0) continue;

    const scaled = scaleIngredient(ingredient, quantity);
    totals.calories += scaled.calories;
    totals.protein  += scaled.protein;
    totals.carbs    += scaled.carbs;
    totals.fat      += scaled.fat;
    totals.fiber    += scaled.fiber;

    breakdown.push({
      name:     ingredient.name,
      quantity,
      unit:     ingredient.unit,
      ...scaled,
    });
  }

  return {
    calories: Math.round(totals.calories),
    protein:  round(totals.protein, 1),
    carbs:    round(totals.carbs, 1),
    fat:      round(totals.fat, 1),
    fiber:    round(totals.fiber, 1),
    breakdown,
  };
}

/**
 * Calculate macro percentages for display.
 *
 * @param {NutritionResult} nutrition
 * @returns {{ proteinPct: number, carbsPct: number, fatPct: number }}
 */
export function getMacroPercentages(nutrition) {
  const { calories, protein, carbs, fat } = nutrition;
  if (calories <= 0) return { proteinPct: 0, carbsPct: 0, fatPct: 0 };

  const protCal = protein * 4;
  const carbCal = carbs * 4;
  const fatCal  = fat * 9;
  const total   = protCal + carbCal + fatCal || 1;

  return {
    proteinPct: Math.round((protCal / total) * 100),
    carbsPct:   Math.round((carbCal / total) * 100),
    fatPct:     Math.round((fatCal / total) * 100),
  };
}

function round(n, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * foodTypeClassifier.ts — Food Type Classifier
 *
 * Classifies scanned ingredients as liquid, solid, or mixed
 * to drive correct portion units (ml vs g).
 */

export type FoodType = 'liquid' | 'solid' | 'mixed';

export interface FoodTypeResult {
  type: FoodType;
}

const LIQUID_KEYWORDS = [
  'coffee', 'café', 'espresso', 'latte', 'cappuccino', 'americano',
  'milk', 'leche', 'juice', 'jugo', 'soda', 'refresco',
  'tea', 'té', 'smoothie', 'shake', 'water', 'agua',
  'soup', 'sopa', 'broth', 'caldo', 'beer', 'cerveza',
  'wine', 'vino', 'cocktail', 'cóctel', 'lemonade', 'limonada',
];

const SOLID_KEYWORDS = [
  'pizza', 'salad', 'ensalada', 'burger', 'hamburguesa',
  'rice', 'arroz', 'pasta', 'chicken', 'pollo',
  'sandwich', 'sándwich', 'cake', 'pastel', 'bread', 'pan',
  'steak', 'filete', 'egg', 'huevo', 'fries', 'papas',
  'taco', 'burrito', 'sushi', 'fish', 'pescado',
  'avocado', 'aguacate', 'banana', 'plátano', 'fruit', 'fruta',
];

const MIXED_KEYWORDS = [
  'ice cream', 'helado', 'yogurt', 'oatmeal', 'avena',
  'cereal', 'açaí', 'acai', 'pudding', 'pudín',
  'granola', 'porridge',
];

function matchesKeywords(label: string, keywords: string[]): boolean {
  const lower = label.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

/**
 * Classify a set of ingredients as liquid, solid, or mixed.
 *
 * @param ingredients — array with at least a `name` or `label` string field
 * @returns FoodTypeResult
 */
export function classifyFoodType(
  ingredients: Array<{ name?: string; label?: string }>,
): FoodTypeResult {
  if (!ingredients || ingredients.length === 0) {
    return { type: 'solid' };
  }

  let liquidCount = 0;
  let solidCount = 0;

  for (const ing of ingredients) {
    const label = (ing.name ?? ing.label ?? '').toLowerCase();

    // Check mixed first (specific items that are neither purely liquid nor solid)
    if (matchesKeywords(label, MIXED_KEYWORDS)) {
      // Mixed items count as half each
      liquidCount += 0.5;
      solidCount += 0.5;
      continue;
    }

    if (matchesKeywords(label, LIQUID_KEYWORDS)) {
      liquidCount++;
    } else if (matchesKeywords(label, SOLID_KEYWORDS)) {
      solidCount++;
    } else {
      // Unknown items default to solid
      solidCount++;
    }
  }

  const total = liquidCount + solidCount;
  if (total === 0) return { type: 'solid' };

  const liquidRatio = liquidCount / total;
  const solidRatio = solidCount / total;

  if (liquidRatio > 0.6) return { type: 'liquid' };
  if (solidRatio > 0.6) return { type: 'solid' };
  return { type: 'mixed' };
}

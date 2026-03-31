/**
 * segmentFood.js — AI Food Segmentation
 *
 * Transforms raw Claude Vision response into structured detected objects
 * with confidence scores, enabling multi-component food detection.
 *
 * Example: A latte image → [coffee, milk, ice] each with confidence.
 */

/**
 * @typedef {Object} DetectedObject
 * @property {string}  label       — detected food/ingredient name
 * @property {number}  confidence  — 0-1 numeric confidence
 * @property {string}  level       — 'high' | 'medium' | 'low'
 * @property {Object}  per100g     — raw nutrition per 100g from AI
 * @property {string}  [note]      — optional AI note
 * @property {string}  [container] — detected container type if any
 */

const CONFIDENCE_MAP = { high: 0.9, medium: 0.7, low: 0.4 };

/**
 * Parse container hints from food names or notes.
 * Returns null if no container detected.
 */
function detectContainer(name, note = '') {
  const text = `${name} ${note}`.toLowerCase();
  const containers = [
    { keywords: ['cup', 'taza', 'mug', 'vaso'],           type: 'cup' },
    { keywords: ['bowl', 'tazón', 'plato hondo', 'bol'],  type: 'bowl' },
    { keywords: ['plate', 'plato'],                        type: 'plate' },
    { keywords: ['glass', 'copa', 'vaso de cristal'],      type: 'glass' },
    { keywords: ['bottle', 'botella'],                     type: 'bottle' },
    { keywords: ['can', 'lata'],                           type: 'can' },
  ];
  for (const c of containers) {
    if (c.keywords.some(k => text.includes(k))) return c.type;
  }
  return null;
}

/**
 * Segment raw scan response into individual detected objects.
 *
 * @param {{ foods: Array }} scanResult — raw response from scan-food edge function
 * @returns {DetectedObject[]}
 */
export function segmentFood(scanResult) {
  if (!scanResult?.foods || !Array.isArray(scanResult.foods)) return [];

  return scanResult.foods.map(food => {
    const level = ['high', 'medium', 'low'].includes(food.confidence)
      ? food.confidence
      : 'low';

    return {
      label:      food.name ?? 'Unknown',
      confidence: CONFIDENCE_MAP[level] ?? 0.4,
      level,
      per100g:    food.per100g ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      note:       food.note ?? '',
      container:  detectContainer(food.name, food.note),
    };
  });
}

/**
 * Generate alternative meal-level predictions from detected objects.
 * Groups ingredients into likely meal combinations.
 *
 * @param {DetectedObject[]} objects — segmented food objects
 * @returns {Array<{ name: string, confidence: number, ingredients: string[] }>}
 */
export function generatePredictions(objects) {
  if (!objects.length) return [];

  // The primary prediction is always the detected combination
  const primary = {
    name: objects.map(o => o.label).join(' + '),
    confidence: objects.reduce((sum, o) => sum + o.confidence, 0) / objects.length,
    ingredients: objects.map(o => o.label),
  };

  const predictions = [primary];

  // Generate alternative predictions based on common food combos
  const labels = objects.map(o => o.label.toLowerCase());
  const MEAL_PATTERNS = [
    { match: ['café', 'leche'],           alt: 'Latte',          confidence: 0.75 },
    { match: ['coffee', 'milk'],          alt: 'Latte',          confidence: 0.75 },
    { match: ['café', 'leche', 'hielo'],  alt: 'Iced Latte',    confidence: 0.72 },
    { match: ['coffee', 'milk', 'ice'],   alt: 'Iced Latte',    confidence: 0.72 },
    { match: ['arroz', 'pollo'],          alt: 'Arroz con Pollo', confidence: 0.70 },
    { match: ['rice', 'chicken'],         alt: 'Chicken & Rice', confidence: 0.70 },
    { match: ['pan', 'huevo'],            alt: 'Tostada con Huevo', confidence: 0.68 },
    { match: ['bread', 'egg'],            alt: 'Egg Toast',      confidence: 0.68 },
  ];

  for (const pattern of MEAL_PATTERNS) {
    const matchCount = pattern.match.filter(m => labels.some(l => l.includes(m))).length;
    if (matchCount >= 2) {
      predictions.push({
        name: pattern.alt,
        confidence: pattern.confidence,
        ingredients: objects.map(o => o.label),
      });
    }
  }

  // Sort by confidence descending, cap at 3
  return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

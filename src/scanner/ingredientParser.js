/**
 * ingredientParser.js — Ingredient Parser
 *
 * Converts detected food objects into structured ingredients with
 * base nutritional values per standard serving.
 */

/**
 * @typedef {Object} ParsedIngredient
 * @property {string}  name         — ingredient name
 * @property {number}  baseCalories — calories per 100g/100ml
 * @property {number}  protein      — protein per 100g/100ml
 * @property {number}  carbs        — carbs per 100g/100ml
 * @property {number}  fat          — fat per 100g/100ml
 * @property {number}  fiber        — fiber per 100g/100ml
 * @property {number}  defaultQty   — default quantity in grams/ml
 * @property {string}  unit         — 'g' or 'ml'
 * @property {boolean} enabled      — whether included in calculation
 * @property {string}  category     — ingredient category
 */

// Fallback nutrition database for common ingredients the AI might miss detail on
const INGREDIENT_DB = {
  // Beverages
  'coffee':         { cal: 2,   p: 0.1, c: 0,   f: 0,   fi: 0, qty: 200, unit: 'ml', cat: 'beverage' },
  'café':           { cal: 2,   p: 0.1, c: 0,   f: 0,   fi: 0, qty: 200, unit: 'ml', cat: 'beverage' },
  'espresso':       { cal: 5,   p: 0.1, c: 0.6, f: 0,   fi: 0, qty: 30,  unit: 'ml', cat: 'beverage' },
  'water':          { cal: 0,   p: 0,   c: 0,   f: 0,   fi: 0, qty: 250, unit: 'ml', cat: 'beverage' },
  'agua':           { cal: 0,   p: 0,   c: 0,   f: 0,   fi: 0, qty: 250, unit: 'ml', cat: 'beverage' },

  // Dairy
  'milk':           { cal: 42,  p: 3.4, c: 5,   f: 1,   fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'leche':          { cal: 42,  p: 3.4, c: 5,   f: 1,   fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'whole milk':     { cal: 61,  p: 3.2, c: 4.8, f: 3.3, fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'leche entera':   { cal: 61,  p: 3.2, c: 4.8, f: 3.3, fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'almond milk':    { cal: 13,  p: 0.4, c: 0.3, f: 1.1, fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'leche de almendra':{ cal:13, p: 0.4, c: 0.3, f: 1.1, fi: 0, qty: 150, unit: 'ml', cat: 'dairy' },
  'oat milk':       { cal: 47,  p: 1,   c: 6.7, f: 1.5, fi: 0.8, qty: 150, unit: 'ml', cat: 'dairy' },
  'cream':          { cal: 340, p: 2,   c: 2.8, f: 37,  fi: 0, qty: 30,  unit: 'ml', cat: 'dairy' },
  'crema':          { cal: 340, p: 2,   c: 2.8, f: 37,  fi: 0, qty: 30,  unit: 'ml', cat: 'dairy' },
  'yogurt':         { cal: 59,  p: 3.5, c: 4.7, f: 3.3, fi: 0, qty: 150, unit: 'g',  cat: 'dairy' },

  // Sweeteners
  'sugar':          { cal: 387, p: 0,   c: 100, f: 0,   fi: 0, qty: 10,  unit: 'g',  cat: 'sweetener' },
  'azúcar':         { cal: 387, p: 0,   c: 100, f: 0,   fi: 0, qty: 10,  unit: 'g',  cat: 'sweetener' },
  'honey':          { cal: 304, p: 0.3, c: 82,  f: 0,   fi: 0, qty: 15,  unit: 'g',  cat: 'sweetener' },
  'miel':           { cal: 304, p: 0.3, c: 82,  f: 0,   fi: 0, qty: 15,  unit: 'g',  cat: 'sweetener' },
  'syrup':          { cal: 260, p: 0,   c: 67,  f: 0,   fi: 0, qty: 15,  unit: 'ml', cat: 'sweetener' },
  'jarabe':         { cal: 260, p: 0,   c: 67,  f: 0,   fi: 0, qty: 15,  unit: 'ml', cat: 'sweetener' },

  // Zero-calorie items
  'ice':            { cal: 0,   p: 0,   c: 0,   f: 0,   fi: 0, qty: 100, unit: 'g',  cat: 'zero' },
  'hielo':          { cal: 0,   p: 0,   c: 0,   f: 0,   fi: 0, qty: 100, unit: 'g',  cat: 'zero' },

  // Supplements
  'protein powder': { cal: 375, p: 80,  c: 7.5, f: 3.8, fi: 0, qty: 30,  unit: 'g',  cat: 'supplement' },
  'proteína':       { cal: 375, p: 80,  c: 7.5, f: 3.8, fi: 0, qty: 30,  unit: 'g',  cat: 'supplement' },

  // Common foods
  'rice':           { cal: 130, p: 2.7, c: 28,  f: 0.3, fi: 0.4, qty: 150, unit: 'g', cat: 'grain' },
  'arroz':          { cal: 130, p: 2.7, c: 28,  f: 0.3, fi: 0.4, qty: 150, unit: 'g', cat: 'grain' },
  'chicken':        { cal: 165, p: 31,  c: 0,   f: 3.6, fi: 0, qty: 120, unit: 'g',  cat: 'protein' },
  'pollo':          { cal: 165, p: 31,  c: 0,   f: 3.6, fi: 0, qty: 120, unit: 'g',  cat: 'protein' },
  'egg':            { cal: 155, p: 13,  c: 1.1, f: 11,  fi: 0, qty: 50,  unit: 'g',  cat: 'protein' },
  'huevo':          { cal: 155, p: 13,  c: 1.1, f: 11,  fi: 0, qty: 50,  unit: 'g',  cat: 'protein' },
  'bread':          { cal: 265, p: 9,   c: 49,  f: 3.2, fi: 2.7, qty: 30, unit: 'g', cat: 'grain' },
  'pan':            { cal: 265, p: 9,   c: 49,  f: 3.2, fi: 2.7, qty: 30, unit: 'g', cat: 'grain' },
  'banana':         { cal: 89,  p: 1.1, c: 23,  f: 0.3, fi: 2.6, qty: 120, unit: 'g', cat: 'fruit' },
  'plátano':        { cal: 89,  p: 1.1, c: 23,  f: 0.3, fi: 2.6, qty: 120, unit: 'g', cat: 'fruit' },
  'avocado':        { cal: 160, p: 2,   c: 8.5, f: 14.7,fi: 6.7, qty: 80, unit: 'g', cat: 'fruit' },
  'aguacate':       { cal: 160, p: 2,   c: 8.5, f: 14.7,fi: 6.7, qty: 80, unit: 'g', cat: 'fruit' },
};

// Quick-add presets available in the ingredient editor
export const QUICK_ADD_INGREDIENTS = [
  { name: 'Sugar',          nameEs: 'Azúcar',     key: 'sugar' },
  { name: 'Syrup',          nameEs: 'Jarabe',     key: 'syrup' },
  { name: 'Cream',          nameEs: 'Crema',      key: 'cream' },
  { name: 'Protein Powder', nameEs: 'Proteína',   key: 'protein powder' },
  { name: 'Honey',          nameEs: 'Miel',       key: 'honey' },
  { name: 'Almond Milk',    nameEs: 'Leche Alm.', key: 'almond milk' },
];

/**
 * Look up an ingredient in the local database.
 * Returns null if not found.
 */
function lookupIngredient(name) {
  const lower = name.toLowerCase().trim();
  // Exact match
  if (INGREDIENT_DB[lower]) return { ...INGREDIENT_DB[lower] };
  // Partial match
  for (const [key, val] of Object.entries(INGREDIENT_DB)) {
    if (lower.includes(key) || key.includes(lower)) return { ...val };
  }
  return null;
}

/**
 * Parse detected objects into structured ingredients.
 *
 * @param {import('./segmentFood').DetectedObject[]} detectedObjects
 * @returns {ParsedIngredient[]}
 */
export function parseIngredients(detectedObjects) {
  if (!Array.isArray(detectedObjects)) return [];

  return detectedObjects.map(obj => {
    const dbEntry = lookupIngredient(obj.label);
    const per100g = obj.per100g ?? {};

    // Prefer AI-provided values, fall back to local DB
    const cal  = per100g.calories ?? dbEntry?.cal ?? 0;
    const prot = per100g.protein  ?? dbEntry?.p   ?? 0;
    const carb = per100g.carbs    ?? dbEntry?.c   ?? 0;
    const fat  = per100g.fat      ?? dbEntry?.f   ?? 0;
    const fib  = per100g.fiber    ?? dbEntry?.fi  ?? 0;

    return {
      name:         obj.label,
      baseCalories: cal,
      protein:      prot,
      carbs:        carb,
      fat:          fat,
      fiber:        fib,
      defaultQty:   dbEntry?.qty ?? 100,
      unit:         dbEntry?.unit ?? 'g',
      enabled:      true,
      category:     dbEntry?.cat ?? 'food',
    };
  });
}

/**
 * Create an ingredient from a quick-add key.
 *
 * @param {string} key — key from QUICK_ADD_INGREDIENTS
 * @returns {ParsedIngredient | null}
 */
export function createQuickAddIngredient(key) {
  const dbEntry = INGREDIENT_DB[key];
  if (!dbEntry) return null;

  const preset = QUICK_ADD_INGREDIENTS.find(q => q.key === key);
  return {
    name:         preset?.name ?? key,
    baseCalories: dbEntry.cal,
    protein:      dbEntry.p,
    carbs:        dbEntry.c,
    fat:          dbEntry.f,
    fiber:        dbEntry.fi,
    defaultQty:   dbEntry.qty,
    unit:         dbEntry.unit,
    enabled:      true,
    category:     dbEntry.cat,
  };
}

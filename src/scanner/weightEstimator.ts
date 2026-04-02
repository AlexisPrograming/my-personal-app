/**
 * weightEstimator.ts — Visual Weight Estimation
 *
 * Estimates ingredient weights based on common single-serving sizes.
 * Applies a plate multiplier when food is detected on a plate
 * (portions served on plates tend to be larger than standalone items).
 */

export interface WeightEstimate {
  label: string;
  estimatedGrams: number;
  source: 'db' | 'default';
}

// ─── Common serving weights (grams) ─────────────────────────────────────────

const WEIGHT_DB: Record<string, number> = {
  // Breads & grains
  'bread':          35,
  'pan':            35,
  'toast':          30,
  'tostada':        30,
  'tortilla':       40,
  'bun':            50,
  'bagel':          90,
  'croissant':      60,
  'rice':           150,
  'arroz':          150,
  'pasta':          180,
  'noodles':        180,
  'oatmeal':        150,
  'avena':          150,
  'cereal':         40,
  'granola':        40,
  'pancake':        75,
  'waffle':         75,
  'croutons':       15,

  // Proteins
  'egg':            50,
  'huevo':          50,
  'fried egg':      55,
  'chicken':        120,
  'pollo':          120,
  'chicken breast': 150,
  'pechuga':        150,
  'steak':          200,
  'bistec':         200,
  'filete':         200,
  'ham':            20,
  'jamón':          20,
  'bacon':          15,
  'tocino':         15,
  'fish':           150,
  'pescado':        150,
  'salmon':         150,
  'salmón':         150,
  'shrimp':         100,
  'camarón':        100,
  'meat':           150,
  'carne':          150,
  'pork':           150,
  'cerdo':          150,
  'sausage':        50,
  'salchicha':      50,
  'protein powder': 30,
  'proteína':       30,

  // Dairy
  'cheese':         25,
  'queso':          25,
  'cream':          15,
  'crema':          15,
  'yogurt':         150,
  'butter':         10,
  'mantequilla':    10,
  'milk':           200,
  'leche':          200,

  // Vegetables & greens
  'arugula':        10,
  'rúcula':         10,
  'lettuce':        15,
  'lechuga':        15,
  'spinach':        15,
  'espinaca':       15,
  'tomato':         80,
  'tomate':         80,
  'onion':          30,
  'cebolla':        30,
  'pepper':         60,
  'pimiento':       60,
  'mushroom':       30,
  'champiñón':      30,
  'salad':          100,
  'ensalada':       100,
  'vegetables':     80,
  'verduras':       80,
  'potato':         150,
  'papa':           150,
  'beans':          100,
  'frijoles':       100,
  'corn':           80,
  'maíz':           80,
  'avocado':        80,
  'aguacate':       80,
  'kale':           15,

  // Fruits
  'banana':         120,
  'plátano':        120,
  'apple':          180,
  'manzana':        180,
  'orange':         150,
  'naranja':        150,
  'berry':          50,
  'fruit':          100,
  'fruta':          100,

  // Condiments & extras
  'sugar':          10,
  'azúcar':         10,
  'honey':          15,
  'miel':           15,
  'syrup':          20,
  'jarabe':         20,
  'sauce':          30,
  'salsa':          30,
  'dressing':       30,
  'aderezo':        30,
  'olive':          10,
  'aceituna':       10,
  'soy sauce':      10,
  'ketchup':        15,
  'mayonnaise':     15,
  'mayonesa':       15,
  'frosting':       30,

  // Composite items
  'pizza':          200,
  'burger':         200,
  'hamburguesa':    200,
  'sandwich':       180,
  'sándwich':       180,
  'taco':           100,
  'burrito':        250,
  'sushi':          150,
  'soup':           300,
  'sopa':           300,
  'cake':           100,
  'pastel':         100,
  'ice cream':      100,
  'helado':         100,
  'smoothie':       300,

  // Zero-calorie
  'ice':            80,
  'hielo':          80,
  'water':          250,
  'agua':           250,

  // Beverages
  'coffee':         200,
  'café':           200,
  'espresso':       30,
  'tea':            200,
  'té':             200,
  'juice':          250,
  'jugo':           250,
  'soda':           350,
  'refresco':       350,
};

const PLATE_MULTIPLIER = 1.2;

function lookupWeight(label: string): { grams: number; source: 'db' | 'default' } {
  const lower = label.toLowerCase().trim();

  // Exact match
  if (WEIGHT_DB[lower] !== undefined) {
    return { grams: WEIGHT_DB[lower], source: 'db' };
  }

  // Partial match
  for (const [key, grams] of Object.entries(WEIGHT_DB)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { grams, source: 'db' };
    }
  }

  // Default fallback
  return { grams: 100, source: 'default' };
}

/**
 * Estimate weights for a list of ingredients.
 *
 * @param ingredients — array with at least a `name` or `label` field
 * @param onPlate — whether food was detected on a plate (applies 20% increase)
 * @returns Array of weight estimates
 */
export function estimateWeights(
  ingredients: Array<{ name?: string; label?: string }>,
  onPlate: boolean = false,
): WeightEstimate[] {
  return ingredients.map(ing => {
    const label = ing.name ?? ing.label ?? '';
    const { grams, source } = lookupWeight(label);
    const finalGrams = onPlate ? Math.round(grams * PLATE_MULTIPLIER) : grams;

    return {
      label,
      estimatedGrams: finalGrams,
      source,
    };
  });
}

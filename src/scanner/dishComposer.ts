/**
 * dishComposer.ts — Dish Composition Layer
 *
 * Groups individually detected ingredients into logical dishes
 * using pattern matching rules. Improves the scanner's contextual
 * understanding so "bread + egg + ham" becomes "Breakfast Sandwich"
 * instead of three separate items.
 */

export interface DetectedItem {
  label: string;
  confidence: number;
  [key: string]: unknown;
}

export interface DishComposition {
  dish: string;
  dishEs: string;
  ingredients: string[];
}

// ─── Confidence threshold ────────────────────────────────────────────────────

const MIN_CONFIDENCE = 0.55;

/**
 * Filter out low-confidence detections.
 */
export function filterByConfidence(items: DetectedItem[]): DetectedItem[] {
  return items.filter(i => {
    if (typeof i.confidence === 'number') return i.confidence >= MIN_CONFIDENCE;
    // String confidence levels from the AI (high/medium/low)
    return i.confidence !== 'low';
  });
}

// ─── Dish rules ──────────────────────────────────────────────────────────────

interface DishRule {
  required: string[];
  optional: string[];
  dish: string;
  dishEs: string;
}

const DISH_RULES: DishRule[] = [
  // Breakfast combinations
  { required: ['bread', 'egg', 'ham'],       optional: [],                          dish: 'Breakfast Sandwich',         dishEs: 'Sándwich de Desayuno' },
  { required: ['bread', 'egg', 'cheese'],    optional: ['ham'],                     dish: 'Egg & Cheese Sandwich',      dishEs: 'Sándwich de Huevo y Queso' },
  { required: ['bread', 'egg'],              optional: ['arugula', 'lettuce', 'tomato', 'spinach'], dish: 'Toast with Egg', dishEs: 'Tostada con Huevo' },
  { required: ['egg', 'bacon'],              optional: ['toast', 'bread'],          dish: 'Eggs & Bacon',               dishEs: 'Huevos con Tocino' },
  { required: ['pancake'],                   optional: ['syrup', 'butter', 'fruit', 'banana', 'berry'], dish: 'Pancakes', dishEs: 'Panqueques' },
  { required: ['waffle'],                    optional: ['syrup', 'butter', 'fruit'], dish: 'Waffles',                   dishEs: 'Waffles' },
  { required: ['oatmeal'],                   optional: ['fruit', 'banana', 'honey', 'milk'], dish: 'Oatmeal Bowl',      dishEs: 'Bowl de Avena' },
  { required: ['cereal'],                    optional: ['milk'],                    dish: 'Cereal Bowl',                dishEs: 'Bowl de Cereal' },

  // Lunch / Dinner
  { required: ['rice', 'chicken'],           optional: ['beans', 'salad', 'sauce', 'vegetables'], dish: 'Chicken & Rice', dishEs: 'Pollo con Arroz' },
  { required: ['rice', 'beans'],             optional: ['meat', 'chicken', 'pork'], dish: 'Rice & Beans',               dishEs: 'Arroz con Frijoles' },
  { required: ['pasta', 'sauce'],            optional: ['cheese', 'meat', 'chicken'], dish: 'Pasta',                    dishEs: 'Pasta' },
  { required: ['burger', 'bun'],             optional: ['lettuce', 'tomato', 'cheese', 'onion'], dish: 'Burger',        dishEs: 'Hamburguesa' },
  { required: ['tortilla', 'meat'],          optional: ['cheese', 'lettuce', 'salsa', 'beans'], dish: 'Taco/Burrito',   dishEs: 'Taco/Burrito' },
  { required: ['salad', 'chicken'],          optional: ['dressing', 'cheese', 'croutons'], dish: 'Chicken Salad',       dishEs: 'Ensalada de Pollo' },
  { required: ['steak'],                     optional: ['potato', 'vegetables', 'rice', 'salad'], dish: 'Steak Plate',  dishEs: 'Plato de Bistec' },
  { required: ['fish'],                      optional: ['rice', 'vegetables', 'lemon', 'salad'], dish: 'Fish Plate',    dishEs: 'Plato de Pescado' },
  { required: ['pizza'],                     optional: ['cheese', 'pepperoni', 'mushroom', 'olive'], dish: 'Pizza',     dishEs: 'Pizza' },
  { required: ['sushi'],                     optional: ['rice', 'fish', 'avocado', 'soy sauce'], dish: 'Sushi',         dishEs: 'Sushi' },
  { required: ['soup'],                      optional: ['noodles', 'vegetables', 'chicken', 'bread'], dish: 'Soup',     dishEs: 'Sopa' },
  { required: ['sandwich'],                  optional: ['lettuce', 'tomato', 'cheese', 'ham'], dish: 'Sandwich',        dishEs: 'Sándwich' },

  // Drinks
  { required: ['coffee', 'milk'],            optional: ['sugar', 'cream', 'ice'],   dish: 'Coffee with Milk',           dishEs: 'Café con Leche' },
  { required: ['coffee'],                    optional: ['sugar', 'cream'],           dish: 'Coffee',                     dishEs: 'Café' },
  { required: ['smoothie'],                  optional: ['fruit', 'milk', 'ice', 'banana'], dish: 'Smoothie',            dishEs: 'Smoothie' },

  // Snacks / Desserts
  { required: ['yogurt'],                    optional: ['fruit', 'granola', 'honey'], dish: 'Yogurt Bowl',              dishEs: 'Bowl de Yogurt' },
  { required: ['ice cream'],                 optional: ['cone', 'topping', 'sauce'], dish: 'Ice Cream',                 dishEs: 'Helado' },
  { required: ['cake'],                      optional: ['frosting', 'cream'],        dish: 'Cake',                      dishEs: 'Pastel' },
];

// Greens aliases for matching
const GREENS = ['arugula', 'rúcula', 'lettuce', 'lechuga', 'spinach', 'espinaca', 'kale', 'greens'];

function normalizeLabel(label: string): string {
  return label.toLowerCase().trim();
}

function labelsContain(labels: string[], keyword: string): boolean {
  return labels.some(l => l.includes(keyword) || keyword.includes(l));
}

/**
 * Compose a dish from a list of detected ingredients.
 * Returns the best-matching dish or a generic label if no pattern matches.
 */
export function composeDish(items: DetectedItem[]): DishComposition {
  const labels = items.map(i => normalizeLabel(i.label));

  // Expand greens: if any greens keyword is in labels, also add "greens" alias
  const hasGreens = labels.some(l => GREENS.some(g => l.includes(g)));

  let bestMatch: DishRule | null = null;
  let bestScore = 0;

  for (const rule of DISH_RULES) {
    // Check all required keywords present
    const requiredMet = rule.required.every(req => {
      if (req === 'greens' || GREENS.includes(req)) {
        return hasGreens || labelsContain(labels, req);
      }
      return labelsContain(labels, req);
    });

    if (!requiredMet) continue;

    // Score = required matches + optional matches
    const optionalHits = rule.optional.filter(opt => {
      if (GREENS.includes(opt)) return hasGreens;
      return labelsContain(labels, opt);
    }).length;

    const score = rule.required.length * 2 + optionalHits;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  const ingredientNames = items.map(i => i.label);

  if (bestMatch) {
    return {
      dish: bestMatch.dish,
      dishEs: bestMatch.dishEs,
      ingredients: ingredientNames,
    };
  }

  // No pattern matched — use the highest-confidence item as the dish name
  const primary = items.reduce((a, b) => {
    const confA = typeof a.confidence === 'number' ? a.confidence : 0.5;
    const confB = typeof b.confidence === 'number' ? b.confidence : 0.5;
    return confA >= confB ? a : b;
  }, items[0]);

  return {
    dish: primary.label,
    dishEs: primary.label,
    ingredients: ingredientNames,
  };
}

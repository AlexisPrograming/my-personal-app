/**
 * smartSegmentFood.ts — Enhanced Food Segmentation
 *
 * Provides multi-component food detection from AI scan results with:
 * - Smarter ingredient decomposition (e.g. latte → coffee + milk)
 * - Gram estimation per component
 * - Edge case handling (foam, sauces, hidden items)
 * - Typed interfaces for the full pipeline
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawFoodItem {
  name: string;
  confidence?: string | number;
  per100g?: NutritionPer100g;
  note?: string;
}

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface SegmentedComponent {
  label: string;
  confidence: number;
  grams: number;
  category: ComponentCategory;
  isHidden: boolean;
  source: 'detected' | 'inferred';
}

export type ComponentCategory =
  | 'beverage'
  | 'dairy'
  | 'sweetener'
  | 'grain'
  | 'protein'
  | 'fruit'
  | 'vegetable'
  | 'sauce'
  | 'zero'
  | 'supplement'
  | 'food';

export interface SegmentationResult {
  components: SegmentedComponent[];
  mealType: 'drink' | 'solid' | 'mixed';
  totalEstimatedGrams: number;
}

// ─── Confidence Mapping ──────────────────────────────────────────────────────

const CONFIDENCE_MAP: Record<string, number> = {
  high: 0.9,
  medium: 0.7,
  low: 0.4,
};

function normalizeConfidence(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Math.max(0, Math.min(1, raw));
  if (typeof raw === 'string' && CONFIDENCE_MAP[raw] !== undefined) return CONFIDENCE_MAP[raw];
  return 0.5;
}

// ─── Default Gram Estimates ──────────────────────────────────────────────────

const DEFAULT_GRAMS: Record<string, { grams: number; category: ComponentCategory }> = {
  // Beverages
  coffee:       { grams: 150, category: 'beverage' },
  café:         { grams: 150, category: 'beverage' },
  espresso:     { grams: 30,  category: 'beverage' },
  tea:          { grams: 200, category: 'beverage' },
  té:           { grams: 200, category: 'beverage' },
  water:        { grams: 250, category: 'beverage' },
  agua:         { grams: 250, category: 'beverage' },
  juice:        { grams: 200, category: 'beverage' },
  jugo:         { grams: 200, category: 'beverage' },
  smoothie:     { grams: 300, category: 'beverage' },

  // Dairy
  milk:         { grams: 120, category: 'dairy' },
  leche:        { grams: 120, category: 'dairy' },
  'whole milk': { grams: 120, category: 'dairy' },
  'almond milk':{ grams: 120, category: 'dairy' },
  'oat milk':   { grams: 120, category: 'dairy' },
  cream:        { grams: 30,  category: 'dairy' },
  crema:        { grams: 30,  category: 'dairy' },
  yogurt:       { grams: 150, category: 'dairy' },
  cheese:       { grams: 30,  category: 'dairy' },
  queso:        { grams: 30,  category: 'dairy' },

  // Sweeteners
  sugar:        { grams: 10,  category: 'sweetener' },
  azúcar:       { grams: 10,  category: 'sweetener' },
  honey:        { grams: 15,  category: 'sweetener' },
  miel:         { grams: 15,  category: 'sweetener' },
  syrup:        { grams: 15,  category: 'sweetener' },
  jarabe:       { grams: 15,  category: 'sweetener' },

  // Zero-calorie
  ice:          { grams: 50,  category: 'zero' },
  hielo:        { grams: 50,  category: 'zero' },
  foam:         { grams: 20,  category: 'zero' },
  espuma:       { grams: 20,  category: 'zero' },

  // Proteins
  chicken:      { grams: 120, category: 'protein' },
  pollo:        { grams: 120, category: 'protein' },
  beef:         { grams: 120, category: 'protein' },
  carne:        { grams: 120, category: 'protein' },
  egg:          { grams: 50,  category: 'protein' },
  huevo:        { grams: 50,  category: 'protein' },
  fish:         { grams: 120, category: 'protein' },
  pescado:      { grams: 120, category: 'protein' },
  beans:        { grams: 80,  category: 'protein' },
  frijoles:     { grams: 80,  category: 'protein' },

  // Grains
  rice:         { grams: 150, category: 'grain' },
  arroz:        { grams: 150, category: 'grain' },
  bread:        { grams: 30,  category: 'grain' },
  pan:          { grams: 30,  category: 'grain' },
  pasta:        { grams: 150, category: 'grain' },
  tortilla:     { grams: 30,  category: 'grain' },
  oatmeal:      { grams: 150, category: 'grain' },
  avena:        { grams: 150, category: 'grain' },

  // Fruits
  banana:       { grams: 120, category: 'fruit' },
  plátano:      { grams: 120, category: 'fruit' },
  avocado:      { grams: 80,  category: 'fruit' },
  aguacate:     { grams: 80,  category: 'fruit' },
  apple:        { grams: 150, category: 'fruit' },
  manzana:      { grams: 150, category: 'fruit' },

  // Vegetables
  lettuce:      { grams: 30,  category: 'vegetable' },
  lechuga:      { grams: 30,  category: 'vegetable' },
  tomato:       { grams: 80,  category: 'vegetable' },
  tomate:       { grams: 80,  category: 'vegetable' },

  // Sauces (hidden items)
  ketchup:      { grams: 15,  category: 'sauce' },
  mayonnaise:   { grams: 15,  category: 'sauce' },
  mayonesa:     { grams: 15,  category: 'sauce' },
  mustard:      { grams: 10,  category: 'sauce' },
  mostaza:      { grams: 10,  category: 'sauce' },
  salsa:        { grams: 20,  category: 'sauce' },
  dressing:     { grams: 20,  category: 'sauce' },
  aderezo:      { grams: 20,  category: 'sauce' },
  'soy sauce':  { grams: 10,  category: 'sauce' },
  butter:       { grams: 10,  category: 'dairy' },
  mantequilla:  { grams: 10,  category: 'dairy' },
  oil:          { grams: 10,  category: 'sauce' },
  aceite:       { grams: 10,  category: 'sauce' },

  // Supplements
  'protein powder': { grams: 30, category: 'supplement' },
  proteína:         { grams: 30, category: 'supplement' },
};

// ─── Composite Food Decomposition ────────────────────────────────────────────

interface CompositeRule {
  keywords: string[];
  components: { label: string; gramsFraction: number }[];
}

const COMPOSITE_FOODS: CompositeRule[] = [
  {
    keywords: ['latte', 'café con leche'],
    components: [
      { label: 'espresso', gramsFraction: 0.15 },
      { label: 'milk', gramsFraction: 0.75 },
      { label: 'foam', gramsFraction: 0.10 },
    ],
  },
  {
    keywords: ['cappuccino', 'capuchino'],
    components: [
      { label: 'espresso', gramsFraction: 0.33 },
      { label: 'milk', gramsFraction: 0.33 },
      { label: 'foam', gramsFraction: 0.34 },
    ],
  },
  {
    keywords: ['mocha', 'moca'],
    components: [
      { label: 'espresso', gramsFraction: 0.20 },
      { label: 'milk', gramsFraction: 0.55 },
      { label: 'syrup', gramsFraction: 0.10 },
      { label: 'cream', gramsFraction: 0.15 },
    ],
  },
  {
    keywords: ['sandwich', 'sándwich'],
    components: [
      { label: 'bread', gramsFraction: 0.30 },
      { label: 'protein', gramsFraction: 0.40 },
      { label: 'lettuce', gramsFraction: 0.15 },
      { label: 'mayonnaise', gramsFraction: 0.15 },
    ],
  },
];

// ─── Hidden Item Inference ───────────────────────────────────────────────────

interface HiddenItemRule {
  trigger: string[];
  hidden: { label: string; grams: number; category: ComponentCategory };
}

const HIDDEN_ITEMS: HiddenItemRule[] = [
  { trigger: ['fries', 'papas fritas'],     hidden: { label: 'ketchup', grams: 15, category: 'sauce' } },
  { trigger: ['salad', 'ensalada'],          hidden: { label: 'dressing', grams: 20, category: 'sauce' } },
  { trigger: ['toast', 'tostada'],           hidden: { label: 'butter', grams: 10, category: 'dairy' } },
  { trigger: ['pancake', 'hotcake', 'waffle'], hidden: { label: 'syrup', grams: 30, category: 'sweetener' } },
  { trigger: ['sushi'],                      hidden: { label: 'soy sauce', grams: 10, category: 'sauce' } },
  { trigger: ['pasta'],                      hidden: { label: 'salsa', grams: 40, category: 'sauce' } },
];

// ─── Core Functions ──────────────────────────────────────────────────────────

function lookupGrams(label: string): { grams: number; category: ComponentCategory } {
  const lower = label.toLowerCase().trim();
  if (DEFAULT_GRAMS[lower]) return { ...DEFAULT_GRAMS[lower] };
  for (const [key, val] of Object.entries(DEFAULT_GRAMS)) {
    if (lower.includes(key) || key.includes(lower)) return { ...val };
  }
  return { grams: 100, category: 'food' };
}

function tryDecompose(label: string, totalGrams: number): SegmentedComponent[] | null {
  const lower = label.toLowerCase();
  for (const rule of COMPOSITE_FOODS) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.components.map(c => {
        const lookup = lookupGrams(c.label);
        return {
          label: c.label,
          confidence: 0.75,
          grams: Math.round(totalGrams * c.gramsFraction),
          category: lookup.category,
          isHidden: false,
          source: 'inferred' as const,
        };
      });
    }
  }
  return null;
}

function inferHiddenItems(labels: string[]): SegmentedComponent[] {
  const hidden: SegmentedComponent[] = [];
  const lowerLabels = labels.map(l => l.toLowerCase());

  for (const rule of HIDDEN_ITEMS) {
    const triggered = rule.trigger.some(t => lowerLabels.some(l => l.includes(t)));
    if (triggered) {
      // Don't add if already detected
      const alreadyPresent = lowerLabels.some(l => l.includes(rule.hidden.label.toLowerCase()));
      if (!alreadyPresent) {
        hidden.push({
          label: rule.hidden.label,
          confidence: 0.45,
          grams: rule.hidden.grams,
          category: rule.hidden.category,
          isHidden: true,
          source: 'inferred',
        });
      }
    }
  }
  return hidden;
}

function detectMealType(components: SegmentedComponent[]): 'drink' | 'solid' | 'mixed' {
  const beverageWeight = components
    .filter(c => c.category === 'beverage' || c.category === 'dairy')
    .reduce((sum, c) => sum + c.grams, 0);
  const solidWeight = components
    .filter(c => !['beverage', 'dairy', 'zero'].includes(c.category))
    .reduce((sum, c) => sum + c.grams, 0);
  const total = beverageWeight + solidWeight;

  if (total === 0) return 'mixed';
  if (beverageWeight / total > 0.7) return 'drink';
  if (solidWeight / total > 0.7) return 'solid';
  return 'mixed';
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Enhanced food segmentation from AI scan results.
 *
 * Takes raw food items from the scanner and produces a detailed
 * component breakdown with gram estimates, categories, and hidden
 * item inference.
 *
 * @param scanResult — raw response from the scan-food edge function
 * @returns SegmentationResult with components and meal metadata
 */
export function smartSegmentFood(
  scanResult: { foods?: RawFoodItem[] } | null
): SegmentationResult {
  if (!scanResult?.foods || !Array.isArray(scanResult.foods)) {
    return { components: [], mealType: 'mixed', totalEstimatedGrams: 0 };
  }

  const components: SegmentedComponent[] = [];

  for (const food of scanResult.foods) {
    const label = food.name ?? 'Unknown';
    const confidence = normalizeConfidence(food.confidence);
    const lookup = lookupGrams(label);

    // Try to decompose composite foods (e.g. "latte" → espresso + milk + foam)
    const decomposed = tryDecompose(label, lookup.grams * 2.5);
    if (decomposed) {
      components.push(...decomposed);
    } else {
      components.push({
        label,
        confidence,
        grams: lookup.grams,
        category: lookup.category,
        isHidden: false,
        source: 'detected',
      });
    }
  }

  // Infer hidden items (sauces, dressings, etc.)
  const allLabels = components.map(c => c.label);
  const hidden = inferHiddenItems(allLabels);
  components.push(...hidden);

  const totalEstimatedGrams = components.reduce((sum, c) => sum + c.grams, 0);
  const mealType = detectMealType(components);

  return { components, mealType, totalEstimatedGrams };
}

/**
 * Convert segmented components to the format expected by ingredientParser/calculateNutrition.
 *
 * @returns Array of { name, grams } for ingredient mapping
 */
export function componentsToIngredientMap(
  components: SegmentedComponent[]
): { name: string; grams: number }[] {
  return components
    .filter(c => c.category !== 'zero') // exclude ice etc. from nutrition
    .map(c => ({ name: c.label, grams: c.grams }));
}

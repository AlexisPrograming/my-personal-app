/**
 * smartMealMemory.ts — Enhanced AI Meal Memory
 *
 * Stores user corrections to food predictions and biases future scans
 * toward the user's preferences. Uses fuzzy matching on prediction labels
 * and ingredient overlap for smarter recall.
 *
 * Storage: localStorage (web) / AsyncStorage (native).
 * Limited to 50 entries for performance.
 */

import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MealCorrectionEntry {
  originalPrediction: string;
  correctedFood: string;
  ingredients: string[];
  timestamp: number;
  count: number;
}

export interface MealSuggestion {
  food: string;
  ingredients: string[];
  confidenceBoost: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pulse_smart_meal_memory';
const MAX_ENTRIES = 50;

// Confidence boost scales with correction count
const BASE_BOOST = 0.1;
const MAX_BOOST = 0.3;
const BOOST_PER_COUNT = 0.05;

// Fuzzy match threshold (0-1), lower = more lenient
const FUZZY_THRESHOLD = 0.4;

// ─── Storage Layer ───────────────────────────────────────────────────────────

async function loadMemory(): Promise<MealCorrectionEntry[]> {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('react-native').AsyncStorage;
    if (!AsyncStorage) return [];
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    if (__DEV__) console.warn('[SmartMealMemory] loadMemory failed:', e);
    return [];
  }
}

async function persistMemory(entries: MealCorrectionEntry[]): Promise<void> {
  try {
    // Keep only the most recent MAX_ENTRIES
    const trimmed = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_ENTRIES);
    const data = JSON.stringify(trimmed);

    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, data);
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('react-native').AsyncStorage;
    if (AsyncStorage) await AsyncStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    if (__DEV__) console.warn('[SmartMealMemory] persistMemory failed:', e);
  }
}

// ─── Matching Utilities ──────────────────────────────────────────────────────

/**
 * Simple fuzzy similarity between two strings (0-1).
 * Uses token overlap rather than edit distance for speed.
 */
function similarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().trim().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().trim().split(/\s+/));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? overlap / union : 0;
}

/**
 * Check if prediction roughly matches a stored entry.
 * Matches on exact label, substring, or fuzzy token overlap.
 */
function isMatch(prediction: string, stored: string): boolean {
  const p = prediction.toLowerCase().trim();
  const s = stored.toLowerCase().trim();
  if (p === s) return true;
  if (p.includes(s) || s.includes(p)) return true;
  return similarity(p, s) >= FUZZY_THRESHOLD;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Save a meal correction when the user edits a detected food.
 *
 * @param prediction — the original AI prediction label
 * @param correctedFood — the user's corrected food name
 * @param ingredients — list of ingredient names in the correction
 */
export async function saveMealCorrection(
  prediction: string,
  correctedFood: string,
  ingredients: string[] = []
): Promise<void> {
  const entries = await loadMemory();
  const key = prediction.toLowerCase().trim();

  const existing = entries.find(
    e => e.originalPrediction.toLowerCase().trim() === key
  );

  if (existing) {
    existing.correctedFood = correctedFood;
    existing.ingredients = ingredients.length > 0 ? ingredients : existing.ingredients;
    existing.timestamp = Date.now();
    existing.count = existing.count + 1;
  } else {
    entries.push({
      originalPrediction: prediction,
      correctedFood,
      ingredients,
      timestamp: Date.now(),
      count: 1,
    });
  }

  await persistMemory(entries);
}

/**
 * Get meal suggestions based on past user corrections.
 *
 * @param prediction — current AI prediction label
 * @returns array of suggestions with confidence boosts, sorted by relevance
 */
export async function getMealSuggestions(
  prediction: string
): Promise<MealSuggestion[]> {
  const entries = await loadMemory();
  if (entries.length === 0) return [];

  const suggestions: MealSuggestion[] = [];

  for (const entry of entries) {
    if (!isMatch(prediction, entry.originalPrediction)) continue;

    // Scale boost by correction count
    const boost = Math.min(
      BASE_BOOST + (entry.count - 1) * BOOST_PER_COUNT,
      MAX_BOOST
    );

    suggestions.push({
      food: entry.correctedFood,
      ingredients: entry.ingredients,
      confidenceBoost: boost,
    });
  }

  // Sort by boost descending
  return suggestions.sort((a, b) => b.confidenceBoost - a.confidenceBoost);
}

/**
 * Apply meal memory suggestions to a list of predictions.
 * Boosts matched predictions and optionally inserts new ones.
 *
 * @param predictions — current prediction list
 * @returns enhanced predictions with memory-based adjustments
 */
export async function applySmartMemory(
  predictions: { name: string; confidence: number; [key: string]: unknown }[]
): Promise<{ name: string; confidence: number; corrected?: boolean; memorySuggestion?: boolean; [key: string]: unknown }[]> {
  const entries = await loadMemory();
  if (entries.length === 0) return predictions;

  const result = predictions.map(pred => {
    const matching = entries.find(e => isMatch(pred.name, e.originalPrediction));
    if (!matching || matching.count < 1) return pred;

    const boost = Math.min(
      BASE_BOOST + (matching.count - 1) * BOOST_PER_COUNT,
      MAX_BOOST
    );

    return {
      ...pred,
      name: matching.correctedFood,
      confidence: Math.min(pred.confidence + boost, 0.99),
      corrected: true,
    };
  });

  // Check for stored corrections that don't match any current prediction
  for (const entry of entries) {
    if (entry.count < 2) continue;
    const alreadyPresent = result.some(
      r => r.name.toLowerCase() === entry.correctedFood.toLowerCase()
    );
    if (alreadyPresent) continue;

    // Check if any current prediction is related
    const related = predictions.some(p => isMatch(p.name, entry.originalPrediction));
    if (related) {
      const boost = Math.min(BASE_BOOST + (entry.count - 1) * BOOST_PER_COUNT, MAX_BOOST);
      result.push({
        name: entry.correctedFood,
        confidence: 0.5 + boost,
        corrected: true,
        memorySuggestion: true,
        ingredients: entry.ingredients,
      });
    }
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Clear all smart meal memory.
 */
export async function clearSmartMemory(): Promise<void> {
  await persistMemory([]);
}

/**
 * Get memory stats for debugging/UI.
 */
export async function getMemoryStats(): Promise<{
  totalEntries: number;
  topCorrections: { original: string; corrected: string; count: number }[];
}> {
  const entries = await loadMemory();
  const sorted = [...entries].sort((a, b) => b.count - a.count).slice(0, 5);
  return {
    totalEntries: entries.length,
    topCorrections: sorted.map(e => ({
      original: e.originalPrediction,
      corrected: e.correctedFood,
      count: e.count,
    })),
  };
}

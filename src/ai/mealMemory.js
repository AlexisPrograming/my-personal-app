/**
 * mealMemory.js — AI Meal Memory
 *
 * Lightweight system that stores user corrections to food predictions.
 * Next time the AI detects a similar food, it auto-adjusts based on
 * the user's past preferences.
 *
 * Storage: AsyncStorage (native) or localStorage (web).
 */

import { Platform } from 'react-native';

const STORAGE_KEY = 'pulse_meal_memory';
const MAX_ENTRIES = 100;

/**
 * @typedef {Object} MealCorrection
 * @property {string} originalLabel  — what the AI detected
 * @property {string} correctedLabel — what the user changed it to
 * @property {Object} [ingredients]  — user's ingredient adjustments
 * @property {string} [portionId]    — user's preferred portion size
 * @property {number} timestamp      — when the correction was made
 * @property {number} count          — how many times this correction was made
 */

/** Read all corrections from storage */
async function loadMemory() {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }
    // Native: use AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('react-native').AsyncStorage;
    if (!AsyncStorage) return [];
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save corrections to storage */
async function saveMemory(corrections) {
  try {
    const data = JSON.stringify(corrections.slice(-MAX_ENTRIES));
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, data);
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
      ?? require('react-native').AsyncStorage;
    if (AsyncStorage) await AsyncStorage.setItem(STORAGE_KEY, data);
  } catch {
    // Silently fail — meal memory is not critical
  }
}

/**
 * Record a user correction.
 *
 * @param {string} originalLabel — AI's original detection
 * @param {string} correctedLabel — what the user corrected it to
 * @param {Object} [options]
 * @param {Object} [options.ingredients] — adjusted ingredient list
 * @param {string} [options.portionId] — preferred portion
 */
export async function recordCorrection(originalLabel, correctedLabel, options = {}) {
  const corrections = await loadMemory();
  const key = originalLabel.toLowerCase().trim();

  const existing = corrections.find(c => c.originalLabel.toLowerCase() === key);
  if (existing) {
    existing.correctedLabel = correctedLabel;
    existing.ingredients = options.ingredients ?? existing.ingredients;
    existing.portionId = options.portionId ?? existing.portionId;
    existing.timestamp = Date.now();
    existing.count = (existing.count || 1) + 1;
  } else {
    corrections.push({
      originalLabel,
      correctedLabel,
      ingredients: options.ingredients ?? null,
      portionId: options.portionId ?? null,
      timestamp: Date.now(),
      count: 1,
    });
  }

  await saveMemory(corrections);
}

/**
 * Look up past corrections for a detected food label.
 * Returns the correction if found, null otherwise.
 *
 * @param {string} label — AI-detected label
 * @returns {Promise<MealCorrection|null>}
 */
export async function lookupCorrection(label) {
  const corrections = await loadMemory();
  const key = label.toLowerCase().trim();
  return corrections.find(c => c.originalLabel.toLowerCase() === key) ?? null;
}

/**
 * Apply stored corrections to a list of predictions.
 * Boosts confidence of previously-corrected items and reorders.
 *
 * @param {Array<{ name: string, confidence: number }>} predictions
 * @returns {Promise<Array<{ name: string, confidence: number, corrected?: boolean }>>}
 */
export async function applyMemory(predictions) {
  const corrections = await loadMemory();
  if (!corrections.length) return predictions;

  return predictions.map(pred => {
    const correction = corrections.find(
      c => c.originalLabel.toLowerCase() === pred.name.toLowerCase()
    );
    if (correction && correction.count >= 2) {
      return {
        ...pred,
        name: correction.correctedLabel,
        confidence: Math.min(pred.confidence + 0.1, 0.99),
        corrected: true,
      };
    }
    return pred;
  });
}

/**
 * Clear all meal memory (for settings/privacy).
 */
export async function clearMemory() {
  await saveMemory([]);
}

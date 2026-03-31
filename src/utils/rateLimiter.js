// Client-side rate limiter for Supabase API calls.
// Uses a sliding-window counter per key stored in memory.
// Keys are typically per-action (e.g. 'auth:signIn', 'weight:log').

const _windows = new Map(); // key -> number[]  (timestamps of recent calls)

/**
 * Check whether a call is allowed under the rate limit.
 *
 * @param {string} key      - Identifier for the action (e.g. 'auth:signIn')
 * @param {number} maxCalls - Max calls allowed in the window
 * @param {number} windowMs - Rolling window duration in milliseconds
 * @returns {{ allowed: boolean, retryAfterMs: number }}
 */
export function checkRateLimit(key, maxCalls, windowMs) {
  const now = Date.now();
  const timestamps = (_windows.get(key) || []).filter(t => now - t < windowMs);

  if (timestamps.length >= maxCalls) {
    const oldest = timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, retryAfterMs: Math.ceil(retryAfterMs / 1000) };
  }

  timestamps.push(now);
  _windows.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Show a platform-appropriate "rate limit exceeded" alert.
 *
 * @param {number} retryAfterSecs
 * @param {string} [action]
 */
export function showRateLimitAlert(retryAfterSecs, action = 'this action') {
  const msg = `Too many attempts. Please wait ${retryAfterSecs}s before trying ${action} again.`;
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(msg);
  } else {
    // Lazy import to avoid issues in non-RN contexts
    const { Alert } = require('react-native');
    Alert.alert('Slow down', msg);
  }
}

// Pre-configured rate limit profiles used across the app.
export const LIMITS = {
  // Auth: max 10 attempts per 2 min
  authSubmit:   { maxCalls: 10, windowMs: 120_000 },
  // Profile setup save: max 3 saves per 30 s
  profileSave:  { maxCalls: 3,  windowMs: 30_000 },
  // Weight log: max 5 entries per 60 s
  weightLog:    { maxCalls: 5,  windowMs: 60_000 },
  // Exercise set log: max 30 sets per 60 s
  setLog:       { maxCalls: 30, windowMs: 60_000 },
  // Food log: max 20 entries per 60 s
  foodLog:      { maxCalls: 20, windowMs: 60_000 },
  // Water update: max 20 per 60 s
  waterUpdate:  { maxCalls: 20, windowMs: 60_000 },
  // AI food scan: max 20 per hour (mirrors server-side limit)
  aiScan:       { maxCalls: 20, windowMs: 60 * 60_000 },
};

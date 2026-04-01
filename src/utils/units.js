/**
 * units.js — Unit conversion utilities
 *
 * DB always stores metric (kg, cm, km, ml).
 * Display converts based on lang: en → imperial, es → metric.
 */

// ─── System detection ───────────────────────────────────────────────────────

/** Returns true if the language uses imperial units */
export const isImperial = (lang) => lang === 'en';

// ─── Weight (body & training) ───────────────────────────────────────────────

const KG_TO_LBS = 2.20462;

/** kg → lbs */
export const kgToLbs = (kg) => Math.round(kg * KG_TO_LBS * 10) / 10;

/** lbs → kg */
export const lbsToKg = (lbs) => Math.round(lbs / KG_TO_LBS * 10) / 10;

/** Display weight with unit label */
export const fmtWeight = (kg, lang) =>
  isImperial(lang) ? `${kgToLbs(kg)} lbs` : `${kg} kg`;

/** Display weight value only (no label) */
export const fmtWeightVal = (kg, lang) =>
  isImperial(lang) ? `${kgToLbs(kg)}` : `${kg}`;

/** Convert user input to kg for storage */
export const inputToKg = (value, lang) =>
  isImperial(lang) ? lbsToKg(Number(value)) : Number(value);

/** Convert kg from DB to display value */
export const kgToDisplay = (kg, lang) =>
  isImperial(lang) ? kgToLbs(kg) : kg;

/** Weight unit label */
export const weightUnit = (lang) => isImperial(lang) ? 'lbs' : 'kg';

/** Validation range for body weight input (in display units) */
export const bodyWeightRange = (lang) =>
  isImperial(lang) ? { min: 22, max: 1100 } : { min: 10, max: 500 };

// ─── Height ─────────────────────────────────────────────────────────────────

const CM_PER_INCH = 2.54;

/** cm → { ft, in } */
export const cmToFtIn = (cm) => {
  const totalIn = cm / CM_PER_INCH;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return { ft, in: inches === 12 ? 0 : inches, ftAdjusted: inches === 12 ? ft + 1 : ft };
};

/** ft + in → cm */
export const ftInToCm = (ft, inches) => Math.round((ft * 12 + inches) * CM_PER_INCH);

/** Display height */
export const fmtHeight = (cm, lang) => {
  if (!cm) return '—';
  if (isImperial(lang)) {
    const { ftAdjusted, in: inches } = cmToFtIn(cm);
    return `${ftAdjusted}'${inches}"`;
  }
  return `${cm} cm`;
};

/** Height unit label */
export const heightUnit = (lang) => isImperial(lang) ? 'ft / in' : 'cm';

/** Validation range for height input in cm (always stored as cm) */
export const heightRange = () => ({ min: 50, max: 300 });

// ─── Distance (cardio) ─────────────────────────────────────────────────────

const KM_TO_MI = 0.621371;

/** km → mi */
export const kmToMi = (km) => Math.round(km * KM_TO_MI * 100) / 100;

/** mi → km */
export const miToKm = (mi) => Math.round(mi / KM_TO_MI * 100) / 100;

/** Display distance */
export const fmtDist = (km, lang) =>
  isImperial(lang) ? `${kmToMi(km)} mi` : `${km} km`;

/** Convert user distance input to km for storage */
export const inputToKm = (value, lang) =>
  isImperial(lang) ? miToKm(Number(value)) : Number(value);

/** Convert km from DB to display value */
export const kmToDisplay = (km, lang) =>
  isImperial(lang) ? kmToMi(km) : km;

/** Distance unit label */
export const distUnit = (lang) => isImperial(lang) ? 'mi' : 'km';

/** Pace label */
export const paceUnit = (lang) => isImperial(lang) ? 'min/mi' : 'min/km';

/** Format pace */
export const fmtPace = (km, min, lang) => {
  if (!km || !min || km <= 0 || min <= 0) return '';
  if (isImperial(lang)) {
    const mi = kmToMi(km);
    return `${(min / mi).toFixed(1)} min/mi`;
  }
  return `${(min / km).toFixed(1)} min/km`;
};

// ─── Water ──────────────────────────────────────────────────────────────────

const ML_PER_OZ = 29.5735;

/** ml → fl oz */
export const mlToOz = (ml) => Math.round(ml / ML_PER_OZ);

/** fl oz → ml */
export const ozToMl = (oz) => Math.round(oz * ML_PER_OZ);

/** Display water */
export const fmtWater = (ml, lang) =>
  isImperial(lang) ? `${mlToOz(ml)} oz` : `${ml} ml`;

/** Water unit label */
export const waterUnit = (lang) => isImperial(lang) ? 'oz' : 'ml';

/** Convert user water input to ml for storage */
export const inputToMl = (value, lang) =>
  isImperial(lang) ? ozToMl(Number(value)) : Number(value);

/** Convert ml from DB to display value */
export const mlToDisplay = (ml, lang) =>
  isImperial(lang) ? mlToOz(ml) : ml;

/** Water quick-add amounts (in display units) */
export const waterQuickAmounts = (lang) =>
  isImperial(lang) ? [8, 12, 16] : [250, 350, 500];

/** Default water target in ml */
export const defaultWaterTarget = (lang) =>
  isImperial(lang) ? 2840 : 2500; // ~96 oz ≈ 2840 ml

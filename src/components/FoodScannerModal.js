/**
 * FoodScannerModal — AI food scanner using Claude Vision.
 *
 * Requires:
 *   npx expo install expo-image-picker expo-image-manipulator
 *
 * Props:
 *   visible      {boolean}
 *   onClose      {() => void}
 *   onAddFood    {(food) => void}  — same signature as existing handleAddFood
 *   meal         {string}          — 'breakfast' | 'lunch' | 'dinner' | 'snacks'
 *   lang         {string}          — 'en' | 'es'
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Image, Alert,
  Platform, Animated, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../supabaseConfig';
import { segmentFood, generatePredictions } from '../scanner/segmentFood';
import { parseIngredients } from '../scanner/ingredientParser';
import { estimatePortion, PORTION_SIZES } from '../scanner/portionEstimator';
import { estimateSmartPortion, formatPortionEstimate } from '../scanner/smartPortionEstimator';
import { classifyFoodType } from '../scanner/foodTypeClassifier';
import { filterByConfidence, composeDish } from '../scanner/dishComposer';
import { estimateWeights } from '../scanner/weightEstimator';
import { detectPlate } from '../scanner/plateDetector';
import { estimateFoodCoverage } from '../scanner/foodAreaEstimator';
import { calculatePortionMultiplier } from '../scanner/portionMultiplier';
import { smartSegmentFood } from '../scanner/smartSegmentFood';
import { calculateNutrition, getMacroPercentages } from '../nutrition/calculateNutrition';
import { recordCorrection, applyMemory, lookupCorrection } from '../ai/mealMemory';
import { saveMealCorrection, applySmartMemory } from '../ai/smartMealMemory';
import { checkRateLimit, showRateLimitAlert, LIMITS } from '../utils/rateLimiter';
import IngredientEditor from './IngredientEditor';
import NutritionPreview from './NutritionPreview';
import PortionSelector from './PortionSelector';

// ─── Theme (mirrors App.js) ───────────────────────────────────────────────────
const C = {
  bg:           '#06060F',
  surface:      '#0D0D1F',
  card:         '#12122A',
  elevated:     '#1A1A35',
  border:       'rgba(139,92,246,0.18)',
  borderBright: 'rgba(139,92,246,0.45)',
  purple:       '#9D6FFF',
  purpleD:      '#7C3AED',
  green:        '#10B981',
  amber:        '#FBBF24',
  red:          '#F87171',
  cyan:         '#22D3EE',
  text:         '#F0EEFF',
  muted:        '#9B93B8',
  dim:          '#4B4570',
};

// ─── Strings ──────────────────────────────────────────────────────────────────
const T = {
  en: {
    title:        'AI Food Scanner',
    takePhoto:    '📷 Take Photo',
    chooseGallery:'🖼 Choose from Gallery',
    changePhoto:  'Change Photo',
    scan:         '🔍 Scan Food',
    addToMeal:    'Add to',
    cancel:       'Cancel',
    confidence:   { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' },
    lowWarn:      "I'm not sure about this food — verify macros before adding.",
    amountLabel:  'Amount',
    quickAmounts: ['2oz', '4oz', '6oz', '8oz'],
    macros:       { cal: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat', fiber: 'Fiber' },
    units:        ['oz', 'lb', 'g', 'kg'],
    loading:      ['Identifying the food…', 'Analyzing macros…', 'Almost there…'],
    errSize:      'Image must be under 10 MB.',
    errType:      'Only JPG, PNG or WEBP allowed.',
    errGeneric:   'Could not scan the food. Please try again.',
  },
  es: {
    title:        'Escáner de Comida IA',
    takePhoto:    '📷 Tomar Foto',
    chooseGallery:'🖼 Elegir de Galería',
    changePhoto:  'Cambiar Foto',
    scan:         '🔍 Escanear Comida',
    addToMeal:    'Agregar a',
    cancel:       'Cancelar',
    confidence:   { high: 'Alta confianza', medium: 'Confianza media', low: 'Baja confianza' },
    lowWarn:      'No estoy seguro de este alimento, verifica los macros antes de agregar.',
    amountLabel:  'Cantidad',
    quickAmounts: ['50g', '100g', '150g', '200g'],
    macros:       { cal: 'Calorías', p: 'Proteína', c: 'Carbos', f: 'Grasas', fiber: 'Fibra' },
    units:        ['g', 'kg', 'oz', 'lb'],
    loading:      ['Identificando la comida…', 'Analizando macros…', 'Casi listo…'],
    errSize:      'La imagen debe pesar menos de 10 MB.',
    errType:      'Solo se permiten JPG, PNG o WEBP.',
    errGeneric:   'No se pudo escanear. Intenta de nuevo.',
  },
};

// ─── Unit conversions to grams ────────────────────────────────────────────────
const TO_GRAMS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };

function calcMacros(per100g, amountStr, unit) {
  const raw   = parseFloat(amountStr);
  if (!raw || raw <= 0) return { cal: 0, p: 0, c: 0, f: 0, fiber: 0 };
  const grams = raw * (TO_GRAMS[unit] ?? 1);
  const ratio = grams / 100;
  return {
    cal:   Math.round(per100g.calories * ratio),
    p:     Math.round(per100g.protein  * ratio * 10) / 10,
    c:     Math.round(per100g.carbs    * ratio * 10) / 10,
    f:     Math.round(per100g.fat      * ratio * 10) / 10,
    fiber: Math.round(per100g.fiber    * ratio * 10) / 10,
  };
}

function toGrams(amountStr, unit) {
  const raw = parseFloat(amountStr);
  if (!raw || raw <= 0) return 0;
  return Math.round(raw * (TO_GRAMS[unit] ?? 1) * 10) / 10;
}

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ level, lang }) {
  const tr = T[lang] ?? T.es;
  const colors = { high: C.green, medium: C.amber, low: C.red };
  return (
    <View style={[styles.badge, { borderColor: colors[level] ?? C.dim }]}>
      <Text style={{ color: colors[level] ?? C.muted, fontSize: 11, fontWeight: '700' }}>
        {tr.confidence[level] ?? level}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function FoodScannerModal({ visible, onClose, onAddFood, meal = 'lunch', lang = 'es' }) {
  const tr = T[lang] ?? T.es;

  const [step,        setStep]        = useState('idle');   // idle | preview | scanning | result
  const [imageUri,    setImageUri]    = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mediaType,   setMediaType]   = useState('image/jpeg');
  const [result,      setResult]      = useState(null);   // { foods: [...] }
  const [selections,  setSelections]  = useState([]);     // [{ amount, unit, selected }]
  const [loadingIdx,  setLoadingIdx]  = useState(0);
  const [error,       setError]       = useState('');

  // ── V2: Enhanced nutrition state ──
  const [ingredients,   setIngredients]   = useState([]);    // ParsedIngredient[]
  const [predictions,   setPredictions]   = useState([]);    // [{ name, confidence, ingredients }]
  const [activePredIdx, setActivePredIdx] = useState(0);     // which prediction is active
  const [portionId,     setPortionId]     = useState('medium');
  const [portionMl,     setPortionMl]     = useState(350);
  const [foodType,      setFoodType]      = useState('liquid');
  const [dishInfo,      setDishInfo]      = useState(null);
  const [plateInfo,     setPlateInfo]     = useState(null);
  const [smartEstimate, setSmartEstimate] = useState(null);   // PortionEstimate from smart estimator
  const [segmentation,  setSegmentation]  = useState(null);   // SegmentationResult from smart segmenter

  const loadingTimer = useRef(null);
  const spinAnim     = useRef(new Animated.Value(0)).current;

  // ── Real-time nutrition calculation ──
  const nutritionItems = useMemo(() =>
    ingredients.map(ing => ({
      ingredient: ing,
      quantity: ing.defaultQty,
    })),
    [ingredients]
  );

  // Rotate loading messages
  useEffect(() => {
    if (step === 'scanning') {
      loadingTimer.current = setInterval(() => {
        setLoadingIdx(i => (i + 1) % tr.loading.length);
      }, 1500);
      Animated.loop(Animated.timing(spinAnim, {
        toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web',
      })).start();
    } else {
      clearInterval(loadingTimer.current);
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
    return () => clearInterval(loadingTimer.current);
  }, [step]);

  const reset = useCallback(() => {
    setStep('idle');
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
    setSelections([]);
    setIngredients([]);
    setPredictions([]);
    setActivePredIdx(0);
    setPortionId('medium');
    setPortionMl(350);
    setFoodType('liquid');
    setDishInfo(null);
    setPlateInfo(null);
    setSmartEstimate(null);
    setSegmentation(null);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickImage = async (source) => {
    setError('');
    try {
      let pickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Permite el acceso a la cámara en Ajustes.');
          return;
        }
        pickerResult = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality:    1,
          base64:     false,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Permite el acceso a la galería en Ajustes.');
          return;
        }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality:    1,
          base64:     false,
        });
      }

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];

      // Validate type
      const ext = (asset.uri.split('.').pop() ?? '').toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mime    = mimeMap[ext] ?? (asset.mimeType?.startsWith('image/') ? asset.mimeType : null);
      if (!mime) { setError(tr.errType); return; }

      // Validate size (10 MB)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        setError(tr.errSize); return;
      }

      setImageUri(asset.uri);
      setMediaType(mime);
      setStep('preview');
    } catch (e) {
      if (__DEV__) console.warn('[FoodScanner] pickImage error', e);
      setError(tr.errGeneric);
    }
  };

  // ── Compress & encode ───────────────────────────────────────────────────────
  const compressAndEncode = async (uri) => {
    // Resize to 1024px, 70% quality. base64:true works on web (canvas) and native.
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    if (manipulated.base64) {
      return { base64: manipulated.base64, mediaType: 'image/jpeg' };
    }

    // Native fallback: lazy-require FileSystem so it never loads on web
    if (Platform.OS !== 'web') {
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return { base64, mediaType: 'image/jpeg' };
    }

    throw new Error('No se pudo codificar la imagen.');
  };

  // ── Scan ────────────────────────────────────────────────────────────────────
  const scan = async () => {
    if (!imageUri) return;

    // Client-side rate limit (mirrors server-side)
    const rl = checkRateLimit('aiScan', LIMITS.aiScan.maxCalls, LIMITS.aiScan.windowMs);
    if (!rl.allowed) {
      showRateLimitAlert(rl.retryAfterMs, lang === 'es' ? 'escanear' : 'scanning');
      return;
    }

    setError('');
    setStep('scanning');
    setLoadingIdx(0);

    try {
      // Step 1: compress image
      let base64, mt;
      try {
        ({ base64, mediaType: mt } = await compressAndEncode(imageUri));
      } catch (e) {
        if (__DEV__) console.warn('[FoodScanner] compress error', e);
        setError(lang === 'es' ? 'Error al procesar la imagen.' : 'Error processing image.');
        setStep('preview');
        return;
      }

      // Step 2: validate session server-side and call Edge Function
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authUser) {
        setError(lang === 'es' ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Session expired. Please log in again.');
        setStep('preview');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(lang === 'es' ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Session expired. Please log in again.');
        setStep('preview');
        return;
      }

      let data, fnError;
      try {
        ({ data, error: fnError } = await supabase.functions.invoke('scan-food', {
          body: { imageBase64: base64, mediaType: mt, lang },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }));
      } catch (e) {
        if (__DEV__) console.warn('[FoodScanner] fetch error', e);
        setError(lang === 'es' ? 'Error de red. Verifica tu conexión.' : 'Network error. Check your connection.');
        setStep('preview');
        return;
      }

      if (fnError) {
        setError(fnError.message ?? tr.errGeneric);
        setStep('preview');
        return;
      }

      // Normalize: support both { foods: [...] } and legacy single-food format
      const normalized = Array.isArray(data.foods)
        ? data
        : { foods: [{ name: data.name, confidence: data.confidence, per100g: data.per100g, note: data.note }] };
      setResult(normalized);
      setImageBase64(base64);
      const defaultUnit = lang === 'en' ? 'oz' : 'g';
      const defaultAmt  = lang === 'en' ? '4' : '100';
      setSelections(normalized.foods.map(() => ({ amount: defaultAmt, unit: defaultUnit, selected: true })));

      // V2: Run segmentation → ingredients → portion estimation → predictions
      const rawDetected = segmentFood(normalized);

      // V2.5: Filter out low-confidence detections (< 0.55)
      const detected = filterByConfidence(rawDetected);

      // V3: Enhanced smart segmentation for multi-component detection
      const smartSeg = smartSegmentFood(normalized);
      setSegmentation(smartSeg);

      // Merge smart segmentation gram estimates into parsed ingredients
      const parsed = parseIngredients(detected);
      if (smartSeg.components.length > 0) {
        const gramMap = {};
        for (const comp of smartSeg.components) {
          gramMap[comp.label.toLowerCase()] = comp.grams;
        }
        for (const ing of parsed) {
          const override = gramMap[ing.name.toLowerCase()];
          if (override !== undefined) ing.defaultQty = override;
        }
        // Add inferred hidden items not already in parsed list
        for (const comp of smartSeg.components.filter(c => c.isHidden)) {
          const alreadyParsed = parsed.some(p =>
            p.name.toLowerCase() === comp.label.toLowerCase()
          );
          if (!alreadyParsed) {
            const hiddenDetected = [{
              label: comp.label,
              confidence: comp.confidence,
              level: 'low',
              per100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
              note: '',
              container: null,
            }];
            const hiddenParsed = parseIngredients(hiddenDetected);
            if (hiddenParsed.length > 0) {
              hiddenParsed[0].defaultQty = comp.grams;
              hiddenParsed[0].enabled = false; // hidden items start disabled
              parsed.push(hiddenParsed[0]);
            }
          }
        }
      }
      // Compose dish from detected ingredients
      const composition = composeDish(detected);
      setDishInfo(composition);

      // Plate detection → food coverage → portion multiplier → weight estimation
      const plate = detectPlate(detected);
      const coverage = estimateFoodCoverage(detected);
      const { multiplier } = plate.plateDetected
        ? calculatePortionMultiplier(plate.plateSize, coverage.foodCoverage)
        : { multiplier: 1.0 };
      setPlateInfo({ ...plate, coverage: coverage.foodCoverage, multiplier });

      const container = detected.find(d => d.container)?.container ?? null;
      const weights = estimateWeights(parsed, multiplier);

      // Apply weight estimates to ingredients (prefer smart segmentation, then weight estimator)
      for (let i = 0; i < parsed.length; i++) {
        const weightEst = weights[i];
        if (weightEst && parsed[i].unit === 'g') {
          // Only override if no smart segmentation override was already applied
          const hasSmartOverride = smartSeg.components.some(
            c => c.label.toLowerCase() === parsed[i].name.toLowerCase()
          );
          if (!hasSmartOverride) {
            parsed[i].defaultQty = weightEst.estimatedGrams;
          }
        }
      }

      setIngredients(parsed);

      // Classify food type from parsed ingredients
      const { type: detectedFoodType } = classifyFoodType(parsed);
      setFoodType(detectedFoodType);

      // Smart portion estimation from detected objects
      const smartEst = estimateSmartPortion(detected, detectedFoodType);
      setSmartEstimate(smartEst);

      // Use smart estimate to drive portion selection
      const portion = estimatePortion(container, parsed, detectedFoodType);

      // Prefer smart estimate when it has reasonable confidence
      const useSmartVolume = smartEst.confidence > 0.3;
      const effectivePortionId = useSmartVolume ? smartEst.suggestedSize : portion.portionId;
      const effectiveValue = useSmartVolume
        ? smartEst.estimatedVolume
        : (detectedFoodType === 'liquid' ? portion.totalMl : portion.totalGrams);

      setPortionId(effectivePortionId);
      setPortionMl(effectiveValue);

      // Scale ingredient quantities based on estimated portion
      const portionData = PORTION_SIZES.find(p => p.id === effectivePortionId);
      if (portionData) {
        const baseRef = detectedFoodType === 'liquid' ? 350 : 300;
        setIngredients(prev => prev.map(ing => ({
          ...ing,
          defaultQty: ing.unit === 'ml'
            ? Math.round(effectiveValue * (ing.defaultQty / baseRef))
            : ing.defaultQty,
        })));
      }

      // Generate meal-level predictions and apply meal memory
      let preds = generatePredictions(detected);
      try { preds = await applyMemory(preds); } catch { /* non-critical */ }
      try { preds = await applySmartMemory(preds); } catch { /* non-critical */ }
      setPredictions(preds);
      setActivePredIdx(0);

      setStep('result');
    } catch (e) {
      if (__DEV__) console.warn('[FoodScanner] unexpected error', e);
      setError(e?.message ?? tr.errGeneric);
      setStep('preview');
    }
  };

  // ── Add to log (V2: ingredient-based) ───────────────────────────────────────
  const handleAdd = () => {
    const now = Date.now();
    const enabledIngredients = ingredients.filter(ing => ing.enabled && ing.defaultQty > 0);

    if (enabledIngredients.length === 0 && result?.foods) {
      // Fallback: use legacy per-food approach if no ingredients
      result.foods.forEach((food, i) => {
        const sel = selections[i];
        if (!sel?.selected || !(parseFloat(sel.amount) > 0)) return;
        const macros = calcMacros(food.per100g, sel.amount, sel.unit);
        const grams  = toGrams(sel.amount, sel.unit);
        onAddFood({
          id:    `scan_${now}_${i}`,
          name:  food.name,
          cal:   macros.cal,
          p:     macros.p,
          c:     macros.c,
          f:     macros.f,
          unit:  `${grams}g`,
          meal,
          logId: String(now + i),
        });
      });
    } else {
      // V2: Calculate from ingredients
      const nutrition = calculateNutrition(
        enabledIngredients.map(ing => ({ ingredient: ing, quantity: ing.defaultQty }))
      );
      const mealName = predictions[activePredIdx]?.name
        ?? (dishInfo && lang === 'es' ? dishInfo.dishEs : dishInfo?.dish)
        ?? enabledIngredients.map(i => i.name).join(' + ');

      onAddFood({
        id:    `scan_${now}_0`,
        name:  mealName,
        cal:   nutrition.calories,
        p:     nutrition.protein,
        c:     nutrition.carbs,
        f:     nutrition.fat,
        unit:  `${portionMl}${foodType === 'liquid' ? 'ml' : 'g'}`,
        meal,
        logId: String(now),
      });

      // Record to meal memory if user changed the prediction
      if (result?.foods?.[0]?.name && predictions[activePredIdx]?.name) {
        const original = result.foods[0].name;
        const chosen = predictions[activePredIdx].name;
        if (original.toLowerCase() !== chosen.toLowerCase()) {
          const ingredientNames = enabledIngredients.map(i => i.name);
          recordCorrection(original, chosen, { portionId }).catch(() => {});
          saveMealCorrection(original, chosen, ingredientNames).catch(() => {});
        }
      }
    }

    reset();
    onClose();
  };

  const toggleSelected = (i) =>
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s));

  const updateSelection = (i, patch) =>
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // ── V2: Ingredient editor callbacks ──
  const handleIngredientUpdate = useCallback((idx, patch) => {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, ...patch } : ing));
  }, []);

  const handleIngredientToggle = useCallback((idx) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === idx ? { ...ing, enabled: !ing.enabled } : ing
    ));
  }, []);

  const handleIngredientAdd = useCallback((ingredient) => {
    setIngredients(prev => [...prev, ingredient]);
  }, []);

  const handleIngredientRemove = useCallback((idx) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handlePortionSelect = useCallback((id, ml) => {
    setPortionId(id);
    setPortionMl(ml);
    // Scale liquid ingredients proportionally
    setIngredients(prev => prev.map(ing => {
      if (ing.unit === 'ml') {
        const ratio = ml / portionMl;
        return { ...ing, defaultQty: Math.round(ing.defaultQty * ratio) };
      }
      return ing;
    }));
  }, [portionMl]);

  const spinStyle = {
    transform: [{
      rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    }],
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{tr.title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={{ color: C.muted, fontSize: 22, lineHeight: 24 }}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── IDLE: pick source ── */}
          {step === 'idle' && (
            <View style={styles.section}>
              <Text style={styles.hint}>
                {lang === 'es'
                  ? 'Toma una foto de tu comida o elige una de la galería'
                  : 'Take a photo of your food or choose one from your gallery'}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => pickImage('camera')}>
                <Text style={styles.primaryBtnText}>{tr.takePhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.elevated, marginTop: 10 }]} onPress={() => pickImage('gallery')}>
                <Text style={[styles.primaryBtnText, { color: C.purple }]}>{tr.chooseGallery}</Text>
              </TouchableOpacity>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {/* ── PREVIEW: image picked, ready to scan ── */}
          {(step === 'preview') && (
            <View style={styles.section}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity style={styles.primaryBtn} onPress={scan}>
                <Text style={styles.primaryBtnText}>{tr.scan}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setStep('idle'); setImageUri(null); setError(''); }}>
                <Text style={styles.ghostBtnText}>{tr.changePhoto}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SCANNING: spinner ── */}
          {step === 'scanning' && (
            <View style={[styles.section, { alignItems: 'center', paddingVertical: 48 }]}>
              <Animated.View style={[styles.spinner, spinStyle]} />
              <Text style={styles.loadingText}>{tr.loading[loadingIdx]}</Text>
            </View>
          )}

          {/* ── RESULT: V2 Enhanced Flow ── */}
          {step === 'result' && result?.foods && (
            <View style={styles.section}>

              {/* 1. TOP PREDICTIONS — switchable */}
              {predictions.length > 1 && (
                <View style={{ gap: 6, marginBottom: 4 }}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'es' ? 'Predicciones' : 'Predictions'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {predictions.map((pred, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.predChip, idx === activePredIdx && styles.predChipActive]}
                        onPress={() => setActivePredIdx(idx)}
                      >
                        <Text style={[styles.predText, idx === activePredIdx && { color: '#fff' }]}>
                          {pred.name}
                        </Text>
                        <Text style={styles.predConf}>
                          {Math.round(pred.confidence * 100)}%
                        </Text>
                        {pred.corrected && (
                          <Text style={{ color: C.green, fontSize: 9 }}>★</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 2. DETECTED FOODS (original cards, collapsed) */}
              <Text style={styles.sectionTitle}>
                {result.foods.length === 1
                  ? (lang === 'es' ? '1 alimento detectado' : '1 food detected')
                  : (lang === 'es' ? `${result.foods.length} alimentos detectados` : `${result.foods.length} foods detected`)}
              </Text>

              {/* 1.5 DISH COMPOSITION */}
              {dishInfo && (
                <View style={styles.dishBox}>
                  <Text style={styles.dishLabel}>
                    {lang === 'es' ? 'Plato detectado' : 'Detected Dish'}
                  </Text>
                  <Text style={styles.dishName}>
                    {lang === 'es' ? dishInfo.dishEs : dishInfo.dish}
                  </Text>
                  {plateInfo && plateInfo.plateDetected && (
                    <View style={styles.plateMetaRow}>
                      <Text style={styles.plateMeta}>
                        {lang === 'es' ? 'Plato' : 'Plate'}: {plateInfo.plateSize}
                      </Text>
                      <Text style={styles.plateMeta}>
                        {lang === 'es' ? 'Cobertura' : 'Coverage'}: {Math.round(plateInfo.coverage * 100)}%
                      </Text>
                      <Text style={styles.plateMeta}>
                        {plateInfo.multiplier}x
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {result.foods.map((food, i) => {
                const sel = selections[i] ?? { amount: lang === 'en' ? '4' : '100', unit: lang === 'en' ? 'oz' : 'g', selected: true };
                return (
                  <View key={i} style={[styles.foodCard, { paddingVertical: 10 }]}>
                    <TouchableOpacity onPress={() => toggleSelected(i)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.checkbox, sel.selected && styles.checkboxActive]}>
                        {sel.selected && <Text style={{ color: '#fff', fontSize: 10, lineHeight: 14 }}>✓</Text>}
                      </View>
                      <Text style={[styles.foodName, { fontSize: 16 }]} numberOfLines={1}>{food.name}</Text>
                      <ConfidenceBadge level={food.confidence} lang={lang} />
                    </TouchableOpacity>
                    {food.note ? <Text style={[styles.noteText, { marginTop: 4 }]}>{food.note}</Text> : null}
                    {food.confidence === 'low' && (
                      <View style={[styles.warnBox, { marginTop: 6 }]}>
                        <Text style={{ color: C.amber, fontSize: 12 }}>⚠️ {tr.lowWarn}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* 2.5 SEGMENTATION SUMMARY */}
              {segmentation && segmentation.components.length > 0 && (
                <View style={styles.segmentationBox}>
                  <Text style={styles.sectionTitle}>
                    {lang === 'es' ? 'Componentes detectados' : 'Detected components'}
                  </Text>
                  <Text style={styles.segmentationMeta}>
                    {lang === 'es' ? 'Tipo' : 'Type'}: {segmentation.mealType}
                    {'  |  '}~{segmentation.totalEstimatedGrams}g {lang === 'es' ? 'total' : 'total'}
                  </Text>
                  {segmentation.components.map((comp, idx) => (
                    <View key={idx} style={styles.segmentRow}>
                      <Text style={[styles.segmentCheck, !comp.isHidden && { color: C.green }]}>
                        {comp.isHidden ? '?' : '✓'}
                      </Text>
                      <Text style={styles.segmentLabel}>{comp.label}</Text>
                      <Text style={styles.segmentGrams}>~{comp.grams}g</Text>
                      {comp.source === 'inferred' && (
                        <Text style={styles.segmentInferred}>
                          {lang === 'es' ? 'inferido' : 'inferred'}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 3. INGREDIENT EDITOR */}
              {ingredients.length > 0 && (
                <IngredientEditor
                  ingredients={ingredients}
                  onUpdate={handleIngredientUpdate}
                  onToggle={handleIngredientToggle}
                  onAdd={handleIngredientAdd}
                  onRemove={handleIngredientRemove}
                  lang={lang}
                />
              )}

              {/* 4. SMART PORTION ESTIMATE + SELECTOR */}
              {smartEstimate && smartEstimate.confidence > 0 && (
                <View style={styles.smartEstimateBox}>
                  <Text style={styles.smartEstimateText}>
                    {formatPortionEstimate(smartEstimate, lang)}
                  </Text>
                  {smartEstimate.container !== 'unknown' && (
                    <Text style={styles.smartEstimateDetail}>
                      {lang === 'es' ? 'Contenedor' : 'Container'}: {smartEstimate.container}
                      {'  '}({Math.round(smartEstimate.confidence * 100)}%)
                    </Text>
                  )}
                </View>
              )}
              <PortionSelector
                selectedId={portionId}
                customMl={portionMl}
                onSelect={handlePortionSelect}
                lang={lang}
                foodType={foodType}
              />

              {/* 5. LIVE NUTRITION PREVIEW */}
              <NutritionPreview items={nutritionItems} lang={lang} />

              {/* 6. CONFIRM CTA */}
              {(() => {
                const hasIngredients = ingredients.some(i => i.enabled && i.defaultQty > 0);
                const hasSelections = selections.some(s => s.selected && parseFloat(s.amount) > 0);
                const canAdd = hasIngredients || hasSelections;
                return (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 8, opacity: canAdd ? 1 : 0.4 }]}
                    onPress={handleAdd}
                    disabled={!canAdd}
                  >
                    <Text style={styles.primaryBtnText}>
                      {tr.addToMeal} {meal}
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setStep('idle'); setImageUri(null); setResult(null); setSelections([]); setIngredients([]); setPredictions([]); setSmartEstimate(null); setSegmentation(null); }}>
                <Text style={styles.ghostBtnText}>{lang === 'es' ? '↩ Escanear otra' : '↩ Scan another'}</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 16 : 20, paddingBottom: 12,
                  borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:  { color: C.text, fontSize: 18, fontWeight: '800' },
  closeBtn:     { padding: 4 },
  scroll:       { padding: 20, paddingBottom: 60 },
  section:      { gap: 12 },
  hint:         { color: C.muted, fontSize: 14, textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  preview:      { width: '100%', height: 240, borderRadius: 16, backgroundColor: C.card },
  primaryBtn:   { backgroundColor: C.purple, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '800', fontSize: 15 },
  ghostBtn:     { borderRadius: 14, paddingVertical: 12, alignItems: 'center',
                  borderWidth: 1, borderColor: C.border },
  ghostBtnText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  errorText:    { color: C.red, fontSize: 13, textAlign: 'center' },
  spinner:      { width: 44, height: 44, borderRadius: 22, borderWidth: 3,
                  borderColor: C.purple, borderTopColor: 'transparent', marginBottom: 16 },
  loadingText:  { color: C.muted, fontSize: 14 },
  foodName:     { color: C.text, fontSize: 20, fontWeight: '800', flex: 1 },
  badge:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  noteText:     { color: C.muted, fontSize: 12, fontStyle: 'italic' },
  warnBox:      { backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 10,
                  borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', padding: 10 },
  label:        { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput:  { backgroundColor: C.card, color: C.text, fontSize: 24, fontWeight: '700',
                  borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border,
                  minWidth: 90, textAlign: 'center' },
  unitRow:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  unitBtn:      { backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 10,
                  paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  unitBtnActive:{ backgroundColor: C.purpleD, borderColor: C.purple },
  unitBtnText:  { color: C.muted, fontSize: 13, fontWeight: '600' },
  quickRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickBtn:     { backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14,
                  paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  quickBtnActive:{ borderColor: C.purple },
  quickBtnText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  macroCard:    { backgroundColor: C.card, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: C.border },
  macroRow:     { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 6 },
  macroLabel:   { color: C.muted, fontSize: 13 },
  macroValue:   { fontSize: 13, fontWeight: '700' },
  macroBar:     { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
                  backgroundColor: C.elevated },
  macroBarSeg:  { height: 6 },
  macroBarLegend:{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  legendText:   { fontSize: 11, fontWeight: '600' },
  sectionTitle: { color: C.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  foodCard:     { backgroundColor: C.card, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: C.border },
  checkbox:     { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
                  borderColor: C.dim, alignItems: 'center', justifyContent: 'center' },
  checkboxActive:{ backgroundColor: C.purpleD, borderColor: C.purple },
  predChip:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  predChipActive:{ backgroundColor: C.purpleD, borderColor: C.purple },
  predText:     { color: C.muted, fontSize: 13, fontWeight: '600' },
  predConf:     { color: C.dim, fontSize: 11 },
  segmentationBox:  { backgroundColor: C.card, borderRadius: 14, padding: 14,
                      borderWidth: 1, borderColor: C.border, gap: 6 },
  segmentationMeta: { color: C.dim, fontSize: 11, marginBottom: 2 },
  segmentRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  segmentCheck:     { fontSize: 13, fontWeight: '700', color: C.dim, width: 16 },
  segmentLabel:     { color: C.text, fontSize: 13, fontWeight: '600', flex: 1 },
  segmentGrams:     { color: C.muted, fontSize: 12 },
  segmentInferred:  { color: C.amber, fontSize: 10, fontStyle: 'italic' },
  dishBox:          { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12,
                      padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', marginBottom: 4 },
  dishLabel:        { color: C.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: 0.5, marginBottom: 2 },
  dishName:         { color: C.green, fontSize: 16, fontWeight: '700' },
  plateMetaRow:     { flexDirection: 'row', gap: 12, marginTop: 6 },
  plateMeta:        { color: C.muted, fontSize: 11 },
  smartEstimateBox: { backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 12,
                      padding: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  smartEstimateText: { color: C.purple, fontSize: 14, fontWeight: '700' },
  smartEstimateDetail: { color: C.muted, fontSize: 12, marginTop: 2 },
});

// purpleD needed in styles
const extraStyles = { purpleD: C.purpleD };

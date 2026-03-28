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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Image, Alert,
  Platform, Animated, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../supabaseConfig';

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
    quickAmounts: ['50g', '100g', '150g', '200g'],
    macros:       { cal: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat', fiber: 'Fiber' },
    units:        ['g', 'kg', 'oz', 'lb'],
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

  const loadingTimer = useRef(null);
  const spinAnim     = useRef(new Animated.Value(0)).current;

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
      console.warn('[FoodScanner] pickImage error', e);
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
    setError('');
    setStep('scanning');
    setLoadingIdx(0);

    try {
      // Step 1: compress image
      let base64, mt;
      try {
        ({ base64, mediaType: mt } = await compressAndEncode(imageUri));
      } catch (e) {
        console.warn('[FoodScanner] compress error', e);
        setError(lang === 'es' ? 'Error al procesar la imagen.' : 'Error processing image.');
        setStep('preview');
        return;
      }

      // Step 2: get session token and call Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError(lang === 'es' ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Session expired. Please log in again.');
        setStep('preview');
        return;
      }

      let data, fnError;
      try {
        ({ data, error: fnError } = await supabase.functions.invoke('scan-food', {
          body: { imageBase64: base64, mediaType: mt },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }));
      } catch (e) {
        console.warn('[FoodScanner] fetch error', e);
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
      setSelections(normalized.foods.map(() => ({ amount: '100', unit: 'g', selected: true })));
      setStep('result');
    } catch (e) {
      console.warn('[FoodScanner] unexpected error', e);
      setError(e?.message ?? tr.errGeneric);
      setStep('preview');
    }
  };

  // ── Add to log ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!result?.foods) return;
    const now = Date.now();
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
    reset();
    onClose();
  };

  const toggleSelected = (i) =>
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s));

  const updateSelection = (i, patch) =>
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

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

          {/* ── RESULT: multi-food cards ── */}
          {step === 'result' && result?.foods && (
            <View style={styles.section}>

              <Text style={styles.sectionTitle}>
                {result.foods.length === 1
                  ? (lang === 'es' ? '1 alimento detectado' : '1 food detected')
                  : (lang === 'es' ? `${result.foods.length} alimentos detectados` : `${result.foods.length} foods detected`)}
              </Text>

              {result.foods.map((food, i) => {
                const sel    = selections[i] ?? { amount: '100', unit: 'g', selected: true };
                const macros = calcMacros(food.per100g, sel.amount, sel.unit);
                const totalCals = macros.cal;
                const protPct = totalCals > 0 ? Math.round((macros.p * 4 / totalCals) * 100) : 0;
                const carbPct = totalCals > 0 ? Math.round((macros.c * 4 / totalCals) * 100) : 0;
                const fatPct  = totalCals > 0 ? Math.round((macros.f * 9 / totalCals) * 100) : 0;
                return (
                  <View key={i} style={[styles.foodCard, !sel.selected && { opacity: 0.45 }]}>
                    {/* Checkbox + name + confidence */}
                    <TouchableOpacity onPress={() => toggleSelected(i)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={[styles.checkbox, sel.selected && styles.checkboxActive]}>
                        {sel.selected && <Text style={{ color: '#fff', fontSize: 10, lineHeight: 14 }}>✓</Text>}
                      </View>
                      <Text style={[styles.foodName, { flex: 1 }]}>{food.name}</Text>
                      <ConfidenceBadge level={food.confidence} lang={lang} />
                    </TouchableOpacity>

                    {food.note ? <Text style={styles.noteText}>{food.note}</Text> : null}
                    {food.confidence === 'low' && (
                      <View style={styles.warnBox}>
                        <Text style={{ color: C.amber, fontSize: 12 }}>⚠️ {tr.lowWarn}</Text>
                      </View>
                    )}

                    {sel.selected && (
                      <>
                        <Text style={[styles.label, { marginTop: 8 }]}>{tr.amountLabel}</Text>
                        <View style={styles.amountRow}>
                          <TextInput
                            style={styles.amountInput}
                            value={sel.amount}
                            onChangeText={v => updateSelection(i, { amount: v.replace(/[^0-9.]/g, '') })}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                          />
                          <View style={styles.unitRow}>
                            {tr.units.map(u => (
                              <TouchableOpacity key={u} onPress={() => updateSelection(i, { unit: u })}
                                style={[styles.unitBtn, sel.unit === u && styles.unitBtnActive]}>
                                <Text style={[styles.unitBtnText, sel.unit === u && { color: '#fff' }]}>{u}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <View style={styles.quickRow}>
                          {[50, 100, 150, 200].map(q => (
                            <TouchableOpacity key={q}
                              onPress={() => updateSelection(i, { amount: String(q), unit: 'g' })}
                              style={[styles.quickBtn, sel.amount === String(q) && sel.unit === 'g' && styles.quickBtnActive]}>
                              <Text style={[styles.quickBtnText, sel.amount === String(q) && sel.unit === 'g' && { color: C.purple }]}>{q}g</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={[styles.macroCard, { marginTop: 8 }]}>
                          <View style={styles.macroRow}>
                            <Text style={styles.macroLabel}>{tr.macros.cal}</Text>
                            <Text style={[styles.macroValue, { color: C.amber }]}>{macros.cal} kcal</Text>
                          </View>
                          {[
                            { key: 'p', color: C.cyan,  label: tr.macros.p },
                            { key: 'c', color: C.green, label: tr.macros.c },
                            { key: 'f', color: C.amber, label: tr.macros.f },
                            { key: 'fiber', color: C.muted, label: tr.macros.fiber },
                          ].map(({ key, color, label }) => (
                            <View key={key} style={styles.macroRow}>
                              <Text style={styles.macroLabel}>{label}</Text>
                              <Text style={[styles.macroValue, { color }]}>{macros[key]}g</Text>
                            </View>
                          ))}
                          {totalCals > 0 && (
                            <View style={{ marginTop: 8 }}>
                              <View style={styles.macroBar}>
                                <View style={[styles.macroBarSeg, { flex: protPct, backgroundColor: C.cyan }]} />
                                <View style={[styles.macroBarSeg, { flex: carbPct, backgroundColor: C.green }]} />
                                <View style={[styles.macroBarSeg, { flex: fatPct,  backgroundColor: C.amber }]} />
                              </View>
                              <View style={styles.macroBarLegend}>
                                <Text style={[styles.legendText, { color: C.cyan  }]}>P {protPct}%</Text>
                                <Text style={[styles.legendText, { color: C.green }]}>C {carbPct}%</Text>
                                <Text style={[styles.legendText, { color: C.amber }]}>F {fatPct}%</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}

              {/* CTA */}
              {(() => {
                const count = selections.filter(s => s.selected && parseFloat(s.amount) > 0).length;
                return (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 8, opacity: count > 0 ? 1 : 0.4 }]}
                    onPress={handleAdd}
                    disabled={count === 0}
                  >
                    <Text style={styles.primaryBtnText}>
                      {tr.addToMeal} {meal}{count > 1 ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setStep('idle'); setImageUri(null); setResult(null); setSelections([]); }}>
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
});

// purpleD needed in styles
const extraStyles = { purpleD: C.purpleD };

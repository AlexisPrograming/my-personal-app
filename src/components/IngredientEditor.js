/**
 * IngredientEditor.js — Interactive Ingredient Editor
 *
 * Allows users to toggle ingredients on/off, adjust quantities via sliders,
 * and add common ingredients via quick-add buttons.
 */

import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Platform,
} from 'react-native';
import { QUICK_ADD_INGREDIENTS, createQuickAddIngredient } from '../scanner/ingredientParser';

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

const T = {
  en: {
    ingredients: 'Ingredients',
    quickAdd:    'Quick Add',
    addManual:   '+ Add ingredient',
    qty:         'qty',
    enabled:     'ON',
    disabled:    'OFF',
  },
  es: {
    ingredients: 'Ingredientes',
    quickAdd:    'Agregar Rápido',
    addManual:   '+ Agregar ingrediente',
    qty:         'cant',
    enabled:     'ON',
    disabled:    'OFF',
  },
};

/**
 * @param {Object} props
 * @param {import('../scanner/ingredientParser').ParsedIngredient[]} props.ingredients
 * @param {Function} props.onUpdate — (index, patch) => void
 * @param {Function} props.onToggle — (index) => void
 * @param {Function} props.onAdd — (ingredient) => void
 * @param {Function} props.onRemove — (index) => void
 * @param {string}   props.lang — 'en' | 'es'
 */
export default function IngredientEditor({ ingredients, onUpdate, onToggle, onAdd, onRemove, lang = 'es' }) {
  const tr = T[lang] ?? T.es;

  const handleQuickAdd = useCallback((key) => {
    const ingredient = createQuickAddIngredient(key);
    if (ingredient) onAdd(ingredient);
  }, [onAdd]);

  // Filter out quick-add items already in the list
  const existingNames = new Set(ingredients.map(i => i.name.toLowerCase()));
  const availableQuickAdd = QUICK_ADD_INGREDIENTS.filter(
    q => !existingNames.has(q.name.toLowerCase()) && !existingNames.has(q.nameEs.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{tr.ingredients}</Text>

      {/* Ingredient list */}
      {ingredients.map((ing, idx) => (
        <View key={`${ing.name}-${idx}`} style={[styles.ingredientRow, !ing.enabled && styles.disabled]}>
          {/* Toggle */}
          <TouchableOpacity onPress={() => onToggle(idx)} style={styles.toggleBtn}>
            <View style={[styles.toggleDot, ing.enabled && styles.toggleDotActive]} />
          </TouchableOpacity>

          {/* Name */}
          <Text style={[styles.ingredientName, !ing.enabled && { color: C.dim }]} numberOfLines={1}>
            {ing.name}
          </Text>

          {/* Quantity input */}
          {ing.enabled && (
            <View style={styles.qtyWrap}>
              <TextInput
                style={styles.qtyInput}
                value={String(ing.defaultQty)}
                onChangeText={v => {
                  const num = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                  onUpdate(idx, { defaultQty: num });
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.unitLabel}>{ing.unit}</Text>
            </View>
          )}

          {/* Calorie hint */}
          {ing.enabled && (
            <Text style={styles.calHint}>
              {Math.round(ing.baseCalories * ing.defaultQty / 100)}kcal
            </Text>
          )}

          {/* Remove */}
          <TouchableOpacity onPress={() => onRemove(idx)} style={styles.removeBtn}>
            <Text style={{ color: C.red, fontSize: 16, lineHeight: 18 }}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Quick-add buttons */}
      {availableQuickAdd.length > 0 && (
        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddLabel}>{tr.quickAdd}</Text>
          <View style={styles.quickAddRow}>
            {availableQuickAdd.map(q => (
              <TouchableOpacity
                key={q.key}
                style={styles.quickAddBtn}
                onPress={() => handleQuickAdd(q.key)}
              >
                <Text style={styles.quickAddText}>
                  + {lang === 'es' ? q.nameEs : q.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { gap: 8 },
  sectionTitle:   { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
                    textTransform: 'uppercase', marginBottom: 4 },
  ingredientRow:  { flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: C.card, borderRadius: 12, padding: 10,
                    borderWidth: 1, borderColor: C.border },
  disabled:       { opacity: 0.45 },
  toggleBtn:      { padding: 4 },
  toggleDot:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: C.dim, backgroundColor: 'transparent' },
  toggleDotActive:{ borderColor: C.green, backgroundColor: C.green },
  ingredientName: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  qtyWrap:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyInput:       { backgroundColor: C.elevated, color: C.text, fontSize: 14, fontWeight: '700',
                    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                    borderWidth: 1, borderColor: C.border, minWidth: 50, textAlign: 'center' },
  unitLabel:      { color: C.muted, fontSize: 12, fontWeight: '600' },
  calHint:        { color: C.amber, fontSize: 11, fontWeight: '600', minWidth: 44, textAlign: 'right' },
  removeBtn:      { padding: 4 },
  quickAddSection:{ marginTop: 8 },
  quickAddLabel:  { color: C.dim, fontSize: 11, fontWeight: '600', marginBottom: 6 },
  quickAddRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickAddBtn:    { backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 10,
                    paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  quickAddText:   { color: C.purple, fontSize: 12, fontWeight: '600' },
});

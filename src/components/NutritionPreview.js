/**
 * NutritionPreview.js — Real-Time Nutrition Preview
 *
 * Instantly updates as ingredients or portions change.
 * No loading states — pure computation from local data.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculateNutrition, getMacroPercentages } from '../nutrition/calculateNutrition';

const C = {
  card:   '#12122A',
  elevated:'#1A1A35',
  border: 'rgba(139,92,246,0.18)',
  purple: '#9D6FFF',
  green:  '#10B981',
  amber:  '#FBBF24',
  cyan:   '#22D3EE',
  text:   '#F0EEFF',
  muted:  '#9B93B8',
  dim:    '#4B4570',
};

const T = {
  en: { title: 'Nutrition', cal: 'Calories', p: 'Protein', c: 'Carbs', f: 'Fat', fi: 'Fiber' },
  es: { title: 'Nutrición', cal: 'Calorías', p: 'Proteína', c: 'Carbos', f: 'Grasas', fi: 'Fibra' },
};

/**
 * @param {Object} props
 * @param {Array<{ ingredient: import('../scanner/ingredientParser').ParsedIngredient, quantity: number }>} props.items
 * @param {string} props.lang
 */
export default function NutritionPreview({ items, lang = 'es' }) {
  const tr = T[lang] ?? T.es;

  const nutrition = useMemo(() => calculateNutrition(items), [items]);
  const pct = useMemo(() => getMacroPercentages(nutrition), [nutrition]);

  const macros = [
    { key: 'protein', label: tr.p,  value: nutrition.protein,  unit: 'g', color: C.cyan },
    { key: 'carbs',   label: tr.c,  value: nutrition.carbs,    unit: 'g', color: C.green },
    { key: 'fat',     label: tr.f,  value: nutrition.fat,      unit: 'g', color: C.amber },
    { key: 'fiber',   label: tr.fi, value: nutrition.fiber,    unit: 'g', color: C.muted },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr.title}</Text>

      {/* Calorie hero */}
      <View style={styles.calRow}>
        <Text style={styles.calValue}>{nutrition.calories}</Text>
        <Text style={styles.calUnit}>kcal</Text>
      </View>

      {/* Macro bar */}
      {nutrition.calories > 0 && (
        <View style={styles.barWrap}>
          <View style={styles.bar}>
            {pct.proteinPct > 0 && <View style={[styles.barSeg, { flex: pct.proteinPct, backgroundColor: C.cyan }]} />}
            {pct.carbsPct > 0   && <View style={[styles.barSeg, { flex: pct.carbsPct,   backgroundColor: C.green }]} />}
            {pct.fatPct > 0     && <View style={[styles.barSeg, { flex: pct.fatPct,     backgroundColor: C.amber }]} />}
          </View>
          <View style={styles.barLegend}>
            <Text style={[styles.legendText, { color: C.cyan }]}>P {pct.proteinPct}%</Text>
            <Text style={[styles.legendText, { color: C.green }]}>C {pct.carbsPct}%</Text>
            <Text style={[styles.legendText, { color: C.amber }]}>F {pct.fatPct}%</Text>
          </View>
        </View>
      )}

      {/* Macro rows */}
      {macros.map(m => (
        <View key={m.key} style={styles.macroRow}>
          <View style={[styles.dot, { backgroundColor: m.color }]} />
          <Text style={styles.macroLabel}>{m.label}</Text>
          <Text style={[styles.macroValue, { color: m.color }]}>{m.value}{m.unit}</Text>
        </View>
      ))}

      {/* Per-ingredient breakdown */}
      {nutrition.breakdown.length > 1 && (
        <View style={styles.breakdown}>
          {nutrition.breakdown.map((b, i) => (
            <View key={i} style={styles.breakdownRow}>
              <Text style={styles.breakdownName} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.breakdownCal}>{b.calories}kcal</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { backgroundColor: C.card, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: C.border, gap: 6 },
  title:        { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
                  textTransform: 'uppercase' },
  calRow:       { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: 2 },
  calValue:     { color: C.amber, fontSize: 32, fontWeight: '800' },
  calUnit:      { color: C.muted, fontSize: 14, fontWeight: '600' },
  barWrap:      { gap: 4 },
  bar:          { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden',
                  backgroundColor: C.elevated },
  barSeg:       { height: 6 },
  barLegend:    { flexDirection: 'row', justifyContent: 'space-around' },
  legendText:   { fontSize: 11, fontWeight: '600' },
  macroRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  macroLabel:   { color: C.muted, fontSize: 13, flex: 1 },
  macroValue:   { fontSize: 13, fontWeight: '700' },
  breakdown:    { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border, gap: 3 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownName:{ color: C.dim, fontSize: 11, flex: 1 },
  breakdownCal: { color: C.dim, fontSize: 11, fontWeight: '600' },
});

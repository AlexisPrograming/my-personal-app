/**
 * PortionSelector.js — Portion Size Selector
 *
 * Provides Small/Medium/Large presets with a custom input option.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet,
} from 'react-native';
import { PORTION_SIZES } from '../scanner/portionEstimator';

const C = {
  card:     '#12122A',
  elevated: '#1A1A35',
  border:   'rgba(139,92,246,0.18)',
  purple:   '#9D6FFF',
  purpleD:  '#7C3AED',
  text:     '#F0EEFF',
  muted:    '#9B93B8',
  dim:      '#4B4570',
};

const T = {
  en: { portion: 'Portion Size', custom: 'Custom' },
  es: { portion: 'Tamaño de Porción', custom: 'Custom' },
};

/**
 * @param {Object} props
 * @param {string} props.selectedId — current portion id ('small' | 'medium' | 'large' | 'custom')
 * @param {number} props.customMl — custom ml value
 * @param {Function} props.onSelect — (portionId, ml) => void
 * @param {string} props.lang
 */
export default function PortionSelector({ selectedId, customMl, onSelect, lang = 'es', foodType = 'liquid' }) {
  const tr = T[lang] ?? T.es;
  const [showCustom, setShowCustom] = useState(selectedId === 'custom');

  const isLiquid = foodType === 'liquid';
  const unitLabel = isLiquid ? 'ml' : 'g';

  const handlePreset = (portion) => {
    setShowCustom(false);
    const value = isLiquid ? portion.ml : portion.grams;
    onSelect(portion.id, value);
  };

  const handleCustom = () => {
    setShowCustom(true);
    onSelect('custom', customMl || (isLiquid ? 350 : 300));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr.portion}</Text>

      <View style={styles.row}>
        {PORTION_SIZES.map(p => {
          const active = selectedId === p.id;
          const label = lang === 'es' ? p.labelEs : p.label;
          const displayValue = isLiquid ? p.ml : p.grams;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => handlePreset(p)}
            >
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {label}
              </Text>
              <Text style={[styles.optionMl, active && { color: C.text }]}>
                {displayValue} {unitLabel}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Custom option */}
        <TouchableOpacity
          style={[styles.option, showCustom && styles.optionActive]}
          onPress={handleCustom}
        >
          <Text style={[styles.optionLabel, showCustom && styles.optionLabelActive]}>
            {tr.custom}
          </Text>
          {showCustom ? (
            <View style={styles.customInputWrap}>
              <TextInput
                style={styles.customInput}
                value={String(customMl || '')}
                onChangeText={v => {
                  const num = parseInt(v.replace(/[^0-9]/g, ''), 10) || 0;
                  onSelect('custom', num);
                }}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <Text style={{ color: C.muted, fontSize: 11 }}>{unitLabel}</Text>
            </View>
          ) : (
            <Text style={styles.optionMl}>...</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { gap: 8 },
  title:             { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
                       textTransform: 'uppercase' },
  row:               { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option:            { flex: 1, minWidth: 70, backgroundColor: C.elevated, borderRadius: 12,
                       padding: 10, alignItems: 'center', gap: 2,
                       borderWidth: 1, borderColor: C.border },
  optionActive:      { backgroundColor: C.purpleD, borderColor: C.purple },
  optionLabel:       { color: C.muted, fontSize: 13, fontWeight: '700' },
  optionLabelActive: { color: '#fff' },
  optionMl:          { color: C.dim, fontSize: 11 },
  customInputWrap:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
  customInput:       { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center',
                       minWidth: 36, borderBottomWidth: 1, borderBottomColor: C.purple,
                       paddingVertical: 0 },
});

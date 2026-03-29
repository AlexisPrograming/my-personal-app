import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../../utils/theme';

export default function OrbitRing({ completed = 0, total = 7, size = 80 }) {
  const strokeWidth  = 8;
  const r            = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct          = total > 0 ? Math.min(completed / total, 1) : 0;
  const dashOffset   = circumference * (1 - pct);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.elevated} strokeWidth={strokeWidth} fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.purple} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: size > 70 ? 14 : 11 }}>
        {completed}/{total}
      </Text>
    </View>
  );
}

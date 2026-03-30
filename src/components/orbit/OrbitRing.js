import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, F } from '../../utils/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function OrbitRing({ completed = 0, total = 7, size = 80 }) {
  const strokeWidth   = 6;
  const r             = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct           = total > 0 ? Math.min(completed / total, 1) : 0;
  const targetOffset  = circumference * (1 - pct);

  const animVal = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: targetOffset,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [targetOffset]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.elevated} strokeWidth={strokeWidth} fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={C.cyan}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animVal}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2},${size / 2}`}
        />
      </Svg>

      {/* Center count */}
      <Text style={{
        color: C.cyan,
        fontFamily: F.headingB,
        fontSize: size > 70 ? 18 : 13,
        lineHeight: size > 70 ? 20 : 15,
      }}>
        {completed}
      </Text>
      <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 9, letterSpacing: 0.5 }}>
        /{total}
      </Text>
    </View>
  );
}

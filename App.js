// ═══════════════════════════════════════════════════════════════
//  PULSE — Health Coach  ·  Powered by Supabase
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity, TextInput,
  ScrollView, Modal, Animated, Dimensions, useWindowDimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Line } from 'react-native-svg';
import { supabase } from './supabaseConfig';

const { width: W } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DESKTOP_BP = 768;
function useIsDesktop() { const { width } = useWindowDimensions(); return width >= DESKTOP_BP; }

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg:           '#07070F',
  surface:      '#0E0E1A',
  card:         '#141422',
  elevated:     '#1C1C30',
  border:       'rgba(139,92,246,0.14)',
  borderBright: 'rgba(139,92,246,0.35)',
  purple:       '#8B5CF6',
  purpleD:      '#6D28D9',
  cyan:         '#06B6D4',
  green:        '#10B981',
  amber:        '#F59E0B',
  red:          '#EF4444',
  text:         '#F1F5F9',
  muted:        '#94A3B8',
  dim:          '#475569',
  subtle:       '#1E293B',
};

// ─── DATA ────────────────────────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary',  desc: 'Desk job, little movement', factor: 1.2   },
  { id: 'light',     label: 'Light',      desc: '1–3 workouts / week',       factor: 1.375 },
  { id: 'moderate',  label: 'Moderate',   desc: '3–5 workouts / week',       factor: 1.55  },
  { id: 'active',    label: 'Active',     desc: '6–7 workouts / week',       factor: 1.725 },
  { id: 'athlete',   label: 'Athlete',    desc: 'Two-a-days / heavy labor',  factor: 1.9   },
];

const GOALS = [
  { id: 'lose',     label: 'Lose Fat',       desc: 'Caloric deficit + high protein',    icon: '↓', color: C.cyan   },
  { id: 'maintain', label: 'Maintain',       desc: 'Hold your weight & energy',         icon: '◈', color: C.green  },
  { id: 'gain',     label: 'Build Muscle',   desc: 'Caloric surplus + progressive load', icon: '↑', color: C.purple },
  { id: 'recomp',   label: 'Recomposition',  desc: 'Lose fat and gain muscle at once',  icon: '⟳', color: C.amber  },
];

const DIET_TYPES = [
  { id: 'standard',     label: 'Standard'     },
  { id: 'high-protein', label: 'High Protein' },
  { id: 'low-carb',     label: 'Low Carb'     },
  { id: 'keto',         label: 'Keto'         },
  { id: 'vegan',        label: 'Vegan'        },
  { id: 'vegetarian',   label: 'Vegetarian'   },
];

const TRAINING_TYPES = [
  { id: 'weights',      label: 'Weights'      },
  { id: 'cardio',       label: 'Cardio'       },
  { id: 'hiit',         label: 'HIIT'         },
  { id: 'mixed',        label: 'Mixed'        },
  { id: 'calisthenics', label: 'Calisthenics' },
];

const FOOD_DB = [
  { id: 'f1',  name: 'Chicken Breast',       unit: '100g',          cal: 165, p: 31,  c: 0,    f: 3.6 },
  { id: 'f2',  name: 'Salmon Fillet',         unit: '100g',          cal: 208, p: 20,  c: 0,    f: 13  },
  { id: 'f3',  name: 'Brown Rice',            unit: '1 cup cooked',  cal: 216, p: 5,   c: 45,   f: 1.8 },
  { id: 'f4',  name: 'White Rice',            unit: '1 cup cooked',  cal: 242, p: 4.4, c: 53,   f: 0.4 },
  { id: 'f5',  name: 'Whole Egg',             unit: '1 large',       cal: 78,  p: 6,   c: 0.6,  f: 5.3 },
  { id: 'f6',  name: 'Egg Whites',            unit: '3 large',       cal: 51,  p: 11,  c: 0.6,  f: 0.2 },
  { id: 'f7',  name: 'Greek Yogurt',          unit: '170g',          cal: 100, p: 17,  c: 6,    f: 0.7 },
  { id: 'f8',  name: 'Oatmeal',               unit: '1 cup cooked',  cal: 166, p: 6,   c: 28,   f: 3.6 },
  { id: 'f9',  name: 'Sweet Potato',          unit: '100g',          cal: 86,  p: 1.6, c: 20,   f: 0.1 },
  { id: 'f10', name: 'Broccoli',              unit: '100g',          cal: 34,  p: 2.8, c: 7,    f: 0.4 },
  { id: 'f11', name: 'Avocado',               unit: 'half',          cal: 120, p: 1.5, c: 6,    f: 11  },
  { id: 'f12', name: 'Banana',                unit: '1 medium',      cal: 105, p: 1.3, c: 27,   f: 0.4 },
  { id: 'f13', name: 'Apple',                 unit: '1 medium',      cal: 95,  p: 0.5, c: 25,   f: 0.3 },
  { id: 'f14', name: 'Almonds',               unit: '28g handful',   cal: 164, p: 6,   c: 6,    f: 14  },
  { id: 'f15', name: 'Whey Protein',          unit: '1 scoop',       cal: 120, p: 24,  c: 3,    f: 1.5 },
  { id: 'f16', name: 'Cottage Cheese',        unit: '100g',          cal: 98,  p: 11,  c: 3.4,  f: 4.3 },
  { id: 'f17', name: 'Tuna (canned)',         unit: '100g',          cal: 116, p: 26,  c: 0,    f: 0.8 },
  { id: 'f18', name: 'Pasta (dry)',           unit: '100g',          cal: 371, p: 13,  c: 75,   f: 1.5 },
  { id: 'f19', name: 'Whole Milk',            unit: '1 cup',         cal: 149, p: 8,   c: 12,   f: 8   },
  { id: 'f20', name: 'Olive Oil',             unit: '1 tbsp',        cal: 119, p: 0,   c: 0,    f: 13.5},
  { id: 'f21', name: 'Quinoa',                unit: '1 cup cooked',  cal: 222, p: 8,   c: 39,   f: 3.5 },
  { id: 'f22', name: 'Lentils',               unit: '1 cup cooked',  cal: 230, p: 18,  c: 40,   f: 0.8 },
  { id: 'f23', name: 'Peanut Butter',         unit: '2 tbsp',        cal: 188, p: 8,   c: 6,    f: 16  },
  { id: 'f24', name: 'Ground Beef (90/10)',   unit: '100g',          cal: 176, p: 20,  c: 0,    f: 10  },
  { id: 'f25', name: 'Blueberries',           unit: '1 cup',         cal: 84,  p: 1,   c: 21,   f: 0.5 },
  { id: 'f26', name: 'Spinach',               unit: '100g',          cal: 23,  p: 2.9, c: 3.6,  f: 0.4 },
  { id: 'f27', name: 'Whole Wheat Bread',     unit: '1 slice',       cal: 69,  p: 3.6, c: 12,   f: 1   },
  { id: 'f28', name: 'Tofu',                  unit: '100g',          cal: 76,  p: 8,   c: 1.9,  f: 4.8 },
  { id: 'f29', name: 'Edamame',               unit: '100g',          cal: 121, p: 11,  c: 9,    f: 5.2 },
  { id: 'f30', name: 'Orange',                unit: '1 medium',      cal: 62,  p: 1.2, c: 15,   f: 0.2 },
];

const EXERCISES = {
  Push: [
    { id: 'p1', name: 'Bench Press',         muscles: 'Chest, Triceps'     },
    { id: 'p2', name: 'Overhead Press',       muscles: 'Shoulders, Triceps' },
    { id: 'p3', name: 'Incline DB Press',     muscles: 'Upper Chest'        },
    { id: 'p4', name: 'Push-ups',             muscles: 'Chest, Triceps'     },
    { id: 'p5', name: 'Lateral Raises',       muscles: 'Side Delts'         },
    { id: 'p6', name: 'Tricep Pushdown',      muscles: 'Triceps'            },
  ],
  Pull: [
    { id: 'u1', name: 'Pull-ups',             muscles: 'Lats, Biceps'       },
    { id: 'u2', name: 'Barbell Row',          muscles: 'Back, Biceps'       },
    { id: 'u3', name: 'Lat Pulldown',         muscles: 'Lats'               },
    { id: 'u4', name: 'Seated Cable Row',     muscles: 'Mid Back'           },
    { id: 'u5', name: 'Bicep Curls',          muscles: 'Biceps'             },
  ],
  Legs: [
    { id: 'l1', name: 'Back Squat',           muscles: 'Quads, Glutes'      },
    { id: 'l2', name: 'Romanian Deadlift',    muscles: 'Hamstrings, Glutes' },
    { id: 'l3', name: 'Leg Press',            muscles: 'Quads, Glutes'      },
    { id: 'l4', name: 'Hip Thrust',           muscles: 'Glutes'             },
    { id: 'l5', name: 'Calf Raises',          muscles: 'Calves'             },
  ],
  Core: [
    { id: 'c1', name: 'Plank',                muscles: 'Core'               },
    { id: 'c2', name: 'Hanging Leg Raises',   muscles: 'Lower Abs'          },
    { id: 'c3', name: 'Ab Wheel Rollout',     muscles: 'Full Core'          },
  ],
  Cardio: [
    { id: 'cv1', name: 'Running',             muscles: 'Full Body'          },
    { id: 'cv2', name: 'Cycling',             muscles: 'Legs, Cardio'       },
    { id: 'cv3', name: 'Jump Rope',           muscles: 'Full Body'          },
    { id: 'cv4', name: 'HIIT Intervals',      muscles: 'Full Body'          },
  ],
};

const QUOTES = [
  "The body achieves what the mind believes.",
  "Progress, not perfection.",
  "Your only competition is who you were yesterday.",
  "Discipline is choosing what you want most over what you want now.",
  "Show up. Do the work. Trust the process.",
  "Small daily improvements are the key to staggering long-term results.",
];

const COACH_RESPONSES = {
  protein:  ["You're targeting {p}g of protein daily. Spread it across 4–5 meals — chicken, eggs, Greek yogurt, tuna are your best friends.", "Protein is the building block of muscle. Hit {p}g daily. Prioritize it at breakfast and post-workout."],
  calories: ["Your target is {cal} kcal/day. Staying within ±100 kcal is perfectly fine — don't stress perfection.", "With a {goal} goal, your {cal} kcal target is calibrated to move you toward your outcome."],
  sleep:    ["Sleep is where muscle is built and fat is burned. 7–9 hours is ideal. Poor sleep raises cortisol and kills progress.", "Same wake time daily, dark room, no screens 30 min before bed. It amplifies every other effort."],
  water:    ["Even mild dehydration (1–2%) can reduce strength by up to 10%. Sip consistently throughout the day.", "Add 500ml for every 30 min of intense exercise on top of your daily target."],
  training: ["Progressive overload is the real driver of change — add a little weight or a rep each week.", "Consistency beats intensity. 3 sessions every week beats 6 sessions for 2 weeks then burning out."],
  default:  ["Focus on the fundamentals: hit your protein, train consistently, sleep 7–9h, drink water. Everything else is noise.", "Nutrition drives 80% of body composition. Training shapes the muscles. Sleep repairs them.", "Track your food for 2 weeks. Awareness alone improves choices by 20–30%."],
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
function calcMacros({ weight, height, age, sex, goal, activity }) {
  if (!weight || !height || !age) return null;
  const s = sex === 'female' ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + s;
  const act = ACTIVITY_LEVELS.find(a => a.id === activity) || ACTIVITY_LEVELS[1];
  const tdee = Math.round(bmr * act.factor);
  let multiplier = 1, proteinPerKg = 1.6;
  if (goal === 'lose')  { multiplier = 0.80; proteinPerKg = 2.2; }
  if (goal === 'gain')  { multiplier = 1.10; proteinPerKg = 2.0; }
  if (goal === 'recomp'){ multiplier = 0.95; proteinPerKg = 2.2; }
  const calories = Math.round(tdee * multiplier);
  const protein  = Math.round(weight * proteinPerKg);
  const fats     = Math.round((0.25 * calories) / 9);
  const carbs    = Math.round((calories - protein * 4 - fats * 9) / 4);
  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fats };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Up early';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Night owl';
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayStr()  { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getCoachReply(msg, macros) {
  const m = msg.toLowerCase();
  let tpl = '';
  if (m.includes('protein'))                        tpl = randomFrom(COACH_RESPONSES.protein);
  else if (m.includes('calor') || m.includes('eat')) tpl = randomFrom(COACH_RESPONSES.calories);
  else if (m.includes('sleep') || m.includes('rest')) tpl = randomFrom(COACH_RESPONSES.sleep);
  else if (m.includes('water') || m.includes('hydrat')) tpl = randomFrom(COACH_RESPONSES.water);
  else if (m.includes('train') || m.includes('workout')) tpl = randomFrom(COACH_RESPONSES.training);
  else tpl = randomFrom(COACH_RESPONSES.default);
  return tpl.replace('{p}', macros?.protein ?? '—').replace('{cal}', macros?.calories ?? '—').replace('{goal}', 'your');
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
function Btn({ label, onPress, variant = 'primary', style, disabled, loading }) {
  const bg     = variant === 'primary' ? C.purple : 'transparent';
  const border = variant === 'secondary' ? C.borderBright : 'transparent';
  const color  = variant === 'ghost' ? C.muted : C.text;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[{
      backgroundColor: bg, borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: border, borderRadius: 12, paddingVertical: 14,
      alignItems: 'center', opacity: disabled ? 0.5 : 1,
    }, style]}>
      {loading
        ? <ActivityIndicator color={C.text} size="small" />
        : <Text style={{ color, fontWeight: '600', fontSize: 15 }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Card({ children, style, glow }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: glow ? C.borderBright : C.border, padding: 16, marginBottom: 12 }, style]}>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress, color, small }) {
  const accent = color || C.purple;
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: active ? accent : C.elevated, borderRadius: 999, paddingHorizontal: small ? 12 : 16, paddingVertical: small ? 6 : 9, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: active ? accent : C.border }}>
      <Text style={{ color: active ? '#fff' : C.muted, fontSize: small ? 12 : 13, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroBar({ label, value, goal, color }) {
  const pct  = Math.min(1, (value || 0) / (goal || 1));
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, useNativeDriver: false, friction: 6 }).start();
  }, [pct]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{value ?? 0}<Text style={{ color: C.dim }}>/{goal}g</Text></Text>
      </View>
      <View style={{ height: 6, backgroundColor: C.subtle, borderRadius: 3, overflow: 'hidden' }}>
        <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width }} />
      </View>
    </View>
  );
}

function CalorieRing({ consumed, goal, size = 170, stroke = 13 }) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const progress = Math.min(1, (consumed || 0) / (goal || 1));
  const over  = consumed > goal;
  const anim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);
  const strokeDashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });
  const ringColor = over ? C.red : progress > 0.85 ? C.amber : C.purple;
  const remaining = Math.abs(goal - (consumed || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={C.subtle} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size/2} cy={size/2} r={r} stroke={ringColor} strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round" rotation="-90" origin={`${size/2}, ${size/2}`} />
      </Svg>
      <Text style={{ color: C.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 }}>{remaining}</Text>
      <Text style={{ color: C.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 2 }}>{over ? 'OVER BUDGET' : 'KCAL LEFT'}</Text>
      <Text style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>{consumed || 0} / {goal} consumed</Text>
    </View>
  );
}

function WaterGlass({ current, target, onAdd, onReset }) {
  const pct      = Math.min(1, (current || 0) / (target || 1));
  const fillAnim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.spring(fillAnim, { toValue: pct, useNativeDriver: false, friction: 5 }).start();
  }, [pct]);
  const glassH  = 72;
  const fillH   = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, glassH] });
  const fillColor = pct < 0.4 ? C.dim : pct < 0.8 ? C.cyan : C.green;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: 36, height: glassH + 8, borderWidth: 2, borderColor: C.cyan, borderTopWidth: 0, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <Animated.View style={{ height: fillH, backgroundColor: fillColor, borderRadius: 2 }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>{current} <Text style={{ color: C.muted, fontSize: 12, fontWeight: '400' }}>/ {target} ml</Text></Text>
        <Text style={{ color: pct >= 1 ? C.green : C.cyan, fontSize: 11, marginTop: 2 }}>{Math.round(pct * 100)}% hydrated{pct >= 1 ? '  ✓' : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[250, 500, 750].map(ml => (
            <TouchableOpacity key={ml} onPress={() => onAdd(ml)} style={{ backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '600' }}>+{ml}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onReset} style={{ backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.dim, fontSize: 12 }}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function StreakBadge({ streak }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (streak > 0) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])).start();
    }
  }, [streak]);
  return (
    <Animated.View style={{ transform: [{ scale: pulse }], backgroundColor: streak >= 7 ? '#78350F' : streak >= 3 ? C.elevated : C.elevated, borderRadius: 12, padding: 14, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: streak > 0 ? C.amber : C.border }}>
      <Text style={{ fontSize: 28 }}>{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '○'}</Text>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 22, marginTop: 4 }}>{streak}</Text>
      <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>day streak</Text>
    </Animated.View>
  );
}

function WeightChart({ weights }) {
  const { width } = useWindowDimensions();
  if (!weights || weights.length < 2) {
    return <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: C.dim, fontSize: 12 }}>Log at least 2 weigh-ins to see a trend</Text></View>;
  }
  const vals   = weights.map(w => w.weight_kg);
  const min    = Math.min(...vals) - 1;
  const max    = Math.max(...vals) + 1;
  const containerW = width >= DESKTOP_BP ? Math.min(width - 280, 900) : width;
  const chartH = 70, chartW = containerW - 80;
  const ptX    = (i) => (i / (vals.length - 1)) * chartW;
  const ptY    = (v) => chartH - ((v - min) / (max - min)) * chartH;
  const points = vals.map((v, i) => ({ x: ptX(i), y: ptY(v) }));
  return (
    <View>
      <Svg width={chartW} height={chartH + 10}>
        {points.map((p, i) => i < points.length - 1 && (
          <Line key={i} x1={p.x} y1={p.y} x2={points[i+1].x} y2={points[i+1].y} stroke={C.purple} strokeWidth="2" strokeLinecap="round" />
        ))}
        {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r="4" fill={C.purple} />)}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: C.dim, fontSize: 10 }}>{weights[0]?.logged_at}</Text>
        <Text style={{ color: C.dim, fontSize: 10 }}>{weights[weights.length-1]?.logged_at}</Text>
      </View>
    </View>
  );
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────
function WelcomeScreen({ onGetStarted, onSignIn }) {
  const isDesktop = useIsDesktop();
  const glow  = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 2000, useNativeDriver: false }),
    ])).start();
  }, []);
  const glowSize = glow.interpolate({ inputRange: [0, 1], outputRange: [280, 400] });
  const glowOpa  = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: 'row' }}>
        {/* Left panel */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Animated.View style={{ position: 'absolute', width: glowSize, height: glowSize, borderRadius: 999, backgroundColor: C.purple, opacity: glowOpa }} />
          <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Text style={{ fontSize: 42 }}>⚡</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 64, fontWeight: '800', letterSpacing: -2 }}>PULSE</Text>
            <Text style={{ color: C.purple, fontSize: 14, letterSpacing: 5, marginTop: 6 }}>HEALTH COACH</Text>
            <Text style={{ color: C.muted, fontSize: 17, textAlign: 'center', marginTop: 24, lineHeight: 28, maxWidth: 360 }}>Your intelligent fitness companion.{'\n'}Track nutrition, training, and progress.{'\n'}Built for results.</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
              {[{ icon: '◈', label: 'Smart Macros' }, { icon: '△', label: 'Training Logs' }, { icon: '⚡', label: 'AI Coaching' }].map(f => (
                <View key={f.label} style={{ alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.border, minWidth: 100 }}>
                  <Text style={{ fontSize: 22, color: C.purple, marginBottom: 6 }}>{f.icon}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{f.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
        {/* Right panel - auth card */}
        <View style={{ width: 440, backgroundColor: C.surface, borderLeftWidth: 1, borderLeftColor: C.border, alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <Animated.View style={{ width: '100%', opacity: fade, transform: [{ translateY: slide }] }}>
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>Get started</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 36 }}>Start your transformation today.</Text>
            <View style={{ gap: 12 }}>
              <Btn label="Create Account" onPress={onGetStarted} />
              <Btn label="Sign In" onPress={onSignIn} variant="secondary" />
            </View>
            <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 28 }}>
              Personalized nutrition & training plans{'\n'}powered by your body data.
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={{ position: 'absolute', top: '25%', width: glowSize, height: glowSize, borderRadius: 999, backgroundColor: C.purple, opacity: glowOpa, transform: [{ translateY: -60 }] }} />
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: slide }], width: '100%' }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 34 }}>⚡</Text>
        </View>
        <Text style={{ color: C.text, fontSize: 42, fontWeight: '800', letterSpacing: -1, textAlign: 'center' }}>PULSE</Text>
        <Text style={{ color: C.purple, fontSize: 13, letterSpacing: 3, marginTop: 4 }}>HEALTH COACH</Text>
        <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center', marginTop: 20, lineHeight: 22 }}>Your intelligent fitness companion.{'\n'}Track nutrition, training, and progress.</Text>
        <View style={{ width: '100%', marginTop: 48, gap: 12 }}>
          <Btn label="Get Started" onPress={onGetStarted} />
          <Btn label="I already have an account" onPress={onSignIn} variant="secondary" />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onBack, initialMode = 'signup' }) {
  const [mode,     setMode]     = useState(initialMode);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setError('');
    if (!/\S+@\S+\.\S+/.test(email))   { setError('Enter a valid email.'); return; }
    if (password.length < 6)            { setError('Password needs at least 6 characters.'); return; }
    if (mode === 'signup' && username.length < 3) { setError('Username needs at least 3 characters.'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: username.trim() } },
        });
        if (signUpErr) throw signUpErr;
        if (data.user && !data.session) {
          setError('Check your email and confirm your account before signing in.');
          return;
        }
        if (data.user && data.session) {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: data.user.id, username: username.trim(), profile_complete: false,
          }, { onConflict: 'id' });
          if (profileErr && profileErr.code !== '23505') throw profileErr;
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) throw signInErr;
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('breach')) {
        setError('This password has been found in a known data breach. Please choose a different password.');
      } else {
        setError(msg || 'Something went wrong.');
      }
    } finally { setLoading(false); }
  };

  const isDesktop = useIsDesktop();
  const formContent = (
    <>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 28 }}>
        <Text style={{ color: C.muted, fontSize: 14 }}>← Back</Text>
      </TouchableOpacity>
      <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>{mode === 'signup' ? 'Create account' : 'Welcome back'}</Text>
      <Text style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>{mode === 'signup' ? 'Start your transformation today.' : 'Continue your journey.'}</Text>
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, padding: 4, marginBottom: 24 }}>
        {['signup', 'signin'].map(m => (
          <TouchableOpacity key={m} onPress={() => setMode(m)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: mode === m ? C.purple : 'transparent' }}>
            <Text style={{ color: mode === m ? '#fff' : C.dim, fontWeight: '600', fontSize: 13 }}>{m === 'signup' ? 'Sign Up' : 'Sign In'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'signup' && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="e.g. alexfit" placeholderTextColor={C.dim} />
        </View>
      )}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={C.dim} />
      </View>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Min. 6 characters" placeholderTextColor={C.dim} />
      </View>
      {error ? <Text style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}
      <Btn label={mode === 'signup' ? 'Create Account' : 'Sign In'} onPress={submit} loading={loading} />
    </>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 460, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 40 }}>
          {formContent}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, paddingTop: 60 }}>
        {formContent}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── SETUP FLOW ───────────────────────────────────────────────────────────────
function SetupScreen({ onComplete, userId }) {
  const [step,         setStep]         = useState(0);
  const slideAnim                       = useRef(new Animated.Value(0)).current;
  const [goal,         setGoal]         = useState('maintain');
  const [sex,          setSex]          = useState('male');
  const [age,          setAge]          = useState('');
  const [height,       setHeight]       = useState('');
  const [weight,       setWeight]       = useState('');
  const [bodyFat,      setBodyFat]      = useState('');
  const [activity,     setActivity]     = useState('moderate');
  const [trainingType, setTrainingType] = useState('mixed');
  const [trainingDays, setTrainingDays] = useState('3');
  const [diet,         setDiet]         = useState('standard');
  const [sleep,        setSleep]        = useState('7');
  const [timeFrame,    setTimeFrame]    = useState('3');
  const [waterTarget,  setWaterTarget]  = useState('2500');
  const [saving,       setSaving]       = useState(false);

  const animateStep = (dir) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir *  30, duration: 0,   useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,         duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => { animateStep(1); setStep(s => s + 1); };
  const goBack = () => { if (step === 0) return; animateStep(-1); setStep(s => s - 1); };

  const finish = async () => {
    setSaving(true);
    const profileData = {
      goal, sex, age: Number(age), height_cm: Number(height),
      weight_kg: Number(weight), body_fat_pct: bodyFat ? Number(bodyFat) : null,
      activity, training_type: trainingType, training_days: Number(trainingDays),
      diet, sleep_hours: Number(sleep), time_frame: Number(timeFrame),
      water_target: Number(waterTarget), profile_complete: true,
    };
    try {
      const { error } = await supabase.from('profiles').update(profileData).eq('id', userId);
      if (error) throw error;
      onComplete(profileData);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  const STEPS = ['Goal', 'Body', 'Training', 'Preferences'];

  const isDesktop = useIsDesktop();
  const maxW = isDesktop ? 640 : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: isDesktop ? 32 : 56, paddingHorizontal: 24, paddingBottom: 16, alignItems: isDesktop ? 'center' : undefined }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, width: '100%', maxWidth: maxW, alignSelf: isDesktop ? 'center' : undefined }}>
          {STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? C.purple : C.subtle }} />)}
        </View>
        <View style={{ maxWidth: maxW, alignSelf: isDesktop ? 'center' : undefined, width: '100%' }}>
          <Text style={{ color: C.dim, fontSize: 12, letterSpacing: 1.5 }}>STEP {step + 1} OF {STEPS.length}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{STEPS[step]}</Text>
        </View>
      </View>

      <Animated.ScrollView style={{ flex: 1, transform: [{ translateX: slideAnim }] }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, alignItems: isDesktop ? 'center' : undefined }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: maxW }}>

        {step === 0 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>What's your main goal?</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>This shapes your entire nutrition and training plan.</Text>
            {GOALS.map(g => (
              <TouchableOpacity key={g.id} onPress={() => setGoal(g.id)} style={{ backgroundColor: goal === g.id ? C.card : C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: goal === g.id ? g.color : C.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: goal === g.id ? g.color : C.elevated, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 18, color: '#fff' }}>{g.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{g.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{g.desc}</Text>
                </View>
                {goal === g.id && <Text style={{ color: g.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>Your body data</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Used to calculate your personal calorie and macro targets.</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Biological sex</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {['male', 'female'].map(s => <Chip key={s} label={s === 'male' ? 'Male' : 'Female'} active={sex === s} onPress={() => setSex(s)} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Age</Text><TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 28" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Height (cm)</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="e.g. 175" placeholderTextColor={C.dim} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Weight (kg)</Text><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="e.g. 75" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Body fat % <Text style={{ color: C.dim }}>(optional)</Text></Text><TextInput style={styles.input} value={bodyFat} onChangeText={setBodyFat} keyboardType="number-pad" placeholder="e.g. 18" placeholderTextColor={C.dim} /></View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>Activity & training</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Determines your TDEE — calories you actually burn each day.</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Daily activity level</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setActivity(a.id)} style={{ backgroundColor: activity === a.id ? C.card : C.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: activity === a.id ? C.purple : C.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{a.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{a.desc}</Text>
                </View>
                {activity === a.id && <Text style={{ color: C.purple }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8, marginTop: 16 }}>Training style</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TRAINING_TYPES.map(t => <Chip key={t.id} label={t.label} active={trainingType === t.id} onPress={() => setTrainingType(t.id)} />)}
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6, marginTop: 16 }}>Training days per week</Text>
            <TextInput style={[styles.input, { width: 100 }]} value={trainingDays} onChangeText={setTrainingDays} keyboardType="number-pad" placeholder="e.g. 4" placeholderTextColor={C.dim} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>Preferences</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>Fine-tune your plan to match your lifestyle.</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Diet style</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {DIET_TYPES.map(d => <Chip key={d.id} label={d.label} active={diet === d.id} onPress={() => setDiet(d.id)} small />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Sleep (hours)</Text><TextInput style={styles.input} value={sleep} onChangeText={setSleep} keyboardType="number-pad" placeholder="7" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Time frame (months)</Text><TextInput style={styles.input} value={timeFrame} onChangeText={setTimeFrame} keyboardType="number-pad" placeholder="3" placeholderTextColor={C.dim} /></View>
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Daily water target (ml)</Text>
            <TextInput style={[styles.input, { width: 140 }]} value={waterTarget} onChangeText={setWaterTarget} keyboardType="number-pad" placeholder="2500" placeholderTextColor={C.dim} />
            {/* Live preview */}
            <Card style={{ marginTop: 20 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Your macro preview</Text>
              {(() => {
                const m = calcMacros({ weight: Number(weight), height: Number(height), age: Number(age), sex, goal, activity });
                return m
                  ? <><Text style={{ color: C.text, fontWeight: '700', fontSize: 18 }}>{m.calories} kcal / day</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>P: {m.protein}g  ·  C: {m.carbs}g  ·  F: {m.fats}g</Text></>
                  : <Text style={{ color: C.dim, fontSize: 12 }}>Fill in body data to see the preview.</Text>;
              })()}
            </Card>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          {step > 0 && <Btn label="Back" onPress={goBack} variant="secondary" style={{ flex: 1 }} />}
          {step < 3
            ? <Btn label="Continue →" onPress={goNext} style={{ flex: 2 }} />
            : <Btn label="Build My Plan →" onPress={finish} loading={saving} style={{ flex: 2 }} />}
        </View>
      </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ profile, macros, today, onAddWater, onResetWater, streak }) {
  const quote      = useRef(randomFrom(QUOTES)).current;
  const isDesktop  = useIsDesktop();
  const consumed   = today.food_log.reduce((s, f) => s + f.cal, 0);
  const pConsumed  = today.food_log.reduce((s, f) => s + f.p,   0);
  const cConsumed  = today.food_log.reduce((s, f) => s + f.c,   0);
  const fConsumed  = today.food_log.reduce((s, f) => s + f.f,   0);
  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 100, alignItems: isDesktop ? 'center' : undefined }}>
    <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ color: C.muted, fontSize: 13 }}>{todayStr()}</Text>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', marginTop: 2 }}>{getGreeting()}{profile.username ? `, ${profile.username}` : ''} 👋</Text>
      </View>
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <CalorieRing consumed={consumed} goal={macros?.calories || 2000} />
        </View>
        <View style={{ marginTop: 16 }}>
          <MacroBar label="Protein" value={Math.round(pConsumed)} goal={macros?.protein || 150} color={C.purple} />
          <MacroBar label="Carbs"   value={Math.round(cConsumed)} goal={macros?.carbs   || 200} color={C.cyan}   />
          <MacroBar label="Fats"    value={Math.round(fConsumed)} goal={macros?.fats    || 60}  color={C.amber}  />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <StreakBadge streak={streak} />
        <Card style={{ flex: 2, marginBottom: 0 }}>
          <Text style={{ color: C.purple, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>TODAY'S THOUGHT</Text>
          <Text style={{ color: C.text, fontSize: 13, lineHeight: 19, fontStyle: 'italic' }}>"{quote}"</Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: C.cyan, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>HYDRATION</Text>
        <WaterGlass current={today.water_ml} target={profile.water_target || 2500} onAdd={onAddWater} onReset={onResetWater} />
      </Card>
      {macros && (
        <Card>
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>YOUR DAILY TARGETS</Text>
          {[
            { label: 'Calories', value: `${macros.calories} kcal`, color: C.purple },
            { label: 'Protein',  value: `${macros.protein}g`,      color: C.purple },
            { label: 'Carbs',    value: `${macros.carbs}g`,        color: C.cyan   },
            { label: 'Fats',     value: `${macros.fats}g`,         color: C.amber  },
            { label: 'BMR',      value: `${macros.bmr} kcal`,      color: C.dim    },
            { label: 'TDEE',     value: `${macros.tdee} kcal`,     color: C.dim    },
          ].map(row => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ color: row.color, fontWeight: '700', fontSize: 13 }}>{row.value}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
    </ScrollView>
  );
}

// ─── LOG TAB ──────────────────────────────────────────────────────────────────
function LogTab({ today, onAddFood, onRemoveFood }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [meal,    setMeal]    = useState('breakfast');
  const search = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setResults(FOOD_DB.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8));
  }, []);
  const meals      = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const totalCal   = today.food_log.reduce((s, f) => s + f.cal, 0);
  const isDesktop  = useIsDesktop();
  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 100, alignItems: isDesktop ? 'center' : undefined }} keyboardShouldPersistTaps="handled">
    <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 16 }}>Nutrition Log</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {meals.map(m => <Chip key={m} label={m.charAt(0).toUpperCase() + m.slice(1)} active={meal === m} onPress={() => setMeal(m)} small />)}
      </View>
      <View style={{ backgroundColor: C.card, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 }}>
        <Text style={{ color: C.dim, marginRight: 8 }}>🔍</Text>
        <TextInput style={{ flex: 1, color: C.text, paddingVertical: 12, fontSize: 14 }} value={query} onChangeText={search} placeholder="Search foods…" placeholderTextColor={C.dim} />
        {query ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}><Text style={{ color: C.dim, fontSize: 18 }}>×</Text></TouchableOpacity> : null}
      </View>
      {results.map(f => (
        <TouchableOpacity key={f.id} onPress={() => { onAddFood({ ...f, meal, logId: Date.now().toString() + f.id }); setQuery(''); setResults([]); }} style={{ backgroundColor: C.elevated, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{f.name}</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{f.unit}  ·  P: {f.p}g  C: {f.c}g  F: {f.f}g</Text>
          </View>
          <Text style={{ color: C.purple, fontWeight: '700', fontSize: 14, marginRight: 8 }}>{f.cal} kcal</Text>
          <Text style={{ color: C.green, fontSize: 20 }}>＋</Text>
        </TouchableOpacity>
      ))}
      {meals.map(m => {
        const items   = today.food_log.filter(f => f.meal === m);
        if (!items.length) return null;
        const mealCal = items.reduce((s, f) => s + f.cal, 0);
        return (
          <View key={m} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
              <Text style={{ color: C.purple, fontSize: 12 }}>{mealCal} kcal</Text>
            </View>
            {items.map(f => (
              <View key={f.logId} style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>{f.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>P: {f.p}g  C: {f.c}g  F: {f.f}g</Text>
                </View>
                <Text style={{ color: C.amber, fontWeight: '700', marginRight: 12 }}>{f.cal} kcal</Text>
                <TouchableOpacity onPress={() => onRemoveFood(f.logId)}><Text style={{ color: C.red, fontSize: 18 }}>×</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}
      {today.food_log.length > 0 && (
        <Card style={{ marginTop: 16 }} glow>
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>TODAY'S TOTALS</Text>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 22 }}>{totalCal} kcal</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            P: {Math.round(today.food_log.reduce((s,f)=>s+f.p,0))}g  ·  C: {Math.round(today.food_log.reduce((s,f)=>s+f.c,0))}g  ·  F: {Math.round(today.food_log.reduce((s,f)=>s+f.f,0))}g
          </Text>
        </Card>
      )}
    </View>
    </ScrollView>
  );
}

// ─── TRAIN TAB ────────────────────────────────────────────────────────────────
function TrainTab({ today, onLogSet, onAddExercise, onFinishWorkout, streak }) {
  const [activeCategory, setActiveCategory] = useState('Push');
  const [showExercises,  setShowExercises]  = useState(false);
  const [setInputs,      setSetInputs]      = useState({});
  const categories = Object.keys(EXERCISES);
  const days       = ['M','T','W','T','F','S','S'];
  const dayOfWeek  = new Date().getDay();
  const totalSets  = today.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVol   = today.exercises.reduce((s, e) => s + e.sets.reduce((ss, set) => ss + (set.weight||0)*(set.reps||0), 0), 0);
  const isDesktop  = useIsDesktop();
  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 100, alignItems: isDesktop ? 'center' : undefined }}>
    <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>Training</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {days.map((d, i) => {
          const idx     = i === 6 ? 0 : i + 1;
          const isToday = idx === dayOfWeek;
          return <View key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? C.purple : C.card, borderWidth: 1, borderColor: isToday ? C.purple : C.border }}><Text style={{ color: isToday ? '#fff' : C.dim, fontSize: 11, fontWeight: isToday ? '700' : '400' }}>{d}</Text></View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Exercises', value: today.exercises.length, color: C.purple }, { label: 'Total sets', value: totalSets, color: C.cyan }, { label: 'Volume kg', value: totalVol, color: C.amber }].map(s => (
          <Card key={s.label} style={{ flex: 1, marginBottom: 0, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: s.color, fontWeight: '800', fontSize: 22 }}>{s.value}</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.label}</Text>
          </Card>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {categories.map(cat => <Chip key={cat} label={cat} active={activeCategory === cat} onPress={() => setActiveCategory(cat)} small />)}
      </View>
      <TouchableOpacity onPress={() => setShowExercises(v => !v)} style={{ backgroundColor: C.elevated, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.borderBright }}>
        <Text style={{ color: C.purple, fontSize: 20, marginRight: 10 }}>+</Text>
        <Text style={{ color: C.text, fontWeight: '600' }}>Add exercise from {activeCategory}</Text>
      </TouchableOpacity>
      {showExercises && (
        <Card style={{ marginBottom: 16 }}>
          {EXERCISES[activeCategory].map(ex => (
            <TouchableOpacity key={ex.id} onPress={() => { onAddExercise(ex); setShowExercises(false); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{ex.name}</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>{ex.muscles}</Text>
              </View>
              <Text style={{ color: C.green, fontSize: 20 }}>＋</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}
      {today.exercises.map((ex, ei) => (
        <Card key={ei} style={{ marginBottom: 10 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 10 }}>{ex.name}</Text>
          {ex.sets.map((set, si) => (
            <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{si + 1}</Text>
              </View>
              <Text style={{ color: C.text, fontSize: 13 }}>{set.weight > 0 ? `${set.weight}kg` : '—'}  ×  {set.reps} reps</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <TextInput style={[styles.input, { flex: 1, paddingVertical: 8 }]} placeholder="kg" placeholderTextColor={C.dim} keyboardType="number-pad" value={setInputs[ex.id]?.weight||''} onChangeText={v => setSetInputs(p => ({ ...p, [ex.id]: { ...p[ex.id], weight: v } }))} />
            <TextInput style={[styles.input, { flex: 1, paddingVertical: 8 }]} placeholder="reps" placeholderTextColor={C.dim} keyboardType="number-pad" value={setInputs[ex.id]?.reps||''} onChangeText={v => setSetInputs(p => ({ ...p, [ex.id]: { ...p[ex.id], reps: v } }))} />
            <TouchableOpacity onPress={() => { const inp = setInputs[ex.id]||{}; onLogSet(ei, { weight: Number(inp.weight)||0, reps: Number(inp.reps)||0 }); setSetInputs(p => ({ ...p, [ex.id]: {} })); }} style={{ backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Log</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
      {today.exercises.length > 0 && (
        <Btn label={today.completed ? '✓ Workout Complete!' : 'Finish Workout'} onPress={onFinishWorkout} variant={today.completed ? 'secondary' : 'primary'} style={{ marginTop: 8 }} />
      )}
    </View>
    </ScrollView>
  );
}

// ─── ME TAB ───────────────────────────────────────────────────────────────────
function MeTab({ profile, macros, weights, onAddWeight, onLogout, onEditProfile }) {
  const [weightInput, setWeightInput] = useState('');
  const [saving,      setSaving]      = useState(false);
  const goalObj = GOALS.find(g => g.id === profile.goal);
  const handleAddWeight = async () => {
    if (!weightInput) return;
    setSaving(true);
    await onAddWeight(Number(weightInput));
    setWeightInput('');
    setSaving(false);
  };
  const isDesktop = useIsDesktop();
  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 100, alignItems: isDesktop ? 'center' : undefined }}>
    <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.elevated, borderWidth: 2, borderColor: C.purple, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 20 }}>{profile.username || 'Athlete'}</Text>
        {goalObj && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: C.elevated, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: goalObj.color, marginRight: 6 }}>{goalObj.icon}</Text>
            <Text style={{ color: goalObj.color, fontSize: 12, fontWeight: '600' }}>{goalObj.label}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Weight',   value: `${profile.weight_kg ?? '—'}kg`,    icon: '⚖' },
          { label: 'Height',   value: `${profile.height_cm ?? '—'}cm`,    icon: '↕' },
          { label: 'Age',      value: `${profile.age ?? '—'}y`,           icon: '◌' },
          { label: 'Body fat', value: profile.body_fat_pct ? `${profile.body_fat_pct}%` : '—', icon: '%' },
        ].map(s => (
          <Card key={s.label} style={{ flex: 1, marginBottom: 0, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: C.purple, fontSize: 16 }}>{s.icon}</Text>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, marginTop: 4 }}>{s.value}</Text>
            <Text style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>{s.label}</Text>
          </Card>
        ))}
      </View>
      {macros && (
        <Card>
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>MACRO PLAN</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[{ label: 'Calories', v: macros.calories, unit: 'kcal', color: C.purple }, { label: 'Protein', v: macros.protein, unit: 'g', color: C.purple }, { label: 'Carbs', v: macros.carbs, unit: 'g', color: C.cyan }, { label: 'Fats', v: macros.fats, unit: 'g', color: C.amber }].map(m => (
              <View key={m.label} style={{ alignItems: 'center' }}>
                <Text style={{ color: m.color, fontWeight: '800', fontSize: 20 }}>{m.v}</Text>
                <Text style={{ color: C.dim, fontSize: 10 }}>{m.unit}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
      <Card>
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>WEIGHT HISTORY</Text>
        <WeightChart weights={weights} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <TextInput style={[styles.input, { flex: 1, paddingVertical: 9 }]} value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder="Today's weight (kg)" placeholderTextColor={C.dim} />
          <Btn label="Log" onPress={handleAddWeight} loading={saving} style={{ paddingHorizontal: 20, paddingVertical: 9 }} />
        </View>
        {weights.length > 0 && <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Last: {weights[weights.length-1]?.weight_kg}kg on {weights[weights.length-1]?.logged_at}</Text>}
      </Card>
      <View style={{ gap: 10 }}>
        <Btn label="Edit Profile" onPress={onEditProfile} variant="secondary" />
        <Btn label="Sign Out" onPress={onLogout} variant="ghost" />
      </View>
    </View>
    </ScrollView>
  );
}

// ─── AI COACH MODAL ───────────────────────────────────────────────────────────
function CoachModal({ visible, onClose, macros }) {
  const [messages, setMessages] = useState([{ from: 'coach', text: "Hey! I'm your PULSE coach. Ask me anything about nutrition, training, or recovery." }]);
  const [input,    setInput]    = useState('');
  const [typing,   setTyping]   = useState(false);
  const scroll                  = useRef(null);
  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(prev => [...prev, { from: 'user', text: txt }]);
    setInput(''); setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'coach', text: getCoachReply(txt, macros) }]);
      setTyping(false);
    }, 900 + Math.random() * 700);
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>⚡ AI Coach</Text>
            <Text style={{ color: C.green, fontSize: 11, marginTop: 2 }}>● Online</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}><Text style={{ color: C.muted, fontSize: 22 }}>×</Text></TouchableOpacity>
        </View>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 12 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((msg, i) => (
            <View key={i} style={{ flexDirection: msg.from === 'user' ? 'row-reverse' : 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 }}>
              {msg.from === 'coach' && <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>⚡</Text></View>}
              <View style={{ maxWidth: '80%', backgroundColor: msg.from === 'user' ? C.purple : C.card, borderRadius: 16, padding: 12, borderBottomRightRadius: msg.from === 'user' ? 4 : 16, borderBottomLeftRadius: msg.from === 'coach' ? 4 : 16, borderWidth: 1, borderColor: msg.from === 'user' ? C.purple : C.border }}>
                <Text style={{ color: C.text, fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
              </View>
            </View>
          ))}
          {typing && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>⚡</Text></View>
              <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border }}><Text style={{ color: C.muted }}>...</Text></View>
            </View>
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          {['Protein tips', 'Best training split', 'Sleep better', 'Water intake', 'Calorie deficit'].map(s => (
            <TouchableOpacity key={s} onPress={() => setInput(s)} style={{ backgroundColor: C.elevated, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: C.border }}><Text style={{ color: C.muted, fontSize: 12 }}>{s}</Text></TouchableOpacity>
          ))}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <TextInput style={[styles.input, { flex: 1, paddingVertical: 10 }]} value={input} onChangeText={setInput} placeholder="Ask your coach…" placeholderTextColor={C.dim} onSubmitEditing={send} returnKeyType="send" />
            <TouchableOpacity onPress={send} style={{ backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>↑</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: 'TODAY', label: 'Today',     icon: '◎' },
  { id: 'LOG',   label: 'Nutrition', icon: '⊕' },
  { id: 'TRAIN', label: 'Train',     icon: '△' },
  { id: 'ME',    label: 'Me',        icon: '◉' },
];

function TabBar({ active, onPress, onCoach }) {
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', paddingBottom: Platform.OS === 'ios' ? 24 : 10, paddingTop: 10 }}>
      {NAV_TABS.map(t => (
        <TouchableOpacity key={t.id} onPress={() => onPress(t.id)} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: active === t.id ? C.purple : C.dim }}>{t.icon}</Text>
          <Text style={{ fontSize: 10, color: active === t.id ? C.purple : C.dim, marginTop: 3, fontWeight: active === t.id ? '700' : '400' }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onCoach} style={{ position: 'absolute', right: 16, top: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', shadowColor: C.purple, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        <Text style={{ fontSize: 22 }}>⚡</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SIDEBAR (desktop) ───────────────────────────────────────────────────────
function Sidebar({ active, onPress, onCoach, username }) {
  return (
    <View style={{ width: 240, backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.border, paddingTop: 32, paddingBottom: 24, paddingHorizontal: 16, justifyContent: 'space-between' }}>
      <View>
        {/* Logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 36, paddingHorizontal: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18 }}>⚡</Text>
          </View>
          <View>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, letterSpacing: -0.5 }}>PULSE</Text>
            <Text style={{ color: C.dim, fontSize: 10, letterSpacing: 1 }}>HEALTH COACH</Text>
          </View>
        </View>
        {/* Nav items */}
        {NAV_TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => onPress(t.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, marginBottom: 4, backgroundColor: active === t.id ? C.elevated : 'transparent', borderWidth: active === t.id ? 1 : 0, borderColor: active === t.id ? C.border : 'transparent' }}>
            <Text style={{ fontSize: 16, color: active === t.id ? C.purple : C.dim }}>{t.icon}</Text>
            <Text style={{ color: active === t.id ? C.text : C.muted, fontWeight: active === t.id ? '600' : '400', fontSize: 14 }}>{t.label}</Text>
            {active === t.id && <View style={{ flex: 1 }} />}
            {active === t.id && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.purple }} />}
          </TouchableOpacity>
        ))}
      </View>
      {/* Bottom: AI Coach + user */}
      <View style={{ gap: 10 }}>
        <TouchableOpacity onPress={onCoach} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 16 }}>⚡</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>AI Coach</Text>
        </TouchableOpacity>
        {username ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12 }}>👤</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{username}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const SCREENS = { WELCOME: 'WELCOME', AUTH: 'AUTH', SETUP: 'SETUP', MAIN: 'MAIN' };

export default function App() {
  const [screen,       setScreen]       = useState(SCREENS.WELCOME);
  const [authMode,     setAuthMode]     = useState('signup');
  const [user,         setUser]         = useState(null);
  const [loadingAuth,  setLoadingAuth]  = useState(true);
  const [tab,          setTab]          = useState('TODAY');
  const [coachVisible, setCoachVisible] = useState(false);
  const isDesktop = useIsDesktop();

  const [profile, setProfile] = useState({ username: '', sex: 'male', age: null, height_cm: null, weight_kg: null, body_fat_pct: null, activity: 'moderate', goal: 'maintain', training_type: 'mixed', training_days: 3, diet: 'standard', sleep_hours: 7, time_frame: 3, water_target: 2500 });
  const [todayLog, setTodayLog] = useState({ food_log: [], water_ml: 0, id: null });
  const [workout,  setWorkout]  = useState({ exercises: [], completed: false, id: null });
  const [streak,   setStreak]   = useState(0);
  const [weights,  setWeights]  = useState([]);

  const macros = calcMacros({ weight: profile.weight_kg, height: profile.height_cm, age: profile.age, sex: profile.sex, goal: profile.goal, activity: profile.activity });

  // ── Supabase auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUserData(session.user);
      else { setScreen(SCREENS.WELCOME); setLoadingAuth(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUserData(session.user);
      else { setUser(null); setScreen(SCREENS.WELCOME); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (u) => {
    setUser(u);
    try {
      const [profileRes, dailyRes, workoutRes, streakRes, weightsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', u.id).single(),
        supabase.from('daily_logs').select('*').eq('user_id', u.id).eq('log_date', todayISO()).single(),
        supabase.from('workouts').select('*').eq('user_id', u.id).eq('workout_date', todayISO()).single(),
        supabase.from('streaks').select('*').eq('user_id', u.id).single(),
        supabase.from('weight_history').select('*').eq('user_id', u.id).order('logged_at', { ascending: true }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (dailyRes.data)   setTodayLog({ ...dailyRes.data, food_log: dailyRes.data.food_log || [] });
      if (workoutRes.data) setWorkout({ ...workoutRes.data, exercises: workoutRes.data.exercises || [] });
      if (streakRes.data)  setStreak(streakRes.data.current_streak || 0);
      if (weightsRes.data) setWeights(weightsRes.data);
      setScreen(profileRes.data?.profile_complete ? SCREENS.MAIN : SCREENS.SETUP);
    } catch {
      setScreen(SCREENS.SETUP);
    }
    setLoadingAuth(false);
  };

  // ── Persist today's food log + water ──
  const saveDailyLog = async (newLog) => {
    if (!user) return;
    const payload = { user_id: user.id, log_date: todayISO(), food_log: newLog.food_log, water_ml: newLog.water_ml };
    if (newLog.id) {
      await supabase.from('daily_logs').update(payload).eq('id', newLog.id);
    } else {
      const { data } = await supabase.from('daily_logs').insert(payload).select().single();
      if (data) return { ...newLog, id: data.id };
    }
    return newLog;
  };

  // ── Persist workout ──
  const saveWorkout = async (newWorkout) => {
    if (!user) return;
    const payload = { user_id: user.id, workout_date: todayISO(), exercises: newWorkout.exercises, completed: newWorkout.completed };
    if (newWorkout.id) {
      await supabase.from('workouts').update(payload).eq('id', newWorkout.id);
    } else {
      const { data } = await supabase.from('workouts').insert(payload).select().single();
      if (data) return { ...newWorkout, id: data.id };
    }
    return newWorkout;
  };

  // ── Handlers ──
  const handleAddFood = async (food) => {
    const newLog = { ...todayLog, food_log: [...todayLog.food_log, food] };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
  };

  const handleRemoveFood = async (logId) => {
    const newLog = { ...todayLog, food_log: todayLog.food_log.filter(f => f.logId !== logId) };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
  };

  const handleAddWater = async (ml) => {
    const newLog = { ...todayLog, water_ml: todayLog.water_ml + ml };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
  };

  const handleResetWater = async () => {
    const newLog = { ...todayLog, water_ml: 0 };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
  };

  const handleAddExercise = async (ex) => {
    const newW  = { ...workout, exercises: [...workout.exercises, { ...ex, sets: [] }] };
    const saved = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleLogSet = async (exIndex, set) => {
    const exs      = [...workout.exercises];
    exs[exIndex]   = { ...exs[exIndex], sets: [...exs[exIndex].sets, set] };
    const newW     = { ...workout, exercises: exs };
    const saved    = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleFinishWorkout = async () => {
    const newW  = { ...workout, completed: true };
    const saved = await saveWorkout(newW);
    setWorkout(saved || newW);
    const newStreak = streak + 1;
    setStreak(newStreak);
    await supabase.from('streaks').upsert({ user_id: user.id, current_streak: newStreak, last_workout_date: todayISO() }, { onConflict: 'user_id' });
    Alert.alert('Workout Complete! 🔥', `${newStreak} day streak — keep going!`);
  };

  const handleAddWeight = async (kg) => {
    const { data } = await supabase.from('weight_history').insert({ user_id: user.id, weight_kg: kg, logged_at: todayISO() }).select().single();
    if (data) setWeights(prev => [...prev, data]);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        setTodayLog({ food_log: [], water_ml: 0, id: null });
        setWorkout({ exercises: [], completed: false, id: null });
        setStreak(0); setWeights([]);
      }},
    ]);
  };

  const handleSetupComplete = (p) => {
    setProfile(prev => ({ ...prev, ...p }));
    setScreen(SCREENS.MAIN);
  };

  if (loadingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚡</Text>
        <ActivityIndicator color={C.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />

      {screen === SCREENS.WELCOME && (
        <WelcomeScreen
          onGetStarted={() => { setAuthMode('signup'); setScreen(SCREENS.AUTH); }}
          onSignIn={() => { setAuthMode('signin'); setScreen(SCREENS.AUTH); }}
        />
      )}

      {screen === SCREENS.AUTH && (
        <AuthScreen onBack={() => setScreen(SCREENS.WELCOME)} initialMode={authMode} />
      )}

      {screen === SCREENS.SETUP && (
        <SetupScreen onComplete={handleSetupComplete} userId={user?.id} />
      )}

      {screen === SCREENS.MAIN && (
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
          {isDesktop && <Sidebar active={tab} onPress={setTab} onCoach={() => setCoachVisible(true)} username={profile.username} />}
          <View style={{ flex: 1 }}>
            {tab === 'TODAY' && <TodayTab profile={profile} macros={macros} today={todayLog} onAddWater={handleAddWater} onResetWater={handleResetWater} streak={streak} />}
            {tab === 'LOG'   && <LogTab today={todayLog} onAddFood={handleAddFood} onRemoveFood={handleRemoveFood} />}
            {tab === 'TRAIN' && <TrainTab today={workout} onLogSet={handleLogSet} onAddExercise={handleAddExercise} onFinishWorkout={handleFinishWorkout} streak={streak} />}
            {tab === 'ME'    && <MeTab profile={profile} macros={macros} weights={weights} onAddWeight={handleAddWeight} onLogout={handleLogout} onEditProfile={() => setScreen(SCREENS.SETUP)} />}
          </View>
          {!isDesktop && <TabBar active={tab} onPress={setTab} onCoach={() => setCoachVisible(true)} />}
          <CoachModal visible={coachVisible} onClose={() => setCoachVisible(false)} macros={macros} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = {
  input: {
    backgroundColor: C.elevated, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border,
  },
};

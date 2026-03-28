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
import { checkRateLimit, showRateLimitAlert, LIMITS } from './src/utils/rateLimiter';
import FoodScannerModal from './src/components/FoodScannerModal';

const { width: W } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DESKTOP_BP = 768;
function useIsDesktop() { const { width } = useWindowDimensions(); return width >= DESKTOP_BP; }

// ─── THEME ──────────────────────────────────────────────────────────────────
const C = {
  bg:           '#06060F',
  surface:      '#0D0D1F',
  card:         '#12122A',
  elevated:     '#1A1A35',
  border:       'rgba(139,92,246,0.18)',
  borderBright: 'rgba(139,92,246,0.45)',
  purple:       '#9D6FFF',
  purpleD:      '#7C3AED',
  purpleGlow:   'rgba(157,111,255,0.15)',
  cyan:         '#22D3EE',
  green:        '#10B981',
  amber:        '#FBBF24',
  red:          '#F87171',
  text:         '#F0EEFF',
  muted:        '#9B93B8',
  dim:          '#4B4570',
  subtle:       '#16163A',
};

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const STRINGS = {
  en: {
    navToday:'Today', navNutrition:'Nutrition', navTrain:'Train', navHistory:'History', navMe:'Me',
    today:'Today', hydration:'HYDRATION', todaysThought:"TODAY'S THOUGHT", dailyTargets:'YOUR DAILY TARGETS',
    nutritionLog:'Nutrition Log', breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snacks:'Snacks',
    searchFood:'Search food…', addCustom:'+ Add custom food', noResults:'No results. Add it manually?',
    customFoodName:'Food name', weightG:'Weight (g, optional)', calories:'Calories', protein:'Protein (g)',
    carbs:'Carbs (g)', fats:'Fats (g)', save:'Save', cancel:'Cancel',
    training:'Training', addExerciseFrom:'Add exercise from', logBtn:'Log',
    finishWorkout:'Finish Workout', workoutDone:'✓ Done — Tap to undo',
    exercises:'Exercises', totalSets:'Total sets', volumeKg:'Volume kg',
    weightHistory:'WEIGHT HISTORY', macroPlan:'MACRO PLAN', editProfile:'Edit Profile',
    signOut:'Sign Out', settings:'Settings', logWeight:'Log', weightPlaceholder:"Today's weight (kg)",
    settingsTitle:'Settings', language:'Language', english:'English', spanish:'Spanish',
    changeEmail:'Change Email', newEmail:'New email address', confirmEmail:'Confirm new email',
    changePassword:'Change Password', currentPassword:'Current password', newPassword:'New password (min 12 chars)', confirmPassword:'Confirm new password',
    resetPasswordEmail:'Forgot password? Reset via Email', resetSent:'Reset email sent! Check your inbox.',
    emailUpdated:'Email update sent! Check your new inbox to confirm.',
    passwordUpdated:'Password updated successfully!',
    passwordMismatch:'Passwords do not match.', emailMismatch:'Emails do not match.',
    wrongPassword:'Current password is incorrect.',
    close:'Close', aiCoach:'⚡ AI Coach', online:'● Online', askCoach:'Ask your coach…',
    historyEmpty:'No history yet.\nStart logging to see your progress here.',
    gotIt:'Got it!', remove:'Remove',
    // Greetings
    greeting_early:'Up early', greeting_morning:'Good morning', greeting_afternoon:'Good afternoon',
    greeting_evening:'Good evening', greeting_night:'Night owl',
    // Macro labels
    macroProtein:'Protein', macroCarbs:'Carbs', macroFats:'Fats', macroCalories:'Calories',
    labelBmr:'BMR', labelTdee:'TDEE', todaysTotals:"TODAY'S TOTALS",
    // Exercise categories
    cat_push:'Push', cat_pull:'Pull', cat_legs:'Legs', cat_core:'Core', cat_cardio:'Cardio',
    // Food form
    addFoodTo:'Add food to', addTo:'Add to', addFoodManually:'+ Add food manually',
    foodNameRequired:'Food name *', weightGLabel:'Weight (g)', caloriesKcalLabel:'Calories (kcal)',
    proteinGLabel:'Protein (g)', carbsGLabel:'Carbs (g)', fatGLabel:'Fat (g)',
    notFoundAddManually:'not found — add it manually',
    // Help modal
    helpTitle:'⚡ How to use Training',
    help1title:'Pick a category', help1desc:'Choose Push, Pull, Legs, Core or Cardio to browse exercises.',
    help2title:'Add an exercise', help2desc:'Tap "+ Add exercise" and select one from the list.',
    help3title:'Log a set', help3desc:'Enter the weight in kg and the number of reps, then tap Log. Repeat for each set.',
    help4title:'Edit or delete', help4desc:"Tap ✏ to fix a set's weight or reps. Tap ✕ on a set to delete it, or ✕ next to the exercise name to remove the whole exercise.",
    help5title:'Finish', help5desc:"When you're done, tap \"Finish Workout\" to save your session and add to your streak.",
    // Setup
    setup_step:'STEP', setup_of:'OF',
    setup_steps_0:'Goal', setup_steps_1:'Body', setup_steps_2:'Training', setup_steps_3:'Preferences',
    setup_goal_title:"What's your main goal?", setup_goal_sub:'This shapes your entire nutrition and training plan.',
    setup_body_title:'Your body data', setup_body_sub:'Used to calculate your personal calorie and macro targets.',
    setup_act_title:'Activity & training', setup_act_sub:'Determines your TDEE — calories you actually burn each day.',
    setup_prefs_title:'Preferences', setup_prefs_sub:'Fine-tune your plan to match your lifestyle.',
    setup_bioSex:'Biological sex', setup_male:'Male', setup_female:'Female',
    setup_age:'Age', setup_heightCm:'Height (cm)', setup_weightKg:'Weight (kg)',
    setup_bodyFat:'Body fat %', setup_optional:'optional',
    setup_actLevel:'Daily activity level', setup_trainStyle:'Training style',
    setup_trainDays:'Training days per week', setup_dietStyle:'Diet style',
    setup_sleepH:'Sleep (hours)', setup_timeFrame:'Time frame (months)',
    setup_waterTarget:'Daily water target (ml)', setup_macroPreview:'Your macro preview',
    setup_fillBody:'Fill in body data to see the preview.',
    setup_back:'Back', setup_continue:'Continue →', setup_buildPlan:'Build My Plan →',
    // Goals
    goal_lose_label:'Lose Fat', goal_lose_desc:'Caloric deficit + high protein',
    goal_maintain_label:'Maintain', goal_maintain_desc:'Hold your weight & energy',
    goal_gain_label:'Build Muscle', goal_gain_desc:'Caloric surplus + progressive load',
    goal_recomp_label:'Recomposition', goal_recomp_desc:'Lose fat and gain muscle at once',
    // Activity levels
    act_sedentary_label:'Sedentary', act_sedentary_desc:'Desk job, little movement',
    act_light_label:'Light', act_light_desc:'1–3 workouts / week',
    act_moderate_label:'Moderate', act_moderate_desc:'3–5 workouts / week',
    act_active_label:'Active', act_active_desc:'6–7 workouts / week',
    act_athlete_label:'Athlete', act_athlete_desc:'Two-a-days / heavy labor',
    // Diet / training types
    tt_standard:'Standard', tt_highprotein:'High Protein', tt_lowcarb:'Low Carb',
    tt_keto:'Keto', tt_vegan:'Vegan', tt_vegetarian:'Vegetarian',
    tt_weights:'Weights', tt_cardio:'Cardio', tt_hiit:'HIIT', tt_mixed:'Mixed', tt_calisthenics:'Calisthenics',
    // Welcome
    welcome_tagline:'Your intelligent fitness companion.\nTrack nutrition, training, and progress.\nBuilt for results.',
    welcome_tagline_short:'Your intelligent fitness companion.\nTrack nutrition, training, and progress.',
    welcome_getStarted:'Get Started', welcome_haveAccount:'I already have an account',
    welcome_startTitle:'Get started', welcome_startSub:'Start your transformation today.',
    welcome_createAccount:'Create Account', welcome_signIn:'Sign In',
    welcome_smartMacros:'Smart Macros', welcome_trainingLogs:'Training Logs', welcome_aiCoaching:'AI Coaching',
    welcome_powered:'Personalized nutrition & training plans\npowered by your body data.',
    // Auth
    auth_createTitle:'Create account', auth_welcomeBack:'Welcome back',
    auth_startTransform:'Start your transformation today.', auth_continueJourney:'Continue your journey.',
    auth_signUp:'Sign Up', auth_signIn:'Sign In',
    auth_username:'Username', auth_email:'Email', auth_password:'Password',
    auth_minPassword:'Min. 12 characters', auth_back:'← Back',
    auth_createBtn:'Create Account', auth_signInBtn:'Sign In',
  },
  es: {
    navToday:'Hoy', navNutrition:'Nutrición', navTrain:'Entrenar', navHistory:'Historial', navMe:'Yo',
    today:'Hoy', hydration:'HIDRATACIÓN', todaysThought:'PENSAMIENTO DEL DÍA', dailyTargets:'TUS OBJETIVOS DIARIOS',
    nutritionLog:'Registro de Nutrición', breakfast:'Desayuno', lunch:'Almuerzo', dinner:'Cena', snacks:'Snacks',
    searchFood:'Buscar alimento…', addCustom:'+ Agregar alimento personalizado', noResults:'Sin resultados. ¿Agregar manualmente?',
    customFoodName:'Nombre del alimento', weightG:'Peso (g, opcional)', calories:'Calorías', protein:'Proteína (g)',
    carbs:'Carbohidratos (g)', fats:'Grasas (g)', save:'Guardar', cancel:'Cancelar',
    training:'Entrenamiento', addExerciseFrom:'Agregar ejercicio de', logBtn:'Registrar',
    finishWorkout:'Terminar Entrenamiento', workoutDone:'✓ Listo — Toca para deshacer',
    exercises:'Ejercicios', totalSets:'Series totales', volumeKg:'Volumen kg',
    weightHistory:'HISTORIAL DE PESO', macroPlan:'PLAN DE MACROS', editProfile:'Editar Perfil',
    signOut:'Cerrar Sesión', settings:'Ajustes', logWeight:'Registrar', weightPlaceholder:'Peso de hoy (kg)',
    settingsTitle:'Ajustes', language:'Idioma', english:'Inglés', spanish:'Español',
    changeEmail:'Cambiar Email', newEmail:'Nuevo correo electrónico', confirmEmail:'Confirmar nuevo correo',
    changePassword:'Cambiar Contraseña', currentPassword:'Contraseña actual', newPassword:'Nueva contraseña (mín. 12 caracteres)', confirmPassword:'Confirmar nueva contraseña',
    resetPasswordEmail:'¿Olvidaste tu contraseña? Restablecer por Email', resetSent:'¡Email enviado! Revisa tu bandeja.',
    emailUpdated:'¡Actualización enviada! Confirma en tu nuevo correo.',
    passwordUpdated:'¡Contraseña actualizada correctamente!',
    passwordMismatch:'Las contraseñas no coinciden.', emailMismatch:'Los correos no coinciden.',
    wrongPassword:'La contraseña actual es incorrecta.',
    close:'Cerrar', aiCoach:'⚡ Coach IA', online:'● En línea', askCoach:'Pregunta a tu coach…',
    historyEmpty:'Sin historial aún.\nEmpieza a registrar para ver tu progreso.',
    gotIt:'¡Entendido!', remove:'Eliminar',
    // Greetings
    greeting_early:'Madrugador', greeting_morning:'Buenos días', greeting_afternoon:'Buenas tardes',
    greeting_evening:'Buenas noches', greeting_night:'Noctámbulo',
    // Macro labels
    macroProtein:'Proteína', macroCarbs:'Carbohidratos', macroFats:'Grasas', macroCalories:'Calorías',
    labelBmr:'TMB', labelTdee:'TDEE', todaysTotals:'TOTALES DE HOY',
    // Exercise categories
    cat_push:'Empujar', cat_pull:'Jalar', cat_legs:'Piernas', cat_core:'Core', cat_cardio:'Cardio',
    // Food form
    addFoodTo:'Agregar alimento a', addTo:'Agregar a', addFoodManually:'+ Agregar alimento manualmente',
    foodNameRequired:'Nombre del alimento *', weightGLabel:'Peso (g)', caloriesKcalLabel:'Calorías (kcal)',
    proteinGLabel:'Proteína (g)', carbsGLabel:'Carbohidratos (g)', fatGLabel:'Grasa (g)',
    notFoundAddManually:'no encontrado — agregar manualmente',
    // Help modal
    helpTitle:'⚡ Cómo usar Entrenamiento',
    help1title:'Elige una categoría', help1desc:'Selecciona Empujar, Jalar, Piernas, Core o Cardio para ver ejercicios.',
    help2title:'Agrega un ejercicio', help2desc:'Toca "+ Agregar ejercicio" y selecciona uno de la lista.',
    help3title:'Registra una serie', help3desc:'Ingresa el peso en kg y las repeticiones, luego toca Registrar. Repite para cada serie.',
    help4title:'Editar o eliminar', help4desc:'Toca ✏ para corregir el peso o las reps. Toca ✕ en una serie para eliminarla, o ✕ junto al ejercicio para quitarlo completo.',
    help5title:'Terminar', help5desc:'Cuando hayas terminado, toca "Terminar Entrenamiento" para guardar tu sesión y sumar a tu racha.',
    // Setup
    setup_step:'PASO', setup_of:'DE',
    setup_steps_0:'Meta', setup_steps_1:'Cuerpo', setup_steps_2:'Entrenamiento', setup_steps_3:'Preferencias',
    setup_goal_title:'¿Cuál es tu objetivo principal?', setup_goal_sub:'Esto define tu plan de nutrición y entrenamiento.',
    setup_body_title:'Tus datos corporales', setup_body_sub:'Usados para calcular tus objetivos de calorías y macros.',
    setup_act_title:'Actividad y entrenamiento', setup_act_sub:'Determina tu TDEE — las calorías que quemas cada día.',
    setup_prefs_title:'Preferencias', setup_prefs_sub:'Ajusta tu plan a tu estilo de vida.',
    setup_bioSex:'Sexo biológico', setup_male:'Masculino', setup_female:'Femenino',
    setup_age:'Edad', setup_heightCm:'Altura (cm)', setup_weightKg:'Peso (kg)',
    setup_bodyFat:'% de grasa corporal', setup_optional:'opcional',
    setup_actLevel:'Nivel de actividad diaria', setup_trainStyle:'Estilo de entrenamiento',
    setup_trainDays:'Días de entrenamiento por semana', setup_dietStyle:'Estilo de dieta',
    setup_sleepH:'Horas de sueño', setup_timeFrame:'Plazo (meses)',
    setup_waterTarget:'Meta de agua diaria (ml)', setup_macroPreview:'Vista previa de tus macros',
    setup_fillBody:'Completa los datos corporales para ver la vista previa.',
    setup_back:'Atrás', setup_continue:'Continuar →', setup_buildPlan:'Crear Mi Plan →',
    // Goals
    goal_lose_label:'Perder Grasa', goal_lose_desc:'Déficit calórico + alta proteína',
    goal_maintain_label:'Mantener', goal_maintain_desc:'Mantén tu peso y energía',
    goal_gain_label:'Ganar Músculo', goal_gain_desc:'Superávit calórico + carga progresiva',
    goal_recomp_label:'Recomposición', goal_recomp_desc:'Perder grasa y ganar músculo al mismo tiempo',
    // Activity levels
    act_sedentary_label:'Sedentario', act_sedentary_desc:'Trabajo de escritorio, poco movimiento',
    act_light_label:'Ligero', act_light_desc:'1–3 entrenamientos / semana',
    act_moderate_label:'Moderado', act_moderate_desc:'3–5 entrenamientos / semana',
    act_active_label:'Activo', act_active_desc:'6–7 entrenamientos / semana',
    act_athlete_label:'Atleta', act_athlete_desc:'Doble sesión / trabajo pesado',
    // Diet / training types
    tt_standard:'Estándar', tt_highProtein:'Alta Proteína', tt_lowCarb:'Bajo en Carbohidratos',
    tt_keto:'Keto', tt_vegan:'Vegano', tt_vegetarian:'Vegetariano',
    tt_weights:'Pesas', tt_cardio:'Cardio', tt_hiit:'HIIT', tt_mixed:'Mixto', tt_calisthenics:'Calistenia',
    // Welcome
    welcome_tagline:'Tu compañero inteligente de fitness.\nRegistra nutrición, entrenamiento y progreso.\nHecho para resultados.',
    welcome_tagline_short:'Tu compañero inteligente de fitness.\nRegistra nutrición, entrenamiento y progreso.',
    welcome_getStarted:'Comenzar', welcome_haveAccount:'Ya tengo una cuenta',
    welcome_startTitle:'Empieza hoy', welcome_startSub:'Comienza tu transformación hoy.',
    welcome_createAccount:'Crear Cuenta', welcome_signIn:'Iniciar Sesión',
    welcome_smartMacros:'Macros Inteligentes', welcome_trainingLogs:'Registro de Entrenos', welcome_aiCoaching:'Coach IA',
    welcome_powered:'Planes de nutrición y entrenamiento personalizados\nbasados en tus datos corporales.',
    // Auth
    auth_createTitle:'Crear cuenta', auth_welcomeBack:'Bienvenido de vuelta',
    auth_startTransform:'Comienza tu transformación hoy.', auth_continueJourney:'Continúa tu camino.',
    auth_signUp:'Registrarse', auth_signIn:'Iniciar Sesión',
    auth_username:'Nombre de usuario', auth_email:'Correo electrónico', auth_password:'Contraseña',
    auth_minPassword:'Mín. 12 caracteres', auth_back:'← Atrás',
    auth_createBtn:'Crear Cuenta', auth_signInBtn:'Iniciar Sesión',
  },
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

function getGreeting(lang) {
  const h = new Date().getHours();
  const key = h < 5 ? 'greeting_early' : h < 12 ? 'greeting_morning' : h < 17 ? 'greeting_afternoon' : h < 21 ? 'greeting_evening' : 'greeting_night';
  return STRINGS[lang]?.[key] ?? STRINGS.en[key];
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayStr(lang)  { const locale = lang === 'es' ? 'es-ES' : 'en-US'; return new Date().toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' }); }
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
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[{
      backgroundColor: isPrimary ? C.purple : 'transparent',
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: C.borderBright,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      opacity: disabled ? 0.4 : 1,
      shadowColor: isPrimary ? C.purple : 'transparent',
      shadowOpacity: isPrimary ? 0.4 : 0,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: isPrimary ? 6 : 0,
    }, style]}>
      {loading
        ? <ActivityIndicator color={C.text} size="small" />
        : <Text style={{ color: variant === 'ghost' ? C.muted : C.text, fontWeight: '700', fontSize: 15, letterSpacing: 0.2 }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Card({ children, style, glow }) {
  return (
    <View style={[{
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: glow ? C.borderBright : C.border,
      padding: 18,
      marginBottom: 12,
      shadowColor: glow ? C.purple : '#000',
      shadowOpacity: glow ? 0.2 : 0.08,
      shadowRadius: glow ? 16 : 8,
      shadowOffset: { width: 0, height: 4 },
    }, style]}>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress, color, small }) {
  const accent = color || C.purple;
  return (
    <TouchableOpacity onPress={onPress} style={{
      backgroundColor: active ? accent : C.elevated,
      borderRadius: 999,
      paddingHorizontal: small ? 12 : 16,
      paddingVertical: small ? 6 : 9,
      marginRight: 8, marginBottom: 8,
      borderWidth: 1,
      borderColor: active ? accent : C.border,
      shadowColor: active ? accent : 'transparent',
      shadowOpacity: active ? 0.3 : 0,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    }}>
      <Text style={{ color: active ? '#fff' : C.muted, fontSize: small ? 12 : 13, fontWeight: active ? '700' : '500' }}>{label}</Text>
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
function WelcomeScreen({ onGetStarted, onSignIn, lang = 'en' }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
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
            <Text style={{ color: C.muted, fontSize: 17, textAlign: 'center', marginTop: 24, lineHeight: 28, maxWidth: 360 }}>{tr('welcome_tagline')}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 40 }}>
              {[{ icon: '◈', label: tr('welcome_smartMacros') }, { icon: '△', label: tr('welcome_trainingLogs') }, { icon: '⚡', label: tr('welcome_aiCoaching') }].map(f => (
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
            <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>{tr('welcome_startTitle')}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 36 }}>{tr('welcome_startSub')}</Text>
            <View style={{ gap: 12 }}>
              <Btn label={tr('welcome_createAccount')} onPress={onGetStarted} />
              <Btn label={tr('welcome_signIn')} onPress={onSignIn} variant="secondary" />
            </View>
            <Text style={{ color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 28 }}>
              {tr('welcome_powered')}
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
        <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center', marginTop: 20, lineHeight: 22 }}>{tr('welcome_tagline_short')}</Text>
        <View style={{ width: '100%', marginTop: 48, gap: 12 }}>
          <Btn label={tr('welcome_getStarted')} onPress={onGetStarted} />
          <Btn label={tr('welcome_haveAccount')} onPress={onSignIn} variant="secondary" />
        </View>
      </Animated.View>
    </View>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onBack, initialMode = 'signup', lang = 'en' }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const [mode,     setMode]     = useState(initialMode);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setError('');
    const rl = checkRateLimit('auth:submit', LIMITS.authSubmit.maxCalls, LIMITS.authSubmit.windowMs);
    if (!rl.allowed) { setError(`Too many attempts. Please wait ${rl.retryAfterMs}s and try again.`); return; }
    if (!/\S+@\S+\.\S+/.test(email))   { setError('Enter a valid email.'); return; }
    if (password.length < 12)           { setError('Password needs at least 12 characters.'); return; }
    if (mode === 'signup' && username.length < 3) { setError('Username needs at least 3 characters.'); return; }
    if (mode === 'signup' && username.length > 30) { setError('Username must be 30 characters or less.'); return; }
    if (mode === 'signup' && !/^[a-zA-Z0-9_]+$/.test(username.trim())) { setError('Username can only contain letters, numbers, and underscores.'); return; }
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
        <Text style={{ color: C.muted, fontSize: 14 }}>{tr('auth_back')}</Text>
      </TouchableOpacity>
      <Text style={{ color: C.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>{mode === 'signup' ? tr('auth_createTitle') : tr('auth_welcomeBack')}</Text>
      <Text style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>{mode === 'signup' ? tr('auth_startTransform') : tr('auth_continueJourney')}</Text>
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, padding: 4, marginBottom: 24 }}>
        {['signup', 'signin'].map(m => (
          <TouchableOpacity key={m} onPress={() => setMode(m)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: mode === m ? C.purple : 'transparent' }}>
            <Text style={{ color: mode === m ? '#fff' : C.dim, fontWeight: '600', fontSize: 13 }}>{m === 'signup' ? tr('auth_signUp') : tr('auth_signIn')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'signup' && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('auth_username')}</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="e.g. alexfit" placeholderTextColor={C.dim} />
        </View>
      )}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('auth_email')}</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" placeholderTextColor={C.dim} />
      </View>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('auth_password')}</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder={tr('auth_minPassword')} placeholderTextColor={C.dim} />
      </View>
      {error ? <Text style={{ color: C.red, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{error}</Text> : null}
      <Btn label={mode === 'signup' ? tr('auth_createBtn') : tr('auth_signInBtn')} onPress={submit} loading={loading} />
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
function SetupScreen({ onComplete, userId, lang = 'en' }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
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

  const clampNum = (val, min, max) => { const n = Number(val); return isNaN(n) ? min : Math.min(max, Math.max(min, n)); };

  const goNext = () => {
    if (step === 1) {
      const a = Number(age), h = Number(height), w = Number(weight), bf = bodyFat ? Number(bodyFat) : null;
      if (!age || isNaN(a) || a < 10 || a > 120) { Alert.alert('Invalid age', 'Enter an age between 10 and 120.'); return; }
      if (!height || isNaN(h) || h < 50 || h > 300) { Alert.alert('Invalid height', 'Enter a height between 50 and 300 cm.'); return; }
      if (!weight || isNaN(w) || w < 10 || w > 500) { Alert.alert('Invalid weight', 'Enter a weight between 10 and 500 kg.'); return; }
      if (bf !== null && (isNaN(bf) || bf < 0 || bf > 70)) { Alert.alert('Invalid body fat', 'Enter a body fat % between 0 and 70.'); return; }
    }
    if (step === 2) {
      const td = Number(trainingDays);
      if (!trainingDays || isNaN(td) || td < 0 || td > 7) { Alert.alert('Invalid training days', 'Enter 0–7 days per week.'); return; }
    }
    if (step === 3) {
      const sl = Number(sleep), tf = Number(timeFrame), wt = Number(waterTarget);
      if (!sleep || isNaN(sl) || sl < 0 || sl > 24) { Alert.alert('Invalid sleep', 'Enter sleep hours between 0 and 24.'); return; }
      if (!timeFrame || isNaN(tf) || tf < 1 || tf > 60) { Alert.alert('Invalid time frame', 'Enter a time frame between 1 and 60 months.'); return; }
      if (!waterTarget || isNaN(wt) || wt < 0 || wt > 10000) { Alert.alert('Invalid water target', 'Enter a water target between 0 and 10000 ml.'); return; }
    }
    animateStep(1); setStep(s => s + 1);
  };
  const goBack = () => { if (step === 0) return; animateStep(-1); setStep(s => s - 1); };

  const finish = async () => {
    const rl = checkRateLimit('profile:save', LIMITS.profileSave.maxCalls, LIMITS.profileSave.windowMs);
    if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'saving your profile'); return; }
    setSaving(true);
    const profileData = {
      goal, sex,
      age:            clampNum(age, 10, 120),
      height_cm:      clampNum(height, 50, 300),
      weight_kg:      clampNum(weight, 10, 500),
      body_fat_pct:   bodyFat ? clampNum(bodyFat, 0, 70) : null,
      activity, training_type: trainingType,
      training_days:  clampNum(trainingDays, 0, 7),
      diet,
      sleep_hours:    clampNum(sleep, 0, 24),
      time_frame:     clampNum(timeFrame, 1, 60),
      water_target:   clampNum(waterTarget, 0, 10000),
      profile_complete: true,
    };
    try {
      const { error } = await supabase.from('profiles').update(profileData).eq('id', userId);
      if (error) throw error;
      onComplete(profileData);
    } catch (e) {
      if (Platform.OS === 'web') { window.alert(`Error: ${e.message}`); } else { Alert.alert('Error', e.message); }
    } finally { setSaving(false); }
  };

  const STEPS = [tr('setup_steps_0'), tr('setup_steps_1'), tr('setup_steps_2'), tr('setup_steps_3')];

  const isDesktop = useIsDesktop();
  const maxW = isDesktop ? 640 : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: isDesktop ? 32 : 56, paddingHorizontal: 24, paddingBottom: 16, alignItems: isDesktop ? 'center' : undefined }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, width: '100%', maxWidth: maxW, alignSelf: isDesktop ? 'center' : undefined }}>
          {STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? C.purple : C.subtle }} />)}
        </View>
        <View style={{ maxWidth: maxW, alignSelf: isDesktop ? 'center' : undefined, width: '100%' }}>
          <Text style={{ color: C.dim, fontSize: 12, letterSpacing: 1.5 }}>{tr('setup_step')} {step + 1} {tr('setup_of')} {STEPS.length}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{STEPS[step]}</Text>
        </View>
      </View>

      <Animated.ScrollView style={{ flex: 1, transform: [{ translateX: slideAnim }] }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, alignItems: isDesktop ? 'center' : undefined }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: maxW }}>

        {step === 0 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>{tr('setup_goal_title')}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{tr('setup_goal_sub')}</Text>
            {GOALS.map(g => (
              <TouchableOpacity key={g.id} onPress={() => setGoal(g.id)} style={{ backgroundColor: goal === g.id ? C.card : C.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: goal === g.id ? g.color : C.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: goal === g.id ? g.color : C.elevated, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 18, color: '#fff' }}>{g.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{tr('goal_' + g.id + '_label')}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{tr('goal_' + g.id + '_desc')}</Text>
                </View>
                {goal === g.id && <Text style={{ color: g.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>{tr('setup_body_title')}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{tr('setup_body_sub')}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{tr('setup_bioSex')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {['male', 'female'].map(s => <Chip key={s} label={s === 'male' ? tr('setup_male') : tr('setup_female')} active={sex === s} onPress={() => setSex(s)} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_age')}</Text><TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="e.g. 28" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_heightCm')}</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="e.g. 175" placeholderTextColor={C.dim} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_weightKg')}</Text><TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="e.g. 75" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_bodyFat')} <Text style={{ color: C.dim }}>({tr('setup_optional')})</Text></Text><TextInput style={styles.input} value={bodyFat} onChangeText={setBodyFat} keyboardType="number-pad" placeholder="e.g. 18" placeholderTextColor={C.dim} /></View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>{tr('setup_act_title')}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{tr('setup_act_sub')}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{tr('setup_actLevel')}</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity key={a.id} onPress={() => setActivity(a.id)} style={{ backgroundColor: activity === a.id ? C.card : C.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: activity === a.id ? C.purple : C.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{tr('act_' + a.id + '_label')}</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{tr('act_' + a.id + '_desc')}</Text>
                </View>
                {activity === a.id && <Text style={{ color: C.purple }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8, marginTop: 16 }}>{tr('setup_trainStyle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TRAINING_TYPES.map(t => <Chip key={t.id} label={tr('tt_' + t.id.replace(/-/g, ''))} active={trainingType === t.id} onPress={() => setTrainingType(t.id)} />)}
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6, marginTop: 16 }}>{tr('setup_trainDays')}</Text>
            <TextInput style={[styles.input, { width: 100 }]} value={trainingDays} onChangeText={setTrainingDays} keyboardType="number-pad" placeholder="e.g. 4" placeholderTextColor={C.dim} />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800', marginBottom: 6 }}>{tr('setup_prefs_title')}</Text>
            <Text style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>{tr('setup_prefs_sub')}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{tr('setup_dietStyle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {DIET_TYPES.map(d => <Chip key={d.id} label={tr('tt_' + d.id.replace(/-/g, ''))} active={diet === d.id} onPress={() => setDiet(d.id)} small />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_sleepH')}</Text><TextInput style={styles.input} value={sleep} onChangeText={setSleep} keyboardType="number-pad" placeholder="7" placeholderTextColor={C.dim} /></View>
              <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_timeFrame')}</Text><TextInput style={styles.input} value={timeFrame} onChangeText={setTimeFrame} keyboardType="number-pad" placeholder="3" placeholderTextColor={C.dim} /></View>
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_waterTarget')}</Text>
            <TextInput style={[styles.input, { width: 140 }]} value={waterTarget} onChangeText={setWaterTarget} keyboardType="number-pad" placeholder="2500" placeholderTextColor={C.dim} />
            {/* Live preview */}
            <Card style={{ marginTop: 20 }}>
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{tr('setup_macroPreview')}</Text>
              {(() => {
                const m = calcMacros({ weight: Number(weight), height: Number(height), age: Number(age), sex, goal, activity });
                return m
                  ? <><Text style={{ color: C.text, fontWeight: '700', fontSize: 18 }}>{m.calories} kcal / {tr('today').toLowerCase()}</Text><Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>P: {m.protein}g  ·  C: {m.carbs}g  ·  F: {m.fats}g</Text></>
                  : <Text style={{ color: C.dim, fontSize: 12 }}>{tr('setup_fillBody')}</Text>;
              })()}
            </Card>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          {step > 0 && <Btn label={tr('setup_back')} onPress={goBack} variant="secondary" style={{ flex: 1 }} />}
          {step < 3
            ? <Btn label={tr('setup_continue')} onPress={goNext} style={{ flex: 2 }} />
            : <Btn label={tr('setup_buildPlan')} onPress={finish} loading={saving} style={{ flex: 2 }} />}
        </View>
      </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ profile, macros, today, onAddWater, onResetWater, streak, lang }) {
  const tr         = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
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
        <Text style={{ color: C.muted, fontSize: 13 }}>{todayStr(lang)}</Text>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', marginTop: 2 }}>{getGreeting(lang)}{profile.username ? `, ${profile.username}` : ''} 👋</Text>
      </View>
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <CalorieRing consumed={consumed} goal={macros?.calories || 2000} />
        </View>
        <View style={{ marginTop: 16 }}>
          <MacroBar label={tr('macroProtein')} value={Math.round(pConsumed)} goal={macros?.protein || 150} color={C.purple} />
          <MacroBar label={tr('macroCarbs')}   value={Math.round(cConsumed)} goal={macros?.carbs   || 200} color={C.cyan}   />
          <MacroBar label={tr('macroFats')}    value={Math.round(fConsumed)} goal={macros?.fats    || 60}  color={C.amber}  />
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <StreakBadge streak={streak} />
        <Card style={{ flex: 2, marginBottom: 0 }}>
          <Text style={{ color: C.purple, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{tr('todaysThought')}</Text>
          <Text style={{ color: C.text, fontSize: 13, lineHeight: 19, fontStyle: 'italic' }}>"{quote}"</Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: C.cyan, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>{tr('hydration')}</Text>
        <WaterGlass current={today.water_ml} target={profile.water_target || 2500} onAdd={onAddWater} onReset={onResetWater} />
      </Card>
      {macros && (
        <Card>
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>{tr('dailyTargets')}</Text>
          {[
            { label: tr('macroCalories'), value: `${macros.calories} kcal`, color: C.purple },
            { label: tr('macroProtein'),  value: `${macros.protein}g`,      color: C.purple },
            { label: tr('macroCarbs'),    value: `${macros.carbs}g`,        color: C.cyan   },
            { label: tr('macroFats'),     value: `${macros.fats}g`,         color: C.amber  },
            { label: tr('labelBmr'),      value: `${macros.bmr} kcal`,      color: C.dim    },
            { label: tr('labelTdee'),     value: `${macros.tdee} kcal`,     color: C.dim    },
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
function LogTab({ today, onAddFood, onRemoveFood, lang }) {
  const tr          = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [meal,      setMeal]      = useState('breakfast');
  const [showForm,  setShowForm]  = useState(false);
  const [showScan,  setShowScan]  = useState(false);
  const [cName,     setCName]     = useState('');
  const [cWeight,   setCWeight]   = useState('');
  const [cCal,      setCCal]      = useState('');
  const [cP,        setCP]        = useState('');
  const [cC,        setCC]        = useState('');
  const [cF,        setCF]        = useState('');

  const meals     = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const totalCal  = today.food_log.reduce((s, f) => s + f.cal, 0);
  const isDesktop = useIsDesktop();
  const noResults = query.trim().length > 0 && results.length === 0;

  const search = useCallback((q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setResults(FOOD_DB.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8));
  }, []);

  const openForm = (prefill = '') => {
    setCName(prefill); setCWeight(''); setCCal(''); setCP(''); setCC(''); setCF('');
    setShowForm(true);
  };

  const cancelForm = () => setShowForm(false);

  const submitCustom = () => {
    if (!cName.trim()) return;
    onAddFood({
      id: 'custom_' + Date.now(),
      name: cName.trim(),
      cal:  Math.max(0, Number(cCal) || 0),
      p:    Math.max(0, Number(cP)   || 0),
      c:    Math.max(0, Number(cC)   || 0),
      f:    Math.max(0, Number(cF)   || 0),
      unit: cWeight ? `${cWeight}g` : 'serving',
      meal,
      logId: Date.now().toString(),
    });
    setShowForm(false);
    setQuery(''); setResults([]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 120, alignItems: isDesktop ? 'center' : undefined }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>

          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 16 }}>{tr('nutritionLog')}</Text>

          {/* Meal selector */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {meals.map(m => <Chip key={m} label={tr(m)} active={meal === m} onPress={() => setMeal(m)} small />)}
          </View>

          {/* Search bar */}
          <View style={{ backgroundColor: C.card, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 }}>
            <Text style={{ color: C.dim, marginRight: 8 }}>🔍</Text>
            <TextInput style={{ flex: 1, color: C.text, paddingVertical: 12, fontSize: 14 }} value={query} onChangeText={search} placeholder={tr('searchFood')} placeholderTextColor={C.dim} />
            {query ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}><Text style={{ color: C.dim, fontSize: 18 }}>×</Text></TouchableOpacity> : null}
          </View>

          {/* Search results */}
          {results.map(f => (
            <TouchableOpacity key={f.id} onPress={() => { onAddFood({ ...f, meal, logId: Date.now().toString() + f.id }); setQuery(''); setResults([]); }} style={{ backgroundColor: C.elevated, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{f.name}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{f.unit}  ·  P: {f.p}g  C: {f.c}g  F: {f.f}g</Text>
              </View>
              <Text style={{ color: C.purple, fontWeight: '700', fontSize: 14, marginRight: 8 }}>{f.cal} kcal</Text>
              <Text style={{ color: C.green, fontSize: 20, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          ))}

          {/* "Not found" hint */}
          {noResults && !showForm && (
            <TouchableOpacity onPress={() => openForm(query)} style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.borderBright }}>
              <Text style={{ color: C.muted, flex: 1, fontSize: 13 }}>"{query}" {tr('notFoundAddManually')}</Text>
              <Text style={{ color: C.purple, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          )}

          {/* ── Inline custom-food form ── */}
          {showForm ? (
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.borderBright }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{tr('addFoodTo')} {tr(meal)}</Text>
                <TouchableOpacity onPress={cancelForm} style={{ padding: 4 }}>
                  <Text style={{ color: C.muted, fontSize: 20, lineHeight: 22 }}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Meal tabs inside form */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {meals.map(m => <Chip key={m} label={tr(m)} active={meal === m} onPress={() => setMeal(m)} small />)}
              </View>

              {/* Name */}
              <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('foodNameRequired')}</Text>
              <TextInput style={[styles.input, { marginBottom: 12 }]} value={cName} onChangeText={setCName} placeholder="e.g. Beans, Rice, Chicken…" placeholderTextColor={C.dim} />

              {/* Weight + Calories */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('weightGLabel')}</Text>
                  <TextInput style={styles.input} value={cWeight} onChangeText={setCWeight} keyboardType="decimal-pad" placeholder="200" placeholderTextColor={C.dim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('caloriesKcalLabel')}</Text>
                  <TextInput style={styles.input} value={cCal} onChangeText={setCCal} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.dim} />
                </View>
              </View>

              {/* Macros */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('proteinGLabel')}</Text>
                  <TextInput style={styles.input} value={cP} onChangeText={setCP} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.dim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('carbsGLabel')}</Text>
                  <TextInput style={styles.input} value={cC} onChangeText={setCC} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.dim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{tr('fatGLabel')}</Text>
                  <TextInput style={styles.input} value={cF} onChangeText={setCF} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.dim} />
                </View>
              </View>

              <TouchableOpacity onPress={submitCustom} style={{ backgroundColor: cName.trim() ? C.purple : C.elevated, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: cName.trim() ? '#fff' : C.dim, fontWeight: '800', fontSize: 15 }}>{tr('addTo')} {tr(meal)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── "Add food" + camera scan buttons ── */
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity onPress={() => openForm()} style={{ flex: 1, backgroundColor: C.purple, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{tr('addFoodManually')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const rl = checkRateLimit('aiScan', LIMITS.aiScan.maxCalls, LIMITS.aiScan.windowMs);
                  if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'scanning food'); return; }
                  setShowScan(true);
                }}
                style={{ backgroundColor: C.elevated, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderBright }}
              >
                <Text style={{ fontSize: 22 }}>📷</Text>
              </TouchableOpacity>
            </View>
          )}

          <FoodScannerModal
            visible={showScan}
            onClose={() => setShowScan(false)}
            onAddFood={(food) => { onAddFood({ ...food, meal }); setShowScan(false); }}
            meal={meal}
            lang={lang}
          />

          {/* Logged meals */}
          {meals.map(m => {
            const items   = today.food_log.filter(f => f.meal === m);
            if (!items.length) return null;
            const mealCal = items.reduce((s, f) => s + f.cal, 0);
            return (
              <View key={m} style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{tr(m)}</Text>
                  <Text style={{ color: C.purple, fontSize: 12 }}>{mealCal} kcal</Text>
                </View>
                {items.map(f => (
                  <View key={f.logId} style={{ backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }}>{f.name}{f.unit && f.unit !== 'serving' ? ` (${f.unit})` : ''}</Text>
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
              <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>{tr('todaysTotals')}</Text>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 22 }}>{totalCal} kcal</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                P: {Math.round(today.food_log.reduce((s,f)=>s+f.p,0))}g  ·  C: {Math.round(today.food_log.reduce((s,f)=>s+f.c,0))}g  ·  F: {Math.round(today.food_log.reduce((s,f)=>s+f.f,0))}g
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── TRAIN TAB ────────────────────────────────────────────────────────────────
function TrainTab({ today, onLogSet, onAddExercise, onFinishWorkout, onDeleteExercise, onDeleteSet, onEditSet, streak, lang }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const [activeCategory, setActiveCategory] = useState('Push');
  const [showExercises,  setShowExercises]  = useState(false);
  const [setInputs,      setSetInputs]      = useState({});
  const [editingSet,     setEditingSet]     = useState(null); // { exIndex, setIndex }
  const [editInputs,     setEditInputs]     = useState({ weight: '', reps: '' });
  const [showHelp,       setShowHelp]       = useState(false);
  const categories = Object.keys(EXERCISES);
  const days       = ['M','T','W','T','F','S','S'];
  const dayOfWeek  = new Date().getDay();
  const totalSets  = today.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalVol   = today.exercises.reduce((s, e) => s + e.sets.reduce((ss, set) => ss + (set.weight||0)*(set.reps||0), 0), 0);
  const isDesktop  = useIsDesktop();
  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 12, paddingBottom: isDesktop ? 40 : 90, alignItems: isDesktop ? 'center' : undefined }}>
    <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 22 : 18, fontWeight: '800', marginBottom: isDesktop ? 6 : 4 }}>{tr('training')}</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: isDesktop ? 20 : 10 }}>
        {days.map((d, i) => {
          const idx     = i === 6 ? 0 : i + 1;
          const isToday = idx === dayOfWeek;
          return <View key={i} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? C.purple : C.card, borderWidth: 1, borderColor: isToday ? C.purple : C.border }}><Text style={{ color: isToday ? '#fff' : C.dim, fontSize: 11, fontWeight: isToday ? '700' : '400' }}>{d}</Text></View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: isDesktop ? 12 : 8, marginBottom: isDesktop ? 16 : 8 }}>
        {[{ label: tr('exercises'), value: today.exercises.length, color: C.purple }, { label: tr('totalSets'), value: totalSets, color: C.cyan }, { label: tr('volumeKg'), value: totalVol, color: C.amber }].map(s => (
          <Card key={s.label} style={{ flex: 1, marginBottom: 0, padding: isDesktop ? 12 : 6, alignItems: 'center' }}>
            <Text style={{ color: s.color, fontWeight: '800', fontSize: isDesktop ? 22 : 15 }}>{s.value}</Text>
            <Text style={{ color: C.muted, fontSize: isDesktop ? 10 : 9, marginTop: 1 }}>{s.label}</Text>
          </Card>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isDesktop ? 12 : 8 }}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
          {categories.map(cat => <Chip key={cat} label={tr('cat_' + cat.toLowerCase())} active={activeCategory === cat} onPress={() => setActiveCategory(cat)} small />)}
        </View>
        <TouchableOpacity onPress={() => setShowHelp(true)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.borderBright, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
          <Text style={{ color: C.purple, fontWeight: '800', fontSize: 13 }}>?</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowHelp(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.borderBright }}>
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, marginBottom: 16 }}>{tr('helpTitle')}</Text>
            {[
              { icon: '1️⃣', title: tr('help1title'), desc: tr('help1desc') },
              { icon: '2️⃣', title: tr('help2title'), desc: tr('help2desc') },
              { icon: '3️⃣', title: tr('help3title'), desc: tr('help3desc') },
              { icon: '4️⃣', title: tr('help4title'), desc: tr('help4desc') },
              { icon: '5️⃣', title: tr('help5title'), desc: tr('help5desc') },
            ].map(step => (
              <View key={step.title} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{step.title}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 17 }}>{step.desc}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setShowHelp(false)} style={{ backgroundColor: C.purple, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{tr('gotIt')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <TouchableOpacity onPress={() => setShowExercises(v => !v)} style={{ backgroundColor: C.elevated, borderRadius: 12, padding: isDesktop ? 14 : 10, marginBottom: isDesktop ? 12 : 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.borderBright }}>
        <Text style={{ color: C.purple, fontSize: isDesktop ? 20 : 16, marginRight: 8 }}>+</Text>
        <Text style={{ color: C.text, fontWeight: '600', fontSize: isDesktop ? 15 : 13 }}>{tr('addExerciseFrom')} {tr('cat_' + activeCategory.toLowerCase())}</Text>
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
        <Card key={ei} style={{ marginBottom: isDesktop ? 10 : 7, padding: isDesktop ? undefined : 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: isDesktop ? 10 : 6 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: isDesktop ? 14 : 13, flex: 1 }}>{ex.name}</Text>
            <View style={{ backgroundColor: C.elevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700' }}>{ex.sets.length} sets</Text>
            </View>
            <TouchableOpacity onPress={() => onDeleteExercise(ei)} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: C.red, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {ex.sets.map((set, si) => (
            editingSet && editingSet.exIndex === ei && editingSet.setIndex === si ? (
              <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{si + 1}</Text>
                </View>
                <TextInput style={[styles.input, { width: isDesktop ? undefined : 58, flex: isDesktop ? 1 : undefined, paddingVertical: 6, fontSize: 12, textAlign: 'center' }]} placeholder="kg" placeholderTextColor={C.dim} keyboardType="number-pad" value={editInputs.weight} onChangeText={v => setEditInputs(p => ({ ...p, weight: v }))} />
                <TextInput style={[styles.input, { width: isDesktop ? undefined : 58, flex: isDesktop ? 1 : undefined, paddingVertical: 6, fontSize: 12, textAlign: 'center' }]} placeholder="reps" placeholderTextColor={C.dim} keyboardType="number-pad" value={editInputs.reps} onChangeText={v => setEditInputs(p => ({ ...p, reps: v }))} />
                <TouchableOpacity onPress={() => { const w = Math.min(1000, Math.max(0, Number(editInputs.weight)||0)); const r = Math.min(9999, Math.max(0, Math.round(Number(editInputs.reps)||0))); onEditSet(ei, si, { weight: w, reps: r }); setEditingSet(null); }} style={{ backgroundColor: C.green, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingSet(null)} style={{ backgroundColor: C.elevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ color: C.muted, fontSize: 11 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: isDesktop ? 6 : 4 }}>
                <View style={{ width: isDesktop ? 24 : 20, height: isDesktop ? 24 : 20, borderRadius: 6, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{si + 1}</Text>
                </View>
                <Text style={{ color: C.text, fontSize: isDesktop ? 13 : 12, flex: 1 }}>{set.weight > 0 ? `${set.weight}kg` : '—'}  ×  {set.reps} reps</Text>
                <TouchableOpacity onPress={() => { setEditingSet({ exIndex: ei, setIndex: si }); setEditInputs({ weight: String(set.weight || ''), reps: String(set.reps || '') }); }} style={{ paddingHorizontal: 6 }}>
                  <Text style={{ color: C.amber, fontSize: 13 }}>✏</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDeleteSet(ei, si)} style={{ paddingHorizontal: 6 }}>
                  <Text style={{ color: C.red, fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: isDesktop ? 8 : 6 }}>
            <TextInput style={[styles.input, { width: isDesktop ? undefined : 60, flex: isDesktop ? 1 : undefined, paddingVertical: isDesktop ? 8 : 6, fontSize: isDesktop ? 14 : 13, textAlign: 'center' }]} placeholder="kg" placeholderTextColor={C.dim} keyboardType="number-pad" value={setInputs[ex.id]?.weight||''} onChangeText={v => setSetInputs(p => ({ ...p, [ex.id]: { ...p[ex.id], weight: v } }))} />
            <TextInput style={[styles.input, { width: isDesktop ? undefined : 60, flex: isDesktop ? 1 : undefined, paddingVertical: isDesktop ? 8 : 6, fontSize: isDesktop ? 14 : 13, textAlign: 'center' }]} placeholder="reps" placeholderTextColor={C.dim} keyboardType="number-pad" value={setInputs[ex.id]?.reps||''} onChangeText={v => setSetInputs(p => ({ ...p, [ex.id]: { ...p[ex.id], reps: v } }))} />
            <TouchableOpacity onPress={() => { const inp = setInputs[ex.id]||{}; const w = Math.min(1000, Math.max(0, Number(inp.weight)||0)); const r = Math.min(9999, Math.max(0, Math.round(Number(inp.reps)||0))); onLogSet(ei, { weight: w, reps: r }); setSetInputs(p => ({ ...p, [ex.id]: {} })); }} style={{ flex: isDesktop ? undefined : 1, backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: isDesktop ? 14 : 12, paddingVertical: isDesktop ? 9 : 7, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: isDesktop ? 14 : 13 }}>{tr('logBtn')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
      {today.exercises.length > 0 && (
        <Btn label={today.completed ? tr('workoutDone') : tr('finishWorkout')} onPress={onFinishWorkout} variant={today.completed ? 'secondary' : 'primary'} style={{ marginTop: 8 }} />
      )}
    </View>
    </ScrollView>
  );
}

// ─── ME TAB ───────────────────────────────────────────────────────────────────
function MeTab({ profile, macros, weights, onAddWeight, onLogout, onEditProfile, lang, onChangeLang, user }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const [weightInput,   setWeightInput]   = useState('');
  const [saving,        setSaving]        = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const goalObj = GOALS.find(g => g.id === profile.goal);
  const handleAddWeight = async () => {
    if (!weightInput) return;
    const kg = Number(weightInput);
    if (isNaN(kg) || kg < 10 || kg > 500) {
      if (Platform.OS === 'web') { window.alert('Enter a valid weight between 10 and 500 kg.'); } else { Alert.alert('Invalid weight', 'Enter a value between 10 and 500 kg.'); }
      return;
    }
    setSaving(true);
    await onAddWeight(kg);
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
          <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>{tr('macroPlan')}</Text>
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
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>{tr('weightHistory')}</Text>
        <WeightChart weights={weights} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <TextInput style={[styles.input, { flex: 1, paddingVertical: 9 }]} value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder={tr('weightPlaceholder')} placeholderTextColor={C.dim} />
          <Btn label={tr('logWeight')} onPress={handleAddWeight} loading={saving} style={{ paddingHorizontal: 20, paddingVertical: 9 }} />
        </View>
        {weights.length > 0 && <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>Last: {weights[weights.length-1]?.weight_kg}kg on {weights[weights.length-1]?.logged_at}</Text>}
      </Card>
      <View style={{ gap: 10 }}>
        <Btn label={tr('settings')} onPress={() => setShowSettings(true)} variant="secondary" />
        <Btn label={tr('editProfile')} onPress={onEditProfile} variant="secondary" />
        <Btn label={tr('signOut')} onPress={onLogout} variant="ghost" />
      </View>
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} lang={lang} onChangeLang={onChangeLang} user={user} tr={tr} />
    </View>
    </ScrollView>
  );
}

// ─── AI COACH MODAL ───────────────────────────────────────────────────────────
function CoachModal({ visible, onClose, macros, lang }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
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
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>{tr('aiCoach')}</Text>
            <Text style={{ color: C.green, fontSize: 11, marginTop: 2 }}>{tr('online')}</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 4 }} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
          {['Protein tips', 'Best training split', 'Sleep better', 'Water intake', 'Calorie deficit'].map(s => (
            <TouchableOpacity key={s} onPress={() => setInput(s)} style={{ backgroundColor: C.elevated, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8, borderWidth: 1, borderColor: C.border }}><Text style={{ color: C.muted, fontSize: 12 }}>{s}</Text></TouchableOpacity>
          ))}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            <TextInput style={[styles.input, { flex: 1, paddingVertical: 10 }]} value={input} onChangeText={setInput} placeholder={tr('askCoach')} placeholderTextColor={C.dim} onSubmitEditing={send} returnKeyType="send" />
            <TouchableOpacity onPress={send} style={{ backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>↑</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── HISTORY TAB ─────────────────────────────────────────────────────────────
function HistoryTab({ logs, workouts, loading, lang }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const isDesktop = useIsDesktop();
  const byDate = {};
  logs.forEach(l  => { byDate[l.log_date]      = { ...(byDate[l.log_date]      || {}), log:     l }; });
  workouts.forEach(w => { byDate[w.workout_date] = { ...(byDate[w.workout_date] || {}), workout: w }; });
  const dates  = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const byMonth = {};
  dates.forEach(d => {
    const m = d.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(d);
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.purple} size="large" /></View>;

  if (!dates.length) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <Text style={{ color: C.muted, fontSize: 15, textAlign: 'center' }}>{tr('historyEmpty')}</Text>
    </View>
  );

  // ── Water stats ──
  const todayStr2  = todayISO();
  const weekAgo    = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const monthStart = todayStr2.slice(0, 7) + '-01';
  const todayWater = (byDate[todayStr2]?.log?.water_ml) || 0;
  const weekLogs   = logs.filter(l => l.log_date >= weekAgo);
  const monthLogs  = logs.filter(l => l.log_date >= monthStart);
  const weekAvg    = weekLogs.length  ? Math.round(weekLogs.reduce( (s,l) => s + (l.water_ml||0), 0) / weekLogs.length)  : 0;
  const monthAvg   = monthLogs.length ? Math.round(monthLogs.reduce((s,l) => s + (l.water_ml||0), 0) / monthLogs.length) : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: isDesktop ? 40 : 100, alignItems: isDesktop ? 'center' : undefined }}>
      <View style={{ width: '100%', maxWidth: isDesktop ? 860 : undefined }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 22, marginBottom: 4 }}>History</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Your last 30 days at a glance.</Text>

        {/* Hydration summary */}
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 }}>💧 HYDRATION</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Today',         value: `${todayWater} ml` },
              { label: 'Weekly avg',    value: `${weekAvg} ml` },
              { label: 'Monthly avg',   value: `${monthAvg} ml` },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: C.elevated, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{s.value}</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Card>
        {months.map(month => (
          <View key={month} style={{ marginBottom: 24 }}>
            <Text style={{ color: C.purple, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 }}>
              {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
            </Text>
            {byMonth[month].map(date => {
              const entry   = byDate[date];
              const log     = entry.log;
              const workout = entry.workout;
              const cal     = log ? (log.food_log || []).reduce((s, f) => s + (f.cal || 0), 0) : 0;
              const protein = log ? (log.food_log || []).reduce((s, f) => s + (f.p   || 0), 0) : 0;
              const water   = log ? (log.water_ml || 0) : 0;
              const d = new Date(date + 'T12:00:00');
              return (
                <Card key={date} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <Text style={{ color: C.purple, fontWeight: '800', fontSize: 17 }}>{d.getDate()}</Text>
                      <Text style={{ color: C.dim, fontSize: 9, letterSpacing: 0.5 }}>{d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {log
                        ? <><Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{cal} kcal · {Math.round(protein)}g protein</Text>
                            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>💧 {water} ml water</Text></>
                        : <Text style={{ color: C.dim, fontSize: 12 }}>No food logged</Text>}
                    </View>
                    {workout && (
                      <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
                        backgroundColor: workout.completed ? C.purpleGlow : C.elevated,
                        borderColor:     workout.completed ? C.purple     : C.border }}>
                        <Text style={{ color: workout.completed ? C.purple : C.dim, fontSize: 11, fontWeight: '700' }}>
                          {workout.completed ? '✓ Trained' : 'Rest'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── SETTINGS MODAL ──────────────────────────────────────────────────────────
function SettingsModal({ visible, onClose, lang, onChangeLang, user, tr }) {
  const [section,   setSection]   = useState(null); // 'email' | 'password' | null
  const [newEmail,  setNewEmail]  = useState('');
  const [confEmail, setConfEmail] = useState('');
  const [currPass,  setCurrPass]  = useState('');
  const [newPass,   setNewPass]   = useState('');
  const [confPass,  setConfPass]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState('');

  const reset = () => { setSection(null); setNewEmail(''); setConfEmail(''); setCurrPass(''); setNewPass(''); setConfPass(''); setMsg(''); };

  const handleChangeEmail = async () => {
    if (newEmail !== confEmail) { setMsg(tr('emailMismatch')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    setMsg(error ? error.message : tr('emailUpdated'));
    if (!error) { setNewEmail(''); setConfEmail(''); }
  };

  const handleChangePassword = async () => {
    if (!currPass) { setMsg(tr('currentPassword') + ' required.'); return; }
    if (newPass !== confPass) { setMsg(tr('passwordMismatch')); return; }
    if (newPass.length < 12) { setMsg('Min 12 characters.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user?.email, password: currPass });
    if (authError) { setLoading(false); setMsg(tr('wrongPassword')); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    setMsg(error ? error.message : tr('passwordUpdated'));
    if (!error) { setCurrPass(''); setNewPass(''); setConfPass(''); }
  };

  const handleResetEmail = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user?.email);
    setLoading(false);
    setMsg(error ? error.message : tr('resetSent'));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 18, flex: 1 }}>{tr('settingsTitle')}</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} style={{ padding: 8 }}><Text style={{ color: C.muted, fontSize: 22 }}>×</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* Language */}
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>{tr('language').toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[{ code: 'en', label: tr('english') }, { code: 'es', label: tr('spanish') }].map(l => (
                <TouchableOpacity key={l.code} onPress={() => onChangeLang(l.code)} style={{ flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: lang === l.code ? C.purple : C.elevated, borderWidth: 1, borderColor: lang === l.code ? C.purple : C.border }}>
                  <Text style={{ color: lang === l.code ? '#fff' : C.muted, fontWeight: '700' }}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Change Email */}
          <Card style={{ marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setSection(section === 'email' ? null : 'email')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{tr('changeEmail')}</Text>
              <Text style={{ color: C.purple, fontSize: 18 }}>{section === 'email' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {section === 'email' && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <TextInput style={[styles.input, { paddingVertical: 10 }]} placeholder={tr('newEmail')} placeholderTextColor={C.dim} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />
                <TextInput style={[styles.input, { paddingVertical: 10 }]} placeholder={tr('confirmEmail')} placeholderTextColor={C.dim} value={confEmail} onChangeText={setConfEmail} autoCapitalize="none" keyboardType="email-address" />
                <Btn label={tr('save')} onPress={handleChangeEmail} loading={loading} />
              </View>
            )}
          </Card>

          {/* Change Password */}
          <Card style={{ marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setSection(section === 'password' ? null : 'password')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{tr('changePassword')}</Text>
              <Text style={{ color: C.purple, fontSize: 18 }}>{section === 'password' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {section === 'password' && (
              <View style={{ marginTop: 14, gap: 10 }}>
                <TextInput style={[styles.input, { paddingVertical: 10 }]} placeholder={tr('currentPassword')} placeholderTextColor={C.dim} value={currPass} onChangeText={setCurrPass} secureTextEntry />
                <TextInput style={[styles.input, { paddingVertical: 10 }]} placeholder={tr('newPassword')} placeholderTextColor={C.dim} value={newPass} onChangeText={setNewPass} secureTextEntry />
                <TextInput style={[styles.input, { paddingVertical: 10 }]} placeholder={tr('confirmPassword')} placeholderTextColor={C.dim} value={confPass} onChangeText={setConfPass} secureTextEntry />
                <Btn label={tr('save')} onPress={handleChangePassword} loading={loading} />
                <TouchableOpacity onPress={handleResetEmail} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: C.cyan, fontSize: 13 }}>{tr('resetPasswordEmail')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {msg ? <Text style={{ color: C.green, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{msg}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── TAB BAR ─────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: 'TODAY', label: 'Today',     icon: '◎' },
  { id: 'LOG',   label: 'Nutrition', icon: '⊕' },
  { id: 'TRAIN', label: 'Train',     icon: '△' },
  { id: 'HIST',  label: 'History',   icon: '▤' },
  { id: 'ME',    label: 'Me',        icon: '◉' },
];

function TabBar({ active, onPress, onCoach, lang }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const navLabels = { TODAY: tr('navToday'), LOG: tr('navNutrition'), TRAIN: tr('navTrain'), HIST: tr('navHistory'), ME: tr('navMe') };
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', paddingBottom: Platform.OS === 'ios' ? 24 : 10, paddingTop: 10 }}>
      {NAV_TABS.map(t => (
        <TouchableOpacity key={t.id} onPress={() => onPress(t.id)} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: active === t.id ? C.purple : C.dim }}>{t.icon}</Text>
          <Text style={{ fontSize: 10, color: active === t.id ? C.purple : C.dim, marginTop: 3, fontWeight: active === t.id ? '700' : '400' }}>{navLabels[t.id]}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onCoach} style={{ position: 'absolute', right: 16, top: -52, width: 48, height: 48, borderRadius: 24, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', shadowColor: C.purple, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        <Text style={{ fontSize: 22 }}>⚡</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SIDEBAR (desktop) ───────────────────────────────────────────────────────
function Sidebar({ active, onPress, onCoach, username, lang }) {
  const tr = k => STRINGS[lang]?.[k] ?? STRINGS.en[k];
  const navLabels = { TODAY: tr('navToday'), LOG: tr('navNutrition'), TRAIN: tr('navTrain'), HIST: tr('navHistory'), ME: tr('navMe') };
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
            <Text style={{ color: active === t.id ? C.text : C.muted, fontWeight: active === t.id ? '600' : '400', fontSize: 14 }}>{navLabels[t.id]}</Text>
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
  const [lang,         setLang]         = useState(() => { try { return (typeof localStorage !== 'undefined' && localStorage.getItem('pulse_lang')) || 'en'; } catch { return 'en'; } });
  const handleChangeLang = (l) => { setLang(l); try { localStorage.setItem('pulse_lang', l); } catch {} };
  const isDesktop = useIsDesktop();

  const [profile, setProfile] = useState({ username: '', sex: 'male', age: null, height_cm: null, weight_kg: null, body_fat_pct: null, activity: 'moderate', goal: 'maintain', training_type: 'mixed', training_days: 3, diet: 'standard', sleep_hours: 7, time_frame: 3, water_target: 2500 });
  const [todayLog, setTodayLog] = useState({ food_log: [], water_ml: 0, id: null });
  const [workout,  setWorkout]  = useState({ exercises: [], completed: false, id: null });
  const [streak,   setStreak]   = useState(0);
  const [weights,  setWeights]  = useState([]);
  const [historyLogs,     setHistoryLogs]     = useState([]);
  const [historyWorkouts, setHistoryWorkouts] = useState([]);
  const [loadingHistory,  setLoadingHistory]  = useState(false);
  const [historyLoaded,   setHistoryLoaded]   = useState(false);
  const sessionDateRef = useRef(todayISO());

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

  // ── Midnight date-change detection ──
  useEffect(() => {
    if (!user || screen !== SCREENS.MAIN) return;
    const timer = setInterval(async () => {
      const now = todayISO();
      if (now !== sessionDateRef.current) {
        sessionDateRef.current = now;
        setTodayLog({ food_log: [], water_ml: 0, id: null });
        setWorkout({ exercises: [], completed: false, id: null });
        setHistoryLoaded(false);
        const [dailyRes, workoutRes] = await Promise.all([
          supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('log_date', now).single(),
          supabase.from('workouts').select('*').eq('user_id', user.id).eq('workout_date', now).single(),
        ]);
        if (dailyRes.data)   setTodayLog({ ...dailyRes.data, food_log: dailyRes.data.food_log || [] });
        if (workoutRes.data) setWorkout({ ...workoutRes.data, exercises: workoutRes.data.exercises || [] });
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [user, screen]);

  // ── Load history (last 30 days) on first visit to HIST tab ──
  useEffect(() => {
    if (tab !== 'HIST' || historyLoaded || !user) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const [logsRes, workoutsRes] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', user.id).gte('log_date', since).order('log_date', { ascending: false }),
        supabase.from('workouts').select('*').eq('user_id', user.id).gte('workout_date', since).order('workout_date', { ascending: false }),
      ]);
      if (logsRes.data)     setHistoryLogs(logsRes.data);
      if (workoutsRes.data) setHistoryWorkouts(workoutsRes.data);
      setHistoryLoaded(true);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [tab, historyLoaded, user]);

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
    const rl = checkRateLimit('food:log', LIMITS.foodLog.maxCalls, LIMITS.foodLog.windowMs);
    if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'logging food'); return; }
    const newLog = { ...todayLog, food_log: [...todayLog.food_log, food] };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
    setHistoryLoaded(false);
  };

  const handleRemoveFood = async (logId) => {
    const newLog = { ...todayLog, food_log: todayLog.food_log.filter(f => f.logId !== logId) };
    const saved  = await saveDailyLog(newLog);
    setTodayLog(saved || newLog);
  };

  const handleAddWater = async (ml) => {
    const rl = checkRateLimit('water:update', LIMITS.waterUpdate.maxCalls, LIMITS.waterUpdate.windowMs);
    if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'updating water'); return; }
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
    const rl = checkRateLimit('set:log', LIMITS.setLog.maxCalls, LIMITS.setLog.windowMs);
    if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'logging a set'); return; }
    const exs      = [...workout.exercises];
    exs[exIndex]   = { ...exs[exIndex], sets: [...exs[exIndex].sets, set] };
    const newW     = { ...workout, exercises: exs };
    const saved    = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleDeleteExercise = async (exIndex) => {
    const exs  = workout.exercises.filter((_, i) => i !== exIndex);
    const newW = { ...workout, exercises: exs };
    const saved = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleDeleteSet = async (exIndex, setIndex) => {
    const exs = [...workout.exercises];
    exs[exIndex] = { ...exs[exIndex], sets: exs[exIndex].sets.filter((_, i) => i !== setIndex) };
    const newW = { ...workout, exercises: exs };
    const saved = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleEditSet = async (exIndex, setIndex, updatedSet) => {
    const exs = [...workout.exercises];
    const sets = [...exs[exIndex].sets];
    sets[setIndex] = updatedSet;
    exs[exIndex] = { ...exs[exIndex], sets };
    const newW = { ...workout, exercises: exs };
    const saved = await saveWorkout(newW);
    setWorkout(saved || newW);
  };

  const handleFinishWorkout = async () => {
    if (workout.completed) {
      // Undo: uncomplete workout and subtract streak
      const newW = { ...workout, completed: false };
      const saved = await saveWorkout(newW);
      setWorkout(saved || newW);
      setHistoryLoaded(false);
      const newStreak = Math.max(0, streak - 1);
      setStreak(newStreak);
      await supabase.from('streaks').upsert({ user_id: user.id, current_streak: newStreak, last_workout_date: todayISO() }, { onConflict: 'user_id' });
    } else {
      const newW  = { ...workout, completed: true };
      const saved = await saveWorkout(newW);
      setWorkout(saved || newW);
      setHistoryLoaded(false);
      const newStreak = streak + 1;
      setStreak(newStreak);
      await supabase.from('streaks').upsert({ user_id: user.id, current_streak: newStreak, last_workout_date: todayISO() }, { onConflict: 'user_id' });
      if (Platform.OS === 'web') { window.alert(`Workout Complete! 🔥 ${newStreak} day streak — keep going!`); } else { Alert.alert('Workout Complete! 🔥', `${newStreak} day streak — keep going!`); }
    }
  };

  const handleAddWeight = async (kg) => {
    const rl = checkRateLimit('weight:log', LIMITS.weightLog.maxCalls, LIMITS.weightLog.windowMs);
    if (!rl.allowed) { showRateLimitAlert(rl.retryAfterMs, 'logging weight'); return; }
    const { data } = await supabase.from('weight_history').insert({ user_id: user.id, weight_kg: kg, logged_at: todayISO() }).select().single();
    if (data) setWeights(prev => [...prev, data]);
  };

  const handleLogout = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to sign out?')
      : await new Promise(resolve => Alert.alert('Sign out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Sign out', style: 'destructive', onPress: () => resolve(true) },
        ]));
    if (!confirmed) return;
    await supabase.auth.signOut();
    setTodayLog({ food_log: [], water_ml: 0, id: null });
    setWorkout({ exercises: [], completed: false, id: null });
    setStreak(0); setWeights([]);
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
          lang={lang}
          onGetStarted={() => { setAuthMode('signup'); setScreen(SCREENS.AUTH); }}
          onSignIn={() => { setAuthMode('signin'); setScreen(SCREENS.AUTH); }}
        />
      )}

      {screen === SCREENS.AUTH && (
        <AuthScreen lang={lang} onBack={() => setScreen(SCREENS.WELCOME)} initialMode={authMode} />
      )}

      {screen === SCREENS.SETUP && (
        <SetupScreen lang={lang} onComplete={handleSetupComplete} userId={user?.id} />
      )}

      {screen === SCREENS.MAIN && (
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
          {isDesktop && <Sidebar active={tab} onPress={setTab} onCoach={() => setCoachVisible(true)} username={profile.username} lang={lang} />}
          <View style={{ flex: 1 }}>
            {tab === 'TODAY' && <TodayTab profile={profile} macros={macros} today={todayLog} onAddWater={handleAddWater} onResetWater={handleResetWater} streak={streak} lang={lang} />}
            {tab === 'LOG'   && <LogTab today={todayLog} onAddFood={handleAddFood} onRemoveFood={handleRemoveFood} lang={lang} />}
            {tab === 'TRAIN' && <TrainTab today={workout} onLogSet={handleLogSet} onAddExercise={handleAddExercise} onFinishWorkout={handleFinishWorkout} onDeleteExercise={handleDeleteExercise} onDeleteSet={handleDeleteSet} onEditSet={handleEditSet} streak={streak} lang={lang} />}
            {tab === 'HIST'  && <HistoryTab logs={historyLogs} workouts={historyWorkouts} loading={loadingHistory} lang={lang} />}
            {tab === 'ME'    && <MeTab profile={profile} macros={macros} weights={weights} onAddWeight={handleAddWeight} onLogout={handleLogout} onEditProfile={() => setScreen(SCREENS.SETUP)} lang={lang} onChangeLang={handleChangeLang} user={user} />}
          </View>
          {!isDesktop && <TabBar active={tab} onPress={setTab} onCoach={() => setCoachVisible(true)} lang={lang} />}
          <CoachModal visible={coachVisible} onClose={() => setCoachVisible(false)} macros={macros} lang={lang} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = {
  input: {
    backgroundColor: C.elevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
};

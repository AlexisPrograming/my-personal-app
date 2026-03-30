import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../../utils/theme';

const BATTLE_THEMES = {
  streak:     { accent: C.red,   gradStart: 'rgba(255,92,53,0.10)',  label: '⚔️ STREAK BATTLE',  unit: 'days' },
  reps:       { accent: C.cyan,  gradStart: 'rgba(0,229,255,0.07)',  label: '🏋️ REP CHALLENGE',  unit: 'reps' },
  macro_days: { accent: C.green, gradStart: 'rgba(57,255,126,0.07)', label: '🥗 MACRO STREAK',   unit: 'days' },
};

// Fallback labels for unit display
const TYPE_LABELS = {
  streak:     'Streak Days',
  reps:       'Total Reps',
  macro_days: 'Macro Days',
};

function ProgressBar({ value, accentColor }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <View style={{ height: 6, backgroundColor: C.elevated, borderRadius: 3, overflow: 'hidden' }}>
      <LinearGradient
        colors={[accentColor, accentColor + '66']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${pct}%`, borderRadius: 3 }}
      />
    </View>
  );
}

export default function BattleCard({ battle, userId }) {
  const isChallenger = battle.challenger_id === userId;
  const myScore      = isChallenger ? battle.challenger_score : battle.opponent_score;
  const oppScore     = isChallenger ? battle.opponent_score   : battle.challenger_score;
  const goal         = battle.goal_value || 1;
  const myPct        = myScore  / goal;
  const oppPct       = oppScore / goal;
  const typeLabel    = TYPE_LABELS[battle.battle_type] || battle.battle_type;
  const theme        = BATTLE_THEMES[battle.battle_type] || BATTLE_THEMES.streak;
  const endsAt       = battle.ends_at ? new Date(battle.ends_at).toLocaleDateString() : '—';
  const oppName      = isChallenger
    ? (battle.opponent_name   || 'Opponent')
    : (battle.challenger_name || 'Challenger');

  return (
    <LinearGradient
      colors={[theme.gradStart, 'rgba(0,0,0,0)', C.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.accent + '40',
        padding: 16,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* VS watermark */}
      <Text style={{
        position: 'absolute',
        alignSelf: 'center',
        top: '25%',
        fontFamily: F.headingB,
        fontSize: 52,
        letterSpacing: 8,
        color: theme.accent + '12',
        zIndex: 0,
      }}>VS</Text>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, zIndex: 1 }}>
        <Text style={{ color: theme.accent, fontFamily: F.heading, fontSize: 11, letterSpacing: 3 }}>
          {theme.label}
        </Text>
        <Text style={{ color: C.dim, fontFamily: F.mono, fontSize: 10 }}>ends {endsAt}</Text>
      </View>

      {/* Players */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, zIndex: 1 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>
            YOU
          </Text>
          <Text style={{ color: theme.accent, fontFamily: F.headingB, fontSize: 44, lineHeight: 46 }}>
            {myScore}
          </Text>
          <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 11 }}>{theme.unit}</Text>
        </View>
        <View style={{ width: 1, height: 60, backgroundColor: C.border }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: C.muted, fontFamily: F.heading, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>
            {oppName.toUpperCase()}
          </Text>
          <Text style={{ color: theme.accent, fontFamily: F.headingB, fontSize: 44, lineHeight: 46 }}>
            {oppScore}
          </Text>
          <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 11 }}>{theme.unit}</Text>
        </View>
      </View>

      {/* Progress bars */}
      <View style={{ gap: 6, zIndex: 1 }}>
        <ProgressBar value={myPct}  accentColor={theme.accent} />
        <ProgressBar value={oppPct} accentColor={theme.accent + 'aa'} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 11 }}>
          You: {myScore} {theme.unit}
        </Text>
        <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 11 }}>
          {oppName}: {oppScore} {theme.unit}
        </Text>
      </View>
      <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 11, marginTop: 4 }}>
        Goal: {goal} {typeLabel}
      </Text>
    </LinearGradient>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { C } from '../../utils/theme';

const TYPE_LABELS = {
  streak:     'Streak Days',
  reps:       'Total Reps',
  macro_days: 'Macro Days',
};

function ProgressBar({ value, color }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <View style={{ height: 6, backgroundColor: C.elevated, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
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
  const endsAt       = battle.ends_at ? new Date(battle.ends_at).toLocaleDateString() : '—';
  const oppName      = isChallenger
    ? (battle.opponent_name   || 'Opponent')
    : (battle.challenger_name || 'Challenger');

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1 }}>
          {typeLabel.toUpperCase()}
        </Text>
        <Text style={{ color: C.dim, fontSize: 11 }}>ends {endsAt}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flex: 1 }}>You</Text>
        <Text style={{ color: C.purple, fontWeight: '800', fontSize: 22 }}>{myScore}</Text>
        <Text style={{ color: C.dim, fontSize: 14 }}>vs</Text>
        <Text style={{ color: C.amber, fontWeight: '800', fontSize: 22 }}>{oppScore}</Text>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flex: 1, textAlign: 'right' }}>{oppName}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <ProgressBar value={myPct}  color={C.purple} />
        <ProgressBar value={oppPct} color={C.amber}  />
      </View>
      <Text style={{ color: C.dim, fontSize: 11, marginTop: 8 }}>
        Goal: {goal} {typeLabel}
      </Text>
    </View>
  );
}

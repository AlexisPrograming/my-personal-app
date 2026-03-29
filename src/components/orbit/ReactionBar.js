import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../../supabaseConfig';
import { C } from '../../utils/theme';

const REACTIONS = [
  { type: 'fire',   emoji: '🔥' },
  { type: 'bolt',   emoji: '⚡' },
  { type: 'muscle', emoji: '💪' },
];

export default function ReactionBar({ signalId, userId, initialCounts = {}, initialUserReactions = [] }) {
  const [counts,      setCounts]      = useState(initialCounts);
  const [userReacted, setUserReacted] = useState(new Set(initialUserReactions));

  const handleReact = async (type) => {
    const alreadyReacted = userReacted.has(type);
    const delta = alreadyReacted ? -1 : 1;

    // Optimistic update
    setCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + delta) }));
    setUserReacted(prev => {
      const next = new Set(prev);
      alreadyReacted ? next.delete(type) : next.add(type);
      return next;
    });

    if (alreadyReacted) {
      await supabase
        .from('signal_reactions')
        .delete()
        .match({ signal_id: signalId, user_id: userId, reaction_type: type });
    } else {
      await supabase
        .from('signal_reactions')
        .insert({ signal_id: signalId, user_id: userId, reaction_type: type });
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
      {REACTIONS.map(r => {
        const active = userReacted.has(r.type);
        return (
          <TouchableOpacity
            key={r.type}
            onPress={() => handleReact(r.type)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: active ? C.purpleGlow : C.elevated, borderWidth: 1, borderColor: active ? C.borderBright : C.border }}
          >
            <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
            <Text style={{ color: active ? C.purple : C.muted, fontSize: 12, fontWeight: '600' }}>
              {counts[r.type] || 0}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

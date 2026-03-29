import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../utils/theme';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function FriendCard({ friend, onPress }) {
  const isActiveToday = friend.last_workout_date === todayISO();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ position: 'relative' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.elevated, borderWidth: 2, borderColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>👤</Text>
        </View>
        {isActiveToday && (
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: C.green, borderWidth: 2, borderColor: C.card }} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>
          {friend.username || 'Unknown'}
        </Text>
        <Text style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
          {isActiveToday
            ? 'Active today'
            : friend.last_workout_date
              ? `Last active ${friend.last_workout_date}`
              : 'No activity yet'}
        </Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: C.amber, fontWeight: '700', fontSize: 16 }}>{friend.streak || 0}</Text>
        <Text style={{ color: C.dim, fontSize: 10 }}>streak</Text>
      </View>
    </TouchableOpacity>
  );
}

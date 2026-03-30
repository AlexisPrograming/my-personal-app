import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../../utils/theme';

const AVATAR_PALETTES = [
  { colors: ['#1a3a2a', '#0a2018'], text: '#39ff7e' },
  { colors: ['#2a1a3a', '#1a0a28'], text: '#c084fc' },
  { colors: ['#3a2a1a', '#281a0a'], text: '#fb923c' },
  { colors: ['#1a2a3a', '#0a1828'], text: '#38bdf8' },
  { colors: ['#2a1a2a', '#1a0a1a'], text: '#f472b6' },
];

function getPalette(name) {
  if (!name) return AVATAR_PALETTES[0];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function FriendCard({ friend, onPress }) {
  const isActiveToday = friend.last_workout_date === todayISO();
  const palette       = getPalette(friend.username);
  const initials      = getInitials(friend.username);
  const hasStreak     = (friend.streak || 0) > 0;

  const webGlow = Platform.OS === 'web' ? {
    boxShadow: isActiveToday
      ? '0 0 0 1px rgba(57,255,126,0.2), 0 4px 20px rgba(0,0,0,0.3)'
      : '0 2px 12px rgba(0,0,0,0.25)',
  } : {};

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ marginBottom: 10 }}>
      <LinearGradient
        colors={isActiveToday
          ? ['rgba(57,255,126,0.07)', C.card, C.card]
          : ['rgba(255,255,255,0.025)', C.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isActiveToday ? 'rgba(57,255,126,0.28)' : C.border,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }, webGlow]}
      >
        {/* Avatar with initials */}
        <View style={{ position: 'relative' }}>
          <LinearGradient
            colors={palette.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 46, height: 46, borderRadius: 23,
              borderWidth: isActiveToday ? 2 : 1,
              borderColor: isActiveToday ? C.green : 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: palette.text, fontFamily: F.headingB, fontSize: 16 }}>
              {initials}
            </Text>
          </LinearGradient>
          {isActiveToday && (
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 12, height: 12, borderRadius: 6,
              backgroundColor: C.green, borderWidth: 2, borderColor: C.card,
            }} />
          )}
        </View>

        {/* Name + activity */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Text style={{ color: C.text, fontFamily: F.heading, fontSize: 16, letterSpacing: 0.5 }}>
              {friend.username || 'Unknown'}
            </Text>
            {isActiveToday && (
              <View style={{
                backgroundColor: 'rgba(57,255,126,0.1)',
                borderWidth: 1, borderColor: 'rgba(57,255,126,0.3)',
                borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
              }}>
                <Text style={{ color: C.green, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}>
                  LIVE
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 12 }} numberOfLines={1}>
            {isActiveToday
              ? 'Active right now 🔥'
              : friend.last_workout_date
                ? `Last active ${friend.last_workout_date}`
                : 'No activity yet'}
          </Text>
        </View>

        {/* Streak */}
        <View style={{ alignItems: 'center', minWidth: 52 }}>
          <Text style={{
            fontFamily: F.headingB,
            fontSize: 20,
            color: hasStreak ? C.red : C.dim,
            lineHeight: 22,
          }}>
            {hasStreak ? `🔥 ${friend.streak}` : '—'}
          </Text>
          <Text style={{ color: C.dim, fontFamily: F.body, fontSize: 10, marginTop: 2 }}>
            {hasStreak ? 'day streak' : 'no streak'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

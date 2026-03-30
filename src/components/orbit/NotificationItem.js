import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { C, F } from '../../utils/theme';

const TYPE_CONFIG = {
  new_pr:           { icon: '🏆', bg: 'rgba(245,200,66,0.12)',  border: 'rgba(245,200,66,0.3)',  label: 'set a new PR 🏆'              },
  reaction:         { icon: '🔥', bg: 'rgba(255,92,53,0.12)',   border: 'rgba(255,92,53,0.3)',   label: 'reacted to your signal'       },
  comment:          { icon: '💬', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  label: 'commented on your signal'     },
  battle_invite:    { icon: '⚔️', bg: C.purpleGlow,             border: 'rgba(0,229,255,0.3)',   label: 'challenged you to a battle ⚔️' },
  streak_milestone: { icon: '🔥', bg: 'rgba(255,92,53,0.12)',   border: 'rgba(255,92,53,0.3)',   label: 'hit a streak milestone 🔥'    },
};

const DEFAULT_CONFIG = {
  icon: '📣', bg: C.elevated, border: C.border, label: 'sent you a notification',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationItem({ notification, onPress }) {
  const config   = TYPE_CONFIG[notification.type] || DEFAULT_CONFIG;
  const name     = notification.payload?.username || 'Someone';
  const isUnread = !notification.read;

  const webGlow = Platform.OS === 'web' && isUnread
    ? { boxShadow: '0 0 0 1px rgba(0,229,255,0.15)' }
    : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 12,
        backgroundColor: isUnread ? 'rgba(0,229,255,0.03)' : C.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isUnread ? 'rgba(0,229,255,0.2)' : C.border,
        marginBottom: 8,
      }, webGlow]}
    >
      {/* Colored icon bubble */}
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: config.bg,
        borderWidth: 1, borderColor: config.border,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 18 }}>{config.icon}</Text>
      </View>

      {/* Body */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginBottom: 3 }}>
          <Text style={{ fontFamily: F.heading, fontSize: 14 }}>{name} </Text>
          <Text style={{ color: C.muted }}>{config.label}</Text>
        </Text>
        <Text style={{ color: C.dim, fontFamily: F.mono, fontSize: 10 }}>
          {timeAgo(notification.created_at)}
        </Text>
      </View>

      {/* Unread dot */}
      {isUnread && (
        <View style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: C.cyan,
          ...(Platform.OS === 'web' ? { boxShadow: `0 0 8px ${C.cyan}` } : {}),
        }} />
      )}
    </TouchableOpacity>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { C } from '../../utils/theme';

const TYPE_CONFIG = {
  new_pr:           { icon: '🏆', label: 'set a new PR' },
  reaction:         { icon: '🔥', label: 'reacted to your signal' },
  comment:          { icon: '💬', label: 'commented on your signal' },
  battle_invite:    { icon: '⚔️', label: 'challenged you to a battle' },
  streak_milestone: { icon: '🔥', label: 'hit a streak milestone' },
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
  const config = TYPE_CONFIG[notification.type] || { icon: '📣', label: 'sent you a notification' };
  const name   = notification.payload?.username || 'Someone';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
        backgroundColor: notification.read ? C.card : C.elevated,
        borderRadius: 12, borderWidth: 1,
        borderColor: notification.read ? C.border : C.borderBright,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 20 }}>{config.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 13, lineHeight: 19 }}>
          <Text style={{ fontWeight: '700' }}>{name}</Text>
          <Text style={{ color: C.muted }}> {config.label}</Text>
        </Text>
        <Text style={{ color: C.dim, fontSize: 11, marginTop: 3 }}>
          {timeAgo(notification.created_at)}
        </Text>
      </View>
      {!notification.read && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple, marginTop: 4 }} />
      )}
    </TouchableOpacity>
  );
}

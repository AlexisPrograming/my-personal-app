import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { C } from '../../utils/theme';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PRBanner({ data }) {
  return (
    <View style={{ backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, borderWidth: 1, borderColor: C.amber, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 18 }}>🏆</Text>
        <Text style={{ color: C.amber, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>NEW PR</Text>
      </View>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{data?.exercise || 'Exercise'}</Text>
      <Text style={{ color: C.amber, fontSize: 13, marginTop: 4 }}>
        {data?.weight}kg × {data?.reps} reps
      </Text>
    </View>
  );
}

const chipStyle = { backgroundColor: C.elevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border };
const chipText  = { color: C.muted, fontSize: 12 };

function WorkoutBanner({ data, text }) {
  return (
    <View>
      {text ? <Text style={{ color: C.text, fontSize: 14, marginBottom: 8 }}>{text}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {data?.sets     ? <View style={chipStyle}><Text style={chipText}>{data.sets} sets</Text></View> : null}
        {data?.reps     ? <View style={chipStyle}><Text style={chipText}>{data.reps} reps</Text></View> : null}
        {data?.weight   ? <View style={chipStyle}><Text style={[chipText, { color: C.amber }]}>{data.weight}kg</Text></View> : null}
        {!data?.weight && data?.volume ? <View style={chipStyle}><Text style={[chipText, { color: C.amber }]}>{Math.round(data.volume)}kg vol</Text></View> : null}
        {data?.duration ? <View style={chipStyle}><Text style={chipText}>{data.duration}</Text></View> : null}
      </View>
    </View>
  );
}

function RunBanner({ data, text }) {
  const km   = data?.km   ?? 0;
  const min  = data?.min  ?? 0;
  const pace = km > 0 && min > 0 ? (min / km).toFixed(1) : null;
  const isRecord = data?.is_record;
  return (
    <View style={{ backgroundColor: 'rgba(0,229,255,0.07)', borderRadius: 10, borderWidth: 1, borderColor: C.cyan, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={{ fontSize: 18 }}>🏃</Text>
        <Text style={{ color: C.cyan, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
          {isRecord ? 'NEW RUN RECORD 🎉' : 'RUN'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: text ? 8 : 0 }}>
        {km  > 0 && <View style={chipStyle}><Text style={[chipText, { color: C.cyan }]}>{km} km</Text></View>}
        {min > 0 && <View style={chipStyle}><Text style={[chipText, { color: C.text }]}>{min} min</Text></View>}
        {pace    && <View style={chipStyle}><Text style={[chipText, { color: C.muted }]}>{pace} min/km</Text></View>}
      </View>
      {text ? <Text style={{ color: C.text, fontSize: 13, lineHeight: 19 }}>{text}</Text> : null}
    </View>
  );
}

function MacroBanner({ text }) {
  return (
    <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 10, borderWidth: 1, borderColor: C.green, padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: text ? 6 : 0 }}>
        <Text style={{ fontSize: 16 }}>🥗</Text>
        <Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>MACRO GOAL HIT</Text>
      </View>
      {text ? <Text style={{ color: C.text, fontSize: 13 }}>{text}</Text> : null}
    </View>
  );
}

export default function SignalCard({ signal, userId, onDelete }) {
  const { id, signal_type, text_content, workout_data, is_pr, created_at, author, reactions, user_reactions } = signal;
  const authorName = author?.username || 'Someone';

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Delete this signal?')) onDelete();
    } else {
      Alert.alert('Delete signal', 'Remove this signal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }
  };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.purple, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{authorName}</Text>
          <Text style={{ color: C.dim, fontSize: 11 }}>{timeAgo(created_at)}</Text>
        </View>
        {is_pr && <Text style={{ color: C.amber, fontSize: 12, fontWeight: '700' }}>PR 🏆</Text>}
        {onDelete && (
          <TouchableOpacity onPress={confirmDelete} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
            <Text style={{ fontSize: 15 }}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {signal_type === 'pr'         && <PRBanner data={workout_data} />}
      {signal_type === 'workout'    && <WorkoutBanner data={workout_data} text={text_content} />}
      {signal_type === 'run'        && <RunBanner data={workout_data} text={text_content} />}
      {signal_type === 'post'       && <Text style={{ color: C.text, fontSize: 14, lineHeight: 21 }}>{text_content}</Text>}
      {signal_type === 'macro_goal' && <MacroBanner text={text_content} />}

      <ReactionBar signalId={id} userId={userId} initialCounts={reactions || {}} initialUserReactions={user_reactions || []} />
      <CommentSection signalId={id} userId={userId} />
    </View>
  );
}

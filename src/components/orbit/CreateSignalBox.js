import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { C } from '../../utils/theme';

const inputStyle = {
  backgroundColor: C.elevated,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  color: C.text,
  fontSize: 14,
  borderWidth: 1,
  borderColor: C.border,
};

export default function CreateSignalBox({ onSubmit, todayWorkout }) {
  const [text,            setText]            = useState('');
  const [loading,         setLoading]         = useState(false);
  const [attachedWorkout, setAttachedWorkout] = useState(null);
  const [isPR,            setIsPR]            = useState(false);
  const [isRun,           setIsRun]           = useState(false);
  const [runKm,           setRunKm]           = useState('');
  const [runMin,          setRunMin]          = useState('');

  const hasContent = text.trim() || attachedWorkout || isPR || (isRun && (runKm || runMin));

  const handleAttachWorkout = () => {
    if (attachedWorkout) {
      setAttachedWorkout(null);
    } else if (todayWorkout?.exercises?.length) {
      setAttachedWorkout(todayWorkout);
      setIsPR(false);
    }
  };

  const handleSend = async () => {
    if (!hasContent || loading) return;
    setLoading(true);

    let signal_type  = 'post';
    let workout_data = null;

    if (isPR) {
      signal_type = 'pr';
    } else if (isRun) {
      signal_type  = 'run';
      workout_data = { km: Number(runKm) || 0, min: Number(runMin) || 0, is_record: false };
    } else if (attachedWorkout) {
      signal_type = 'workout';
      const strengthExs = attachedWorkout.exercises.filter(e => !['cv1','cv2','cv3','cv4'].includes(e?.id));
      const totalSets = strengthExs.reduce((s, e) => s + (e.sets?.length || 0), 0);
      const totalReps = strengthExs.reduce((s, e) => s + (e.sets || []).reduce((ss, set) => ss + (set.reps || 0), 0), 0);
      const maxWeight = strengthExs.reduce((m, e) => Math.max(m, ...(e.sets || []).map(set => set.weight || 0)), 0);
      workout_data = { sets: totalSets, reps: totalReps, weight: maxWeight || undefined };
    }

    await onSubmit({ signal_type, text_content: text.trim(), workout_data, is_pr: isPR });
    setText('');
    setAttachedWorkout(null);
    setIsPR(false);
    setIsRun(false);
    setRunKm('');
    setRunMin('');
    setLoading(false);
  };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 }}>
      <TextInput
        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
        placeholder="What's your signal today?"
        placeholderTextColor={C.dim}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
      />
      {isRun && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TextInput
            style={[inputStyle, { flex: 1 }]}
            placeholder="km"
            placeholderTextColor={C.dim}
            value={runKm}
            onChangeText={setRunKm}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[inputStyle, { flex: 1 }]}
            placeholder="min"
            placeholderTextColor={C.dim}
            value={runMin}
            onChangeText={setRunMin}
            keyboardType="decimal-pad"
          />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={handleAttachWorkout}
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: attachedWorkout ? C.purpleGlow : C.elevated, borderWidth: 1, borderColor: attachedWorkout ? C.borderBright : C.border }}
        >
          <Text style={{ color: attachedWorkout ? C.purple : C.muted, fontSize: 12 }}>
            {attachedWorkout ? '✓ Workout' : '+ Workout'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setIsPR(p => !p); setAttachedWorkout(null); setIsRun(false); }}
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isPR ? 'rgba(251,191,36,0.15)' : C.elevated, borderWidth: 1, borderColor: isPR ? C.amber : C.border }}
        >
          <Text style={{ color: isPR ? C.amber : C.muted, fontSize: 12 }}>
            {isPR ? '✓ PR 🏆' : '+ PR 🏆'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setIsRun(r => !r); setIsPR(false); setAttachedWorkout(null); }}
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isRun ? 'rgba(0,229,255,0.1)' : C.elevated, borderWidth: 1, borderColor: isRun ? C.cyan : C.border }}
        >
          <Text style={{ color: isRun ? C.cyan : C.muted, fontSize: 12 }}>
            {isRun ? '✓ Run 🏃' : '+ Run 🏃'}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading || !hasContent}
          style={{ backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, opacity: loading || !hasContent ? 0.5 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>SEND SIGNAL</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { C } from '../../utils/theme';

const inputStyle = {
  flex: 1,
  backgroundColor: C.elevated,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  color: C.text,
  fontSize: 14,
  borderWidth: 1,
  borderColor: C.border,
};

export default function AddFriendBox({ onAdd }) {
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleAdd = async () => {
    const pulseId = input.trim().toUpperCase();
    if (!pulseId) return;
    setLoading(true);
    setError('');
    try {
      const result = await onAdd(pulseId);
      if (result?.error) {
        setError(result.error);
      } else {
        setInput('');
      }
    } catch {
      setError('Connection failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 12 }}>
        ADD FRIEND BY PULSE ID
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={inputStyle}
          placeholder="#PLS-XXXX"
          placeholderTextColor={C.dim}
          value={input}
          onChangeText={setInput}
          autoCapitalize="characters"
          maxLength={9}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={loading || !input.trim()}
          style={{ backgroundColor: C.purple, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>ADD</Text>
          }
        </TouchableOpacity>
      </View>
      {error ? <Text style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{error}</Text> : null}
    </View>
  );
}

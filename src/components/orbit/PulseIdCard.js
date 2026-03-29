import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { C } from '../../utils/theme';
import { ensurePulseId } from '../../utils/orbit/generatePulseId';

export default function PulseIdCard({ userId }) {
  const [pulseId, setPulseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!userId) return;
    ensurePulseId(userId)
      .then(id => { setPulseId(id); setLoading(false); })
      .catch(()  => setLoading(false));
  }, [userId]);

  const handleCopy = () => {
    if (!pulseId) return;
    if (Platform.OS === 'web') {
      try { navigator.clipboard?.writeText(pulseId); } catch {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.borderBright, padding: 16, marginBottom: 16 }}>
      <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>YOUR PULSE ID</Text>
      {loading ? (
        <ActivityIndicator color={C.purple} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.purple, fontWeight: '800', fontSize: 22, letterSpacing: 1 }}>
            {pulseId || '—'}
          </Text>
          <TouchableOpacity
            onPress={handleCopy}
            style={{ backgroundColor: copied ? C.green : C.elevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: copied ? C.green : C.border }}
          >
            <Text style={{ color: copied ? '#fff' : C.muted, fontSize: 12, fontWeight: '600' }}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ color: C.dim, fontSize: 11, marginTop: 8 }}>
        Share this ID with friends to connect on Orbit
      </Text>
    </View>
  );
}

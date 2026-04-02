import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../../supabaseConfig';
import { C } from '../../utils/theme';

const inputStyle = {
  flex: 1,
  backgroundColor: C.elevated,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  color: C.text,
  fontSize: 13,
  borderWidth: 1,
  borderColor: C.border,
};

export default function CommentSection({ signalId, userId }) {
  const [open,     setOpen]     = useState(false);
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    supabase
      .from('signal_comments')
      .select('id, content, created_at, author_id, profiles:author_id(username)')
      .eq('signal_id', signalId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(data || []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`comments-${signalId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'signal_comments',
        filter: `signal_id=eq.${signalId}`,
      }, payload => {
        setComments(prev => [...prev, payload.new]);
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [open, signalId]);

  const sendComment = async () => {
    // Strip control characters and zero-width chars
    const clean = input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
    if (!clean || sending) return;
    setSending(true);
    await supabase.from('signal_comments').insert({
      signal_id: signalId,
      author_id: userId,
      content:   clean,
    });
    setInput('');
    setSending(false);
  };

  const count = comments.length;

  return (
    <View style={{ marginTop: 8 }}>
      <TouchableOpacity onPress={() => setOpen(o => !o)}>
        <Text style={{ color: C.muted, fontSize: 12 }}>
          {open ? '▲' : '▼'}{' '}
          {count > 0 ? `${count} comment${count > 1 ? 's' : ''}` : 'Comment'}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 8 }}>
          {loading ? (
            <ActivityIndicator color={C.purple} size="small" />
          ) : (
            comments.map(c => (
              <View key={c.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600' }}>
                  {c.profiles?.username || 'User'}
                </Text>
                <Text style={{ color: C.text, fontSize: 13, marginTop: 2 }}>{c.content}</Text>
              </View>
            ))
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              style={inputStyle}
              placeholder="Add a comment…"
              placeholderTextColor={C.dim}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendComment}
              returnKeyType="send"
              maxLength={500}
            />
            <TouchableOpacity
              onPress={sendComment}
              disabled={sending || !input.trim()}
              style={{ backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', opacity: sending || !input.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

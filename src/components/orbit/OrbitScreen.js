import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../../supabaseConfig';
import { C, F } from '../../utils/theme';
import PulseIdCard from './PulseIdCard';
import OrbitRing from './OrbitRing';
import FriendCard from './FriendCard';
import AddFriendBox from './AddFriendBox';
import SignalCard from './SignalCard';
import CreateSignalBox from './CreateSignalBox';
import BattleCard from './BattleCard';
import NotificationItem from './NotificationItem';

const TABS = ['ORBIT', 'SIGNAL', 'BATTLES', 'ALERTS'];

export default function OrbitScreen({ user, streak, todayWorkout }) {
  const [activeTab,    setActiveTab]    = useState('ORBIT');
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [friends,      setFriends]      = useState([]);
  const [weeklyCount,  setWeeklyCount]  = useState(0);
  const [signals,      setSignals]      = useState([]);
  const [battles,      setBattles]      = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);

  const loadOrbitTab = useCallback(async () => {
    if (!user?.id) return;

    const { data: connections } = await supabase
      .from('orbit_connections')
      .select('user_id, friend_id')
      .eq('status', 'active')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friendIds = (connections || []).map(c =>
      c.user_id === user.id ? c.friend_id : c.user_id
    );

    if (friendIds.length) {
      const [{ data: profiles }, { data: streakData }] = await Promise.all([
        supabase.from('profiles').select('id, username, pulse_id').in('id', friendIds),
        supabase.from('streaks').select('user_id, current_streak, last_workout_date').in('user_id', friendIds),
      ]);
      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      const streakMap = {};
      (streakData || []).forEach(s => { streakMap[s.user_id] = s; });

      setFriends(friendIds.map(id => ({
        id,
        username:           profileMap[id]?.username,
        pulse_id:           profileMap[id]?.pulse_id,
        streak:             streakMap[id]?.current_streak || 0,
        last_workout_date:  streakMap[id]?.last_workout_date,
      })));
    } else {
      setFriends([]);
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - daysFromMonday);
    cutoff.setHours(0, 0, 0, 0);
    const { data: weekWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('workout_date', cutoff.toISOString().split('T')[0]);
    setWeeklyCount(weekWorkouts?.length || 0);
  }, [user?.id]);

  const loadSignals = useCallback(async () => {
    if (!user?.id) return;

    const { data: rawSignals } = await supabase
      .from('signals')
      .select('*, signal_reactions(reaction_type, user_id)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!rawSignals) return;

    const authorIds = [...new Set(rawSignals.map(s => s.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    setSignals(rawSignals.map(s => {
      const counts = {};
      const mine   = [];
      (s.signal_reactions || []).forEach(r => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (r.user_id === user.id) mine.push(r.reaction_type);
      });
      return { ...s, author: profileMap[s.author_id], reactions: counts, user_reactions: mine };
    }));
  }, [user?.id]);

  const loadBattles = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('streak_battles')
      .select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });
    setBattles(data || []);
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('orbit_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.read).length);
  }, [user?.id]);

  const loadTab = useCallback(async (tab) => {
    setLoading(true);
    if (tab === 'ORBIT')   await loadOrbitTab();
    if (tab === 'SIGNAL')  await loadSignals();
    if (tab === 'BATTLES') await loadBattles();
    if (tab === 'ALERTS')  await loadNotifications();
    setLoading(false);
  }, [loadOrbitTab, loadSignals, loadBattles, loadNotifications]);

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const handleAddFriend = async (pulseId) => {
    const { data: target } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('pulse_id', pulseId)
      .maybeSingle();
    if (!target) return { error: 'User not found. Check the Pulse ID.' };
    if (target.id === user.id) return { error: "That's your own Pulse ID!" };
    const { error } = await supabase
      .from('orbit_connections')
      .insert({ user_id: user.id, friend_id: target.id, status: 'active' });
    if (error?.code === '23505') return { error: 'Already connected!' };
    if (error) return { error: 'Connection failed. Try again.' };
    await loadOrbitTab();
    return { success: true };
  };

  const handleCreateSignal = async (payload) => {
    await supabase.from('signals').insert({ author_id: user.id, ...payload });
    await loadSignals();
  };

  const handleDeleteSignal = async (signalId) => {
    await supabase.from('signals').delete().eq('id', signalId).eq('author_id', user.id);
    setSignals(prev => prev.filter(s => s.id !== signalId));
  };

  const handleMarkRead = async (ids) => {
    if (!ids?.length) return;
    await supabase.from('orbit_notifications').update({ read: true }).in('id', ids);
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTab(activeTab);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
        <Text style={{ color: C.text, fontWeight: '800', fontSize: 24, letterSpacing: -0.5 }}>🌐 ORBIT</Text>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>Your fitness network</Text>
      </View>

      {/* Inner tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={{ paddingVertical: 10, paddingHorizontal: 10, marginRight: 4, borderBottomWidth: 2, borderBottomColor: activeTab === t ? C.purple : 'transparent' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: activeTab === t ? C.purple : C.muted, fontWeight: activeTab === t ? '700' : '400', fontSize: 12, letterSpacing: 0.5 }}>
                {t}
              </Text>
              {t === 'ALERTS' && unreadCount > 0 && (
                <View style={{ backgroundColor: C.purple, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {loading && !refreshing
          ? <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={C.purple} /></View>
          : <>
              {activeTab === 'ORBIT'   && <OrbitTab user={user} streak={streak} weeklyCount={weeklyCount} friends={friends} onAddFriend={handleAddFriend} />}
              {activeTab === 'SIGNAL'  && <SignalTab signals={signals} userId={user?.id} onCreateSignal={handleCreateSignal} onDeleteSignal={handleDeleteSignal} todayWorkout={todayWorkout} />}
              {activeTab === 'BATTLES' && <BattlesTab battles={battles} userId={user?.id} />}
              {activeTab === 'ALERTS'  && <AlertsTab notifications={notifications} onMarkRead={handleMarkRead} />}
            </>
        }
      </ScrollView>
    </View>
  );
}

function OrbitTab({ user, streak, weeklyCount, friends, onAddFriend }) {
  // Build Mon–Sun dot states based on today and weeklyCount
  const todayJS  = new Date().getDay();               // 0=Sun … 6=Sat
  const todayIdx = todayJS === 0 ? 6 : todayJS - 1;  // remap to 0=Mon … 6=Sun
  const dotStates = [0,1,2,3,4,5,6].map(i => {
    if (i === todayIdx) return 'today';
    if (i < todayIdx && (todayIdx - i) <= weeklyCount) return 'done';
    return 'empty';
  });

  return (
    <>
      {/* Orbit Ring row */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 0, alignItems: 'center' }}>
        <OrbitRing completed={weeklyCount} total={7} size={84} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: F.headingB, fontSize: 18, letterSpacing: 0.5 }}>
            {weeklyCount}/7 days this week
          </Text>
        </View>
      </View>

      {/* ── STREAK BAR ── */}
      <View style={{
        marginTop: 16,
        marginBottom: 16,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}>
        {/* Fire */}
        <Text style={{ fontSize: 28 }}>🔥</Text>

        {/* Middle — week dots */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: F.heading,
            fontSize: 11,
            letterSpacing: 2,
            color: C.muted,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>THIS WEEK</Text>
          <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }}>
            {dotStates.map((state, i) => (
              <View key={i} style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: state === 'done'  ? C.red
                               : state === 'today' ? C.amber
                               : C.surface,
                borderWidth: 1,
                borderColor:    state === 'done'  ? C.red
                              : state === 'today' ? C.amber
                              : C.border,
              }} />
            ))}
          </View>
          <Text style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
            Mon–Sun · {weeklyCount} day{weeklyCount !== 1 ? 's' : ''} active
          </Text>
        </View>

        {/* Right — big streak number */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: F.headingB, fontSize: 28, color: C.red, lineHeight: 30 }}>
            {streak}
          </Text>
          <Text style={{ fontSize: 11, color: C.dim }}>day streak</Text>
        </View>
      </View>

      <PulseIdCard userId={user?.id} />
      <AddFriendBox onAdd={onAddFriend} />
      <Text style={{ color: C.muted, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>
        YOUR ORBIT ({friends.length})
      </Text>
      {friends.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 32 }}>🌐</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
            No friends yet. Share your Pulse ID to start your orbit!
          </Text>
        </View>
      ) : (
        friends.map(f => <FriendCard key={f.id} friend={f} onPress={() => {}} />)
      )}
    </>
  );
}

function SignalTab({ signals, userId, onCreateSignal, onDeleteSignal, todayWorkout }) {
  return (
    <>
      <CreateSignalBox onSubmit={onCreateSignal} todayWorkout={todayWorkout} />
      {signals.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 32 }}>📡</Text>
          <Text style={{ color: C.muted, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
            No signals yet. Add friends and post your first signal!
          </Text>
        </View>
      ) : (
        signals.map(s => <SignalCard key={s.id} signal={s} userId={userId} onDelete={s.author_id === userId ? () => onDeleteSignal(s.id) : null} />)
      )}
    </>
  );
}

function BattlesTab({ battles, userId }) {
  if (!battles.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ fontSize: 32 }}>⚔️</Text>
        <Text style={{ color: C.muted, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
          No active battles. Challenge a friend from their profile!
        </Text>
      </View>
    );
  }
  return battles.map(b => <BattleCard key={b.id} battle={b} userId={userId} />);
}

function AlertsTab({ notifications, onMarkRead }) {
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length) onMarkRead(unread);
  }, []);

  if (!notifications.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ fontSize: 32 }}>🔔</Text>
        <Text style={{ color: C.muted, fontSize: 14, marginTop: 12 }}>No notifications yet</Text>
      </View>
    );
  }
  return notifications.map(n => <NotificationItem key={n.id} notification={n} onPress={() => {}} />);
}

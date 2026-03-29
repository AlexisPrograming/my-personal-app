import { supabase } from '../../../supabaseConfig';

export async function getPreviousBest(userId, exerciseName) {
  const { data: workouts } = await supabase
    .from('workouts')
    .select('exercises')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .limit(100);

  let bestWeight = 0;
  let bestReps = 0;
  if (workouts) {
    for (const w of workouts) {
      const ex = (w.exercises || []).find(e => e.name === exerciseName);
      if (ex) {
        for (const s of ex.sets || []) {
          if ((s.weight || 0) > bestWeight) bestWeight = s.weight;
          if ((s.reps || 0) > bestReps) bestReps = s.reps;
        }
      }
    }
  }
  return { weight: bestWeight, reps: bestReps };
}

export async function autoBroadcastPR(userId, exercise, kg, reps, sets) {
  try {
    const { data: signal } = await supabase.from('signals').insert({
      author_id:    userId,
      signal_type:  'pr',
      is_pr:        true,
      workout_data: { exercise, weight: kg, reps, sets },
      text_content: `New PR: ${exercise} — ${kg}kg × ${reps} reps`,
    }).select().single();

    if (!signal) return;

    const { data: connections } = await supabase
      .from('orbit_connections')
      .select('user_id, friend_id')
      .eq('status', 'active')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (!connections?.length) return;

    const friendIds = connections.map(c =>
      c.user_id === userId ? c.friend_id : c.user_id
    );
    if (!friendIds.length) return;

    const notifications = friendIds.map(friendId => ({
      user_id: friendId,
      type:    'new_pr',
      payload: { signal_id: signal.id, exercise, weight: kg, reps, from_user_id: userId },
    }));

    await supabase.from('orbit_notifications').insert(notifications);
  } catch (err) {
    console.warn('[autoBroadcastPR]', err);
  }
}

-- ═══════════════════════════════════════════════════════════════════════════════
-- 007: Security Hardening
-- Fixes: H3, M1 (RLS cleanup), M2 (persistent rate limiting), M3 (input sanitization)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── RLS POLICY CLEANUP ─────────────────────────────────────────────────────
-- Remove duplicates and wrap auth.uid() in (select ...) for performance

-- PROFILES
DROP POLICY IF EXISTS "Users own their profile" ON profiles;
DROP POLICY IF EXISTS "own profile" ON profiles;
CREATE POLICY "own_profile" ON profiles
  FOR ALL
  USING  ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- WORKOUTS
DROP POLICY IF EXISTS "Users own their workouts" ON workouts;
DROP POLICY IF EXISTS "own workouts" ON workouts;
CREATE POLICY "own_workouts" ON workouts
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- WEIGHT_HISTORY
DROP POLICY IF EXISTS "Users own their weight data" ON weight_history;
DROP POLICY IF EXISTS "own weight_history" ON weight_history;
CREATE POLICY "own_weight_history" ON weight_history
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- STREAKS
DROP POLICY IF EXISTS "Users own their streaks" ON streaks;
DROP POLICY IF EXISTS "own streaks" ON streaks;
CREATE POLICY "own_streaks" ON streaks
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- DAILY_LOGS
DROP POLICY IF EXISTS "own daily_logs" ON daily_logs;
CREATE POLICY "own_daily_logs" ON daily_logs
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- SIGNALS
DROP POLICY IF EXISTS "orbit_signals_visibility" ON signals;
DROP POLICY IF EXISTS "orbit_signals_insert" ON signals;
DROP POLICY IF EXISTS "Users can delete own signals" ON signals;

CREATE POLICY "signals_select" ON signals
  FOR SELECT
  USING (
    author_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM orbit_connections
      WHERE status = 'active'
        AND ((user_id = (select auth.uid()) AND friend_id = signals.author_id)
          OR (friend_id = (select auth.uid()) AND user_id = signals.author_id))
    )
  );

CREATE POLICY "signals_insert" ON signals
  FOR INSERT
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "signals_delete" ON signals
  FOR DELETE
  USING (author_id = (select auth.uid()));

-- SIGNAL_REACTIONS
DROP POLICY IF EXISTS "signal_reactions_all" ON signal_reactions;
DROP POLICY IF EXISTS "signal_reactions_select" ON signal_reactions;

CREATE POLICY "signal_reactions_select" ON signal_reactions
  FOR SELECT USING (true);

CREATE POLICY "signal_reactions_manage" ON signal_reactions
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- SIGNAL_COMMENTS (+ new DELETE policy)
DROP POLICY IF EXISTS "signal_comments_select" ON signal_comments;
DROP POLICY IF EXISTS "signal_comments_insert" ON signal_comments;

CREATE POLICY "signal_comments_select" ON signal_comments
  FOR SELECT USING (true);

CREATE POLICY "signal_comments_insert" ON signal_comments
  FOR INSERT
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "signal_comments_delete" ON signal_comments
  FOR DELETE
  USING (author_id = (select auth.uid()));

-- ORBIT_CONNECTIONS
DROP POLICY IF EXISTS "own_connections" ON orbit_connections;
CREATE POLICY "own_connections" ON orbit_connections
  FOR ALL
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- ORBIT_NOTIFICATIONS
DROP POLICY IF EXISTS "own_notifications" ON orbit_notifications;
CREATE POLICY "own_notifications" ON orbit_notifications
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- STREAK_BATTLES
DROP POLICY IF EXISTS "own_battles" ON streak_battles;
CREATE POLICY "own_battles" ON streak_battles
  FOR ALL
  USING (challenger_id = (select auth.uid()) OR opponent_id = (select auth.uid()));

-- ─── M2: PERSISTENT RATE LIMITING ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  timestamps timestamptz[] NOT NULL DEFAULT '{}',
  UNIQUE(user_id, action)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_calls int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_window_seconds || ' seconds')::interval;
  v_timestamps timestamptz[];
  v_filtered timestamptz[];
BEGIN
  SELECT timestamps INTO v_timestamps
  FROM rate_limits
  WHERE user_id = p_user_id AND action = p_action;

  IF v_timestamps IS NULL THEN
    INSERT INTO rate_limits (user_id, action, timestamps)
    VALUES (p_user_id, p_action, ARRAY[now()])
    ON CONFLICT (user_id, action) DO UPDATE
    SET timestamps = ARRAY[now()];
    RETURN true;
  END IF;

  SELECT array_agg(t) INTO v_filtered
  FROM unnest(v_timestamps) AS t
  WHERE t > v_cutoff;

  v_filtered := COALESCE(v_filtered, '{}');

  IF array_length(v_filtered, 1) >= p_max_calls THEN
    UPDATE rate_limits SET timestamps = v_filtered
    WHERE user_id = p_user_id AND action = p_action;
    RETURN false;
  END IF;

  UPDATE rate_limits SET timestamps = array_append(v_filtered, now())
  WHERE user_id = p_user_id AND action = p_action;
  RETURN true;
END;
$$;

-- ─── M3: INPUT SANITIZATION CONSTRAINTS ────────────────────────────────────
ALTER TABLE signals
  ADD CONSTRAINT signals_text_content_length
  CHECK (char_length(text_content) <= 500);

ALTER TABLE signals
  ADD CONSTRAINT signals_text_content_no_html
  CHECK (text_content !~ '<[^>]*>');

ALTER TABLE signal_comments
  ADD CONSTRAINT signal_comments_content_length
  CHECK (char_length(content) <= 500);

ALTER TABLE signal_comments
  ADD CONSTRAINT signal_comments_content_no_html
  CHECK (content !~ '<[^>]*>');

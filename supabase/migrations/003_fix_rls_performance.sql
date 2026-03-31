-- ─── FIX RLS PERFORMANCE WARNINGS ─────────────────────────────────────────────
-- 1. Remove duplicate policies (keeps one clean policy per table)
-- 2. Wrap auth.uid() in (select ...) so it evaluates once per query, not per row
--
-- Run in Supabase Dashboard → SQL Editor, or via: supabase db push

-- ═══════════════════════════════════════════════════════════════════════════════
-- PROFILES — drop duplicates, recreate with (select auth.uid())
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users own their profile" ON profiles;
DROP POLICY IF EXISTS "own profile" ON profiles;

CREATE POLICY "own_profile" ON profiles
  FOR ALL
  USING  ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- WORKOUTS — drop duplicates, recreate
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users own their workouts" ON workouts;
DROP POLICY IF EXISTS "own workouts" ON workouts;

CREATE POLICY "own_workouts" ON workouts
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- WEIGHT_HISTORY — drop duplicates, recreate
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users own their weight data" ON weight_history;
DROP POLICY IF EXISTS "own weight_history" ON weight_history;

CREATE POLICY "own_weight_history" ON weight_history
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STREAKS — drop duplicates, recreate
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users own their streaks" ON streaks;
DROP POLICY IF EXISTS "own streaks" ON streaks;

CREATE POLICY "own_streaks" ON streaks
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DAILY_LOGS — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "own daily_logs" ON daily_logs;

CREATE POLICY "own_daily_logs" ON daily_logs
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FOOD_LOGS — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can CRUD their own food logs" ON food_logs;

CREATE POLICY "own_food_logs" ON food_logs
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SIGNALS — fix initplan on all 3 policies
-- ═══════════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- SIGNAL_REACTIONS — drop duplicate SELECT policies, recreate cleanly
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "signal_reactions_all" ON signal_reactions;
DROP POLICY IF EXISTS "signal_reactions_select" ON signal_reactions;

-- Everyone can read reactions
CREATE POLICY "signal_reactions_select" ON signal_reactions
  FOR SELECT
  USING (true);

-- Users manage their own reactions
CREATE POLICY "signal_reactions_manage" ON signal_reactions
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SIGNAL_COMMENTS — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "signal_comments_select" ON signal_comments;
DROP POLICY IF EXISTS "signal_comments_insert" ON signal_comments;

CREATE POLICY "signal_comments_select" ON signal_comments
  FOR SELECT
  USING (true);

CREATE POLICY "signal_comments_insert" ON signal_comments
  FOR INSERT
  WITH CHECK (author_id = (select auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORBIT_CONNECTIONS — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "own_connections" ON orbit_connections;

CREATE POLICY "own_connections" ON orbit_connections
  FOR ALL
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORBIT_NOTIFICATIONS — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "own_notifications" ON orbit_notifications;

CREATE POLICY "own_notifications" ON orbit_notifications
  FOR ALL
  USING  ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STREAK_BATTLES — fix initplan
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "own_battles" ON streak_battles;

CREATE POLICY "own_battles" ON streak_battles
  FOR ALL
  USING (challenger_id = (select auth.uid()) OR opponent_id = (select auth.uid()));

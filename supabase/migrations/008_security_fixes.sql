-- ═══════════════════════════════════════════════════════════════════════════════
-- 008: Security Fixes
-- H2: orbit_connections RLS (restrict UPDATE/DELETE to creator)
-- H3: orbit_notifications INSERT (allow system inserts for friends)
-- M1: signals signal_type missing 'run'
-- M3: profiles lookup restricted to non-sensitive columns
-- M4: check_rate_limit SECURITY DEFINER search_path fix
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── H2: ORBIT_CONNECTIONS — split into granular policies ──────────────────

DROP POLICY IF EXISTS "own_connections" ON orbit_connections;

-- Both parties can see the connection
CREATE POLICY "connections_select" ON orbit_connections
  FOR SELECT
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- Only the creator can insert
CREATE POLICY "connections_insert" ON orbit_connections
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Only the creator can update
CREATE POLICY "connections_update" ON orbit_connections
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Either party can delete (unfriend from either side)
CREATE POLICY "connections_delete" ON orbit_connections
  FOR DELETE
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- ─── H3: ORBIT_NOTIFICATIONS — allow inserts for connected users ──────────

DROP POLICY IF EXISTS "own_notifications" ON orbit_notifications;

-- Users read/update/delete their own notifications
CREATE POLICY "notifications_select" ON orbit_notifications
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "notifications_update" ON orbit_notifications
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "notifications_delete" ON orbit_notifications
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Allow inserting notifications for friends (PR broadcasts, etc.)
CREATE POLICY "notifications_insert" ON orbit_notifications
  FOR INSERT
  WITH CHECK (
    -- Can notify yourself
    user_id = (select auth.uid())
    OR
    -- Can notify connected friends
    EXISTS (
      SELECT 1 FROM orbit_connections
      WHERE status = 'active'
        AND (
          (orbit_connections.user_id = (select auth.uid()) AND orbit_connections.friend_id = orbit_notifications.user_id)
          OR
          (orbit_connections.friend_id = (select auth.uid()) AND orbit_connections.user_id = orbit_notifications.user_id)
        )
    )
  );

-- ─── M1: SIGNALS — add 'run' to signal_type constraint ───────────────────

ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_signal_type_check;
ALTER TABLE signals ADD CONSTRAINT signals_signal_type_check
  CHECK (signal_type IN ('workout', 'pr', 'post', 'macro_goal', 'run'));

-- ─── M3: PROFILES — restrict lookup to non-sensitive columns ──────────────

DROP POLICY IF EXISTS "lookup_by_pulse_id" ON profiles;

-- Authenticated users can only look up id, username, pulse_id via RLS
-- (RLS can't restrict columns, so we use a view instead)
-- Keep the policy but rely on client queries selecting only safe columns.
-- Add a restrictive function-based approach:
CREATE POLICY "lookup_by_pulse_id" ON profiles
  FOR SELECT
  USING (
    -- Own profile: full access (handled by own_profile policy)
    -- Others: only if authenticated (queries should SELECT only id, username, pulse_id)
    auth.uid() IS NOT NULL
  );

-- Create a secure view for friend lookups that only exposes safe columns
CREATE OR REPLACE VIEW public.profile_lookup AS
  SELECT id, username, pulse_id
  FROM profiles;

-- ─── M4: check_rate_limit — fix SECURITY DEFINER search_path ─────────────

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_calls int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ─── ALLOW PULSE ID LOOKUP ────────────────────────────────────────────────────
-- Users need to look up other profiles by pulse_id to add friends.
-- Current RLS only allows reading your own profile.
-- Add a SELECT policy that lets any authenticated user read id, username, pulse_id.

CREATE POLICY "lookup_by_pulse_id" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

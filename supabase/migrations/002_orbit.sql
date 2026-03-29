-- ─── ORBIT FEATURE MIGRATION ──────────────────────────────────────────────────
-- Only adds new tables/columns — never modifies existing ones.

-- Extend profiles with a pulse_id (ADD COLUMN ONLY)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pulse_id TEXT UNIQUE;

-- ─── NEW TABLES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orbit_connections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users NOT NULL,
  friend_id  UUID REFERENCES auth.users NOT NULL,
  status     TEXT DEFAULT 'active' CHECK (status IN ('pending','active')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID REFERENCES auth.users NOT NULL,
  signal_type  TEXT CHECK (signal_type IN ('workout','pr','post','macro_goal')),
  text_content TEXT,
  workout_data JSONB,
  is_pr        BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signal_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id     UUID REFERENCES signals ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users NOT NULL,
  reaction_type TEXT CHECK (reaction_type IN ('fire','bolt','muscle')),
  UNIQUE(signal_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS signal_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id  UUID REFERENCES signals ON DELETE CASCADE,
  author_id  UUID REFERENCES auth.users NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streak_battles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id    UUID REFERENCES auth.users NOT NULL,
  opponent_id      UUID REFERENCES auth.users NOT NULL,
  battle_type      TEXT CHECK (battle_type IN ('streak','reps','macro_days')),
  status           TEXT DEFAULT 'active' CHECK (status IN ('pending','active','completed')),
  challenger_score INTEGER DEFAULT 0,
  opponent_score   INTEGER DEFAULT 0,
  goal_value       INTEGER,
  ends_at          TIMESTAMPTZ,
  winner_id        UUID REFERENCES auth.users,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orbit_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users NOT NULL,
  type       TEXT NOT NULL,
  payload    JSONB,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orbit_signals_visibility" ON signals FOR SELECT USING (
  author_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM orbit_connections
    WHERE status = 'active'
      AND ((user_id = auth.uid() AND friend_id = signals.author_id)
        OR (friend_id = auth.uid() AND user_id = signals.author_id))
  )
);
CREATE POLICY "orbit_signals_insert" ON signals FOR INSERT WITH CHECK (author_id = auth.uid());

ALTER TABLE signal_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_reactions_all" ON signal_reactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "signal_reactions_select" ON signal_reactions FOR SELECT USING (true);

ALTER TABLE signal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_comments_select" ON signal_comments FOR SELECT USING (true);
CREATE POLICY "signal_comments_insert" ON signal_comments FOR INSERT WITH CHECK (author_id = auth.uid());

ALTER TABLE orbit_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_connections" ON orbit_connections
  FOR ALL USING (user_id = auth.uid() OR friend_id = auth.uid());

ALTER TABLE orbit_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_notifications" ON orbit_notifications
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE streak_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_battles" ON streak_battles
  FOR ALL USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

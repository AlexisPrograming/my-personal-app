-- Optional dedicated food_logs table.
-- The existing app stores food entries in daily_logs.food_log (JSONB array).
-- This migration adds a normalized table for richer querying if needed.

create table if not exists food_logs (
  id          uuid      default gen_random_uuid() primary key,
  user_id     uuid      references auth.users(id) on delete cascade not null,
  food_name   text      not null,
  grams       numeric(8,2) not null,
  calories    numeric(8,2) not null,
  protein     numeric(8,2) not null,
  carbs       numeric(8,2) not null,
  fat         numeric(8,2) not null,
  fiber       numeric(8,2) default 0,
  confidence  text      check (confidence in ('high', 'medium', 'low')),
  meal        text      check (meal in ('breakfast', 'lunch', 'dinner', 'snacks')),
  logged_at   timestamptz default now() not null,
  created_at  timestamptz default now()
);

-- RLS: users only see their own records
alter table food_logs enable row level security;

create policy "Users can CRUD their own food logs"
  on food_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for daily queries
create index food_logs_user_date_idx on food_logs (user_id, logged_at);

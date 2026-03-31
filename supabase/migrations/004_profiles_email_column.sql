-- Add email column to profiles for username-based login lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for fast username lookups during signin
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- Create a secure function for username→email lookup (avoids exposing profile data)
CREATE OR REPLACE FUNCTION public.get_email_by_username(lookup_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM public.profiles WHERE username = lookup_username LIMIT 1;
$$;

-- Grant anon access so unauthenticated users can call it during signin
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;

-- Backfill existing profiles with emails from auth.users
UPDATE profiles
SET email = u.email
FROM auth.users u
WHERE profiles.id = u.id
  AND profiles.email IS NULL;

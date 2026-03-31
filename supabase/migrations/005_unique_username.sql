ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

CREATE OR REPLACE FUNCTION public.check_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(check_username));
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated;

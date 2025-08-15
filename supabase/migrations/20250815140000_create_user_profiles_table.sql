-- ====================================================================
-- Supabase migration: user_profiles table
-- - Store public user information (name, email, etc.)
-- - Automatically populated on user signup via trigger
-- - RLS enabled: users can read/update own profile, admins can manage all
-- - Follows Supabase best practices for user profiles
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) User profiles table
-- =========================================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS
  'Public user profile information. Automatically created when user signs up.';
COMMENT ON COLUMN public.user_profiles.id IS
  'References auth.users.id';
COMMENT ON COLUMN public.user_profiles.email IS
  'User email (copied from auth.users for convenience)';
COMMENT ON COLUMN public.user_profiles.name IS
  'Display name for the user';

-- =========================================================
-- 2) Updated timestamp trigger
-- =========================================================
DROP TRIGGER IF EXISTS trg_user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3) Auto-create profile on user signup
-- =========================================================

-- Function to handle new user registration and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_profile() IS
  'Automatically creates a user profile when a new user signs up.';

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- =========================================================
-- 4) Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can manage all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 5) Grants
-- =========================================================
-- Allow authenticated users and service_role to reference the schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Authenticated users can SELECT and UPDATE (RLS will limit to own profile)
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- Service role can do everything (bypasses RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;
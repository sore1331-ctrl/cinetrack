-- CineTrack Supabase setup
-- Run this once in Supabase -> SQL Editor.
-- It is safe to rerun: tables/columns are created if missing, and policies
-- are recreated so they match the current app.

-- 1. Profiles table: username, sharing toggle, synced preferences.
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         text,
  sharing_enabled  boolean DEFAULT false,
  preferences      jsonb DEFAULT '{}'::jsonb,
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sharing_enabled boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. User data table: one JSON watch library per user.
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  movies      jsonb DEFAULT '[]'::jsonb,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS movies jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Enable Row Level Security.
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 4. Recreate policies idempotently.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

DROP POLICY IF EXISTS "user_data_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_shared" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_insert_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_update_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_delete_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_shared" ON public.user_data;

-- Profiles:
-- Signed-in users can read profile display data for community features.
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can create/update/delete only their own profile row.
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- User data:
-- Users fully control only their own library.
CREATE POLICY "user_data_select_own" ON public.user_data
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_data_insert_own" ON public.user_data
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_data_update_own" ON public.user_data
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_data_delete_own" ON public.user_data
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Shared community libraries are readable by signed-in users only when the
-- owner has enabled sharing.
CREATE POLICY "user_data_select_shared" ON public.user_data
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = user_data.user_id
        AND profiles.sharing_enabled = true
    )
  );

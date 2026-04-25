-- Run this once in Supabase → SQL Editor
-- https://app.supabase.com → your project → SQL Editor

-- 1. profiles table (username, sharing toggle)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       text,
  sharing_enabled boolean DEFAULT false,
  updated_at     timestamptz DEFAULT now()
);

-- 2. user_data table (movies array)
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  movies     jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 4. Profiles policies
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);                          -- anyone authenticated can read profiles

CREATE POLICY "profiles_modify" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);             -- only owner can write

-- 5. User data policies
CREATE POLICY "user_data_own" ON public.user_data
  FOR ALL USING (auth.uid() = user_id);             -- owner can read + write own data

CREATE POLICY "user_data_shared" ON public.user_data
  FOR SELECT USING (                                -- others can read if sharing is enabled
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id  = user_data.user_id
        AND profiles.sharing_enabled = true
    )
  );

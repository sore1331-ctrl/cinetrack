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
  ADD COLUMN IF NOT EXISTS username text;

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
  version     integer DEFAULT 1 NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS movies jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL;

ALTER TABLE public.user_data
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_data_movies_is_array'
  ) THEN
    ALTER TABLE public.user_data
      ADD CONSTRAINT user_data_movies_is_array
      CHECK (jsonb_typeof(movies) = 'array');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_data_version_positive'
  ) THEN
    ALTER TABLE public.user_data
      ADD CONSTRAINT user_data_version_positive
      CHECK (version >= 1);
  END IF;
END $$;

-- 3. Automatic backups before the app overwrites the main user_data row.
CREATE TABLE IF NOT EXISTS public.user_data_backups (
  id                  bigserial PRIMARY KEY,
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  movies              jsonb DEFAULT '[]'::jsonb,
  original_updated_at timestamptz,
  reason              text DEFAULT 'pre-save',
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.user_data_backups
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_data_backups
  ADD COLUMN IF NOT EXISTS movies jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.user_data_backups
  ADD COLUMN IF NOT EXISTS original_updated_at timestamptz;

ALTER TABLE public.user_data_backups
  ADD COLUMN IF NOT EXISTS reason text DEFAULT 'pre-save';

ALTER TABLE public.user_data_backups
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_data_backups_movies_is_array'
  ) THEN
    ALTER TABLE public.user_data_backups
      ADD CONSTRAINT user_data_backups_movies_is_array
      CHECK (jsonb_typeof(movies) = 'array');
  END IF;
END $$;

-- Keep only the newest 30 backups per user. Every save writes a full copy of
-- the library, so without this the table grows until the database is full.
-- Runs as the table owner because signed-in users cannot delete backups.
CREATE INDEX IF NOT EXISTS user_data_backups_user_id_idx
  ON public.user_data_backups (user_id, id DESC);

CREATE OR REPLACE FUNCTION public.prune_user_data_backups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.user_data_backups b
  WHERE b.user_id = NEW.user_id
    AND b.id NOT IN (
      SELECT k.id
      FROM public.user_data_backups k
      WHERE k.user_id = NEW.user_id
      ORDER BY k.id DESC
      LIMIT 30
    );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_data_backups_prune ON public.user_data_backups;
CREATE TRIGGER user_data_backups_prune
  AFTER INSERT ON public.user_data_backups
  FOR EACH ROW EXECUTE FUNCTION public.prune_user_data_backups();

REVOKE EXECUTE ON FUNCTION public.prune_user_data_backups() FROM PUBLIC, anon, authenticated;

-- 4. Append-only progress event log for audit and targeted recovery.
CREATE TABLE IF NOT EXISTS public.progress_events (
  id              bigserial PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key        text,
  media_type      text,
  tmdb_id         text,
  external_source text,
  external_id     text,
  title           text,
  event_type      text NOT NULL,
  before_value    jsonb,
  after_value     jsonb,
  save_id         uuid,
  source          text DEFAULT 'cloud-save',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS item_key text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS media_type text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS tmdb_id text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'unknown';

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS before_value jsonb;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS after_value jsonb;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS save_id uuid;

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'cloud-save';

ALTER TABLE public.progress_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS progress_events_user_created_idx
  ON public.progress_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS progress_events_user_item_idx
  ON public.progress_events (user_id, item_key, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'progress_events_type_allowed'
  ) THEN
    ALTER TABLE public.progress_events
      ADD CONSTRAINT progress_events_type_allowed
      CHECK (event_type IN (
        'unknown',
        'title_added',
        'title_removed',
        'status_changed',
        'episodes_changed',
        'total_episodes_changed',
        'rating_changed',
        'watch_count_changed'
      ));
  END IF;
END $$;

-- 6. Enable Row Level Security.
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_events ENABLE ROW LEVEL SECURITY;

-- 7. Recreate policies idempotently.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_modify" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

DROP POLICY IF EXISTS "user_data_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_shared" ON public.user_data;
DROP POLICY IF EXISTS "Community read shared data" ON public.user_data;
DROP POLICY IF EXISTS "Users manage their own data" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_insert_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_update_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_delete_own" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_shared" ON public.user_data;
DROP POLICY IF EXISTS "user_data_select_authenticated" ON public.user_data;
DROP POLICY IF EXISTS "user_data_backups_select_own" ON public.user_data_backups;
DROP POLICY IF EXISTS "user_data_backups_insert_own" ON public.user_data_backups;
DROP POLICY IF EXISTS "progress_events_select_own" ON public.progress_events;
DROP POLICY IF EXISTS "progress_events_insert_own" ON public.progress_events;
DROP POLICY IF EXISTS "progress_events_update_none" ON public.progress_events;
DROP POLICY IF EXISTS "progress_events_delete_none" ON public.progress_events;

-- Profiles:
-- Users can read only their own profile row. Other users' display names reach
-- the community page through public.shared_libraries() below.
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Users can create/update/delete only their own profile row.
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- User data:
-- Users can read only their own library. Shared libraries are never readable
-- as raw rows, because those include private fields such as notes.
CREATE POLICY "user_data_select_own" ON public.user_data
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_data_insert_own" ON public.user_data
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "user_data_update_own" ON public.user_data
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Backups:
-- Users can read and create their own immutable backup snapshots.
CREATE POLICY "user_data_backups_select_own" ON public.user_data_backups
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_data_backups_insert_own" ON public.user_data_backups
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Progress events:
-- Users can read and append their own history. Normal client/API traffic
-- cannot update or delete old events, keeping the log append-only.
CREATE POLICY "progress_events_select_own" ON public.progress_events
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "progress_events_insert_own" ON public.progress_events
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_data TO authenticated;
GRANT SELECT, INSERT ON public.user_data_backups TO authenticated;
GRANT SELECT, INSERT ON public.progress_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_data_backups_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.progress_events_id_seq TO authenticated;

REVOKE DELETE ON public.user_data FROM authenticated;
REVOKE UPDATE, DELETE ON public.user_data_backups FROM authenticated;
REVOKE UPDATE, DELETE ON public.progress_events FROM authenticated;
REVOKE ALL ON public.user_data FROM anon;
REVOKE ALL ON public.user_data_backups FROM anon;
REVOKE ALL ON public.progress_events FROM anon;

-- 8. Community sharing.
-- The only way to read another user's library. Returns users who turned
-- sharing on (never the caller) and only the fields the community page shows.
CREATE OR REPLACE FUNCTION public.shared_libraries()
RETURNS TABLE (user_id uuid, username text, movies jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.user_id,
    p.username,
    COALESCE((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'title',           m -> 'title',
        'year',            m -> 'year',
        'genre',           m -> 'genre',
        'country',         m -> 'country',
        'status',          m -> 'status',
        'rating',          m -> 'rating',
        'runtime',         m -> 'runtime',
        'mediaType',       m -> 'mediaType',
        'tmdbId',          m -> 'tmdbId',
        'posterUrl',       m -> 'posterUrl',
        'watchedEpisodes', m -> 'watchedEpisodes',
        'totalEpisodes',   m -> 'totalEpisodes',
        'addedAt',         m -> 'addedAt'
      )))
      FROM jsonb_array_elements(d.movies) AS m
      WHERE jsonb_typeof(m) = 'object'
    ), '[]'::jsonb) AS movies
  FROM public.profiles p
  LEFT JOIN public.user_data d ON d.user_id = p.user_id
  WHERE p.sharing_enabled = true
    AND p.user_id <> (select auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.shared_libraries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shared_libraries() TO authenticated;

-- This helper is not used by CineTrack at runtime and should not be callable
-- from the API if it exists.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
  END IF;
END $$;

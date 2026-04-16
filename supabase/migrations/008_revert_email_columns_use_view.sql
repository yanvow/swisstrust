-- ============================================================
-- Migration 008 — Revert email columns; use user_emails view
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── 2. Expose auth user emails via a public view ──────────
--    The view runs as its owner (postgres) which has access
--    to the auth schema, so authenticated users can read it.
CREATE OR REPLACE VIEW public.user_emails AS
  SELECT id, email FROM auth.users;

GRANT SELECT ON public.user_emails TO authenticated;

-- ── 3. Reload schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';

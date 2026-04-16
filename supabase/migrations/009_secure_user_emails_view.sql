-- ============================================================
-- Migration 009 — Restrict user_emails view to admin role only
-- The view was previously readable by all authenticated users,
-- which would allow any tenant/agency to enumerate all emails.
-- The WHERE clause uses auth.jwt() which Supabase resolves per
-- caller, so non-admins get zero rows and admins get all rows.
-- ============================================================

CREATE OR REPLACE VIEW public.user_emails AS
  SELECT au.id, au.email
  FROM auth.users au
  WHERE (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';

-- Grant is already in place from migration 008; no change needed.

NOTIFY pgrst, 'reload schema';

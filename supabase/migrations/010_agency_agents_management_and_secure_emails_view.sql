-- ============================================================
-- Migration 010 — Agency agent management policies +
--                 restrict user_emails view to admin only
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── 1. Agency UPDATE/DELETE on their own agents ───────────────
-- These were missing: removeAgent() / adminSuspendAgent() called by
-- an agency-role user would be blocked by RLS (only agents_admin_all
-- existed, so only admins could do it).

DROP POLICY IF EXISTS "agents_agency_update" ON agency_agents;
CREATE POLICY "agents_agency_update" ON agency_agents FOR UPDATE
  USING (agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid()))
  WITH CHECK (true);

DROP POLICY IF EXISTS "agents_agency_delete" ON agency_agents;
CREATE POLICY "agents_agency_delete" ON agency_agents FOR DELETE
  USING (agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid()));

-- ── 2. Restrict user_emails view to admin role only ──────────
-- The previous view (migrations 008) exposed all auth user emails
-- to every authenticated user. auth.jwt() is session-scoped so
-- the WHERE clause correctly filters per-caller even though the
-- view runs with postgres's object permissions.

CREATE OR REPLACE VIEW public.user_emails AS
  SELECT au.id, au.email
  FROM auth.users au
  WHERE (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';

-- Grant is already in place from migration 008; no change needed.

-- ── 3. Reload schema cache ────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- Migration 010 — Security hardening (continued)
-- Fixes: user_emails view row exposure, last rls_references_user_metadata

-- ============================================================
-- Fix 1: user_emails view — restrict rows by caller role.
-- Regular users only see their own email; admins see all.
-- SECURITY DEFINER is required (auth.users not accessible to
-- authenticated role directly), but row filter prevents mass
-- email harvesting by non-admins.
-- ============================================================
CREATE OR REPLACE VIEW public.user_emails
WITH (security_invoker = false) AS
SELECT id, email
FROM auth.users
WHERE
  ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
  OR id = auth.uid();

GRANT SELECT ON public.user_emails TO authenticated;

-- ============================================================
-- Fix 2: agents_accept_invite — remove last user_metadata reference.
-- Use verified email match instead of invite_token in user_metadata
-- (which users control). A user can only accept an invite sent
-- to their own Supabase-verified email address.
-- ============================================================
DROP POLICY IF EXISTS agents_accept_invite ON public.agency_agents;
CREATE POLICY agents_accept_invite ON public.agency_agents
  FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_id = auth.uid() AND status = 'active');

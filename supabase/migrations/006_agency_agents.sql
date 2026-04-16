-- ============================================================
-- Migration 006 — agency_agents table + invitation support
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── Create agency_agents table ────────────────────────────
CREATE TABLE IF NOT EXISTS agency_agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  invited_by   UUID REFERENCES auth.users(id),
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  -- Profile (filled by agent on accept)
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  UNIQUE(agency_id, email)
);

ALTER TABLE agency_agents ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "agents_admin_all" ON agency_agents;
CREATE POLICY "agents_admin_all" ON agency_agents FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Agency can read its own agents
DROP POLICY IF EXISTS "agents_agency_select" ON agency_agents;
CREATE POLICY "agents_agency_select" ON agency_agents FOR SELECT
  USING (agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid()));

-- Agent can read their own row
DROP POLICY IF EXISTS "agents_own_select" ON agency_agents;
CREATE POLICY "agents_own_select" ON agency_agents FOR SELECT
  USING (user_id = auth.uid());

-- Agent can accept invite: update the row whose invite_token matches their JWT metadata
DROP POLICY IF EXISTS "agents_accept_invite" ON agency_agents;
CREATE POLICY "agents_accept_invite" ON agency_agents FOR UPDATE
  USING (
    invite_token::text = (auth.jwt() -> 'user_metadata' ->> 'invite_token')
  )
  WITH CHECK (true);

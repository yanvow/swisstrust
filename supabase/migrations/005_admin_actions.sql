-- ============================================================
-- Migration 005 — Admin suspend/delete support
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── Add is_suspended column to user tables ────────────────────
ALTER TABLE tenants  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE owners   ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- agency_agents already uses a status text field; 'suspended' is a valid value.
-- No schema change needed there.

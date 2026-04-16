-- ============================================================
-- Migration 007 — schema fixes + email columns on tenants/owners
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── 1. Ensure documents.status column exists ─────────────
--    (may be absent if the original schema was applied
--    before this column was defined, causing PostgREST errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'documents'
      AND column_name  = 'status'
  ) THEN
    ALTER TABLE documents ADD COLUMN status document_status DEFAULT 'pending';
  END IF;
END $$;

-- ── 2. Ensure certificates.mode column exists ─────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'certificates'
      AND column_name  = 'mode'
  ) THEN
    ALTER TABLE certificates ADD COLUMN mode certificate_mode DEFAULT 'directed';
  END IF;
END $$;

-- ── 3. Add email column to tenants and owners ─────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE owners  ADD COLUMN IF NOT EXISTS email TEXT;

-- ── 4. Backfill email from auth.users for existing rows ───
UPDATE public.tenants t
SET    email = u.email
FROM   auth.users u
WHERE  t.user_id = u.id
  AND  t.email IS NULL;

UPDATE public.owners o
SET    email = u.email
FROM   auth.users u
WHERE  o.user_id = u.id
  AND  o.email IS NULL;

-- ── 5. Reload PostgREST schema cache ─────────────────────
--    (notify PostgREST to pick up the new columns immediately)
NOTIFY pgrst, 'reload schema';

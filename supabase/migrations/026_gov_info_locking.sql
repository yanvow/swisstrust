-- Migration: Add government identity locking and manual review request fields
-- When a tenant uploads a passport/ID and OCR matches their name + DOB,
-- they can lock these fields. Locked fields cannot be edited without admin approval.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_gov_info_locked              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gov_info_review_requested       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gov_info_review_note            TEXT,
  ADD COLUMN IF NOT EXISTS accepted_names                  TEXT[],   -- admin-added alternate accepted names (e.g. maiden name)
  ADD COLUMN IF NOT EXISTS guarantor_is_gov_info_locked    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guarantor_gov_info_review_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guarantor_gov_info_review_note  TEXT;

-- Prevent tenants from unlocking their own gov info (only admin can set lock=false once it's true)
CREATE OR REPLACE FUNCTION prevent_gov_info_unlock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- If the current user is not an admin (check admin role in user metadata via JWT)
  IF current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' <> 'admin' THEN
    -- Prevent downgrading lock from true to false
    IF OLD.is_gov_info_locked = TRUE AND NEW.is_gov_info_locked = FALSE THEN
      RAISE EXCEPTION 'Only an admin can unlock government identity information.';
    END IF;
    IF OLD.guarantor_is_gov_info_locked = TRUE AND NEW.guarantor_is_gov_info_locked = FALSE THEN
      RAISE EXCEPTION 'Only an admin can unlock guarantor government identity information.';
    END IF;
    -- Prevent tenants from modifying name/dob when locked
    IF OLD.is_gov_info_locked = TRUE AND (
      NEW.full_name IS DISTINCT FROM OLD.full_name OR
      NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
    ) THEN
      RAISE EXCEPTION 'Government identity is locked. Contact support to request a change.';
    END IF;
    IF OLD.guarantor_is_gov_info_locked = TRUE AND (
      NEW.guarantor_full_name IS DISTINCT FROM OLD.guarantor_full_name OR
      NEW.guarantor_date_of_birth IS DISTINCT FROM OLD.guarantor_date_of_birth
    ) THEN
      RAISE EXCEPTION 'Guarantor government identity is locked. Contact support to request a change.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_gov_info_unlock ON tenants;
CREATE TRIGGER trg_prevent_gov_info_unlock
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION prevent_gov_info_unlock();

-- Add gov_name column to tenants for full government name (as on passport/ID).
-- This allows detecting mismatches between a tenant's display name and their official documents.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gov_name TEXT;

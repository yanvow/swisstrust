-- Migration 012: add permit_type enum and column to tenants
-- The permit_type enum and tenants.permit_type column were defined in schema.sql
-- but never applied to the live database via a migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permit_type') THEN
    CREATE TYPE permit_type AS ENUM ('swiss', 'B', 'C', 'G', 'L');
  END IF;
END
$$;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS permit_type permit_type;

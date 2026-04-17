-- Migration 016: add no-income flag to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_no_income BOOLEAN DEFAULT FALSE;

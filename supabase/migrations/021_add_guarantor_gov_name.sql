ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS guarantor_gov_name TEXT;

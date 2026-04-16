-- Migration 013: add guarantor employment type columns and document types
-- Allows a guarantor to be an employee, self-employed, or both.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS guarantor_is_employee      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guarantor_is_self_employed BOOLEAN DEFAULT FALSE;

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_balance_sheet';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_tax_assessment';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_bank_statement';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_net_income_proof';

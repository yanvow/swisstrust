-- Migration 028: Remove 'open' certificate mode
-- Open mode is replaced by On-Request mode. Existing open certs are migrated to on_request.

-- 1. Migrate any existing 'open' certificates to 'on_request'
UPDATE certificates SET mode = 'on_request' WHERE mode = 'open';

-- 2. Recreate the enum without 'open'
--    PostgreSQL does not support DROP VALUE from enum; we must replace the type.
ALTER TABLE certificates ALTER COLUMN mode DROP DEFAULT;

ALTER TABLE certificates
  ALTER COLUMN mode TYPE TEXT;

DROP TYPE certificate_mode;

CREATE TYPE certificate_mode AS ENUM ('directed', 'on_request');

ALTER TABLE certificates
  ALTER COLUMN mode TYPE certificate_mode USING mode::certificate_mode;

ALTER TABLE certificates
  ALTER COLUMN mode SET DEFAULT 'directed';

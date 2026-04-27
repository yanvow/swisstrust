-- Migration: Add total_doc_uploads counter to tenants
-- Counts every upload event (including replacements), never decremented on delete.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS total_doc_uploads INT NOT NULL DEFAULT 0;

-- Backfill from current live documents
UPDATE tenants
SET total_doc_uploads = (
  SELECT COUNT(*) FROM documents WHERE documents.tenant_id = tenants.id
);

-- Trigger: increment on every new upload (INSERT) or file replacement (storage_path change on UPDATE)
CREATE OR REPLACE FUNCTION increment_doc_upload_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tenants SET total_doc_uploads = total_doc_uploads + 1 WHERE id = NEW.tenant_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    UPDATE tenants SET total_doc_uploads = total_doc_uploads + 1 WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_doc_upload_count ON documents;
CREATE TRIGGER trg_increment_doc_upload_count
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION increment_doc_upload_count();

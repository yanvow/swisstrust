-- ============================================================
-- Storage RLS policies for the "documents" private bucket
-- Without these, createSignedUrl fails for all non-service-role users.
-- Storage path format: {tenant_id}/{doc_type}/{timestamp}_{filename}
-- ============================================================

-- Tenants: full CRUD on their own files
DROP POLICY IF EXISTS "storage_documents_tenant_select" ON storage.objects;
CREATE POLICY "storage_documents_tenant_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "storage_documents_tenant_insert" ON storage.objects;
CREATE POLICY "storage_documents_tenant_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "storage_documents_tenant_update" ON storage.objects;
CREATE POLICY "storage_documents_tenant_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "storage_documents_tenant_delete" ON storage.objects;
CREATE POLICY "storage_documents_tenant_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM tenants WHERE user_id = auth.uid()
    )
  );

-- Agencies: read files for tenants linked via a directed certificate,
-- or via an approved on_request access request
DROP POLICY IF EXISTS "storage_documents_agency_select" ON storage.objects;
CREATE POLICY "storage_documents_agency_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM certificates c
      JOIN agencies a ON a.id = c.agency_id
      WHERE a.user_id = auth.uid()
        AND c.tenant_id::text = (storage.foldername(name))[1]
        AND (
          c.mode = 'directed'
          OR EXISTS (
            SELECT 1 FROM access_requests ar
            WHERE ar.certificate_id = c.id
              AND ar.requester_user_id = auth.uid()
              AND ar.status = 'approved'
          )
        )
    )
  );

-- Owners: read files for tenants linked via a directed certificate addressed to them
DROP POLICY IF EXISTS "storage_documents_owner_select" ON storage.objects;
CREATE POLICY "storage_documents_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM certificates c
      WHERE c.owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND c.mode = 'directed'
        AND c.tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- Admins: full access
DROP POLICY IF EXISTS "storage_documents_admin_all" ON storage.objects;
CREATE POLICY "storage_documents_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

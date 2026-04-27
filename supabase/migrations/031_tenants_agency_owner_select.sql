-- Agencies can read tenant rows for certificates directed to them
-- (or on_request certificates where access is approved)
DROP POLICY IF EXISTS "tenants_agency_select" ON tenants;
CREATE POLICY "tenants_agency_select" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT c.tenant_id FROM certificates c
      JOIN agencies a ON a.id = c.agency_id
      WHERE a.user_id = auth.uid()
    )
    OR
    id IN (
      SELECT c.tenant_id FROM certificates c
      WHERE c.id IN (
        SELECT ar.certificate_id FROM access_requests ar
        WHERE ar.requester_user_id = auth.uid()
          AND ar.status = 'approved'
      )
    )
  );

-- Owners can read tenant rows for directed certificates addressed to them
DROP POLICY IF EXISTS "tenants_owner_select" ON tenants;
CREATE POLICY "tenants_owner_select" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT c.tenant_id FROM certificates c
      WHERE c.owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND c.mode = 'directed'
    )
    OR
    id IN (
      SELECT c.tenant_id FROM certificates c
      WHERE c.id IN (
        SELECT ar.certificate_id FROM access_requests ar
        WHERE ar.requester_user_id = auth.uid()
          AND ar.status = 'approved'
      )
    )
  );

-- Fix infinite recursion in tenants RLS policies.
-- The subqueries in 031 reference certificates, whose own RLS references
-- tenants again, creating a cycle. SECURITY DEFINER functions bypass RLS
-- on the tables they touch, breaking the cycle.

CREATE OR REPLACE FUNCTION public.agency_accessible_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.tenant_id
  FROM certificates c
  JOIN agencies a ON a.id = c.agency_id
  WHERE a.user_id = auth.uid()

  UNION

  SELECT c.tenant_id
  FROM certificates c
  JOIN access_requests ar ON ar.certificate_id = c.id
  WHERE ar.requester_user_id = auth.uid()
    AND ar.status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.owner_accessible_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.tenant_id
  FROM certificates c
  WHERE c.owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND c.mode = 'directed'

  UNION

  SELECT c.tenant_id
  FROM certificates c
  JOIN access_requests ar ON ar.certificate_id = c.id
  WHERE ar.requester_user_id = auth.uid()
    AND ar.status = 'approved';
$$;

-- Replace the recursive policies with function-based ones
DROP POLICY IF EXISTS "tenants_agency_select" ON tenants;
CREATE POLICY "tenants_agency_select" ON tenants
  FOR SELECT USING (
    id IN (SELECT public.agency_accessible_tenant_ids())
  );

DROP POLICY IF EXISTS "tenants_owner_select" ON tenants;
CREATE POLICY "tenants_owner_select" ON tenants
  FOR SELECT USING (
    id IN (SELECT public.owner_accessible_tenant_ids())
  );

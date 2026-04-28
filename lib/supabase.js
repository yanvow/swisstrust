// ============================================================
// Checks — Shared Supabase client + auth helpers
// Include AFTER the Supabase CDN script tag.
// ============================================================

const SUPABASE_URL     = 'https://zgcgosfddrihtwpzboiq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY2dvc2ZkZHJpaHR3cHpib2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTQ1OTksImV4cCI6MjA5MTU3MDU5OX0.xOnxEdebUSBtUNZzjJn_H50U9bbWfwF3lo3boDGHons';

// Browser singleton
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window._sb = _sb;

// ── Auth helpers ──────────────────────────────────────────

async function getSession() {
  const { data: { session } } = await _sb.auth.getSession();
  return session;
}

async function getUser() {
  const { data: { user } } = await _sb.auth.getUser();
  return user;
}

// Redirect to login if not authenticated or wrong role.
// role: 'tenant' | 'agency' | 'agent' | 'owner' | 'admin' | string[] | null (any)
async function requireAuth(role) {
  const session = await getSession();
  if (!session) {
    window.location.href = rootPath() + 'auth/login.html';
    return null;
  }
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(session.user.user_metadata?.role)) {
      window.location.href = rootPath() + 'auth/login.html';
      return null;
    }
  }
  return session.user;
}

async function requireAdmin() {
  return requireAuth('admin');
}

async function signOut() {
  await _sb.auth.signOut();
  window.location.href = rootPath() + 'auth/login.html';
}

// Return relative path from current page to project root.
// Works for pages at root, /auth/, /tenant/, /agency/, /cert/
function rootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  // In file:// URLs depth counts the filename too, so subtract 1
  const levels = Math.max(depth - 1, 0);
  return levels === 0 ? '' : '../'.repeat(levels);
}

// ── DB helpers ────────────────────────────────────────────

async function getTenantByUserId(userId) {
  const { data, error } = await _sb
    .from('tenants')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

async function upsertTenant(userId, fields) {
  const { data, error } = await _sb
    .from('tenants')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
    .select()
    .single();
  return { data, error };
}

async function getAgencies() {
  const { data, error } = await _sb
    .from('agencies')
    .select('id, company_name, address')
    .order('company_name');
  return { data, error };
}

async function getCertificatesByTenant(tenantId) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, agencies(company_name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

async function getCertificatesByAgency(agencyId) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

// On-request certs where this agency user was granted access by the tenant.
async function getApprovedOnRequestCertsByAgency(userId) {
  const { data, error } = await _sb
    .from('access_requests')
    .select('certificates(*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets))')
    .eq('requester_user_id', userId)
    .eq('requester_type', 'agency')
    .eq('status', 'approved');
  if (error) return { data: null, error };
  const certs = (data || [])
    .map(r => r.certificates)
    .filter(c => c && c.is_active)
    .map(c => ({ ...c, _on_request: true }));
  return { data: certs, error: null };
}

// Ghost certs: directed to an unregistered agency by company name.
// RLS allows agencies to SELECT rows where LOWER(unregistered_agency_name) = LOWER(their company_name).
async function getGhostCertsByAgency() {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets)')
    .is('agency_id', null)
    .not('unregistered_agency_name', 'is', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

// Claim a ghost cert by setting agency_id to the agency's own id.
async function claimGhostCert(certId, agencyId) {
  const { data, error } = await _sb
    .from('certificates')
    .update({ agency_id: agencyId })
    .eq('id', certId)
    .select()
    .single();
  return { data, error };
}

async function getCertificateByCode(certCode) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, owner_email, agencies(id, company_name, user_id), tenants(full_name, date_of_birth, nationality, permit_type, monthly_gross_salary, employer_name, job_role, employment_start_date, occupant_count, is_smoker, has_pets)')
    .eq('cert_code', certCode)
    .eq('is_active', true)
    .single();
  return { data, error };
}

async function getAccessLogsByCertificate(certificateId) {
  const { data, error } = await _sb
    .from('document_access_logs')
    .select('*')
    .eq('certificate_id', certificateId)
    .order('accessed_at', { ascending: false })
    .limit(20);
  return { data, error };
}

async function getDocumentsByTenant(tenantId) {
  const { data, error } = await _sb
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at');
  return { data, error };
}

async function upsertDocument(tenantId, docType, fields) {
  const { data, error } = await _sb
    .from('documents')
    .upsert(
      { tenant_id: tenantId, doc_type: docType, ...fields },
      { onConflict: 'tenant_id,doc_type' }
    )
    .select()
    .single();
  return { data, error };
}

async function runOcr(documentId) {
  // getSession() auto-refreshes the access token if expired before we call the edge function.
  const { data: { session } } = await _sb.auth.getSession();
  const { data, error } = await _sb.functions.invoke('ocr', {
    body: { documentId },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  return { data, error };
}

async function getDocumentSignedUrl(storagePath) {
  const { data, error } = await _sb.functions.invoke('signed-url', {
    body: { storage_path: storagePath },
  });
  if (error) return { url: null, error };
  return { url: data?.url || null, error: data?.error ? new Error(data.error) : null };
}

async function logAccess(certificateId, viewerUserId, viewerType) {
  await _sb.from('document_access_logs').insert({
    certificate_id: certificateId,
    viewer_user_id: viewerUserId || null,
    viewer_type: viewerType,
    ip_address: null,
  });
}

// ── Access requests (On-Request mode) ────────────────────

async function getAccessRequestStatus(certificateId, requesterUserId) {
  const { data, error } = await _sb
    .from('access_requests')
    .select('id, status, requested_at, responded_at')
    .eq('certificate_id', certificateId)
    .eq('requester_user_id', requesterUserId)
    .maybeSingle();
  return { data, error };
}

async function createAccessRequest(certificateId, requesterUserId, requesterType, requesterName, message) {
  const { data, error } = await _sb
    .from('access_requests')
    .insert({
      certificate_id: certificateId,
      requester_user_id: requesterUserId,
      requester_type: requesterType,
      requester_name: requesterName,
      message: message || null,
    })
    .select()
    .single();
  return { data, error };
}

async function getPendingRequestsForTenant(tenantId) {
  const { data, error } = await _sb
    .from('access_requests')
    .select(`
      id, status, requester_type, requester_name, message, requested_at,
      certificates(id, cert_code, property_address, property_city, mode)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  return { data, error };
}

async function respondToAccessRequest(requestId, status) {
  const { data, error } = await _sb
    .from('access_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  return { data, error };
}

// ── Admin helpers ─────────────────────────────────────────

async function adminGetStats() {
  const [tenants, agencies, certs, docs, pending, logs] = await Promise.all([
    _sb.from('tenants').select('*', { count: 'exact', head: true }),
    _sb.from('agencies').select('*', { count: 'exact', head: true }),
    _sb.from('certificates').select('*', { count: 'exact', head: true }).eq('is_active', true),
    _sb.from('documents').select('*', { count: 'exact', head: true }),
    _sb.from('documents').select('*', { count: 'exact', head: true }).in('status', ['pending', 'flagged']),
    _sb.from('document_access_logs').select('*', { count: 'exact', head: true })
      .gte('accessed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);
  return {
    tenants:      tenants.count  || 0,
    agencies:     agencies.count || 0,
    certificates: certs.count   || 0,
    documents:    docs.count    || 0,
    pendingDocs:  pending.count || 0,
    logsThisWeek: logs.count    || 0,
  };
}

async function adminGetRecentActivity() {
  const [recentTenants, recentCerts, recentLogs] = await Promise.all([
    _sb.from('tenants').select('id, full_name, created_at, profile_complete').order('created_at', { ascending: false }).limit(8),
    _sb.from('certificates').select('id, cert_code, property_address, is_active, created_at, tenants(full_name), agencies(company_name)').order('created_at', { ascending: false }).limit(8),
    _sb.from('document_access_logs').select('id, viewer_type, accessed_at, certificates(cert_code, property_address, tenants(full_name))').order('accessed_at', { ascending: false }).limit(10),
  ]);
  return {
    recentTenants: recentTenants.data || [],
    recentCerts:   recentCerts.data   || [],
    recentLogs:    recentLogs.data    || [],
  };
}

async function adminGetTenants() {
  const [{ data, error }, { data: emailRows }] = await Promise.all([
    _sb.from('tenants').select('*').order('created_at', { ascending: false }),
    _sb.from('user_emails').select('id, email'),
  ]);
  if (error) return { data, error };
  const emailMap = Object.fromEntries((emailRows || []).map(u => [u.id, u.email]));
  return { data: (data || []).map(t => ({ ...t, email: emailMap[t.user_id] || null })), error: null };
}

async function adminUpdateTenant(tenantId, fields) {
  const { data, error } = await _sb
    .from('tenants')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select()
    .single();
  return { data, error };
}

async function adminGetAgencies() {
  const { data, error } = await _sb
    .from('agencies')
    .select('*')
    .order('company_name');
  return { data, error };
}

async function adminUpdateAgency(agencyId, fields) {
  const { data, error } = await _sb
    .from('agencies')
    .update(fields)
    .eq('id', agencyId)
    .select()
    .single();
  return { data, error };
}

async function adminGetDocuments(statusFilter) {
  let query = _sb
    .from('documents')
    .select('*, tenants(full_name)')
    .order('updated_at', { ascending: false })
    .limit(300);
  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
  const { data, error } = await query;
  return { data, error };
}

async function adminUpdateDocument(docId, fields) {
  const { data, error } = await _sb
    .from('documents')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', docId)
    .select()
    .single();
  return { data, error };
}

async function adminGetCertificates() {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, tenants(full_name), agencies(company_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  return { data, error };
}

async function adminUpdateCertificate(certId, fields) {
  const { data, error } = await _sb
    .from('certificates')
    .update(fields)
    .eq('id', certId)
    .select()
    .single();
  return { data, error };
}

async function adminGetOwners() {
  const [{ data, error }, { data: emailRows }] = await Promise.all([
    _sb.from('owners').select('*').order('created_at', { ascending: false }),
    _sb.from('user_emails').select('id, email'),
  ]);
  if (error) return { data, error };
  const emailMap = Object.fromEntries((emailRows || []).map(u => [u.id, u.email]));
  return { data: (data || []).map(o => ({ ...o, email: emailMap[o.user_id] || null })), error: null };
}

async function adminUpdateOwner(ownerId, fields) {
  const { data, error } = await _sb
    .from('owners')
    .update(fields)
    .eq('id', ownerId)
    .select()
    .single();
  return { data, error };
}

async function adminSuspendOwner(ownerId, suspended) {
  return adminUpdateOwner(ownerId, { is_suspended: suspended });
}

async function adminDeleteOwner(ownerId) {
  const { error } = await _sb.from('owners').delete().eq('id', ownerId);
  return { error };
}

async function adminCreateTenant(fields) {
  const { data, error } = await _sb
    .from('tenants')
    .insert({ ...fields, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

async function adminSuspendTenant(tenantId, suspended) {
  return adminUpdateTenant(tenantId, { is_suspended: suspended });
}

async function adminDeleteTenant(tenantId) {
  const { error } = await _sb.from('tenants').delete().eq('id', tenantId);
  return { error };
}

async function adminCreateAgency(fields) {
  const { data, error } = await _sb
    .from('agencies')
    .insert({ ...fields, created_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

async function adminSuspendAgency(agencyId, suspended) {
  return adminUpdateAgency(agencyId, { is_suspended: suspended });
}

async function adminDeleteAgency(agencyId) {
  const { error } = await _sb.from('agencies').delete().eq('id', agencyId);
  return { error };
}

async function adminGetAgentsByAgency(agencyId) {
  const { data, error } = await _sb
    .from('agency_agents')
    .select('id, email, status, invited_at, accepted_at, user_id, first_name, last_name, phone')
    .eq('agency_id', agencyId)
    .order('invited_at', { ascending: false });
  return { data, error };
}

async function adminCreateAgent(agencyId, email) {
  // Use functions.invoke so the SDK handles session refresh automatically.
  // Raw fetch + getSession() was sending stale access tokens after refresh-token rotation.
  const { data, error } = await _sb.functions.invoke('invite-agent', {
    body: { agencyId, email },
  });
  if (error) return { data: null, error: { message: error.message || 'Invite failed' } };
  return { data, error: null };
}

async function adminSuspendAgent(agentId, suspended) {
  const { data, error } = await _sb
    .from('agency_agents')
    .update({ status: suspended ? 'suspended' : 'active' })
    .eq('id', agentId)
    .select()
    .single();
  return { data, error };
}

async function adminDeleteAgent(agentId) {
  const { error } = await _sb.from('agency_agents').delete().eq('id', agentId);
  return { error };
}

async function adminGetTenantDocuments(tenantId) {
  const { data, error } = await _sb
    .from('documents')
    .select('id, doc_type, file_name, status, confidence_score, created_at, storage_path, rejection_reason')
    .eq('tenant_id', tenantId)
    .order('doc_type');
  return { data, error };
}

async function adminDeleteDocument(docId, storagePath) {
  if (storagePath) await _sb.storage.from('documents').remove([storagePath]);
  const { error } = await _sb.from('documents').delete().eq('id', docId);
  return { error };
}

async function adminDeleteCertificate(certId) {
  const { error } = await _sb.from('certificates').delete().eq('id', certId);
  return { error };
}

// ── Billing & Payment ─────────────────────────────────────

async function getBillingProfile() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  const { data, error } = await _sb
    .from('billing_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return { data, error };
}

async function upsertBillingProfile(fields) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  const { data, error } = await _sb
    .from('billing_profiles')
    .upsert(
      { user_id: user.id, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  return { data, error };
}

async function getPaymentMethods() {
  const { data, error } = await _sb
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
}

async function addPaymentMethod(fields) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  const { data, error } = await _sb
    .from('payment_methods')
    .insert({ user_id: user.id, ...fields })
    .select()
    .single();
  return { data, error };
}

async function deletePaymentMethod(methodId) {
  const { error } = await _sb.from('payment_methods').delete().eq('id', methodId);
  return { error };
}

async function setDefaultPaymentMethod(methodId) {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  await _sb.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await _sb.from('payment_methods').update({ is_default: true }).eq('id', methodId);
  return { error };
}

async function getInvoices() {
  const { data, error } = await _sb
    .from('invoices')
    .select('*')
    .order('issued_at', { ascending: false });
  return { data, error };
}

// Self-service: delete all of the user's uploaded documents
async function deleteSelfDocuments(tenantId) {
  const { data: docs } = await _sb
    .from('documents')
    .select('id, storage_path')
    .eq('tenant_id', tenantId);
  if (docs && docs.length) {
    const paths = docs.map(d => d.storage_path).filter(Boolean);
    if (paths.length) await _sb.storage.from('documents').remove(paths);
  }
  const { error } = await _sb.from('documents').delete().eq('tenant_id', tenantId);
  return { error };
}

// Self-service: reset all tenant profile fields to blank
async function clearSelfTenantInfo(tenantId) {
  const { error } = await _sb.from('tenants').update({
    full_name: null, date_of_birth: null, nationality: null,
    current_address: null, employer_name: null, job_role: null,
    employment_start_date: null, monthly_gross_salary: null,
    occupant_count: 1, is_smoker: false, has_pets: false,
    needs_guarantor: false, guarantor_is_employee: false, guarantor_is_self_employed: false,
    is_employee: false, is_self_employed: false,
    is_unemployed: false, is_on_welfare: false,
    has_household_liability_insurance: false, rental_deposit_type: null,
    profile_complete: false, updated_at: new Date().toISOString(),
  }).eq('id', tenantId);
  return { error };
}

// Self-service: reset owner profile fields
async function clearSelfOwnerInfo() {
  const { data: { user } } = await _sb.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  const { error } = await _sb.from('owners').update({
    full_name: null, phone: null, property_address: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);
  return { error };
}

// Self-service: clear agency profile fields
async function clearSelfAgencyInfo(agencyId) {
  const { error } = await _sb.from('agencies').update({
    company_name: '', address: '', contact_email: '',
  }).eq('id', agencyId);
  return { error };
}

// Self-service: delete account via edge function (requires service role)
async function deleteSelfAccount() {
  const { data, error } = await _sb.functions.invoke('delete-account', { body: {} });
  return { data, error };
}

// ── Admin billing helpers ─────────────────────────────────

async function adminGetBillingProfile(userId) {
  const { data, error } = await _sb
    .from('billing_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
}

async function adminGetPaymentMethods(userId) {
  const { data, error } = await _sb
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

async function adminGetInvoices(userId) {
  const { data, error } = await _sb
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });
  return { data, error };
}

async function adminAddInvoice(userId, fields) {
  const { data, error } = await _sb
    .from('invoices')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  return { data, error };
}

async function adminDeleteTenantDocuments(tenantId) {
  const { data: docs } = await _sb
    .from('documents')
    .select('id, storage_path')
    .eq('tenant_id', tenantId);
  if (docs && docs.length) {
    const paths = docs.map(d => d.storage_path).filter(Boolean);
    if (paths.length) await _sb.storage.from('documents').remove(paths);
  }
  const { error } = await _sb.from('documents').delete().eq('tenant_id', tenantId);
  return { error };
}

async function adminClearTenantInfo(tenantId) {
  const { error } = await _sb.from('tenants').update({
    full_name: null, date_of_birth: null, nationality: null,
    current_address: null, employer_name: null, job_role: null,
    employment_start_date: null, monthly_gross_salary: null,
    occupant_count: 1, is_smoker: false, has_pets: false,
    needs_guarantor: false, guarantor_is_employee: false, guarantor_is_self_employed: false,
    is_employee: false, is_self_employed: false,
    is_unemployed: false, is_on_welfare: false,
    has_household_liability_insurance: false, rental_deposit_type: null,
    profile_complete: false, updated_at: new Date().toISOString(),
  }).eq('id', tenantId);
  return { error };
}

async function adminClearOwnerInfo(ownerId) {
  const { error } = await _sb.from('owners').update({
    full_name: null, phone: null, property_address: null,
    updated_at: new Date().toISOString(),
  }).eq('id', ownerId);
  return { error };
}

// ── Certificate code generator ────────────────────────────
// STD-XXXX-XXXX using unambiguous alphabet (no 0/O, 1/I/l)

function generateCertCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = (n) => Array.from({ length: n }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
  return `STD-${rand(4)}-${rand(4)}`;
}

// ── UI helpers ────────────────────────────────────────────

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function setLoading(btn, loading, defaultText) {
  btn.disabled = loading;
  btn.textContent = loading ? (window.stI18n?.t('Please wait…') || 'Please wait…') : defaultText;
}

function validatePassword(pw) {
  if (pw.length < 8)           return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw))       return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(pw))       return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(pw))       return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain at least one special character (e.g. !@#$%).';
  return null;
}

// ── Agency agents ─────────────────────────────────────────────

// Resolve the agency row for any user: main account → agencies table,
// agent → agency_agents → agencies join.
async function resolveAgency(user) {
  const role = user.user_metadata?.role;
  if (role === 'agency') {
    const { data, error } = await _sb
      .from('agencies')
      .select('id, company_name, is_verified')
      .eq('user_id', user.id)
      .single();
    return { data, error, isAdmin: true };
  }
  if (role === 'agent') {
    const { data, error } = await _sb
      .from('agency_agents')
      .select('agency_id, agencies(id, company_name, is_verified)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    if (error || !data) return { data: null, error, isAdmin: false };
    return { data: data.agencies, error: null, isAdmin: false };
  }
  return { data: null, error: new Error('Not an agency user'), isAdmin: false };
}

async function getAgencyAgents(agencyId) {
  const { data, error } = await _sb
    .from('agency_agents')
    .select('id, email, status, invited_at, accepted_at')
    .eq('agency_id', agencyId)
    .neq('status', 'removed')
    .order('invited_at', { ascending: false });
  return { data, error };
}

async function inviteAgent(agencyId, email) {
  const { data, error } = await _sb.functions.invoke('invite-agent', {
    body: { agencyId, email },
  });
  return { data, error };
}

async function removeAgent(agentId) {
  const { error } = await _sb
    .from('agency_agents')
    .update({ status: 'removed' })
    .eq('id', agentId);
  return { error };
}

// Expose everything
window.sbHelpers = {
  getSession, getUser, requireAuth, requireAdmin, signOut, rootPath,
  adminGetStats, adminGetRecentActivity,
  adminGetTenants, adminCreateTenant, adminUpdateTenant, adminSuspendTenant, adminDeleteTenant,
  adminGetAgencies, adminCreateAgency, adminUpdateAgency, adminSuspendAgency, adminDeleteAgency,
  adminGetAgentsByAgency, adminCreateAgent, adminSuspendAgent, adminDeleteAgent,
  adminGetDocuments, adminGetTenantDocuments, adminUpdateDocument, adminDeleteDocument,
  adminGetCertificates, adminUpdateCertificate, adminDeleteCertificate,
  adminGetOwners, adminUpdateOwner, adminSuspendOwner, adminDeleteOwner,
  adminGetBillingProfile, adminGetPaymentMethods, adminGetInvoices, adminAddInvoice,
  adminDeleteTenantDocuments, adminClearTenantInfo, adminClearOwnerInfo,
  getTenantByUserId, upsertTenant, getAgencies,
  getCertificatesByTenant, getCertificatesByAgency, getApprovedOnRequestCertsByAgency,
  getGhostCertsByAgency, claimGhostCert,
  getCertificateByCode, getDocumentsByTenant, logAccess,
  getAccessRequestStatus, createAccessRequest,
  getPendingRequestsForTenant, respondToAccessRequest,
  getAccessLogsByCertificate,
  generateCertCode, showError, hideError, setLoading, validatePassword,
  upsertDocument, runOcr, getDocumentSignedUrl,
  resolveAgency, getAgencyAgents, inviteAgent, removeAgent,
  getBillingProfile, upsertBillingProfile,
  getPaymentMethods, addPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod,
  getInvoices,
  deleteSelfDocuments, clearSelfTenantInfo, clearSelfOwnerInfo, clearSelfAgencyInfo, deleteSelfAccount,
};

// Mobile sidebar navigation
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    toggle.textContent = '✕';
    toggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    toggle.textContent = '☰';
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close sidebar when a nav link is clicked (page navigation)
  sidebar.querySelectorAll('.sidebar__link').forEach(function (link) {
    link.addEventListener('click', closeSidebar);
  });
});

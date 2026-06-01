"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { NATIONALITIES } from "@/lib/profile-constants";
import PaymentSection from "../_components/PaymentSection";

type Tenant = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email?: string | null;
  nationality: string | null;
  permit_type: string | null;
  date_of_birth: string | null;
  current_address: string | null;
  employer_name: string | null;
  job_role: string | null;
  employment_start_date: string | null;
  monthly_gross_salary: number | null;
  occupant_count: number | null;
  is_smoker: boolean | null;
  has_pets: boolean | null;
  profile_complete: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  gov_info_review_requested?: boolean | null;
  guarantor_gov_info_review_requested?: boolean | null;
  is_gov_info_locked?: boolean | null;
  guarantor_is_gov_info_locked?: boolean | null;
  accepted_names?: string[] | null;
  gov_info_review_note?: string | null;
  needs_guarantor?: boolean | null;
  guarantor_full_name?: string | null;
  guarantor_date_of_birth?: string | null;
  guarantor_gov_info_review_note?: string | null;
};

type TenantDoc = {
  id: string;
  doc_type: string;
  file_name: string | null;
  status: string | null;
  confidence_score: number | null;
  created_at: string;
  storage_path: string | null;
  rejection_reason: string | null;
};

const DOC_LABELS: Record<string, string> = {
  passport_id: "Passport / Swiss ID", residence_permit: "Residence permit",
  betreibungsauszug: "Debt enforcement register", reference_letter: "Reference letter",
  salary_slip_1: "Salary slip 1", salary_slip_2: "Salary slip 2", salary_slip_3: "Salary slip 3",
  balance_sheet: "Balance sheet", tax_assessment: "Tax assessment", bank_statement: "Bank statement",
  net_income_proof: "Net income proof", turnover_proof: "Turnover proof",
  avs_affiliation: "AVS affiliation", commercial_register: "Commercial register",
  guarantor_id: "Guarantor ID", guarantor_salary_slip_1: "Guarantor salary 1",
  guarantor_salary_slip_2: "Guarantor salary 2", guarantor_salary_slip_3: "Guarantor salary 3",
  guarantor_betreibungsauszug: "Guarantor debt register",
  unemployment_benefit_1: "Unemployment benefit 1", unemployment_benefit_2: "Unemployment benefit 2",
  unemployment_benefit_3: "Unemployment benefit 3", welfare_rent_coverage: "Welfare rent coverage",
};
const DOC_STATUS_BADGE: Record<string, string> = {
  pending: "badge-amber", processing: "badge-blue",
  auto_verified: "badge-green", flagged: "badge-amber", rejected: "badge-red",
};

export default function AdminTenantsPage() {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "complete" | "incomplete" | "review_requested">("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data, error }, { data: emails }] = await Promise.all([
        sb.from("tenants").select("*").order("created_at", { ascending: false }),
        sb.from("user_emails").select("id, email"),
      ]);
      if (!error) {
        const emailMap = Object.fromEntries(((emails as { id: string; email: string }[]) || []).map((u) => [u.id, u.email]));
        setTenants(((data as Tenant[]) || []).map((tn) => ({ ...tn, email: emailMap[tn.user_id || ""] || null })));
      }
      setLoading(false);
    })();
  }, [sb]);

  const rows = tenants.filter((tn) => {
    if (q) {
      const ql = q.toLowerCase();
      if (
        !(tn.full_name || "").toLowerCase().includes(ql) &&
        !(tn.email || "").toLowerCase().includes(ql) &&
        !(tn.nationality || "").toLowerCase().includes(ql) &&
        !(tn.employer_name || "").toLowerCase().includes(ql)
      ) return false;
    }
    if (filter === "complete" && !tn.profile_complete) return false;
    if (filter === "incomplete" && tn.profile_complete) return false;
    if (filter === "review_requested" && !tn.gov_info_review_requested && !tn.guarantor_gov_info_review_requested) return false;
    return true;
  });

  async function quickSuspend(id: string, suspend: boolean) {
    const { data, error } = await sb.from("tenants").update({ is_suspended: suspend, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) { alert("Error: " + error.message); return; }
    setTenants((arr) => arr.map((x) => (x.id === id ? { ...x, ...(data as Tenant) } : x)));
  }
  async function quickDelete(id: string) {
    const tn = tenants.find((x) => x.id === id);
    if (!confirm(`Delete tenant "${tn?.full_name || "this tenant"}"? This cannot be undone.`)) return;
    const { error } = await sb.from("tenants").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    setTenants((arr) => arr.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{t("Tenants")}</div>
          <div className="page-subtitle">
            {loading ? t("Loading…") : `${tenants.length} ${tenants.length === 1 ? t("tenant registered") : t("tenants registered")}`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ {t("New tenant")}</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          placeholder={t("Search by name, nationality, employer…")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ width: "auto" }}>
          <option value="all">{t("All profiles")}</option>
          <option value="complete">{t("Complete only")}</option>
          <option value="incomplete">{t("Incomplete only")}</option>
          <option value="review_requested">{t("Identity review requests")}</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Nationality / Permit")}</th>
              <th>{t("Employer")}</th>
              <th>{t("Salary (gross)")}</th>
              <th>{t("Occupants")}</th>
              <th>{t("Status")}</th>
              <th>{t("Joined")}</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("Loading…")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("No tenants found.")}</td></tr>
            ) : rows.map((tn) => (
              <tr key={tn.id} style={tn.is_suspended ? { opacity: 0.5 } : undefined}>
                <td>
                  <div className="font-bold">{tn.full_name || "—"}</div>
                  {tn.email && <div className="text-xs text-gray">{tn.email}</div>}
                  {tn.is_suspended && <span className="badge badge-red" style={{ fontSize: ".65rem" }}>{t("Suspended")}</span>}
                  {(tn.gov_info_review_requested || tn.guarantor_gov_info_review_requested) && <span className="badge badge-amber" style={{ fontSize: ".65rem" }}>🔐 {t("Identity review")}</span>}
                  {(tn.is_gov_info_locked || tn.guarantor_is_gov_info_locked) && <span className="badge badge-green" style={{ fontSize: ".65rem" }}>🔒 {t("Locked")}</span>}
                </td>
                <td>
                  {tn.nationality || "—"}{" "}
                  {tn.permit_type && <span className="badge badge-gray" style={{ fontSize: ".7rem" }}>{tn.permit_type}</span>}
                </td>
                <td className="text-sm">{tn.employer_name || "—"}</td>
                <td className="text-sm">{tn.monthly_gross_salary ? "CHF " + Number(tn.monthly_gross_salary).toLocaleString() : "—"}</td>
                <td className="text-sm">{tn.occupant_count || 1}</td>
                <td><span className={`badge ${tn.profile_complete ? "badge-green" : "badge-amber"}`} style={{ fontSize: ".7rem" }}>{tn.profile_complete ? t("Complete") : t("Incomplete")}</span></td>
                <td className="text-sm text-gray">{new Date(tn.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setEditing(tn)}>{t("Edit")}</button></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => quickSuspend(tn.id, !tn.is_suspended)} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
                    {tn.is_suspended ? t("Unsuspend") : t("Suspend")}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => quickDelete(tn.id)} style={{ color: "var(--red)", borderColor: "var(--red)", marginLeft: 4 }}>{t("Delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setTenants((arr) => arr.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
            setEditing(null);
          }}
          onDeleted={(id) => {
            setTenants((arr) => arr.filter((x) => x.id !== id));
            setEditing(null);
          }}
        />
      )}

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={(t) => {
            setTenants((arr) => [t, ...arr]);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function EditModal({
  tenant,
  onClose,
  onSaved,
  onDeleted,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: (t: Tenant) => void;
  onDeleted: (id: string) => void;
}) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    full_name: tenant.full_name || "",
    nationality: tenant.nationality || "",
    date_of_birth: tenant.date_of_birth || "",
    permit_type: tenant.permit_type || "",
    current_address: tenant.current_address || "",
    employer_name: tenant.employer_name || "",
    job_role: tenant.job_role || "",
    employment_start_date: tenant.employment_start_date || "",
    monthly_gross_salary: tenant.monthly_gross_salary?.toString() || "",
    occupant_count: tenant.occupant_count?.toString() || "1",
    is_smoker: tenant.is_smoker ? "true" : "false",
    has_pets: tenant.has_pets ? "true" : "false",
    profile_complete: tenant.profile_complete ? "true" : "false",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Live copy so gov-identity actions update the modal without a reload
  const [live, setLive] = useState<Tenant>(tenant);
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [dangerErr, setDangerErr] = useState("");
  const [deletingDocs, setDeletingDocs] = useState(false);
  const [clearingInfo, setClearingInfo] = useState(false);

  async function loadDocs() {
    setDocsLoading(true);
    const { data } = await sb
      .from("documents")
      .select("id, doc_type, file_name, status, confidence_score, created_at, storage_path, rejection_reason")
      .eq("tenant_id", tenant.id)
      .order("doc_type");
    setDocs((data as TenantDoc[]) || []);
    setDocsLoading(false);
  }
  useEffect(() => { loadDocs(); /* eslint-disable-next-line */ }, []);

  // Apply a gov-identity update, sync local + parent state
  async function applyGov(fields: Partial<Tenant>) {
    const { data, error } = await sb.from("tenants").update(fields).eq("id", tenant.id).select().single();
    if (error) { alert("Error: " + error.message); return; }
    const updated = { ...live, ...(data as Tenant) };
    setLive(updated);
    onSaved(updated);
  }
  function unlockGov() {
    if (!confirm(t("Unlock this tenant's government identity for editing?"))) return;
    applyGov({ is_gov_info_locked: false, gov_info_review_requested: false, gov_info_review_note: null });
  }
  function rejectGov() {
    if (!confirm(t("Reject this review request? The identity lock stays unchanged."))) return;
    applyGov({ gov_info_review_requested: false, gov_info_review_note: null });
  }
  function addAcceptedName() {
    const name = prompt(t("Enter an alternate accepted name (e.g. maiden name):"));
    if (!name || !name.trim()) return;
    const existing = Array.isArray(live.accepted_names) ? live.accepted_names : [];
    applyGov({ accepted_names: [...new Set([...existing, name.trim()])], gov_info_review_requested: false, gov_info_review_note: null });
  }
  function unlockGuarantorGov() {
    if (!confirm(t("Unlock this guarantor's government identity for editing?"))) return;
    applyGov({ guarantor_is_gov_info_locked: false, guarantor_gov_info_review_requested: false, guarantor_gov_info_review_note: null });
  }
  function rejectGuarantorGov() {
    if (!confirm(t("Reject this review request? The identity lock stays unchanged."))) return;
    applyGov({ guarantor_gov_info_review_requested: false, guarantor_gov_info_review_note: null });
  }

  async function deleteAllDocs() {
    if (!confirm(t("Delete ALL documents for this tenant? Files are permanently removed from storage."))) return;
    setDeletingDocs(true); setDangerErr("");
    const paths = docs.map((d) => d.storage_path).filter(Boolean) as string[];
    if (paths.length) await sb.storage.from("documents").remove(paths);
    const { error } = await sb.from("documents").delete().eq("tenant_id", tenant.id);
    setDeletingDocs(false);
    if (error) { setDangerErr(error.message); return; }
    loadDocs();
  }
  async function clearAllInfo() {
    if (!confirm(t("Clear ALL profile information for this tenant? This resets their profile to blank."))) return;
    setClearingInfo(true); setDangerErr("");
    const reset = {
      full_name: null, date_of_birth: null, nationality: null,
      current_address: null, employer_name: null, job_role: null,
      employment_start_date: null, monthly_gross_salary: null,
      occupant_count: 1, is_smoker: false, has_pets: false,
      needs_guarantor: false, guarantor_is_employee: false, guarantor_is_self_employed: false,
      is_employee: false, is_self_employed: false, is_unemployed: false, is_on_welfare: false,
      has_household_liability_insurance: false, rental_deposit_type: null,
      profile_complete: false, updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("tenants").update(reset).eq("id", tenant.id);
    setClearingInfo(false);
    if (error) { setDangerErr(error.message); return; }
    onSaved({ ...live, full_name: null, profile_complete: false });
  }

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setErr("");
    const fields = {
      full_name: form.full_name.trim() || null,
      nationality: form.nationality.trim() || null,
      date_of_birth: form.date_of_birth || null,
      permit_type: form.permit_type || null,
      current_address: form.current_address.trim() || null,
      employer_name: form.employer_name.trim() || null,
      job_role: form.job_role.trim() || null,
      employment_start_date: form.employment_start_date || null,
      monthly_gross_salary: parseFloat(form.monthly_gross_salary) || null,
      occupant_count: parseInt(form.occupant_count) || 1,
      is_smoker: form.is_smoker === "true",
      has_pets: form.has_pets === "true",
      profile_complete: form.profile_complete === "true",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from("tenants").update(fields).eq("id", tenant.id).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...tenant, ...(data as Tenant) });
  }

  async function toggleSuspend() {
    const { data, error } = await sb.from("tenants").update({ is_suspended: !tenant.is_suspended, updated_at: new Date().toISOString() }).eq("id", tenant.id).select().single();
    if (error) { alert("Error: " + error.message); return; }
    onSaved({ ...tenant, ...(data as Tenant) });
  }

  async function del() {
    if (!confirm(`Delete tenant "${tenant.full_name || "this tenant"}"? This cannot be undone and will remove all their documents.`)) return;
    const { error } = await sb.from("tenants").delete().eq("id", tenant.id);
    if (error) { alert("Error: " + error.message); return; }
    onDeleted(tenant.id);
  }

  return (
    <Modal onClose={onClose} title={tenant.full_name || t("Unnamed tenant")} meta={`${tenant.email || "—"} · ${t("Joined")} ${new Date(tenant.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}`}>
      {err && <div style={{ color: "var(--red)", fontSize: ".875rem", margin: "12px 0" }}>{err}</div>}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Profile")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("Full name")}><input type="text" value={form.full_name} onChange={(e) => up("full_name", e.target.value)} /></Field>
        <Field label={t("Nationality")}>
          <select value={form.nationality} onChange={(e) => up("nationality", e.target.value)}>
            <option value="">—</option>
            {NATIONALITIES.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label={t("Date of birth")}><input type="date" value={form.date_of_birth} onChange={(e) => up("date_of_birth", e.target.value)} /></Field>
        <Field label={t("Permit type")}>
          <select value={form.permit_type} onChange={(e) => up("permit_type", e.target.value)}>
            <option value="">—</option><option value="swiss">Swiss</option><option value="B">B</option><option value="C">C</option><option value="G">G</option><option value="L">L</option>
          </select>
        </Field>
        <Field label={t("Current address")} full><input type="text" value={form.current_address} onChange={(e) => up("current_address", e.target.value)} /></Field>
        <Field label={t("Employer")}><input type="text" value={form.employer_name} onChange={(e) => up("employer_name", e.target.value)} /></Field>
        <Field label={t("Job role")}><input type="text" value={form.job_role} onChange={(e) => up("job_role", e.target.value)} /></Field>
        <Field label={t("Employment start")}><input type="date" value={form.employment_start_date} onChange={(e) => up("employment_start_date", e.target.value)} /></Field>
        <Field label={t("Monthly gross (CHF)")}><input type="number" step={100} value={form.monthly_gross_salary} onChange={(e) => up("monthly_gross_salary", e.target.value)} /></Field>
        <Field label={t("Occupants")}><input type="number" min={1} max={10} value={form.occupant_count} onChange={(e) => up("occupant_count", e.target.value)} /></Field>
        <Field label={t("Smoker")}><select value={form.is_smoker} onChange={(e) => up("is_smoker", e.target.value)}><option value="false">{t("No")}</option><option value="true">{t("Yes")}</option></select></Field>
        <Field label={t("Pets")}><select value={form.has_pets} onChange={(e) => up("has_pets", e.target.value)}><option value="false">{t("No")}</option><option value="true">{t("Yes")}</option></select></Field>
        <Field label={t("Profile complete")}><select value={form.profile_complete} onChange={(e) => up("profile_complete", e.target.value)}><option value="false">{t("No")}</option><option value="true">{t("Yes")}</option></select></Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("Cancel")}</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={toggleSuspend} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
            {tenant.is_suspended ? t("Unsuspend") : t("Suspend")}
          </button>
          <button className="btn btn-outline btn-sm" onClick={del} style={{ color: "var(--red)", borderColor: "var(--red)" }}>{t("Delete")}</button>
        </div>
      </div>

      {/* Documents */}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{t("Documents")}</div>
        <a href={`/admin/documents?tenant=${encodeURIComponent(tenant.full_name || "")}`} className="btn btn-ghost btn-sm" style={{ fontSize: ".8rem" }}>
          {t("Review all in Documents →")}
        </a>
      </div>
      {docsLoading ? (
        <div className="text-sm text-gray">{t("Loading…")}</div>
      ) : docs.length === 0 ? (
        <div className="text-sm text-gray">{t("No documents uploaded yet.")}</div>
      ) : (
        docs.map((d) => {
          const conf = d.confidence_score != null ? Math.round(d.confidence_score * 100) : null;
          const confColor = conf == null ? "var(--gray-400)" : conf >= 90 ? "var(--green)" : conf >= 65 ? "var(--amber)" : "var(--red)";
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm font-bold">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
                <div className="text-xs text-gray">{(d.file_name || d.doc_type) + " · " + new Date(d.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</div>
              </div>
              <span className={`badge ${DOC_STATUS_BADGE[d.status || ""] || "badge-gray"}`} style={{ fontSize: ".7rem", flexShrink: 0 }}>{(d.status || "—").replace("_", " ")}</span>
              <span className="text-sm font-bold" style={{ color: confColor, flexShrink: 0, minWidth: 36, textAlign: "right" }}>{conf != null ? conf + "%" : "—"}</span>
            </div>
          );
        })
      )}

      {/* Payment */}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Payment")}</div>
      <PaymentSection userId={tenant.user_id} />

      {/* Government identity */}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Government identity")}</div>
      <GovBlock
        label={t("Tenant")}
        locked={!!live.is_gov_info_locked}
        name={live.full_name}
        dob={live.date_of_birth}
        acceptedNames={live.accepted_names}
        reviewRequested={!!live.gov_info_review_requested}
        reviewNote={live.gov_info_review_note}
        onUnlock={unlockGov}
        onAddName={addAcceptedName}
        onReject={rejectGov}
      />
      {live.needs_guarantor && live.guarantor_full_name && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--gray-200)" }}>
          <GovBlock
            label={t("Guarantor")}
            locked={!!live.guarantor_is_gov_info_locked}
            name={live.guarantor_full_name}
            dob={live.guarantor_date_of_birth}
            reviewRequested={!!live.guarantor_gov_info_review_requested}
            reviewNote={live.guarantor_gov_info_review_note}
            onUnlock={unlockGuarantorGov}
            onReject={rejectGuarantorGov}
          />
        </div>
      )}

      {/* Danger zone */}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--red)", marginBottom: 12 }}>{t("Danger zone")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-outline btn-sm" onClick={deleteAllDocs} disabled={deletingDocs} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
          {deletingDocs ? t("Deleting…") : t("Delete all documents")}
        </button>
        <button className="btn btn-outline btn-sm" onClick={clearAllInfo} disabled={clearingInfo} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
          {clearingInfo ? t("Clearing…") : t("Clear all information")}
        </button>
      </div>
      {dangerErr && <div style={{ color: "var(--red)", fontSize: ".8rem", marginTop: 8 }}>{dangerErr}</div>}
    </Modal>
  );
}

function GovBlock({
  label, locked, name, dob, acceptedNames, reviewRequested, reviewNote, onUnlock, onAddName, onReject,
}: {
  label: string;
  locked: boolean;
  name: string | null | undefined;
  dob: string | null | undefined;
  acceptedNames?: string[] | null;
  reviewRequested: boolean;
  reviewNote: string | null | undefined;
  onUnlock: () => void;
  onAddName?: () => void;
  onReject: () => void;
}) {
  const t = useT();
  return (
    <div>
      <div className="text-xs text-gray" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
      {locked ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: ".875rem", flexWrap: "wrap" }}>
            <span className="badge badge-green">🔒 {t("Identity locked")}</span>
            <span>{t("Name")}: <strong>{name || "—"}</strong> · {t("Date of birth")}: <strong>{dob || "—"}</strong></span>
          </div>
          {acceptedNames && acceptedNames.length > 0 && (
            <div className="text-xs text-gray" style={{ marginBottom: 6 }}>
              {t("Accepted alternate names:")} {acceptedNames.map((n) => <strong key={n}>{n} </strong>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={onUnlock} style={{ fontSize: ".8rem" }}>{t("Unlock for editing")}</button>
            {onAddName && <button className="btn btn-outline btn-sm" onClick={onAddName} style={{ fontSize: ".8rem" }}>{t("Add accepted name")}</button>}
          </div>
          {reviewRequested && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: "var(--radius)", fontSize: ".875rem" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ {t("Review request pending")}</div>
              <div>{reviewNote || "—"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button className="btn btn-sm" onClick={onUnlock} style={{ background: "#16A34A", color: "#fff", border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 6, fontSize: ".8rem" }}>{t("Approve & unlock")}</button>
                {onAddName && <button className="btn btn-sm btn-outline" onClick={onAddName} style={{ fontSize: ".8rem" }}>{t("Add accepted name")}</button>}
                <button className="btn btn-sm btn-outline" onClick={onReject} style={{ fontSize: ".8rem", color: "var(--red)", borderColor: "var(--red)" }}>{t("Reject request")}</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <span className="badge badge-gray">{t("Not locked")}</span>
      )}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Tenant) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ full_name: "", date_of_birth: "", nationality: "", permit_type: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.full_name.trim()) { setErr(t("Full name is required.")); return; }
    setBusy(true);
    setErr("");
    const fields = {
      full_name: form.full_name.trim(),
      date_of_birth: form.date_of_birth || null,
      nationality: form.nationality.trim() || null,
      permit_type: form.permit_type || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from("tenants").insert(fields).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated(data as Tenant);
  }

  return (
    <Modal onClose={onClose} title={t("New tenant profile")} maxWidth={420}>
      {err && <div style={{ color: "var(--red)", fontSize: ".875rem", marginBottom: 12 }}>{err}</div>}
      <div className="form-group"><label>{t("Full name")} <span className="req">*</span></label><input type="text" placeholder={t("Legal full name")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
      <div className="form-group"><label>{t("Date of birth")}</label><input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
      <div className="form-group"><label>{t("Nationality")}</label><input type="text" placeholder="e.g. Swiss, French, Italian…" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
      <div className="form-group"><label>{t("Permit type")}</label>
        <select value={form.permit_type} onChange={(e) => setForm({ ...form, permit_type: e.target.value })}>
          <option value="">—</option><option value="swiss">Swiss citizen</option><option value="B">B permit</option><option value="C">C permit</option><option value="G">G permit</option><option value="L">L permit</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? t("Creating…") : t("Create tenant")}</button>
        <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, title, meta, maxWidth }: { children: React.ReactNode; onClose: () => void; title: string; meta?: string; maxWidth?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "var(--radius)", width: "100%", maxWidth: maxWidth || 720, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 4 }}>{title}</div>
            {meta && <div className="text-sm text-gray">{meta}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--gray-400)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className="form-group" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      {children}
    </div>
  );
}

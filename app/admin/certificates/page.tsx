"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Cert = {
  id: string;
  cert_code: string;
  mode: string;
  is_active: boolean | null;
  is_eligible: boolean | null;
  property_address: string | null;
  property_city: string | null;
  owner_email: string | null;
  unregistered_agency_name: string | null;
  admin_note: string | null;
  created_at: string;
  tenants?: { full_name: string | null } | null;
  agencies?: { company_name: string | null } | null;
};

const modeLabel: Record<string, string> = { directed: "Directed", on_request: "On-Request" };
const modeColor: Record<string, string> = { directed: "var(--charcoal)", on_request: "var(--amber)" };

export default function AdminCertificatesPage() {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "directed" | "on_request">("all");
  const [active, setActive] = useState<"active" | "all" | "inactive">("active");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Cert | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("certificates").select("*, tenants(full_name), agencies(company_name)").order("created_at", { ascending: false }).limit(500);
      setCerts((data as Cert[]) || []);
      setLoading(false);
    })();
  }, [sb]);

  const rows = certs.filter((c) => {
    if (q) {
      const ql = q.toLowerCase();
      if (
        !(c.cert_code || "").toLowerCase().includes(ql) &&
        !(c.tenants?.full_name || "").toLowerCase().includes(ql) &&
        !(c.agencies?.company_name || "").toLowerCase().includes(ql) &&
        !(c.property_address || "").toLowerCase().includes(ql)
      ) return false;
    }
    if (mode !== "all" && c.mode !== mode) return false;
    if (active === "active" && !c.is_active) return false;
    if (active === "inactive" && c.is_active) return false;
    return true;
  });

  const activeCount = certs.filter((c) => c.is_active).length;

  return (
    <>
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{t("Certificates")}</div>
          <div className="page-subtitle">
            {loading ? t("Loading…") : `${certs.length} ${t("certificates")} · ${activeCount} ${t("active")}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input type="text" placeholder={t("Search by tenant, agency, cert code, property…")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} style={{ width: "auto" }}>
          <option value="all">{t("All modes")}</option>
          <option value="directed">{t("Directed")}</option>
          <option value="on_request">{t("On-Request")}</option>
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value as typeof active)} style={{ width: "auto" }}>
          <option value="active">{t("Active only")}</option>
          <option value="all">{t("Active + inactive")}</option>
          <option value="inactive">{t("Inactive only")}</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Code")}</th><th>{t("Tenant")}</th><th>{t("Property")}</th><th>{t("Recipient")}</th>
              <th>{t("Mode")}</th><th>{t("Eligible")}</th><th>{t("Date")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("Loading…")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("No certificates found.")}</td></tr>
            ) : rows.map((c) => {
              const recipient = c.agencies?.company_name || c.owner_email || c.unregistered_agency_name || "—";
              return (
                <tr key={c.id} style={c.is_active ? undefined : { opacity: 0.5 }}>
                  <td>
                    <a href={`/cert/cert-view?code=${c.cert_code}`} target="_blank" rel="noreferrer" className="font-mono font-bold" style={{ fontSize: ".85rem", letterSpacing: ".06em", color: "var(--charcoal)" }}>
                      {c.cert_code}
                    </a>
                  </td>
                  <td><div className="font-bold text-sm">{c.tenants?.full_name || "—"}</div></td>
                  <td className="text-sm">{c.property_address || "—"}{c.property_city ? ", " + c.property_city : ""}</td>
                  <td className="text-sm text-gray">{recipient}</td>
                  <td><span className="badge" style={{ background: "var(--gray-100)", color: modeColor[c.mode], fontSize: ".7rem", fontWeight: 700 }}>{modeLabel[c.mode] || c.mode}</span></td>
                  <td>{c.is_eligible === true ? <span className="badge badge-green" style={{ fontSize: ".7rem" }}>✓ {t("Yes")}</span> : c.is_eligible === false ? <span className="badge badge-amber" style={{ fontSize: ".7rem" }}>{t("Review")}</span> : "—"}</td>
                  <td className="text-sm text-gray">{new Date(c.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}>{t("Edit")}</button>
                    {!c.is_active && <span className="badge badge-gray" style={{ fontSize: ".65rem", marginLeft: 4 }}>{t("Inactive")}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          cert={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => { setCerts((arr) => arr.map((x) => (x.id === c.id ? c : x))); setEditing(null); }}
          onDeleted={(id) => { setCerts((arr) => arr.filter((x) => x.id !== id)); setEditing(null); }}
        />
      )}
    </>
  );
}

function EditModal({ cert, onClose, onSaved, onDeleted }: { cert: Cert; onClose: () => void; onSaved: (c: Cert) => void; onDeleted: (id: string) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [eligible, setEligible] = useState(cert.is_eligible === true ? "true" : cert.is_eligible === false ? "false" : "");
  const [mode, setMode] = useState(cert.mode || "directed");
  const [active, setActive] = useState(cert.is_active ? "true" : "false");
  const [note, setNote] = useState(cert.admin_note || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(overrideActive?: string) {
    setSaving(true); setErr("");
    const fields: Record<string, unknown> = {
      mode,
      is_active: (overrideActive ?? active) === "true",
    };
    if (eligible !== "") fields.is_eligible = eligible === "true";
    if (note.trim()) fields.admin_note = note.trim();
    const { data, error } = await sb.from("certificates").update(fields).eq("id", cert.id).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...cert, ...(data as Cert) });
  }

  async function del() {
    if (!confirm(`Permanently delete certificate ${cert.cert_code}? The QR code will stop working immediately and this cannot be undone.`)) return;
    const { error } = await sb.from("certificates").delete().eq("id", cert.id);
    if (error) { setErr(error.message); return; }
    onDeleted(cert.id);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "var(--radius)", width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-4">
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{cert.cert_code}</div>
            <div className="text-sm text-gray">{(cert.tenants?.full_name || "—") + " · " + (cert.property_address || "—")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--gray-400)" }}>×</button>
        </div>
        {err && <div style={{ color: "var(--red)", fontSize: ".875rem", marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label>{t("Income eligible")}</label>
            <select value={eligible} onChange={(e) => setEligible(e.target.value)}>
              <option value="">{t("— (keep computed)")}</option>
              <option value="true">{t("Yes — Eligible")}</option>
              <option value="false">{t("No — Review required")}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t("Mode")}</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="directed">{t("Directed")}</option>
              <option value="on_request">{t("On-Request")}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t("Active")}</label>
            <select value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="true">{t("Yes — Active")}</option>
              <option value="false">{t("No — Deactivated")}</option>
            </select>
          </div>
        </div>
        <div className="form-group mt-4">
          <label>{t("Admin note")} <span className="text-gray text-xs">{t("(internal only, not shown to tenant)")}</span></label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: "vertical", fontSize: ".875rem" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => save()} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
          {cert.is_active && (
            <button className="btn btn-outline btn-sm" onClick={() => { if (confirm(t("Deactivate this certificate? The QR code and cert code will no longer work."))) { setActive("false"); save("false"); } }} style={{ color: "var(--red)", borderColor: "var(--red)" }}>{t("Deactivate")}</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={del} style={{ color: "var(--red)", borderColor: "var(--red)" }}>🗑 {t("Delete")}</button>
          <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
}

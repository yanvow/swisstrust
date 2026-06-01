"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import PaymentSection from "../_components/PaymentSection";

type Agency = {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_email: string | null;
  address: string | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
};

type Agent = {
  id: string;
  email: string;
  status: string;
  invited_at: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

const STATUS_COLOR: Record<string, string> = { active: "badge-green", pending: "badge-amber", suspended: "badge-red", removed: "badge-gray" };

export default function AdminAgenciesPage() {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "registered" | "seeded">("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.from("agencies").select("*").order("company_name");
      if (!error) setAgencies((data as Agency[]) || []);
      setLoading(false);
    })();
  }, [sb]);

  const rows = agencies.filter((a) => {
    if (q) {
      const ql = q.toLowerCase();
      if (
        !(a.company_name || "").toLowerCase().includes(ql) &&
        !(a.contact_email || "").toLowerCase().includes(ql) &&
        !(a.address || "").toLowerCase().includes(ql)
      ) return false;
    }
    if (filter === "verified" && !a.is_verified) return false;
    if (filter === "unverified" && a.is_verified) return false;
    if (filter === "registered" && !a.user_id) return false;
    if (filter === "seeded" && a.user_id) return false;
    return true;
  });

  async function toggleVerify(id: string) {
    const a = agencies.find((x) => x.id === id);
    if (!a) return;
    const newVal = !a.is_verified;
    const { error } = await sb.from("agencies").update({ is_verified: newVal }).eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    setAgencies((arr) => arr.map((x) => (x.id === id ? { ...x, is_verified: newVal } : x)));
  }

  const verifiedCount = agencies.filter((a) => a.is_verified).length;

  return (
    <>
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{t("Agencies")}</div>
          <div className="page-subtitle">
            {loading ? t("Loading…") : `${agencies.length} ${t("agencies")} · ${verifiedCount} ${t("verified")}`}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ {t("New agency")}</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input type="text" placeholder={t("Search by name, address, email…")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ width: "auto" }}>
          <option value="all">{t("All agencies")}</option>
          <option value="verified">{t("Verified only")}</option>
          <option value="unverified">{t("Unverified only")}</option>
          <option value="registered">{t("Registered (has login)")}</option>
          <option value="seeded">{t("Pre-seeded (no login)")}</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Agency")}</th><th>{t("Contact email")}</th><th>{t("Address")}</th>
              <th>{t("Verified")}</th><th>{t("Registered")}</th><th>{t("Joined")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("Loading…")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("No agencies found.")}</td></tr>
            ) : rows.map((a) => (
              <tr key={a.id} className="clickable" onClick={() => setEditing(a)} style={a.is_suspended ? { opacity: 0.5 } : undefined}>
                <td>
                  <div className="font-bold">{a.company_name}</div>
                  {a.is_suspended && <span className="badge badge-red" style={{ fontSize: ".65rem" }}>{t("Suspended")}</span>}
                </td>
                <td className="text-sm">{a.contact_email || "—"}</td>
                <td className="text-sm text-gray">{a.address || "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleVerify(a.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 9999,
                      fontSize: ".7rem",
                      fontWeight: 600,
                      border: "1px solid",
                      cursor: "pointer",
                      background: a.is_verified ? "#ECFDF5" : "#FEF2F2",
                      color: a.is_verified ? "#047857" : "#B91C1C",
                      borderColor: a.is_verified ? "#A7F3D0" : "#FECACA",
                    }}
                  >
                    {a.is_verified ? "✓ " + t("Verified") : "✗ " + t("Unverified")}
                  </button>
                </td>
                <td><span className={`badge ${a.user_id ? "badge-green" : "badge-gray"}`} style={{ fontSize: ".7rem" }}>{a.user_id ? t("Yes") : t("Pre-seeded")}</span></td>
                <td className="text-sm text-gray">{new Date(a.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td><button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(a); }}>{t("Edit")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <DetailModal
          agency={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => setAgencies((arr) => arr.map((x) => (x.id === a.id ? a : x)))}
          onDeleted={(id) => { setAgencies((arr) => arr.filter((x) => x.id !== id)); setEditing(null); }}
        />
      )}
      {creating && (
        <CreateModal onClose={() => setCreating(false)} onCreated={(a) => { setAgencies((arr) => [a, ...arr]); setCreating(false); }} />
      )}
    </>
  );
}

function DetailModal({ agency, onClose, onSaved, onDeleted }: { agency: Agency; onClose: () => void; onSaved: (a: Agency) => void; onDeleted: (id: string) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [form, setForm] = useState({
    company_name: agency.company_name || "",
    contact_email: agency.contact_email || "",
    address: agency.address || "",
    is_verified: agency.is_verified ? "true" : "false",
    is_suspended: agency.is_suspended ? "true" : "false",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [agentErr, setAgentErr] = useState("");
  const [dangerErr, setDangerErr] = useState("");
  const [clearing, setClearing] = useState(false);

  async function loadAgents() {
    setAgentsLoading(true);
    const { data } = await sb
      .from("agency_agents")
      .select("id, email, status, invited_at, user_id, first_name, last_name")
      .eq("agency_id", agency.id)
      .order("invited_at", { ascending: false });
    setAgents((data as Agent[]) || []);
    setAgentsLoading(false);
  }

  useEffect(() => { loadAgents(); /* eslint-disable-next-line */ }, []);

  async function save() {
    setSaving(true); setErr("");
    const fields = {
      company_name: form.company_name.trim(),
      address: form.address.trim(),
      contact_email: form.contact_email.trim(),
      is_verified: form.is_verified === "true",
      is_suspended: form.is_suspended === "true",
    };
    const { data, error } = await sb.from("agencies").update(fields).eq("id", agency.id).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...agency, ...(data as Agency) });
    onClose();
  }

  async function del() {
    if (!confirm(`Delete agency "${agency.company_name}"? This cannot be undone.`)) return;
    const { error } = await sb.from("agencies").delete().eq("id", agency.id);
    if (error) { alert("Error: " + error.message); return; }
    onDeleted(agency.id);
  }

  async function clearInfo() {
    if (!confirm(`Clear agency information for "${agency.company_name}"? This cannot be undone.`)) return;
    setClearing(true); setDangerErr("");
    const cleared = { company_name: "", address: "", contact_email: "" };
    const { error } = await sb.from("agencies").update(cleared).eq("id", agency.id);
    setClearing(false);
    if (error) { setDangerErr(error.message); return; }
    setForm((f) => ({ ...f, company_name: "", address: "", contact_email: "" }));
    onSaved({ ...agency, ...cleared });
  }

  async function addAgent() {
    if (!newAgentEmail.trim()) return;
    setAgentErr("");
    const { error } = await sb.functions.invoke("invite-agent", { body: { agencyId: agency.id, email: newAgentEmail.trim() } });
    if (error) { setAgentErr(error.message || "Invite failed"); return; }
    setNewAgentEmail("");
    loadAgents();
  }

  async function toggleAgent(id: string, suspend: boolean) {
    const { error } = await sb.from("agency_agents").update({ status: suspend ? "suspended" : "active" }).eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    loadAgents();
  }

  async function removeAgent(id: string) {
    if (!confirm("Remove this member from the agency?")) return;
    const { error } = await sb.from("agency_agents").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    loadAgents();
  }

  return (
    <Modal onClose={onClose} title={agency.company_name} maxWidth={660} meta={`${agency.contact_email || "—"} · ${agency.is_verified ? t("Verified") : t("Unverified")}${agency.is_suspended ? " · " + t("Suspended") : ""}`}>
      {err && <div style={{ color: "var(--red)", fontSize: ".875rem", margin: "12px 0" }}>{err}</div>}
      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Agency details")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="form-group"><label>{t("Company name")}</label><input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
        <div className="form-group"><label>{t("Contact email")}</label><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}><label>{t("Address")}</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="form-group"><label>{t("Verified on Checks")}</label><select value={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.value })}><option value="false">{t("No — unverified")}</option><option value="true">{t("Yes — verified ✓")}</option></select></div>
        <div className="form-group"><label>{t("Suspended")}</label><select value={form.is_suspended} onChange={(e) => setForm({ ...form, is_suspended: e.target.value })}><option value="false">{t("No — active")}</option><option value="true">{t("Yes — suspended")}</option></select></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn btn-outline btn-sm" onClick={del} style={{ marginLeft: "auto", color: "var(--red)", borderColor: "var(--red)" }}>{t("Delete agency")}</button>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Members")}</div>
      <div style={{ marginBottom: 16 }}>
        {agentsLoading ? (
          <div className="text-sm text-gray">{t("Loading…")}</div>
        ) : agents.length === 0 ? (
          <div className="text-sm text-gray">{t("No members yet.")}</div>
        ) : agents.map((ag) => {
          const displayName = (ag.first_name || ag.last_name) ? ((ag.first_name || "") + " " + (ag.last_name || "")).trim() : null;
          return (
            <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {displayName && <div className="font-bold text-sm">{displayName}</div>}
                <div className={displayName ? "text-xs text-gray" : "font-bold text-sm"} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ag.email}</div>
                <div className="text-xs text-gray">{(ag.user_id ? t("Accepted") : t("Pending")) + " · " + t("Invited") + " " + new Date(ag.invited_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</div>
              </div>
              <span className={`badge ${STATUS_COLOR[ag.status] || "badge-gray"}`} style={{ fontSize: ".7rem" }}>{ag.status}</span>
              <button className="btn btn-outline btn-sm" onClick={() => toggleAgent(ag.id, ag.status !== "suspended")} style={{ color: "var(--amber)", borderColor: "var(--amber)", fontSize: ".75rem" }}>
                {ag.status === "suspended" ? t("Reactivate") : t("Suspend")}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => removeAgent(ag.id)} style={{ color: "var(--red)", borderColor: "var(--red)", fontSize: ".75rem" }}>{t("Remove")}</button>
            </div>
          );
        })}
      </div>
      <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 14 }}>
        <div style={{ fontWeight: 600, fontSize: ".8rem", color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{t("Add member by email")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="email" placeholder="agent@agency.ch" value={newAgentEmail} onChange={(e) => setNewAgentEmail(e.target.value)} style={{ flex: 1, fontSize: ".875rem" }} />
          <button className="btn btn-primary btn-sm" onClick={addAgent}>{t("Add")}</button>
        </div>
        {agentErr && <div style={{ color: "var(--red)", fontSize: ".8rem", marginTop: 6 }}>{agentErr}</div>}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12 }}>{t("Payment")}</div>
      <PaymentSection userId={agency.user_id} />

      <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />
      <div style={{ fontWeight: 600, fontSize: ".9rem", marginBottom: 12, color: "var(--red)" }}>{t("Danger zone")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-outline btn-sm" onClick={clearInfo} disabled={clearing} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
          {clearing ? t("Clearing…") : t("Clear agency information")}
        </button>
      </div>
      {dangerErr && <div style={{ color: "var(--red)", fontSize: ".8rem", marginTop: 8 }}>{dangerErr}</div>}
    </Modal>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Agency) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ company_name: "", address: "", contact_email: "", is_verified: "false" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.company_name.trim() || !form.address.trim() || !form.contact_email.trim()) {
      setErr(t("Company name, address and email are required."));
      return;
    }
    setBusy(true); setErr("");
    const { data, error } = await sb.from("agencies").insert({
      company_name: form.company_name.trim(),
      address: form.address.trim(),
      contact_email: form.contact_email.trim(),
      is_verified: form.is_verified === "true",
      created_at: new Date().toISOString(),
    }).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onCreated(data as Agency);
  }

  return (
    <Modal onClose={onClose} title={t("New agency")} maxWidth={480}>
      {err && <div style={{ color: "var(--red)", fontSize: ".875rem", marginBottom: 12 }}>{err}</div>}
      <div className="form-group"><label>{t("Company name")} <span className="req">*</span></label><input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
      <div className="form-group"><label>{t("Address")} <span className="req">*</span></label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div className="form-group"><label>{t("Contact email")} <span className="req">*</span></label><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
      <div className="form-group"><label>{t("Verified on Checks")}</label><select value={form.is_verified} onChange={(e) => setForm({ ...form, is_verified: e.target.value })}><option value="false">{t("No — unverified")}</option><option value="true">{t("Yes — verified ✓")}</option></select></div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? t("Creating…") : t("Create agency")}</button>
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

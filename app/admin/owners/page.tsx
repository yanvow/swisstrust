"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Owner = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email?: string | null;
  phone: string | null;
  property_address: string | null;
  is_suspended: boolean | null;
  created_at: string;
};

export default function AdminOwnersPage() {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Owner | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data, error }, { data: emails }] = await Promise.all([
        sb.from("owners").select("*").order("created_at", { ascending: false }),
        sb.from("user_emails").select("id, email"),
      ]);
      if (!error) {
        const map = Object.fromEntries(((emails as { id: string; email: string }[]) || []).map((u) => [u.id, u.email]));
        setOwners(((data as Owner[]) || []).map((o) => ({ ...o, email: map[o.user_id || ""] || null })));
      }
      setLoading(false);
    })();
  }, [sb]);

  const rows = owners.filter((o) => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return (
      (o.full_name || "").toLowerCase().includes(ql) ||
      (o.email || "").toLowerCase().includes(ql) ||
      (o.property_address || "").toLowerCase().includes(ql) ||
      (o.phone || "").toLowerCase().includes(ql)
    );
  });

  return (
    <>
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{t("Owners")}</div>
          <div className="page-subtitle">
            {loading ? t("Loading…") : `${owners.length} ${owners.length === 1 ? t("owner registered") : t("owners registered")}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input type="text" placeholder={t("Search by name, address…")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>{t("Name")}</th><th>{t("Phone")}</th><th>{t("Property address")}</th><th>{t("Joined")}</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("Loading…")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("No owners found.")}</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id} style={o.is_suspended ? { opacity: 0.5 } : undefined}>
                <td>
                  <div className="font-bold">{o.full_name || "—"}</div>
                  {o.email && <div className="text-xs text-gray">{o.email}</div>}
                  {o.is_suspended && <span className="badge badge-red" style={{ fontSize: ".65rem" }}>{t("Suspended")}</span>}
                </td>
                <td className="text-sm">{o.phone || "—"}</td>
                <td className="text-sm text-gray">{o.property_address || "—"}</td>
                <td className="text-sm text-gray">{new Date(o.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setEditing(o)}>{t("Edit")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          owner={editing}
          onClose={() => setEditing(null)}
          onSaved={(o) => { setOwners((arr) => arr.map((x) => (x.id === o.id ? o : x))); setEditing(null); }}
          onDeleted={(id) => { setOwners((arr) => arr.filter((x) => x.id !== id)); setEditing(null); }}
        />
      )}
    </>
  );
}

function EditModal({ owner, onClose, onSaved, onDeleted }: { owner: Owner; onClose: () => void; onSaved: (o: Owner) => void; onDeleted: (id: string) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ full_name: owner.full_name || "", phone: owner.phone || "", property_address: owner.property_address || "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setErr("");
    const fields = {
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      property_address: form.property_address.trim() || null,
    };
    const { data, error } = await sb.from("owners").update(fields).eq("id", owner.id).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...owner, ...(data as Owner) });
  }

  async function toggleSuspend() {
    const { data, error } = await sb.from("owners").update({ is_suspended: !owner.is_suspended }).eq("id", owner.id).select().single();
    if (error) { alert("Error: " + error.message); return; }
    onSaved({ ...owner, ...(data as Owner) });
  }

  async function del() {
    if (!confirm(`Delete owner "${owner.full_name}"? This cannot be undone.`)) return;
    const { error } = await sb.from("owners").delete().eq("id", owner.id);
    if (error) { alert("Error: " + error.message); return; }
    onDeleted(owner.id);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "var(--radius)", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-20">
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{t("Edit")} — {owner.full_name || t("Unnamed owner")}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--gray-400)" }}>×</button>
        </div>
        {err && <div style={{ color: "var(--red)", fontSize: ".875rem", marginBottom: 12 }}>{err}</div>}
        <div className="form-group"><label>{t("Full name")}</label><input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="form-group"><label>{t("Phone")}</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="form-group"><label>{t("Property address")}</label><input type="text" value={form.property_address} onChange={(e) => setForm({ ...form, property_address: e.target.value })} /></div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={toggleSuspend} style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>
              {owner.is_suspended ? t("Unsuspend") : t("Suspend")}
            </button>
            <button className="btn btn-outline btn-sm" onClick={del} style={{ color: "var(--red)", borderColor: "var(--red)" }}>{t("Delete")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Doc = {
  id: string;
  doc_type: string;
  file_name: string | null;
  storage_path: string | null;
  status: string | null;
  confidence_score: number | null;
  rejection_reason: string | null;
  ocr_extracted_data: Record<string, unknown> | null;
  created_at: string;
  tenants?: { full_name: string | null } | null;
};

const DOC_LABELS: Record<string, string> = {
  passport_id: "Passport / Swiss ID", residence_permit: "Residence permit",
  salary_slip_1: "Salary slip 1", salary_slip_2: "Salary slip 2", salary_slip_3: "Salary slip 3",
  betreibungsauszug: "Extract from the debt enforcement register",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "badge badge-amber",
  processing: "badge badge-blue",
  auto_verified: "badge badge-green",
  flagged: "badge badge-amber",
  rejected: "badge badge-red",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", processing: "Processing", auto_verified: "Auto-verified",
  flagged: "Flagged", rejected: "Rejected",
};

export default function AdminDocumentsPage() {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const params = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [statusTab, setStatusTab] = useState<string>(params.get("filter") || "all");
  const [q, setQ] = useState(params.get("tenant") || "");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doc | null>(null);

  async function load() {
    setLoading(true);
    let query = sb.from("documents").select("*, tenants(full_name)").order("updated_at", { ascending: false }).limit(300);
    if (statusTab !== "all") query = query.eq("status", statusTab);
    const { data } = await query;
    setDocs((data as Doc[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusTab]);

  const rows = docs.filter((d) => {
    if (q) {
      const ql = q.toLowerCase();
      if (!(d.tenants?.full_name || "").toLowerCase().includes(ql) && !(d.file_name || "").toLowerCase().includes(ql)) return false;
    }
    if (typeFilter !== "all" && d.doc_type !== typeFilter) return false;
    return true;
  });

  const needReview = docs.filter((d) => d.status === "pending" || d.status === "flagged").length;

  return (
    <>
      <div className="flex-between mb-16">
        <div>
          <div className="page-title">{t("Documents")}</div>
          <div className="page-subtitle">
            {loading ? t("Loading…") : `${docs.length} ${t("documents")} · ${needReview} ${t("need review")}`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--gray-200)", marginBottom: 16 }}>
        {(["all", "pending", "flagged", "auto_verified", "rejected"] as const).map((s) => (
          <div
            key={s}
            onClick={() => setStatusTab(s)}
            style={{
              padding: "8px 16px",
              fontSize: ".875rem",
              fontWeight: statusTab === s ? 700 : 500,
              color: statusTab === s ? "var(--charcoal)" : "var(--gray-400)",
              cursor: "pointer",
              borderBottom: `2px solid ${statusTab === s ? "var(--charcoal)" : "transparent"}`,
              marginBottom: "-2px",
            }}
          >
            {s === "all" ? t("All") : t(STATUS_LABEL[s] || s)}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input type="text" placeholder={t("Search by tenant name or file name…")} value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="all">{t("All types")}</option>
          {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>{t("Tenant")}</th><th>{t("Document type")}</th><th>{t("Status")}</th><th>{t("Confidence")}</th><th>{t("Uploaded")}</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("Loading…")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-gray text-sm" style={{ padding: 24, textAlign: "center" }}>{t("No documents found.")}</td></tr>
            ) : rows.map((d) => {
              const conf = d.confidence_score != null ? Math.round(d.confidence_score * 100) : null;
              const confColor = conf == null ? "var(--gray-400)" : conf >= 90 ? "var(--green)" : conf >= 65 ? "var(--amber)" : "var(--red)";
              return (
                <tr key={d.id}>
                  <td>
                    <div className="font-bold">{d.tenants?.full_name || "—"}</div>
                    <div className="text-xs text-gray">{d.file_name || d.storage_path?.split("/").pop() || "—"}</div>
                  </td>
                  <td className="text-sm">{DOC_LABELS[d.doc_type] || d.doc_type}</td>
                  <td><span className={STATUS_BADGE[d.status || ""] || "badge"} style={{ fontSize: ".75rem" }}>{STATUS_LABEL[d.status || ""] || d.status}</span></td>
                  <td>
                    {conf != null ? (
                      <>
                        <div className="text-sm font-bold" style={{ color: confColor }}>{conf}%</div>
                        <div style={{ height: 4, background: "var(--gray-200)", borderRadius: 9999, marginTop: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: conf + "%", background: confColor }} />
                        </div>
                      </>
                    ) : <span className="text-xs text-gray">—</span>}
                  </td>
                  <td className="text-sm text-gray">{new Date(d.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => setEditing(d)}>{t("Review")}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <ReviewModal
          doc={editing}
          onClose={() => setEditing(null)}
          onSaved={(d) => { setDocs((arr) => arr.map((x) => (x.id === d.id ? d : x))); setEditing(null); }}
          onDeleted={(id) => { setDocs((arr) => arr.filter((x) => x.id !== id)); setEditing(null); }}
        />
      )}
    </>
  );
}

function ReviewModal({ doc, onClose, onSaved, onDeleted }: { doc: Doc; onClose: () => void; onSaved: (d: Doc) => void; onDeleted: (id: string) => void }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [status, setStatus] = useState(doc.status || "pending");
  const [confidence, setConfidence] = useState(doc.confidence_score?.toString() || "");
  const [rejection, setRejection] = useState(doc.rejection_reason || "");
  const [ocrData, setOcrData] = useState<Record<string, string>>(() => {
    const o = doc.ocr_extracted_data || {};
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? "")]));
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!doc.storage_path) { setLinkLoading(false); return; }
      const { data, error } = await sb.functions.invoke("signed-url", { body: { storage_path: doc.storage_path } });
      setLinkLoading(false);
      if (!error && data?.url) setSignedUrl(data.url);
    })();
  }, [doc.storage_path, sb]);

  function renameKey(oldK: string, newK: string) {
    if (!newK || newK === oldK || ocrData[newK] != null) return;
    setOcrData((d) => {
      const { [oldK]: v, ...rest } = d;
      return { ...rest, [newK]: v };
    });
  }
  function setValue(k: string, v: string) { setOcrData((d) => ({ ...d, [k]: v })); }
  function removeKey(k: string) { setOcrData((d) => { const { [k]: _, ...rest } = d; void _; return rest; }); }
  function addField() { setOcrData((d) => ({ ...d, new_field: "" })); }

  async function save(overrides?: { status?: string; rejection_reason?: string | null }) {
    setSaving(true); setErr("");
    const fields = {
      status: overrides?.status || status,
      confidence_score: parseFloat(confidence) || null,
      rejection_reason: overrides?.rejection_reason !== undefined ? overrides.rejection_reason : (rejection.trim() || null),
      ocr_extracted_data: Object.keys(ocrData).length > 0 ? ocrData : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await sb.from("documents").update(fields).eq("id", doc.id).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...doc, ...(data as Doc) });
  }

  async function del() {
    if (!confirm(`Delete this document (${doc.file_name || doc.doc_type})? This cannot be undone.`)) return;
    if (doc.storage_path) await sb.storage.from("documents").remove([doc.storage_path]);
    const { error } = await sb.from("documents").delete().eq("id", doc.id);
    if (error) { setErr(error.message); return; }
    onDeleted(doc.id);
  }

  const conf = parseFloat(confidence) || 0;
  const pct = Math.round(Math.min(1, Math.max(0, conf)) * 100);
  const confColor = pct >= 90 ? "var(--green)" : pct >= 65 ? "var(--amber)" : "var(--red)";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "var(--radius)", width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-4">
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
            <div className="text-sm text-gray">{`${t("Tenant")}: ${doc.tenants?.full_name || "—"} · ${t("File")}: ${doc.file_name || doc.storage_path?.split("/").pop() || "—"}`}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--gray-400)" }}>×</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          {linkLoading ? <span className="text-xs text-gray">{t("Generating link…")}</span> : signedUrl ? (
            <a href={signedUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">📄 {t("View original document ↗")}</a>
          ) : <span className="text-xs text-gray">{t("Link unavailable.")}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div className="form-group mb-0">
            <label>{t("Status")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
              <option value="pending">{t("Pending review")}</option>
              <option value="processing">{t("Processing")}</option>
              <option value="auto_verified">{t("Auto-verified ✓")}</option>
              <option value="flagged">{t("Flagged ⚠")}</option>
              <option value="rejected">{t("Rejected ✗")}</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label>{t("Confidence score (0–1)")}</label>
            <input type="number" min={0} max={1} step={0.01} value={confidence} onChange={(e) => setConfidence(e.target.value)} style={{ fontSize: ".875rem" }} />
            <div style={{ height: 4, background: "var(--gray-200)", borderRadius: 9999, marginTop: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: confColor }} />
            </div>
          </div>
        </div>

        <div className="form-group mb-20">
          <label>{t("Rejection reason")} <span className="text-gray text-xs">{t("(shown to tenant when rejected)")}</span></label>
          <textarea rows={2} value={rejection} onChange={(e) => setRejection(e.target.value)} style={{ resize: "vertical", fontSize: ".875rem" }} />
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: ".8125rem", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--gray-400)", marginBottom: 12 }}>{t("Extracted OCR data")}</div>
          {Object.keys(ocrData).length === 0 ? (
            <div className="text-sm text-gray mb-8">{t("No extracted data yet.")}</div>
          ) : Object.entries(ocrData).map(([k, v]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input type="text" defaultValue={k} onBlur={(e) => renameKey(k, e.target.value.trim())} style={{ padding: "4px 8px", fontSize: ".75rem", border: "1px solid var(--gray-200)", borderRadius: 4 }} />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="text" value={v} onChange={(e) => setValue(k, e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => removeKey(k)} style={{ background: "none", border: "none", color: "var(--gray-400)", cursor: "pointer", fontSize: "1rem", padding: "0 4px" }}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm mt-8" onClick={addField} style={{ fontSize: ".78rem" }}>+ {t("Add field")}</button>
        </div>

        {err && <div style={{ color: "var(--red)", fontSize: ".875rem", marginTop: 12 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20, borderTop: "1px solid var(--gray-200)", paddingTop: 20, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => save()} disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setStatus("auto_verified"); setRejection(""); save({ status: "auto_verified", rejection_reason: null }); }} style={{ color: "var(--green)", borderColor: "var(--green)" }}>✓ {t("Mark verified")}</button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              const reason = prompt(t("Rejection reason (shown to tenant):"));
              if (reason !== null) { setStatus("rejected"); setRejection(reason); save({ status: "rejected", rejection_reason: reason }); }
            }}
            style={{ color: "var(--red)", borderColor: "var(--red)" }}
          >✗ {t("Reject")}</button>
          <button className="btn btn-outline btn-sm" onClick={del} style={{ color: "var(--red)", borderColor: "var(--red)", marginLeft: "auto" }}>🗑 {t("Delete document")}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t("Cancel")}</button>
        </div>
      </div>
    </div>
  );
}

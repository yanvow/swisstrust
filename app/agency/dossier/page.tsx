"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase";
import { useAgency } from "../_components/AgencyContext";
import { useT } from "@/lib/i18n";

type Tenant = {
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  permit_type: string | null;
  monthly_gross_salary: number | null;
  employer_name: string | null;
  job_role: string | null;
  employment_start_date: string | null;
  occupant_count: number | null;
  is_smoker: boolean | null;
  has_pets: boolean | null;
};

type Cert = {
  id: string;
  cert_code: string;
  property_address: string | null;
  property_city: string | null;
  rooms: number | null;
  total_chf: number | null;
  rent_chf: number | null;
  move_in_date: string | null;
  is_active: boolean;
  is_eligible: boolean;
  has_visited: boolean;
  heard_about: string | null;
  mode: string | null;
  tenant_id: string;
  created_at: string;
  owner_email: string | null;
  agencies: { id: string; company_name: string; user_id: string } | null;
  tenants: Tenant | null;
};

type Doc = {
  id: string;
  doc_type: string;
  status: keyof typeof STATUS_LABEL;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  confidence_score: number | null;
  ocr_extracted_data: Record<string, string> | null;
};

type AccessLog = { id: string; viewer_type: string; accessed_at: string };

const DOC_META = [
  { key: "passport_id", label: "Passport / Swiss ID", icon: "🪪" },
  { key: "residence_permit", label: "Residence permit", icon: "📋" },
  { key: "salary_slip_1", label: "Salary slip — month 1", icon: "💰" },
  { key: "salary_slip_2", label: "Salary slip — month 2", icon: "💰" },
  { key: "salary_slip_3", label: "Salary slip — month 3", icon: "💰" },
  {
    key: "betreibungsauszug",
    label: "Extract from the debt enforcement register",
    icon: "⚖️",
  },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  processing: "Processing…",
  auto_verified: "Auto-verified",
  flagged: "Flagged",
  rejected: "Rejected",
};
const STATUS_BADGE: Record<string, string> = {
  pending: "badge badge-amber",
  processing: "badge badge-blue",
  auto_verified: "badge badge-green",
  flagged: "badge badge-amber",
  rejected: "badge badge-red",
};

const PERMIT_LABELS: Record<string, string> = {
  swiss: "Swiss citizen",
  B: "B permit",
  C: "C permit",
  G: "G permit",
  L: "L permit",
};

const HEARD_LABELS: Record<string, string> = {
  former_tenant: "Former tenant",
  relocation_agency: "Relocation agency",
  website: "Agency website",
  immobilier_ch: "immobilier.ch",
  other: "Other",
};

export default function AgencyDossierPage() {
  const t = useT();
  const { userId, agencyName } = useAgency();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "ready"; cert: Cert; docs: Doc[]; logs: AccessLog[]; accessTime: string }
  >({ kind: "loading" });
  const [preview, setPreview] = useState<{
    fileName: string;
    blobUrl: string;
    mime: string;
  } | null>(null);
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) {
        setState({ kind: "error" });
        return;
      }

      const { data: cert, error } = await sb
        .from("certificates")
        .select(
          "*, agencies(id, company_name, user_id), tenants(full_name, date_of_birth, nationality, permit_type, monthly_gross_salary, employer_name, job_role, employment_start_date, occupant_count, is_smoker, has_pets)",
        )
        .eq("cert_code", code)
        .eq("is_active", true)
        .single<Cert>();
      if (error || !cert) {
        setState({ kind: "error" });
        return;
      }

      const isDirected = cert.agencies?.user_id === userId;
      if (!isDirected) {
        if (cert.mode === "on_request") {
          const { data: req } = await sb
            .from("access_requests")
            .select("status")
            .eq("certificate_id", cert.id)
            .eq("requester_user_id", userId)
            .maybeSingle();
          if (!req || req.status !== "approved") {
            setState({ kind: "error" });
            return;
          }
        } else {
          setState({ kind: "error" });
          return;
        }
      }

      await sb.from("document_access_logs").insert({
        certificate_id: cert.id,
        viewer_user_id: userId,
        viewer_type: "agency",
      });

      const [{ data: docs }, { data: logs }] = await Promise.all([
        sb
          .from("documents")
          .select("*")
          .eq("tenant_id", cert.tenant_id)
          .order("created_at"),
        sb
          .from("document_access_logs")
          .select("*")
          .eq("certificate_id", cert.id)
          .order("accessed_at", { ascending: false })
          .limit(20),
      ]);
      setState({
        kind: "ready",
        cert,
        docs: (docs as Doc[]) || [],
        logs: (logs as AccessLog[]) || [],
        accessTime: new Date().toLocaleDateString("en-CH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    })();
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePreview();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPreview(storagePath: string, fileName: string, mime: string) {
    setPreview({ fileName, blobUrl: "", mime });
    const sb = createClient();
    const { data, error } = await sb.functions.invoke("signed-url", {
      body: { storage_path: storagePath },
    });
    if (error || !data?.url) {
      setPreview({ fileName, blobUrl: "ERROR", mime });
      return;
    }
    try {
      const resp = await fetch(data.url);
      const blob = await resp.blob();
      setPreview({ fileName, blobUrl: URL.createObjectURL(blob), mime: mime || blob.type || "" });
    } catch {
      setPreview({ fileName, blobUrl: "ERROR", mime });
    }
  }

  function closePreview() {
    if (preview && preview.blobUrl && preview.blobUrl !== "ERROR") {
      URL.revokeObjectURL(preview.blobUrl);
    }
    setPreview(null);
  }

  async function downloadOne(storagePath: string, fileName: string) {
    const sb = createClient();
    const { data, error } = await sb.functions.invoke("signed-url", {
      body: { storage_path: storagePath },
    });
    if (error || !data?.url) return;
    try {
      const resp = await fetch(data.url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || storagePath.split("/").pop() || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      /* ignore */
    }
  }

  async function downloadZip() {
    if (state.kind !== "ready") return;
    const docs = state.docs.filter((d) => d.storage_path);
    if (!docs.length) return;
    setZipBusy(true);
    const sb = createClient();
    const zip = new JSZip();
    await Promise.all(
      docs.map(async (doc) => {
        const { data, error } = await sb.functions.invoke("signed-url", {
          body: { storage_path: doc.storage_path },
        });
        if (error || !data?.url) return;
        try {
          const resp = await fetch(data.url);
          const blob = await resp.blob();
          zip.file(
            `${doc.doc_type}_${doc.file_name || doc.storage_path.split("/").pop()}`,
            blob,
          );
        } catch {
          /* skip */
        }
      }),
    );
    const content = await zip.generateAsync({ type: "blob" });
    const blobUrl = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "dossier-documents.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    setZipBusy(false);
  }

  if (state.kind === "loading") {
    return (
      <div className="text-gray-400 text-sm py-12 text-center">{t("Loading dossier…")}</div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="py-12 text-center">
        <div className="text-gray-400">{t("Certificate not found or access denied.")}</div>
        <Link href="/agency/dashboard" className="btn btn-outline btn-sm mt-4 inline-block">
          ← {t("Back to inbox")}
        </Link>
      </div>
    );
  }

  const { cert, docs, logs, accessTime } = state;
  const tn = cert.tenants || ({} as Tenant);
  const totalRent = cert.total_chf || cert.rent_chf || 0;
  const salary = tn.monthly_gross_salary || 0;
  const certIsActive = cert.is_active !== false;
  const issued = new Date(cert.created_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const propertyLine =
    `${cert.property_address || ""}${cert.property_city ? ", " + cert.property_city : ""}` +
    `${cert.rooms ? " · " + cert.rooms + " " + t("rooms") : ""}` +
    `${cert.total_chf ? " · CHF " + Number(cert.total_chf).toLocaleString() + "/mo" : ""}` +
    `${cert.move_in_date ? " · " + t("Move-in") + " " + new Date(cert.move_in_date).toLocaleDateString("de-CH") : ""}`;
  const byType: Record<string, Doc> = {};
  docs.forEach((d) => (byType[d.doc_type] = d));
  const isSwiss = !tn.nationality || tn.nationality === "Swiss";

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-semibold">
            {t("Full dossier — Agency access")}
          </div>
          <div className="text-3xl font-bold mb-1">{tn.full_name || "—"}</div>
          <div className="text-sm text-gray-400">{propertyLine}</div>
          <div className="text-xs text-gray-400 mt-1">
            {t("Certificate")}:{" "}
            <span className="font-mono font-bold">{cert.cert_code}</span> · {t("Issued")}{" "}
            {issued}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="verified-badge">✓ {t("Identity Verified")}</div>
          <span
            className={`badge ${certIsActive ? "badge-green" : "badge-red"}`}
            style={{ fontSize: "1rem", padding: "7px 18px" }}
          >
            {certIsActive ? `✓ ${t("Valid")}` : `✗ ${t("Not valid")}`}
          </span>
        </div>
      </div>

      <div className="alert alert-success mb-6">
        <span>✓</span>
        <span>
          {t("This access has been logged")} — {accessTime} {t("by")}{" "}
          {agencyName || t("your agency")}.{" "}
          {t("Document download links expire after 60 seconds.")}
        </span>
      </div>

      {/* Summary */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">{t("Verified summary")}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Eligibility")}</div>
            <div
              className="font-bold"
              style={{ color: cert.is_eligible ? "var(--green)" : "var(--amber)" }}
            >
              {cert.is_eligible ? `✓ ${t("Income qualifies")}` : `⚠ ${t("Review income")}`}
            </div>
            <div className="text-xs text-gray-400">
              CHF {salary.toLocaleString()} {cert.is_eligible ? "≥" : "<"} 3× CHF{" "}
              {Number(totalRent).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Occupants")}</div>
            <div className="font-bold">{tn.occupant_count || 1}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Smoker / Pets")}</div>
            <div className="font-bold">
              {tn.is_smoker ? t("Smoker") : t("No")} /{" "}
              {tn.has_pets ? t("Has pets") : t("No")}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Nationality / Permit")}</div>
            <div className="font-bold">
              {PERMIT_LABELS[tn.permit_type || ""] || tn.permit_type || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Visited property")}</div>
            <div className="font-bold">{cert.has_visited ? t("Yes") : t("No")}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Heard about via")}</div>
            <div className="font-bold">
              {HEARD_LABELS[cert.heard_about || ""] || cert.heard_about || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Employment */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">{t("Employment & income")}</div>
          <div className="card-subtitle">{t("From tenant profile")}</div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Employer")}</div>
            <div className="font-bold">{tn.employer_name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Job title")}</div>
            <div className="font-bold">{tn.job_role || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Monthly gross salary")}</div>
            <div className="font-bold text-xl" style={{ color: "var(--green)" }}>
              CHF {salary.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t("Employed since")}</div>
            <div className="font-bold">
              {tn.employment_start_date
                ? new Date(tn.employment_start_date).toLocaleDateString("de-CH")
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card mb-6">
        <div
          className="card-header"
          style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <div className="card-title">{t("Verified documents")}</div>
            <div className="card-subtitle">
              {t("Preview or download individual files · or save all at once as a ZIP")}
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm flex-shrink-0"
            onClick={downloadZip}
            disabled={zipBusy}
          >
            {zipBusy ? t("Generating ZIP…") : `⬇ ${t("Download all as ZIP")}`}
          </button>
        </div>
        <div>
          {DOC_META.filter((m) => !(m.key === "residence_permit" && isSwiss)).map((meta) => {
            const doc = byType[meta.key];
            return (
              <DocBlock
                key={meta.key}
                meta={meta}
                doc={doc}
                onPreview={openPreview}
                onDownload={downloadOne}
              />
            );
          })}
        </div>
      </div>

      {/* Access log */}
      <div
        className="card card--flat mb-6"
        style={{ background: "var(--gray-100)", border: "none", padding: 16 }}
      >
        <div className="card-title text-sm mb-2">{t("Access log for this certificate")}</div>
        <table style={{ fontSize: ".8125rem" }}>
          <thead>
            <tr>
              <th>{t("Date / time")}</th>
              <th>{t("Viewer type")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-gray text-sm">
                  {t("No access logs yet.")}
                </td>
              </tr>
            ) : (
              logs.map((l) => {
                const when = new Date(l.accessed_at).toLocaleDateString("en-CH", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const badge =
                  {
                    agency: "badge-blue",
                    public: "badge-gray",
                    tenant: "badge-green",
                    owner: "badge-amber",
                  }[l.viewer_type] || "badge-gray";
                const label =
                  { agency: t("Agency"), public: t("Public"), tenant: t("Tenant"), owner: t("Owner") }[
                    l.viewer_type
                  ] || l.viewer_type;
                return (
                  <tr key={l.id}>
                    <td>{when}</td>
                    <td>
                      <span className={`badge ${badge}`} style={{ fontSize: ".7rem" }}>
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2">
        <Link href="/agency/dashboard" className="btn btn-outline">
          ← {t("Back to inbox")}
        </Link>
      </div>

      {preview && (
        <div
          className="fixed inset-0 bg-black/75 z-[300] flex items-center justify-center p-6"
          onClick={closePreview}
        >
          <div
            className="bg-white rounded-[2px] w-full max-w-[920px] flex flex-col"
            style={{ maxHeight: "90vh", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 gap-3">
              <span className="font-semibold text-[0.9375rem] truncate">
                {preview.fileName}
              </span>
              <button
                onClick={closePreview}
                className="text-lg text-gray-400 hover:text-charcoal px-2.5"
                aria-label={t("Close preview")}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100" style={{ minHeight: 0 }}>
              {!preview.blobUrl ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                  {t("Loading preview…")}
                </div>
              ) : preview.blobUrl === "ERROR" ? (
                <div className="flex items-center justify-center h-[200px] text-sm text-red">
                  {t("Could not load preview.")}
                </div>
              ) : preview.mime.startsWith("image/") ? (
                <img
                  src={preview.blobUrl}
                  alt={preview.fileName}
                  className="max-w-full block mx-auto"
                  style={{ maxHeight: "75vh", padding: 16 }}
                />
              ) : (
                <iframe
                  src={preview.blobUrl}
                  title={preview.fileName}
                  className="w-full border-none block"
                  style={{ height: "75vh", minHeight: 400 }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DocBlock({
  meta,
  doc,
  onPreview,
  onDownload,
}: {
  meta: { key: string; label: string; icon: string };
  doc?: Doc;
  onPreview: (storagePath: string, fileName: string, mime: string) => void;
  onDownload: (storagePath: string, fileName: string) => Promise<void>;
}) {
  const t = useT();
  if (!doc) {
    return (
      <div className="doc-viewer">
        <div className="doc-viewer__head">
          <div className="doc-viewer__name">
            {meta.icon} {t(meta.label)}
          </div>
          <span className="badge badge-gray">{t("Not uploaded")}</span>
        </div>
        <div className="doc-viewer__body">
          <p className="text-sm text-gray-400">
            {t("The tenant has not uploaded this document.")}
          </p>
        </div>
      </div>
    );
  }
  const confPct = doc.confidence_score != null ? Math.round(doc.confidence_score * 100) : null;
  const badgeText =
    confPct != null
      ? `${t(STATUS_LABEL[doc.status] || doc.status)} · ${confPct}%`
      : t(STATUS_LABEL[doc.status] || doc.status);
  return (
    <div className="doc-viewer">
      <div className="doc-viewer__head">
        <div className="doc-viewer__name">
          {meta.icon} {t(meta.label)}
        </div>
        <span className={STATUS_BADGE[doc.status] || "badge badge-gray"}>{badgeText}</span>
      </div>
      <div className="doc-viewer__body">
        <div className="text-xs text-gray-400 mb-2">
          {doc.file_name || doc.storage_path.split("/").pop()}
        </div>
        {doc.ocr_extracted_data && (
          <div className="doc-viewer__extracted">
            {Object.entries(doc.ocr_extracted_data)
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div key={k} className="doc-viewer__field">
                  <span className="doc-viewer__field-k">
                    {k
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <span className="doc-viewer__field-v">{String(v)}</span>
                </div>
              ))}
          </div>
        )}
        <div className="flex gap-2 flex-wrap mt-2 items-center">
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              onPreview(
                doc.storage_path,
                doc.file_name || doc.storage_path.split("/").pop() || "",
                doc.mime_type || "",
              )
            }
          >
            {t("Preview")}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              onDownload(
                doc.storage_path,
                doc.file_name || doc.storage_path.split("/").pop() || "",
              )
            }
          >
            {t("Download")}
          </button>
        </div>
      </div>
    </div>
  );
}

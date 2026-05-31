"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";
import {
  buildDocSections,
  DOC_STATUS_BADGE,
  DOC_STATUS_LABEL,
  daysSince,
  formatOcrKey,
  nameMatchesProfile,
  normaliseNationality,
  type DocTypeDef,
} from "@/lib/tenant-docs";

type Tenant = {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  permit_type: string | null;
  monthly_gross_salary: number | null;
  is_employee: boolean | null;
  is_self_employed: boolean | null;
  is_unemployed: boolean | null;
  is_on_welfare: boolean | null;
  needs_guarantor: boolean | null;
  guarantor_is_employee: boolean | null;
  guarantor_is_self_employed: boolean | null;
  guarantor_full_name: string | null;
  guarantor_date_of_birth: string | null;
  is_gov_info_locked: boolean | null;
  gov_info_review_requested: boolean | null;
  guarantor_is_gov_info_locked: boolean | null;
  guarantor_gov_info_review_requested: boolean | null;
  accepted_names: string[] | null;
};

type DocRow = {
  id: string;
  doc_type: string;
  status: keyof typeof DOC_STATUS_LABEL;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
  confidence_score: number | null;
  rejection_reason: string | null;
  ocr_extracted_data: Record<string, string> | null;
};

export default function TenantDocumentsPage() {
  const t = useT();
  const { userId } = useTenant();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [docsMap, setDocsMap] = useState<Record<string, DocRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<{
    fileName: string;
    blobUrl: string;
    mime: string;
  } | null>(null);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data: row } = await sb
        .from("tenants")
        .select("*")
        .eq("user_id", userId)
        .single<Tenant>();
      setTenant(row);
      if (row) await refreshDocs(row.id, setDocsMap);
      setLoaded(true);
    })();
  }, [userId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (preview) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [preview]);

  if (!loaded || !tenant) {
    return (
      <div className="text-gray-400 text-sm" style={{ padding: 40, textAlign: "center" }}>
        {t("Loading your documents…")}
      </div>
    );
  }

  const isSwiss = tenant.permit_type === "swiss" || tenant.nationality === "Swiss";
  const sections = buildDocSections({
    isSwiss,
    needsGuarantor: !!tenant.needs_guarantor,
    guarantorIsEmployee: !!tenant.guarantor_is_employee,
    guarantorIsSelfEmployed: !!tenant.guarantor_is_self_employed,
    isEmployee: !!tenant.is_employee,
    isSelfEmployed: !!tenant.is_self_employed,
    isUnemployed: !!tenant.is_unemployed,
    isOnWelfare: !!tenant.is_on_welfare,
  });

  const profileUnconfigured =
    !tenant.needs_guarantor &&
    !tenant.is_employee &&
    !tenant.is_self_employed &&
    !tenant.is_unemployed &&
    !tenant.is_on_welfare;

  async function reload() {
    if (!tenant) return;
    await refreshDocs(tenant.id, setDocsMap);
  }

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
      const blobUrl = URL.createObjectURL(blob);
      setPreview({ fileName, blobUrl, mime: mime || blob.type || "" });
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

  return (
    <>
      <h1 className="text-2xl font-bold">{t("Documents")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        {t(
          "Upload your supporting documents. Each file is stored securely and linked to your dossier.",
        )}
      </p>

      <div className="alert alert-info mb-6">
        <span>ℹ️</span>
        <div>
          <strong>{t("Accepted formats")}:</strong> PDF, JPG, PNG · {t("Max 10 MB per file.")}{" "}
          {t("Documents are stored on Swiss servers and only shared with agencies you authorise.")}
        </div>
      </div>

      {profileUnconfigured ? (
        <>
          {sections[0]?.types.map((type) => (
            <DocCard
              key={type.key}
              type={type}
              doc={docsMap[type.key]}
              tenant={tenant}
              docsMap={docsMap}
              onChange={reload}
              onPreview={openPreview}
            />
          ))}
          <div className="alert alert-info mt-4">
            <span>ℹ️</span>
            <div>
              <strong>{t("Rental situation not configured")}</strong>
              <br />
              <span className="text-sm">
                {t("Go to")}{" "}
                <Link href="/tenant/profile" className="font-semibold">
                  {t("My profile")}
                </Link>{" "}
                {t(
                  "and fill in your rental situation to see all required documents (income type, guarantor, etc.).",
                )}
              </span>
            </div>
          </div>
        </>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="mb-8">
            <div className="text-base font-bold mb-1">{t(section.title)}</div>
            {section.subtitle ? (
              <div className="text-sm text-gray-400 mb-4">{t(section.subtitle)}</div>
            ) : (
              <div className="mb-4" />
            )}
            {section.types.map((type) => (
              <DocCard
                key={type.key}
                type={type}
                doc={docsMap[type.key]}
                tenant={tenant}
                docsMap={docsMap}
                onChange={reload}
                onPreview={openPreview}
              />
            ))}
          </div>
        ))
      )}

      <div className="mt-6">
        <Link href="/tenant/certificate-new" className="btn btn-primary">
          {t("Continue to generate certificate →")}
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
              <span className="font-semibold text-[0.9375rem] truncate min-w-0">
                {preview.fileName}
              </span>
              <button
                onClick={closePreview}
                className="bg-transparent border-none cursor-pointer text-lg text-gray-400 hover:text-charcoal px-2.5"
                aria-label={t("Close preview")}
              >
                ✕
              </button>
            </div>
            <div
              className="flex-1 overflow-auto bg-gray-100"
              style={{ minHeight: 0 }}
            >
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

async function refreshDocs(
  tenantId: string,
  setDocsMap: React.Dispatch<React.SetStateAction<Record<string, DocRow>>>,
) {
  const sb = createClient();
  const { data } = await sb
    .from("documents")
    .select("*")
    .eq("tenant_id", tenantId);
  const map: Record<string, DocRow> = {};
  ((data as DocRow[]) || []).forEach((d) => {
    map[d.doc_type] = d;
  });
  setDocsMap(map);
}

function DocCard({
  type,
  doc,
  tenant,
  docsMap,
  onChange,
  onPreview,
}: {
  type: DocTypeDef;
  doc: DocRow | undefined;
  tenant: Tenant;
  docsMap: Record<string, DocRow>;
  onChange: () => Promise<void>;
  onPreview: (storagePath: string, fileName: string, mime: string) => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSwiss = tenant.permit_type === "swiss" || tenant.nationality === "Swiss";
  const label =
    type.key === "passport_id" ? (isSwiss ? t("Passport or Swiss ID") : t("Passport")) : t(type.label);
  const hint =
    type.key === "passport_id"
      ? isSwiss
        ? t("Upload your passport or Swiss identity card.")
        : t("Upload your passport.")
      : t(type.hint);

  const isBetreibung =
    type.key === "betreibungsauszug" || type.key === "guarantor_betreibungsauszug";
  const isSalarySlip =
    type.key.startsWith("salary_slip") || type.key.startsWith("guarantor_salary_slip");
  const isUnemploymentSlip = type.key.startsWith("unemployment_benefit_");

  let isStale = false;
  let isFuturePeriod = false;
  let ageDays: number | null = null;
  if (doc) {
    if (isBetreibung) {
      const certDate = doc.ocr_extracted_data?.certificate_date;
      ageDays = daysSince(certDate || doc.created_at);
      isStale = ageDays != null && ageDays > 90;
    } else if (isSalarySlip || isUnemploymentSlip) {
      const payPeriod = doc.ocr_extracted_data?.pay_period;
      if (payPeriod) {
        const [y, m] = payPeriod.split("-").map(Number);
        const slipDate = new Date(y, m - 1, 1);
        const now = new Date();
        const cur = new Date(now.getFullYear(), now.getMonth(), 1);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        isFuturePeriod = slipDate > cur;
        isStale = !isFuturePeriod && slipDate < cutoff;
      }
    }
  }

  const sc = doc ? DOC_STATUS_LABEL[doc.status] : null;
  const badgeCls = doc ? DOC_STATUS_BADGE[doc.status] : "badge badge-gray";
  const cardClassMap: Record<string, string> = {
    auto_verified: "doc-card--verified",
    flagged: "doc-card--flagged",
    rejected: "doc-card--rejected",
    processing: "doc-card--processing",
  };
  const headCls =
    isStale || isFuturePeriod
      ? "doc-card--rejected"
      : doc
        ? cardClassMap[doc.status] || ""
        : "";

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(
        t("File is too large (max 10 MB). Please compress or use a different file."),
      );
      return;
    }
    setError(null);
    setPhase("uploading");
    const sb = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tenant.id}/${type.key}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await sb.storage
      .from("documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setError(t("Upload failed") + ": " + uploadError.message);
      setPhase("idle");
      return;
    }
    const { data: docRow, error: dbError } = await sb
      .from("documents")
      .upsert(
        {
          tenant_id: tenant.id,
          doc_type: type.key,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type,
          status: "processing",
        },
        { onConflict: "tenant_id,doc_type" },
      )
      .select()
      .single();
    if (dbError || !docRow?.id) {
      setError(t("Could not save document record") + (dbError ? ": " + dbError.message : ""));
      setPhase("idle");
      return;
    }
    setPhase("processing");
    const { data: sess } = await sb.auth.getSession();
    const { error: ocrError } = await sb.functions.invoke("ocr", {
      body: { documentId: docRow.id },
      headers: sess.session ? { Authorization: `Bearer ${sess.session.access_token}` } : {},
    });
    if (ocrError) setError(t("OCR error") + ": " + ocrError.message);
    setPhase("idle");
    await onChange();
  }

  async function deleteDoc() {
    if (!doc) return;
    if (!confirm(t("Delete this document? You will need to re-upload it."))) return;
    setError(null);
    const sb = createClient();
    const { error: storageErr } = await sb.storage.from("documents").remove([doc.storage_path]);
    if (storageErr) {
      setError(t("Delete failed") + ": " + storageErr.message);
      return;
    }
    const { error: dbErr } = await sb.from("documents").delete().eq("id", doc.id);
    if (dbErr) {
      setError(t("Delete failed") + ": " + dbErr.message);
      return;
    }
    await onChange();
  }

  async function lockIdentity(name: string, dob: string | null, isGuarantor: boolean) {
    const sb = createClient();
    const fields: Record<string, unknown> = isGuarantor
      ? {
          guarantor_is_gov_info_locked: true,
          guarantor_full_name: name,
          guarantor_date_of_birth: dob || tenant.guarantor_date_of_birth,
        }
      : {
          is_gov_info_locked: true,
          full_name: name,
          date_of_birth: dob || tenant.date_of_birth,
        };
    const { error: err } = await sb.from("tenants").update(fields).eq("id", tenant.id);
    if (err) {
      alert(t("Failed to lock identity") + ": " + err.message);
      return;
    }
    await onChange();
  }

  async function requestReview(isGuarantor: boolean) {
    const note = prompt(
      (isGuarantor ? t("Guarantor name change") : t("Your name change")) +
        " — " +
        t("please describe the reason:") +
        "\n" +
        t("(e.g. name changed after marriage, typo in document)") +
        "\n\n" +
        t(
          "An admin will review your request. Certificates cannot be generated until the review is approved.",
        ),
    );
    if (!note || !note.trim()) return;
    const sb = createClient();
    const fields: Record<string, unknown> = isGuarantor
      ? {
          guarantor_gov_info_review_requested: true,
          guarantor_gov_info_review_note: note.trim(),
        }
      : { gov_info_review_requested: true, gov_info_review_note: note.trim() };
    const { error: err } = await sb.from("tenants").update(fields).eq("id", tenant.id);
    if (err) {
      alert(t("Failed to submit review request") + ": " + err.message);
      return;
    }
    await onChange();
  }

  return (
    <div className={`doc-card ${headCls}`}>
      <div className="doc-card__head">
        <div className="doc-card__title">
          {type.icon} {label}
        </div>
        {isStale ? (
          <span className="badge badge-red">{t("Expired — renew now")}</span>
        ) : isFuturePeriod ? (
          <span className="badge badge-red">{t("Invalid — future date")}</span>
        ) : doc ? (
          <span className={badgeCls}>{t(sc || "")}</span>
        ) : (
          <span className="badge badge-gray">{t("Not uploaded")}</span>
        )}
      </div>

      <div className="doc-card__body">
        {!doc ? (
          <>
            <p className="text-sm text-gray-400 mb-4">{hint}</p>
            <div
              className="upload-zone"
              onClick={pickFile}
              role="button"
              tabIndex={0}
            >
              {phase === "uploading" ? (
                <div className="upload-zone__text">
                  <span className="spinner"></span>
                  {t("Uploading…")}
                </div>
              ) : phase === "processing" ? (
                <div className="upload-zone__text">
                  <span className="spinner"></span>
                  {t("Analysing with AI…")}
                </div>
              ) : (
                <>
                  <div className="upload-zone__icon">📁</div>
                  <div className="upload-zone__text">{t("Click or drag to upload")}</div>
                  <div className="upload-zone__hint">PDF, JPG, PNG · {t("Max 10 MB")}</div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="file-info mb-3">
              <span style={{ fontSize: "1.1rem" }}>📄</span>
              <span className="file-info__name">
                {doc.file_name || doc.storage_path.split("/").pop()}
              </span>
              <span className="file-info__date">
                {t("Uploaded")}{" "}
                {new Date(doc.created_at).toLocaleDateString("en-CH", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            {doc.confidence_score != null && (
              <>
                <div className="confidence-bar mb-1">
                  <div
                    className="confidence-bar__fill"
                    style={{
                      width: `${Math.round(doc.confidence_score * 100)}%`,
                      background:
                        doc.confidence_score >= 0.9
                          ? "var(--green)"
                          : doc.confidence_score >= 0.65
                            ? "var(--amber)"
                            : "var(--red)",
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  {Math.round(doc.confidence_score * 100)}% {t("confidence")}
                </div>
              </>
            )}

            <OcrSection data={doc.ocr_extracted_data} />

            <MismatchAlerts
              type={type}
              doc={doc}
              tenant={tenant}
              docsMap={docsMap}
              onLock={lockIdentity}
              onRequestReview={requestReview}
            />

            <ExpiryAlert
              isStale={isStale}
              isFuture={isFuturePeriod}
              isSalary={isSalarySlip || isUnemploymentSlip}
              payPeriod={doc.ocr_extracted_data?.pay_period}
              age={ageDays}
            />

            {doc.rejection_reason && (
              <div className="alert alert-error mt-3">
                <span>⚠️</span>
                <span>{doc.rejection_reason}</span>
              </div>
            )}

            <div className="upload-btn-row">
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
                onClick={pickFile}
                disabled={phase !== "idle"}
              >
                {phase === "uploading"
                  ? t("Uploading…")
                  : phase === "processing"
                    ? t("Analysing…")
                    : t("Replace")}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={deleteDoc}
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
              >
                {t("Delete")}
              </button>
            </div>
          </>
        )}

        {error && <div className="text-xs mt-2" style={{ color: "var(--red)" }}>{error}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function OcrSection({ data }: { data: Record<string, string> | null }) {
  const t = useT();
  if (!data) return null;
  const rows = Object.entries(data).filter(([, v]) => v != null && v !== "");
  if (!rows.length) return null;
  return (
    <div
      style={{
        background: "var(--gray-100)",
        borderRadius: "var(--radius)",
        padding: 14,
        marginBottom: 8,
      }}
    >
      <div
        className="text-xs uppercase tracking-wider text-gray-400 mb-2"
        style={{ fontWeight: 600 }}
      >
        {t("Extracted data")}
      </div>
      <div className="ocr-grid">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <div className="ocr-grid__key">{formatOcrKey(k)}</div>
            <div className="ocr-grid__val">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MismatchAlerts({
  type,
  doc,
  tenant,
  docsMap,
  onLock,
  onRequestReview,
}: {
  type: DocTypeDef;
  doc: DocRow;
  tenant: Tenant;
  docsMap: Record<string, DocRow>;
  onLock: (name: string, dob: string | null, isGuarantor: boolean) => Promise<void>;
  onRequestReview: (isGuarantor: boolean) => Promise<void>;
}) {
  const t = useT();
  const isGuarantorId = type.key === "guarantor_id";
  const isIdDoc = type.key === "passport_id" || isGuarantorId;
  const ocrName = (
    doc.ocr_extracted_data?.full_name ||
    doc.ocr_extracted_data?.issued_for ||
    ""
  ).trim();
  const ocrDob = (doc.ocr_extracted_data?.date_of_birth || "").trim() || null;
  const profileName = isGuarantorId ? tenant.guarantor_full_name : tenant.full_name;
  const profileDob = isGuarantorId ? tenant.guarantor_date_of_birth : tenant.date_of_birth;
  const isLocked = isGuarantorId ? tenant.guarantor_is_gov_info_locked : tenant.is_gov_info_locked;
  const reviewReq = isGuarantorId
    ? tenant.guarantor_gov_info_review_requested
    : tenant.gov_info_review_requested;
  const acceptedNames = isGuarantorId ? [] : tenant.accepted_names || [];

  const alerts: React.ReactNode[] = [];

  if (isIdDoc && ocrName && profileName) {
    const nameMatches =
      nameMatchesProfile(ocrName, profileName) ||
      acceptedNames.some((n) => nameMatchesProfile(ocrName, n));
    const dobMatches = !ocrDob || !profileDob || ocrDob === profileDob;

    if (!isLocked && nameMatches && dobMatches) {
      alerts.push(
        <div
          key="lock"
          className="alert mt-3 items-start"
          style={{
            background: "#F0FDF4",
            border: "1px solid #86EFAC",
            display: "flex",
            gap: 8,
            padding: "12px 14px",
            borderRadius: "var(--radius)",
            fontSize: ".875rem",
          }}
        >
          <span>✅</span>
          <div className="flex-1">
            <strong>{t("Identity verified")}</strong> —{" "}
            {t(
              isGuarantorId
                ? "The name and date of birth on this document match the guarantor's profile."
                : "The name and date of birth on this document match your profile.",
            )}
            <br />
            <span className="text-xs text-gray-400 block mt-0.5">
              {t(
                isGuarantorId
                  ? "Locking protects the guarantor's identity and is required before generating a certificate."
                  : "Locking protects your identity and is required before generating a certificate.",
              )}
            </span>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                onClick={() => onLock(ocrName, ocrDob, isGuarantorId)}
                className="btn btn-sm"
                style={{
                  background: "#16A34A",
                  color: "#fff",
                  border: "none",
                  padding: "6px 14px",
                }}
              >
                🔒 {t("Lock identity")}
              </button>
              <button
                onClick={() => onRequestReview(isGuarantorId)}
                className="btn btn-sm btn-ghost"
              >
                {t("Not my document?")}
              </button>
            </div>
          </div>
        </div>,
      );
    } else if (isLocked && !nameMatches) {
      if (reviewReq) {
        alerts.push(
          <div
            key="pending"
            className="alert mt-3"
            style={{
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              display: "flex",
              gap: 8,
              fontSize: ".875rem",
            }}
          >
            <span>⏳</span>
            <div>
              <strong>{t("Review pending")}</strong> —{" "}
              {t("Document shows")} "<strong>{ocrName}</strong>" {t("but the locked")}{" "}
              {isGuarantorId ? t("guarantor name is") : t("name is")}{" "}
              "<strong>{profileName}</strong>".{" "}
              {t(
                "An admin is reviewing your request. Certificates cannot be generated until this is resolved.",
              )}
            </div>
          </div>,
        );
      } else {
        alerts.push(
          <div
            key="mismatch"
            className="alert alert-error mt-3"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              padding: "12px 14px",
              borderRadius: "var(--radius)",
              display: "flex",
              gap: 8,
              fontSize: ".875rem",
              alignItems: "flex-start",
            }}
          >
            <span>⚠️</span>
            <div className="flex-1">
              <strong>{t("Name mismatch")}</strong> — {t("Document shows")} "
              <strong>{ocrName}</strong>" {t("but the locked")}{" "}
              {isGuarantorId ? t("guarantor name is") : t("name is")} "
              <strong>{profileName}</strong>".
              <br />
              <span className="text-xs text-gray-400">
                {t(
                  "If your name changed (e.g. after marriage), request a manual review. Certificates cannot be generated until this is resolved.",
                )}
              </span>
              <div className="mt-2">
                <button
                  onClick={() => onRequestReview(isGuarantorId)}
                  className="btn btn-sm"
                  style={{ background: "#DC2626", color: "#fff", border: "none" }}
                >
                  {t("Request manual review")}
                </button>
              </div>
            </div>
          </div>,
        );
      }
    } else if (!isLocked && !nameMatches) {
      alerts.push(
        <div
          key="profileMismatch"
          className="alert mt-3"
          style={{
            background: "#FFFBEB",
            border: "1px solid #FCD34D",
            padding: "12px 14px",
            borderRadius: "var(--radius)",
            display: "flex",
            gap: 8,
            fontSize: ".875rem",
            alignItems: "flex-start",
          }}
        >
          <span>⚠️</span>
          <div className="flex-1">
            <strong>{t("Name mismatch")}</strong> — {t("Document shows")} "
            <strong>{ocrName}</strong>" {t("but")}{" "}
            {isGuarantorId ? t("the guarantor profile") : t("your profile")} {t("has")} "
            <strong>{profileName || t("(not set)")}</strong>".
            <br />
            <span className="text-xs text-gray-400">
              {t("Update the profile name to match the document, then lock to generate certificates.")}
            </span>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Link href="/tenant/profile" className="btn btn-sm btn-outline">
                {t("Edit profile")}
              </Link>
            </div>
          </div>
        </div>,
      );
    }

    if (isLocked && ocrDob && profileDob && ocrDob !== profileDob && nameMatches) {
      alerts.push(
        <div
          key="dob"
          className="alert alert-error mt-3"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <span>⚠️</span>
          <span>
            {t("Date of birth mismatch — document shows")} <strong>{ocrDob}</strong>{" "}
            {t("but the locked date of birth is")} <strong>{profileDob}</strong>.{" "}
            {t("Request a manual review to resolve this.")}
          </span>
        </div>,
      );
    }
  }

  const expiry =
    doc.ocr_extracted_data?.expiry_date || doc.ocr_extracted_data?.valid_until;
  if (expiry) {
    const exp = new Date(expiry);
    if (!isNaN(exp.getTime()) && exp < new Date()) {
      alerts.push(
        <div
          key="expired"
          className="alert alert-error mt-3"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <span>⚠️</span>
          <span>
            {t("Document expired — this document expired on")} <strong>{expiry}</strong>.{" "}
            {t("You must obtain a renewed document and re-upload it.")}
          </span>
        </div>,
      );
    }
  }

  const ocrNat = (doc.ocr_extracted_data?.nationality || "").trim();
  if (ocrNat && tenant.nationality) {
    const norm = normaliseNationality(ocrNat) || ocrNat;
    if (norm.toLowerCase() !== tenant.nationality.toLowerCase()) {
      alerts.push(
        <div
          key="nat"
          className="alert alert-error mt-3"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
        >
          <span>⚠️</span>
          <span>
            {t("Nationality mismatch — document shows")} <strong>{norm}</strong>{" "}
            {t("but your profile has")} <strong>{tenant.nationality}</strong>.{" "}
            {t("Please")}{" "}
            <Link href="/tenant/profile" style={{ color: "#1D4ED8", fontWeight: 600 }}>
              {t("update your profile")}
            </Link>{" "}
            {t("or re-upload the correct document.")}
          </span>
        </div>,
      );
    }
  }

  const ocrPermit = (doc.ocr_extracted_data?.permit_type || "").trim().toUpperCase();
  const tenantPermit = (tenant.permit_type || "").trim().toUpperCase();
  if (
    ocrPermit &&
    tenantPermit &&
    tenantPermit !== "SWISS" &&
    doc.doc_type === "residence_permit" &&
    ocrPermit !== tenantPermit
  ) {
    alerts.push(
      <div
        key="permit"
        className="alert alert-error mt-3"
        style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
      >
        <span>⚠️</span>
        <span>
          {t("Permit type mismatch — document shows permit")} <strong>{ocrPermit}</strong>{" "}
          {t("but your profile has permit")} <strong>{tenantPermit}</strong>.{" "}
          {t("Please")}{" "}
          <Link href="/tenant/profile" style={{ color: "#1D4ED8", fontWeight: 600 }}>
            {t("update your profile")}
          </Link>{" "}
          {t("or re-upload the correct document.")}
        </span>
      </div>,
    );
  }

  if (type.key === "salary_slip_3" && tenant.monthly_gross_salary) {
    const salaries = ["salary_slip_1", "salary_slip_2", "salary_slip_3"]
      .map((k) => docsMap[k]?.ocr_extracted_data?.gross_salary)
      .filter((v) => v != null && !isNaN(Number(v)))
      .map(Number);
    if (salaries.length === 3) {
      const avg = salaries.reduce((a, b) => a + b, 0) / 3;
      if (avg < tenant.monthly_gross_salary) {
        alerts.push(
          <div
            key="salaryAvg"
            className="alert alert-error mt-3"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
          >
            <span>⚠️</span>
            <span>
              {t("Average gross salary across your 3 payslips")} (
              <strong>CHF {Math.round(avg).toLocaleString()}</strong>){" "}
              {t("is lower than the monthly gross salary in your profile")} (
              <strong>CHF {Math.round(tenant.monthly_gross_salary).toLocaleString()}</strong>).{" "}
              {t("Please")}{" "}
              <Link href="/tenant/profile" style={{ color: "#1D4ED8", fontWeight: 600 }}>
                {t("update your profile")}
              </Link>
              .
            </span>
          </div>,
        );
      }
    }
  }

  return <>{alerts}</>;
}

function ExpiryAlert({
  isStale,
  isFuture,
  isSalary,
  payPeriod,
  age,
}: {
  isStale: boolean;
  isFuture: boolean;
  isSalary: boolean;
  payPeriod?: string;
  age: number | null;
}) {
  const t = useT();
  if (isFuture) {
    return (
      <div
        className="alert alert-error mt-3"
        style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
      >
        <span>⚠️</span>
        <span>
          {t("This statement shows a pay period of")}{" "}
          <strong>{payPeriod || t("an unknown period")}</strong>,{" "}
          {t("which is in the future. Please upload a valid payslip.")}
        </span>
      </div>
    );
  }
  if (isStale && isSalary) {
    return (
      <div
        className="alert alert-error mt-3"
        style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
      >
        <span>⚠️</span>
        <span>
          {t("This statement is from")}{" "}
          <strong>{payPeriod || t("an unknown period")}</strong>,{" "}
          {t("which is more than 3 months ago. Please upload a more recent statement.")}
        </span>
      </div>
    );
  }
  if (isStale) {
    return (
      <div
        className="alert alert-error mt-3"
        style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
      >
        <span>⚠️</span>
        <span>
          {t("This attestation is")} <strong>{age} {t("days old")}</strong> —{" "}
          {t(
            "it must be issued within the last 3 months. Please obtain a new one and re-upload.",
          )}
        </span>
      </div>
    );
  }
  if (age != null && age > 60) {
    return (
      <div
        className="alert mt-3"
        style={{
          background: "#FFFBEB",
          border: "1px solid #FCD34D",
          padding: "12px 14px",
          borderRadius: "var(--radius)",
          display: "flex",
          gap: 8,
          fontSize: ".875rem",
        }}
      >
        <span>⏳</span>
        <span>
          {t("This attestation is")} <strong>{age} {t("days old")}</strong> —{" "}
          {t("it will expire in")} {90 - age} {90 - age !== 1 ? t("days") : t("day")}.{" "}
          {t("Consider renewing soon.")}
        </span>
      </div>
    );
  }
  return null;
}

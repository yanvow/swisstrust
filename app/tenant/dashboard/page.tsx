"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  computeCertValidity,
  getDocTypeMeta,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  type AccessRequestRow,
  type CertificateRow,
  type DocStatus,
  type DocumentRow,
  type TenantRow,
} from "@/lib/tenant";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";

type State =
  | { phase: "loading" }
  | { phase: "no-tenant" }
  | {
      phase: "ready";
      tenant: TenantRow;
      docs: DocumentRow[];
      certs: CertificateRow[];
      requests: AccessRequestRow[];
    };

export default function TenantDashboardPage() {
  const t = useT();
  const { userId, displayName, setPendingCount } = useTenant();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data: tenant } = await sb
        .from("tenants")
        .select("*")
        .eq("user_id", userId)
        .single<TenantRow>();
      if (!tenant) {
        setState({ phase: "no-tenant" });
        return;
      }

      const [{ data: docs }, { data: certs }, { data: requests }] = await Promise.all([
        sb.from("documents").select("*").eq("tenant_id", tenant.id).order("created_at"),
        sb
          .from("certificates")
          .select("*, agencies(company_name)")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        sb
          .from("access_requests")
          .select(
            "id, status, requester_type, requester_name, message, requested_at, certificates(id, cert_code, property_address, property_city, mode)",
          )
          .eq("status", "pending")
          .order("requested_at", { ascending: false }),
      ]);

      const pendingRequests = ((requests as unknown as AccessRequestRow[]) || []).filter(
        (r) => r.status === "pending",
      );
      setPendingCount(pendingRequests.length);

      setState({
        phase: "ready",
        tenant,
        docs: (docs as DocumentRow[]) || [],
        certs: (certs as CertificateRow[]) || [],
        requests: pendingRequests,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (state.phase === "loading") {
    return (
      <>
        <PageHeader />
        <p className="text-gray-400 text-sm">{t("Loading…")}</p>
      </>
    );
  }

  if (state.phase === "no-tenant") {
    return (
      <>
        <PageHeader />
        <p className="text-red text-sm">
          {t("We couldn't find your tenant profile. Please contact support.")}
        </p>
      </>
    );
  }

  const { tenant, docs, certs, requests } = state;
  const docsMap: Record<string, DocumentRow> = {};
  docs.forEach((d) => {
    docsMap[d.doc_type] = d;
  });
  const docTypes = getDocTypeMeta(tenant);
  const uploadedCount = tenant.total_doc_uploads ?? Object.keys(docsMap).length;
  const verifiedCount = docs.filter((d) => d.status === "auto_verified").length;
  const { valid: profileValid, reasons } = computeCertValidity(docs, tenant);
  const certCount = certs.length;

  const profileComplete = !!tenant.profile_complete;
  const hasEmployment = !!(tenant.employer_name && tenant.monthly_gross_salary);
  const rentalConfigured = !!(
    tenant.needs_guarantor ||
    tenant.is_employee ||
    tenant.is_self_employed ||
    tenant.is_unemployed ||
    tenant.is_on_welfare
  );
  const uploadedRequired = docTypes.filter((dt) => !!docsMap[dt.key]).length;
  const missingRequired = docTypes.length - uploadedRequired;
  const checks = [
    profileComplete,
    hasEmployment,
    rentalConfigured,
    missingRequired === 0,
    certCount > 0,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const firstName = displayName.split(" ")[0] || t("there");

  return (
    <>
      <PageHeader subtitle={`${t("Welcome back,")} ${firstName}. ${t("Here's your dossier status.")}`} />

      {requests.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-bold">{t("Access requests")}</div>
            <span className="badge badge-amber text-[0.7rem]">
              {requests.length} {t("pending")}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <RequestCard key={req.id} req={req} onResponded={() => {
                setState((s) => {
                  if (s.phase !== "ready") return s;
                  const remaining = s.requests.filter((r) => r.id !== req.id);
                  setPendingCount(remaining.length);
                  return { ...s, requests: remaining };
                });
              }} />
            ))}
          </div>
        </section>
      )}

      <section className="card mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[1.125rem] font-semibold">{t("Dossier completion")}</div>
            <div className="text-sm text-gray-400 mt-0.5">
              {t("Complete your profile to generate certificates")}
            </div>
          </div>
          <span className="badge badge-gray">
            {pct}% {t("complete")}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-[3px] overflow-hidden">
          <div className="h-full bg-charcoal rounded-[3px] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Checkpoint
            done={profileComplete}
            label={t("Personal information complete")}
            link="/tenant/profile.html"
            t={t}
          />
          <Checkpoint done={hasEmployment} label={t("Employment details filled")} link="/tenant/profile.html" t={t} />
          <Checkpoint
            done={rentalConfigured}
            label={
              rentalConfigured
                ? t("Rental situation configured")
                : t("Rental situation not configured (income type / guarantor)")
            }
            link="/tenant/profile.html"
            linkLabel={t("Configure →")}
            t={t}
          />
          <Checkpoint
            done={missingRequired === 0}
            label={
              missingRequired === 0
                ? t("All required documents uploaded")
                : `${missingRequired} ${
                    missingRequired > 1 ? t("required documents still missing") : t("required document still missing")
                  }`
            }
            link="/tenant/documents.html"
            linkLabel={t("Upload now →")}
            t={t}
          />
          <Checkpoint
            done={certCount > 0}
            label={
              certCount > 0
                ? `${certCount} ${certCount > 1 ? t("certificates generated") : t("certificate generated")}`
                : t("No certificates yet")
            }
            link="/tenant/certificate-new.html"
            linkLabel={t("Generate →")}
            t={t}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatBox value={uploadedCount} label={t("Documents uploaded")} />
        <StatBox value={verifiedCount} label={t("Verified ✓")} />
        <StatBox value={certCount} label={t("Certificates")} />
        <StatBox
          value={profileValid ? t("✓ Valid") : t("✗ Not ready")}
          label={t("Profile status")}
          color={profileValid ? "var(--st-green, #0A7D44)" : "var(--st-red, #D0021B)"}
          title={!profileValid ? reasons.join("\n") : undefined}
        />
      </section>

      <section className="card mb-6">
        <div className="pb-4 mb-5 border-b border-gray-200">
          <div className="text-[1.125rem] font-semibold">{t("Document status")}</div>
          <div className="text-sm text-gray-400 mt-0.5">
            {t("Upload all required documents to generate a certificate")}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {docTypes.map((dt) => {
            const doc = docsMap[dt.key];
            if (!doc) {
              return (
                <DocRow key={dt.key} icon={dt.icon} title={dt.label} subtitle={t("Not yet uploaded")} >
                  <span className="badge badge-gray">{t("Missing")}</span>
                </DocRow>
              );
            }
            const uploaded = new Date(doc.created_at).toLocaleDateString("en-CH", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const confPct =
              doc.confidence_score != null
                ? `${Math.round(doc.confidence_score * 100)}% ${t("confidence")} · `
                : "";
            return (
              <DocRow
                key={dt.key}
                icon={dt.icon}
                title={dt.label}
                subtitle={`${confPct}${t("Uploaded")} ${uploaded}`}
              >
                <span className={STATUS_BADGE_CLASS[doc.status]}>
                  {t(STATUS_LABEL[doc.status as DocStatus] || doc.status)}
                </span>
              </DocRow>
            );
          })}
        </div>

        <div className="mt-5">
          <a href="/tenant/documents.html" className="btn btn-outline btn-sm">
            {t("Manage documents")}
          </a>
        </div>
      </section>

      <section className="card" style={{ border: "2px solid #1A1A1A", background: "#F5F5F5" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[1.125rem] font-semibold">{t("Ready to apply for a flat?")}</div>
            <div className="text-sm text-gray-400 mt-1">
              {t("Generate a QR certificate for a specific property. Takes 2 minutes.")}
            </div>
          </div>
          <a href="/tenant/certificate-new.html" className="btn btn-primary whitespace-nowrap">
            {t("New certificate →")}
          </a>
        </div>
      </section>
    </>
  );
}

function PageHeader({ subtitle }: { subtitle?: string }) {
  const t = useT();
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold mb-1">{t("Dashboard")}</h1>
      <p className="text-gray-600 text-sm">{subtitle ?? t("Loading…")}</p>
    </div>
  );
}

function StatBox({
  value,
  label,
  color,
  title,
}: {
  value: string | number;
  label: string;
  color?: string;
  title?: string;
}) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-[2px] p-4 shadow-subtle"
      title={title}
    >
      <div className="text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function Checkpoint({
  done,
  label,
  link,
  linkLabel,
  t,
}: {
  done: boolean;
  label: string;
  link?: string;
  linkLabel?: string;
  t: (k: string) => string;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span style={{ color: done ? "#0A7D44" : "#888" }}>{done ? "✓" : "○"}</span>
      <span style={{ color: done ? "inherit" : "#888" }}>{label}</span>
      {!done && link ? (
        <a
          href={link}
          className="ml-auto text-[0.8rem] text-charcoal font-semibold hover:underline"
        >
          {linkLabel || t("Fix →")}
        </a>
      ) : null}
    </div>
  );
}

function DocRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 rounded-[2px] px-3 py-3">
      <div className="text-xl w-6 text-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-charcoal truncate">{title}</div>
        <div className="text-xs text-gray-400 truncate">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function RequestCard({
  req,
  onResponded,
}: {
  req: AccessRequestRow;
  onResponded: () => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<"approved" | "denied" | null>(null);

  const cert = req.certificates;
  const prop = `${cert?.property_address || "—"}${
    cert?.property_city ? ", " + cert.property_city : ""
  }`;
  const when = new Date(req.requested_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const typeLabel = req.requester_type === "owner" ? t("Private owner") : t("Agency");

  const respond = async (status: "approved" | "denied") => {
    setBusy(true);
    setError(null);
    const sb = createClient();
    const { error: updErr } = await sb
      .from("access_requests")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", req.id);
    setBusy(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setResolved(status);
    setTimeout(onResponded, 1200);
  };

  if (resolved) {
    const isApproved = resolved === "approved";
    return (
      <div
        className="card text-sm"
        style={{
          background: isApproved ? "#F0FDF4" : "#FEF2F2",
          border: `1.5px solid ${isApproved ? "#86EFAC" : "#FECACA"}`,
        }}
      >
        <strong>
          {isApproved ? "✓ " : "✗ "}
          {isApproved
            ? t("Access approved — the professional can now view the full dossier.")
            : t("Access denied.")}
        </strong>
      </div>
    );
  }

  return (
    <div className="card" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
      <div className="flex gap-3 items-start">
        <div className="text-xl flex-shrink-0">🔔</div>
        <div className="flex-1">
          <div className="font-bold mb-2">{req.requester_name || typeLabel}</div>
          <div className="text-sm text-gray-600 mb-2">
            {typeLabel} · {t("Requesting access to")} <strong>{prop}</strong> ({cert?.cert_code || "—"})
          </div>
          {req.message ? <div className="text-sm italic mb-2">&quot;{req.message}&quot;</div> : null}
          <div className="text-xs text-gray-400 mb-3">{when}</div>
          <div className="flex gap-2">
            <button onClick={() => respond("approved")} disabled={busy} className="btn btn-primary btn-sm">
              {busy ? t("Please wait…") : t("Approve")}
            </button>
            <button
              onClick={() => respond("denied")}
              disabled={busy}
              className="btn btn-outline btn-sm"
              style={{ color: "#D0021B", borderColor: "#D0021B" }}
            >
              {t("Deny")}
            </button>
          </div>
          {error ? <div className="text-red text-xs mt-2">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}

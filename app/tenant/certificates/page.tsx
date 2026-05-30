"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { computeCertValidity, type DocumentRow, type TenantRow } from "@/lib/tenant";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";

type CertRow = {
  id: string;
  cert_code: string;
  property_address: string | null;
  property_city: string | null;
  rooms: number | null;
  floor: string | null;
  total_chf: number | null;
  move_in_date: string | null;
  mode: string | null;
  is_active: boolean | null;
  is_eligible: boolean | null;
  owner_email: string | null;
  unregistered_agency_name: string | null;
  qr_url: string | null;
  created_at: string;
  agencies?: { company_name: string } | null;
  _valid?: boolean;
};

type AccessLogRow = {
  id: string;
  viewer_type: string;
  accessed_at: string;
};

const MODE_LABEL: Record<string, string> = { directed: "Directed", on_request: "On-Request" };
const MODE_COLOR: Record<string, string> = {
  directed: "var(--charcoal)",
  on_request: "var(--amber)",
};
const VIEWER_LABEL: Record<string, string> = {
  public: "Anonymous scan",
  agency: "Agency login",
  owner: "Owner login",
  tenant: "You (owner)",
};
const VIEWER_ICON: Record<string, string> = {
  public: "👁",
  agency: "🏢",
  owner: "👤",
  tenant: "🪪",
};

export default function TenantCertificatesPage() {
  const t = useT();
  const { userId, displayName } = useTenant();
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("new");
    if (code) {
      setNewCode(code);
      window.history.replaceState(null, "", "/tenant/certificates");
    }

    const sb = createClient();
    (async () => {
      const { data: tenantRow } = await sb
        .from("tenants")
        .select("*")
        .eq("user_id", userId)
        .single<TenantRow>();
      if (!tenantRow) {
        setLoading(false);
        return;
      }
      setTenant(tenantRow);

      const [{ data: docsData }, { data: certsData }] = await Promise.all([
        sb.from("documents").select("*").eq("tenant_id", tenantRow.id),
        sb
          .from("certificates")
          .select("*, agencies(company_name)")
          .eq("tenant_id", tenantRow.id)
          .order("created_at", { ascending: false }),
      ]);

      setDocs((docsData as DocumentRow[]) || []);
      const list = ((certsData as unknown as CertRow[]) || []).map((c) => {
        const { valid } = computeCertValidity((docsData as DocumentRow[]) || [], tenantRow);
        return { ...c, _valid: c.is_active !== false && valid };
      });
      setCerts(list);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return <div className="text-gray-400 text-sm">{t("Loading…")}</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("My certificates")}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {t("One certificate per property. Share the QR code or manual code with your agency.")}
          </p>
        </div>
        <Link href="/tenant/certificate-new" className="btn btn-primary">
          + {t("New certificate")}
        </Link>
      </div>

      {newCode && !bannerDismissed && (
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[2px] px-5 py-3.5 mb-5 flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div className="flex-1">
            <div className="font-semibold text-[0.9375rem]">
              {t("Certificate generated successfully")}
            </div>
            <div className="text-sm text-gray-400">
              {t("Code")}: <span className="font-mono font-bold">{newCode}</span> —{" "}
              {t("share the QR code or code below with your agency.")}
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-xl text-gray-400 hover:text-charcoal leading-none"
            aria-label={t("Dismiss")}
          >
            ×
          </button>
        </div>
      )}

      {certs.length === 0 ? (
        <div className="card mb-6 text-center" style={{ padding: 40 }}>
          <div className="text-3xl mb-3 opacity-40">🪪</div>
          <div className="text-sm text-gray-400 mb-4">
            {t("No certificates yet. Generate one when you find a property.")}
          </div>
          <Link href="/tenant/certificate-new" className="btn btn-primary btn-sm">
            {t("New certificate →")}
          </Link>
        </div>
      ) : (
        certs.map((c) => (
          <CertCard key={c.id} cert={c} tenant={tenant} docs={docs} tenantName={displayName} />
        ))
      )}

      <div
        className="card card--flat text-center"
        style={{ background: "var(--gray-100)", padding: 40 }}
      >
        <div className="text-3xl mb-3 opacity-40">＋</div>
        <div className="text-sm text-gray-400 mb-4">{t("Applying to another property?")}</div>
        <Link href="/tenant/certificate-new" className="btn btn-primary btn-sm">
          {t("Create new certificate")}
        </Link>
      </div>
    </>
  );
}

function CertCard({
  cert: c,
  tenant,
  docs,
  tenantName,
}: {
  cert: CertRow;
  tenant: TenantRow | null;
  docs: DocumentRow[];
  tenantName: string;
}) {
  const t = useT();
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<AccessLogRow[] | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [copied, setCopied] = useState(false);

  const { valid, reasons } = tenant
    ? computeCertValidity(docs, tenant)
    : { valid: false, reasons: [] };
  const certIsValid = c.is_active !== false && valid;
  const mode = c.mode || "directed";
  const borderColor = certIsValid ? "var(--green)" : "var(--red)";
  const date = new Date(c.created_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const detailParts = [
    c.rooms ? `${c.rooms} ${t("rooms")}` : null,
    c.floor ? `${t("Floor")} ${c.floor}` : null,
    c.total_chf ? `CHF ${Number(c.total_chf).toLocaleString()}/mo` : null,
    c.move_in_date
      ? `${t("Move-in")} ${new Date(c.move_in_date).toLocaleDateString("de-CH")}`
      : null,
  ].filter(Boolean);

  const agencyName = c.agencies?.company_name;

  async function toggleLog() {
    if (showLog) {
      setShowLog(false);
      return;
    }
    setShowLog(true);
    if (logs) return;
    setLoadingLog(true);
    const sb = createClient();
    const { data } = await sb
      .from("access_logs")
      .select("id, viewer_type, accessed_at")
      .eq("certificate_id", c.id)
      .order("accessed_at", { ascending: false })
      .limit(20);
    setLogs((data as AccessLogRow[]) || []);
    setLoadingLog(false);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(c.cert_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function printCert() {
    const qrUrl = c.qr_url || `${window.location.origin}/cert/cert-view?code=${c.cert_code}`;
    const property = [c.property_address, c.property_city].filter(Boolean).join(", ") || "—";
    const details = detailParts.join(" · ");
    const issueDate = new Date(c.created_at).toLocaleDateString("en-CH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const recipientLine = agencyName
      ? `Directed to: <strong>${esc(agencyName)}</strong>`
      : c.owner_email
        ? `Directed to: <strong>${esc(c.owner_email)}</strong>`
        : `Mode: <strong>${MODE_LABEL[mode] || mode}</strong>`;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Checks Certificate — ${esc(c.cert_code)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"><\/script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: white; color: #111827; padding: 48px; max-width: 680px; margin: 0 auto; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #111827; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 1.25rem; }
.logo-mark { background: #111827; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.verified { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; color: #15803d; border: 1px solid #86efac; border-radius: 20px; padding: 5px 14px; font-size: .8rem; font-weight: 600; }
.body { display: flex; gap: 40px; align-items: flex-start; margin-bottom: 32px; }
.qr-wrap { flex-shrink: 0; }
.info { flex: 1; }
.cert-code { font-family: monospace; font-size: 1.75rem; font-weight: 700; letter-spacing: .12em; margin-bottom: 6px; }
.property { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
.details { color: #6b7280; font-size: .875rem; margin-bottom: 16px; }
.meta-row { display: flex; gap: 24px; margin-bottom: 16px; }
.meta-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; margin-bottom: 3px; }
.meta-val { font-size: .9375rem; font-weight: 600; }
.status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: .875rem; color: white; background: ${certIsValid ? "#16a34a" : "#dc2626"}; }
.elig-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: .875rem; background: ${c.is_eligible ? "#f0fdf4" : "#fffbeb"}; color: ${c.is_eligible ? "#15803d" : "#b45309"}; border: 1px solid ${c.is_eligible ? "#86efac" : "#fcd34d"}; }
.recipient { font-size: .875rem; color: #374151; margin-bottom: 16px; }
.footer { border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: .75rem; color: #9ca3af; display: flex; justify-content: space-between; }
.scan-hint { font-size: .75rem; color: #9ca3af; margin-top: 6px; text-align: center; }
@media print { body { padding: 24px; } @page { margin: 1cm; size: A4; } }
</style></head>
<body>
<div class="header">
<div class="logo"><div class="logo-mark">C</div>Checks</div>
<div class="verified">✓ Identity Verified</div>
</div>
<div class="body">
<div><canvas id="qr"></canvas><div class="scan-hint">Scan to verify</div></div>
<div class="info">
<div class="cert-code">${esc(c.cert_code)}</div>
<div class="property">${esc(property)}</div>
<div class="details">${esc(details)}</div>
<div class="meta-row">
<div><div class="meta-label">Tenant</div><div class="meta-val">${esc(tenantName)}</div></div>
<div><div class="meta-label">Issued</div><div class="meta-val">${issueDate}</div></div>
</div>
<div class="meta-row">
<div><div class="meta-label">Certificate status</div><div><span class="status-badge">${certIsValid ? "✓ Valid" : "✗ Not valid"}</span></div></div>
<div><div class="meta-label">Income eligibility</div><div><span class="elig-badge">${c.is_eligible ? "✓ Eligible" : "Review required"}</span></div></div>
</div>
<div class="recipient">${recipientLine}</div>
</div>
</div>
<div class="footer"><span>Issued via Checks · checks.ch</span><span>Verify at: ${esc(qrUrl)}</span></div>
<script>QRCode.toCanvas(document.getElementById('qr'), ${JSON.stringify(qrUrl)}, { width: 160, margin: 1 }, function() { window.focus(); window.print(); });<\/script>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="card mb-4" style={{ borderLeft: `3px solid ${borderColor}` }}>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="font-bold">
            {c.property_address || "—"}
            {c.property_city ? `, ${c.property_city}` : ""}
          </div>
          <div className="text-sm text-gray-400 mt-1">{detailParts.join(" · ")}</div>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <span
            className={`badge ${certIsValid ? "badge-green" : "badge-red"}`}
            title={certIsValid ? "" : reasons.join("\n")}
          >
            {certIsValid ? `✓ ${t("Valid")}` : `✗ ${t("Not valid")}`}
          </span>
          <span
            className="badge"
            style={{ background: "var(--gray-100)", color: MODE_COLOR[mode], fontWeight: 600 }}
          >
            {t(MODE_LABEL[mode] || mode)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">{t("Certificate code")}</div>
          <div
            className="font-mono font-bold"
            style={{ fontSize: "1.1rem", letterSpacing: "0.08em" }}
          >
            {c.cert_code}
          </div>
        </div>
        <Recipient cert={c} agencyName={agencyName ?? null} />
        <div>
          <div className="text-xs text-gray-400 mb-1">{t("Created")}</div>
          <div className="text-sm">{date}</div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Link
            href={`/cert/cert-view?code=${c.cert_code}`}
            className="btn btn-outline btn-sm"
          >
            {t("View certificate")}
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={copyCode}>
            {copied ? `✓ ${t("Copied")}` : t("Copy code")}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={printCert}>
            ⬇ {t("Download PDF")}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: ".8rem", color: "var(--gray-400)" }}
          onClick={toggleLog}
          disabled={loadingLog}
        >
          📋 {loadingLog ? t("Loading…") : showLog ? t("Hide access log") : t("Show access log")}
        </button>
        {showLog && !loadingLog && (
          <div className="mt-3">
            {!logs || logs.length === 0 ? (
              <div className="text-sm text-gray-400 py-2">
                {t("No access events recorded yet.")}
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {t("Last")} {logs.length}{" "}
                  {logs.length > 1 ? t("access events") : t("access event")}
                </div>
                {logs.map((log) => {
                  const when = new Date(log.accessed_at).toLocaleString("en-CH", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-2.5 py-1.5 border-b border-gray-100 text-[0.8125rem]"
                    >
                      <span className="flex-shrink-0">
                        {VIEWER_ICON[log.viewer_type] || "👁"}
                      </span>
                      <span className="flex-1 text-charcoal">
                        {t(VIEWER_LABEL[log.viewer_type] || log.viewer_type)}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap">{when}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Recipient({ cert, agencyName }: { cert: CertRow; agencyName: string | null }) {
  const t = useT();
  if (agencyName) {
    return (
      <div>
        <div className="text-xs text-gray-400 mb-1">{t("Directed to")}</div>
        <div className="text-sm font-bold">{agencyName}</div>
      </div>
    );
  }
  if (cert.owner_email) {
    return (
      <div>
        <div className="text-xs text-gray-400 mb-1">{t("Directed to")}</div>
        <div className="text-sm font-bold">{cert.owner_email}</div>
      </div>
    );
  }
  if (cert.unregistered_agency_name) {
    return (
      <div>
        <div className="text-xs text-gray-400 mb-1">{t("Pending delivery")}</div>
        <div className="text-sm font-bold">{cert.unregistered_agency_name}</div>
        <div className="text-xs" style={{ color: "var(--amber)" }}>
          {t("Not yet on Checks")}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{t("Mode")}</div>
      <div className="text-sm font-bold">{t(MODE_LABEL[cert.mode || "directed"])}</div>
    </div>
  );
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

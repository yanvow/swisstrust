"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { computeCertValidity, type DocumentRow, type TenantRow } from "@/lib/tenant";
import { useT } from "@/lib/i18n";

type Cert = {
  id: string;
  cert_code: string;
  property_address: string | null;
  property_city: string | null;
  rooms: number | null;
  total_chf: number | null;
  move_in_date: string | null;
  mode: string;
  is_active: boolean;
  is_eligible: boolean;
  tenant_id: string;
  created_at: string;
  owner_email: string | null;
  agencies: { id: string; company_name: string; user_id: string } | null;
  tenants: TenantRow & {
    full_name: string | null;
    permit_type: string | null;
    occupant_count: number | null;
    is_smoker: boolean | null;
    has_pets: boolean | null;
  } | null;
};

type ViewerInfo = {
  session: { userId: string; email: string; role: string | null; name: string } | null;
  canSeeFull: boolean;
  viewerType: "public" | "tenant" | "agency" | "owner";
  isOwnTenant: boolean;
  accessRequest: { status: string } | null;
};

type Banner =
  | { kind: "public"; text: string }
  | { kind: "public"; html: React.ReactNode }
  | { kind: "agency"; text: string }
  | { kind: "onrequest"; text: string };

export default function CertViewPage() {
  const t = useT();
  const [code, setCode] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing" }
    | { kind: "not-found" }
    | {
        kind: "ready";
        cert: Cert;
        viewer: ViewerInfo;
        validity: { valid: boolean; reasons: string[] };
      }
  >({ kind: "loading" });
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestErr, setRequestErr] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (!c) {
      setState({ kind: "missing" });
      return;
    }
    setCode(c);

    const sb = createClient();
    (async () => {
      const { data: cert, error } = await sb
        .from("certificates")
        .select(
          "*, agencies(id, company_name, user_id), tenants(full_name, date_of_birth, nationality, permit_type, monthly_gross_salary, employer_name, job_role, employment_start_date, occupant_count, is_smoker, has_pets, is_employee, is_self_employed, is_unemployed, is_on_welfare, needs_guarantor, guarantor_is_employee, guarantor_is_self_employed, id)",
        )
        .eq("cert_code", c)
        .eq("is_active", true)
        .single<Cert>();
      if (error || !cert) {
        setState({ kind: "not-found" });
        return;
      }

      const {
        data: { session },
      } = await sb.auth.getSession();
      const role = (session?.user?.user_metadata?.role as string | undefined) || null;
      const viewerName =
        (session?.user?.user_metadata?.company_name as string | undefined) ||
        (session?.user?.user_metadata?.full_name as string | undefined) ||
        session?.user?.email ||
        "";

      const viewer: ViewerInfo = {
        session: session
          ? {
              userId: session.user.id,
              email: session.user.email || "",
              role,
              name: viewerName,
            }
          : null,
        canSeeFull: false,
        viewerType: "public",
        isOwnTenant: false,
        accessRequest: null,
      };

      const mode = cert.mode || "directed";
      const agency = cert.agencies;

      if (session) {
        if (role === "tenant") {
          const { data: myTenant } = await sb
            .from("tenants")
            .select("id")
            .eq("user_id", session.user.id)
            .single();
          viewer.isOwnTenant = !!(myTenant && (myTenant as { id: string }).id === cert.tenant_id);
          viewer.viewerType = "tenant";
        } else if (role === "agency") {
          if (mode === "directed" && agency?.user_id === session.user.id) {
            viewer.canSeeFull = true;
            viewer.viewerType = "agency";
          } else if (mode === "on_request") {
            const { data: req } = await sb
              .from("access_requests")
              .select("status")
              .eq("certificate_id", cert.id)
              .eq("requester_user_id", session.user.id)
              .maybeSingle();
            viewer.accessRequest = (req as { status: string } | null) || null;
            if (req?.status === "approved") {
              viewer.canSeeFull = true;
              viewer.viewerType = "agency";
            }
          }
        } else if (role === "owner") {
          if (
            mode === "directed" &&
            cert.owner_email &&
            cert.owner_email.toLowerCase() === (session.user.email || "").toLowerCase()
          ) {
            viewer.canSeeFull = true;
            viewer.viewerType = "owner";
          } else if (mode === "on_request") {
            const { data: req } = await sb
              .from("access_requests")
              .select("status")
              .eq("certificate_id", cert.id)
              .eq("requester_user_id", session.user.id)
              .maybeSingle();
            viewer.accessRequest = (req as { status: string } | null) || null;
            if (req?.status === "approved") {
              viewer.canSeeFull = true;
              viewer.viewerType = "owner";
            }
          }
        }
      }

      // Log access
      await sb.from("document_access_logs").insert({
        certificate_id: cert.id,
        viewer_user_id: session?.user?.id || null,
        viewer_type: viewer.viewerType,
      });

      // Owner recent history
      if (role === "owner" && session) {
        const key = `checks:ownerRecent:${session.user.id}`;
        try {
          const existing = (
            JSON.parse(localStorage.getItem(key) || "[]") as { certCode: string }[]
          ).filter((i) => i.certCode !== cert.cert_code);
          const entry = {
            certCode: cert.cert_code,
            tenantName: cert.tenants?.full_name || "—",
            property: `${cert.property_address || "—"}${cert.property_city ? ", " + cert.property_city : ""}`,
            mode,
            access: viewer.canSeeFull
              ? "full"
              : mode === "on_request"
                ? "request"
                : "preview",
            viewedAt: new Date().toISOString(),
          };
          localStorage.setItem(key, JSON.stringify([entry, ...existing].slice(0, 8)));
        } catch {
          /* ignore */
        }
      }

      // Validity (full check when full-access viewer or own tenant; just is_active otherwise)
      let validity = { valid: cert.is_active !== false, reasons: [] as string[] };
      if (viewer.canSeeFull || viewer.isOwnTenant) {
        const { data: docs } = await sb
          .from("documents")
          .select("*")
          .eq("tenant_id", cert.tenant_id);
        const v = computeCertValidity(
          (docs as DocumentRow[]) || [],
          cert.tenants as TenantRow,
        );
        validity = {
          valid: cert.is_active !== false && v.valid,
          reasons: cert.is_active === false ? [t("Certificate has been deactivated")] : v.reasons,
        };
      }

      setState({ kind: "ready", cert, viewer, validity });
    })();
  }, [t]);

  async function submitAccessRequest() {
    if (state.kind !== "ready" || !state.viewer.session) return;
    setRequestErr(null);
    setRequestSubmitting(true);
    const sb = createClient();
    const { error } = await sb
      .from("access_requests")
      .insert({
        certificate_id: state.cert.id,
        requester_user_id: state.viewer.session.userId,
        requester_type: state.viewer.session.role,
        requester_name: state.viewer.session.name,
        message: requestMessage.trim() || null,
      });
    setRequestSubmitting(false);
    if (error) {
      setRequestErr(error.message);
      return;
    }
    setState({
      ...state,
      viewer: { ...state.viewer, accessRequest: { status: "pending" } },
    });
  }

  async function signOut() {
    const sb = createClient();
    await sb.auth.signOut();
    window.location.reload();
  }

  if (state.kind === "loading") {
    return <CertShell><div className="text-sm text-gray-400">{t("Loading…")}</div></CertShell>;
  }
  if (state.kind === "missing") {
    return (
      <CertShell>
        <p className="text-gray-400">
          {t("No certificate code provided.")}{" "}
          <Link href="/verify" style={{ color: "var(--charcoal)", fontWeight: 600 }}>
            {t("Enter a code →")}
          </Link>
        </p>
      </CertShell>
    );
  }
  if (state.kind === "not-found") {
    return (
      <CertShell>
        <p className="text-gray-400">{t("Certificate not found or has been revoked.")}</p>
      </CertShell>
    );
  }

  const { cert, viewer, validity } = state;
  const tn = cert.tenants;
  const mode = cert.mode || "directed";
  const agency = cert.agencies;
  const issued = new Date(cert.created_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const signInUrl = `/auth/login?return=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`;
  const returnParam =
    typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";

  // Build banner
  let banner: { className: string; node: React.ReactNode };
  if (viewer.isOwnTenant) {
    banner = {
      className: "tier-banner tier-banner--public",
      node: <>🪪 {t("This is your certificate — manage it from your dashboard")}</>,
    };
  } else if (mode === "on_request" && !viewer.canSeeFull) {
    banner = {
      className: "tier-banner tier-banner--onrequest",
      node: <>🔔 {t("On-Request certificate — access controlled by the tenant")}</>,
    };
  } else if (viewer.canSeeFull) {
    const modeLabel =
      mode === "on_request"
        ? `✅ ${t("On-Request (approved)")}`
        : `🔓 ${t("Directed")}`;
    banner = {
      className: "tier-banner tier-banner--agency",
      node: <>{modeLabel} — {viewer.session?.name} — {t("Full dossier access")}</>,
    };
  } else if (mode === "directed") {
    if (viewer.session && (viewer.session.role === "agency" || viewer.session.role === "owner")) {
      const recipientDesc = agency?.company_name
        ? agency.company_name
        : cert.owner_email
          ? t("a private landlord")
          : t("the authorised recipient");
      banner = {
        className: "tier-banner tier-banner--public",
        node: <>🔒 {t("This certificate is directed to")} {recipientDesc} — {t("you do not have access")}</>,
      };
    } else {
      const recipientDesc = agency?.company_name
        ? `${t("Sign in as")} ${agency.company_name}`
        : t("Sign in as the authorised landlord");
      banner = {
        className: "tier-banner tier-banner--public",
        node: (
          <>
            👁 {t("Directed certificate")} —{" "}
            <Link href={signInUrl} style={{ color: "var(--charcoal)", fontWeight: 600 }}>
              {recipientDesc}
            </Link>{" "}
            {t("to access the full dossier")}
          </>
        ),
      };
    }
  } else {
    banner = {
      className: "tier-banner tier-banner--public",
      node: <>👁 {t("Public view — sign in as the authorised agency to access the full dossier")}</>,
    };
  }

  // Property line
  const propertyLine = (
    <>
      {t("Applying for")}:{" "}
      <strong style={{ color: "var(--charcoal)" }}>
        {cert.property_address}
        {cert.property_city ? ", " + cert.property_city : ""}
      </strong>
      {cert.rooms ? ` · ${cert.rooms} ${t("rooms")}` : ""}
      {cert.total_chf ? ` · CHF ${cert.total_chf.toLocaleString()}/mo` : ""}
    </>
  );

  // Directed-to sublabel
  let directedLabel: string;
  if (mode === "directed") {
    if (agency?.company_name) directedLabel = `${t("Directed to")}: ${agency.company_name}`;
    else if (cert.owner_email) directedLabel = `${t("Directed to")}: ${t("private landlord")}`;
    else directedLabel = t("Directed certificate");
  } else {
    directedLabel = t("On-Request certificate");
  }

  // Lock note (hidden when own tenant or full access)
  const hideLock = viewer.isOwnTenant || viewer.canSeeFull;
  let lockNote: React.ReactNode = null;
  if (!hideLock) {
    if (mode === "directed" && agency?.company_name) {
      lockNote = (
        <>
          🔒 <strong>{t("Full dossier")}</strong> —{" "}
          {t(
            "ID copy, salary slips, debt enforcement register extract and exact income details are visible only to",
          )}{" "}
          <strong>{agency.company_name}</strong>.
        </>
      );
    } else if (mode === "directed" && cert.owner_email) {
      lockNote = (
        <>
          🔒 <strong>{t("Full dossier")}</strong> —{" "}
          {t("visible only to the authorised private landlord.")}
        </>
      );
    } else {
      lockNote = (
        <>
          🔒 <strong>{t("Full dossier")}</strong> —{" "}
          {t("visible once the tenant approves an access request.")}
        </>
      );
    }
  }

  // Nav actions
  let navActions: React.ReactNode;
  if (viewer.isOwnTenant) {
    navActions = (
      <>
        <span className="text-sm text-gray">{viewer.session?.name}</span>
        <Link href="/tenant/certificates" className="btn btn-outline btn-sm">
          {t("My certificates")}
        </Link>
        <button onClick={signOut} className="btn btn-ghost btn-sm">
          {t("Sign out")}
        </button>
      </>
    );
  } else if (viewer.canSeeFull) {
    const dashHref =
      viewer.session?.role === "owner" ? "/owner/dashboard" : "/agency/dashboard";
    navActions = (
      <>
        <span className="text-sm text-gray">{viewer.session?.name}</span>
        <Link href={dashHref} className="btn btn-outline btn-sm">
          {t("Dashboard")}
        </Link>
        <button onClick={signOut} className="btn btn-ghost btn-sm">
          {t("Sign out")}
        </button>
      </>
    );
  } else if (viewer.session) {
    navActions = (
      <>
        <span className="text-sm text-gray">{viewer.session.name}</span>
        <button onClick={signOut} className="btn btn-ghost btn-sm">
          {t("Sign out")}
        </button>
      </>
    );
  } else {
    navActions = (
      <Link href={signInUrl} className="nav__link">
        {t("Sign in")}
      </Link>
    );
  }

  const moveInDate = cert.move_in_date
    ? new Date(cert.move_in_date).toLocaleDateString("de-CH")
    : "—";

  return (
    <>
      <nav className="nav">
        <div className="container flex-between w-full">
          <Link href="/" className="nav__logo">
            <div className="nav__logo-mark">C</div>
            Checks
          </Link>
          <div className="nav__links">{navActions}</div>
        </div>
      </nav>

      <div className={banner.className}>{banner.node}</div>

      <div className="cert-view">
        <div className="cert-view__header">
          <div className="flex-between flex-wrap gap-4">
            <div>
              <div
                className="text-xs text-gray mb-1"
                style={{
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t("Checks Certificate")}
              </div>
              <div
                className="font-mono font-bold"
                style={{ fontSize: "1.1rem", letterSpacing: ".1em", color: "var(--gray-600)" }}
              >
                {cert.cert_code}
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="verified-badge">✓ {t("Identity Verified")}</div>
              <span className={`badge ${validity.valid ? "badge-green" : "badge-red"}`} title={validity.reasons.join("\n")}>
                {validity.valid ? `✓ ${t("Valid")}` : `✗ ${t("Not valid")}`}
              </span>
            </div>
          </div>
          <div className="cert-view__tenant-name">{tn?.full_name || "—"}</div>
          <div className="text-sm text-gray">{propertyLine}</div>
          <div className="text-xs text-gray mt-1">
            {t("Certificate issued")} {issued} · {directedLabel}
          </div>
        </div>

        <div id="public-section">
          <h3
            className="mb-4"
            style={{
              fontSize: "1rem",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--gray-400)",
            }}
          >
            {t("Verified summary")}
          </h3>

          <div className="cert-view__public-grid">
            <Fact label={t("Status")}>
              <span className={`badge ${validity.valid ? "badge-green" : "badge-red"}`} title={validity.reasons.join("\n")}>
                {validity.valid ? `✓ ${t("Valid")}` : `✗ ${t("Not valid")}`}
              </span>
            </Fact>
            <Fact
              label={t("Rent eligibility")}
              valueColor={cert.is_eligible ? "var(--green)" : "var(--red)"}
            >
              {cert.is_eligible ? `✓ ${t("Income qualifies")}` : `⚠ ${t("Review required")}`}
            </Fact>
            <Fact label={t("Occupants")}>{tn?.occupant_count ?? "—"}</Fact>
            <Fact label={t("Smoker")}>{tn?.is_smoker ? t("Yes") : t("No")}</Fact>
            <Fact label={t("Pets")}>{tn?.has_pets ? t("Yes") : t("No")}</Fact>
            <Fact label={t("Desired move-in")}>{moveInDate}</Fact>
          </div>

          {lockNote && (
            <div
              className="card mt-6"
              style={{ background: "var(--gray-100)", border: "none", padding: 16 }}
            >
              <div className="text-sm text-gray-400">{lockNote}</div>
            </div>
          )}
        </div>

        {viewer.canSeeFull && (
          <div
            className="card mb-6 mt-6"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
          >
            <div>
              <div className="font-bold">
                {viewer.session?.role === "owner"
                  ? t("Full dossier — Owner access")
                  : t("Full dossier — Agency access")}
              </div>
              <div className="text-xs text-gray-400">
                {t("Visible to")}: {viewer.session?.name} · {t("Access logged")}{" "}
                {new Date().toLocaleDateString("en-CH", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <Link
              href={`/${viewer.session?.role === "owner" ? "owner" : "agency"}/dossier?code=${encodeURIComponent(cert.cert_code)}`}
              className="btn btn-primary"
            >
              {t("View full dossier")} →
            </Link>
          </div>
        )}

        {mode === "on_request" && !viewer.canSeeFull && !viewer.isOwnTenant && (
          <OnRequestPanel
            viewer={viewer}
            signInUrl={signInUrl}
            returnParam={returnParam}
            requestMessage={requestMessage}
            setRequestMessage={setRequestMessage}
            submitting={requestSubmitting}
            error={requestErr}
            onSubmit={submitAccessRequest}
          />
        )}

        <div
          className="card mt-8 card--flat"
          style={{ background: "var(--gray-100)", border: "none", padding: "14px 16px" }}
        >
          <div className="text-xs text-gray">
            🔒 {t("This access has been logged for audit purposes")} ·{" "}
            <Link href="/verify" style={{ color: "var(--charcoal)", fontWeight: 600 }}>
              {t("Verify another certificate")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function CertShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="nav">
        <div className="container flex-between w-full">
          <Link href="/" className="nav__logo">
            <div className="nav__logo-mark">C</div>
            Checks
          </Link>
        </div>
      </nav>
      <div className="cert-view">
        <div className="cert-view__header">{children}</div>
      </div>
    </>
  );
}

function Fact({
  label,
  children,
  valueColor,
}: {
  label: string;
  children: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="cert-view__fact">
      <div className="cert-view__fact-label">{label}</div>
      <div className="cert-view__fact-value" style={valueColor ? { color: valueColor } : undefined}>
        {children}
      </div>
    </div>
  );
}

function OnRequestPanel({
  viewer,
  signInUrl,
  returnParam,
  requestMessage,
  setRequestMessage,
  submitting,
  error,
  onSubmit,
}: {
  viewer: ViewerInfo;
  signInUrl: string;
  returnParam: string;
  requestMessage: string;
  setRequestMessage: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const t = useT();
  const role = viewer.session?.role;
  const canRequest = !!viewer.session && (role === "agency" || role === "owner");
  const req = viewer.accessRequest;

  if (req?.status === "pending") {
    return (
      <div
        id="onrequest-section"
        className="card mt-6"
        style={{ border: "2px solid #FED7AA", background: "#FFF7ED" }}
      >
        <div className="flex gap-3 items-center">
          <div className="text-2xl">⏳</div>
          <div>
            <div className="font-bold mb-1">{t("Access request sent")}</div>
            <div className="text-sm text-gray-400">
              {t(
                "The tenant has been notified. You will have full access once they approve your request.",
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (req?.status === "denied") {
    return (
      <div
        className="card mt-6"
        style={{ border: "2px solid #FECACA", background: "#FEF2F2" }}
      >
        <div className="flex gap-3 items-center">
          <div className="text-2xl">✗</div>
          <div>
            <div className="font-bold mb-1" style={{ color: "var(--red)" }}>
              {t("Access denied")}
            </div>
            <div className="text-sm text-gray-400">
              {t("The tenant has declined your access request for this dossier.")}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (canRequest && !req) {
    return (
      <div
        className="card mt-6"
        style={{ border: "2px solid #FED7AA", background: "#FFF7ED" }}
      >
        <div className="flex gap-3 items-start">
          <div className="text-2xl">🔔</div>
          <div className="flex-1">
            <div className="font-bold mb-1">{t("Request full dossier access")}</div>
            <div className="text-sm text-gray-400 mb-3">
              {t(
                "The tenant will be notified and can approve or deny your request from their dashboard.",
              )}
            </div>
            <div className="form-group mb-3">
              <textarea
                rows={2}
                placeholder={t(
                  "Optional: briefly introduce yourself or mention the property",
                )}
                style={{ fontSize: ".875rem", resize: "vertical" }}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              />
            </div>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? t("Sending…") : t("Request access")}
            </button>
            {error && <div className="text-red text-xs mt-2">{error}</div>}
          </div>
        </div>
      </div>
    );
  }
  // Anon or wrong role
  return (
    <div
      className="card mt-6"
      style={{ border: "2px solid #FED7AA", background: "#FFF7ED" }}
    >
      <div className="flex gap-3 items-start">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <div className="font-bold mb-1">{t("On-Request certificate")}</div>
          <div className="text-sm text-gray-400 mb-4">
            {t(
              "The tenant controls who accesses this dossier. Sign in or create an account as a verified régie or private landlord to request full access.",
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={signInUrl} className="btn btn-primary btn-sm">
              {t("Sign in to request access")}
            </Link>
            <Link
              href={`/auth/owner-register?return=${returnParam}`}
              className="btn btn-outline btn-sm"
            >
              {t("Create owner account")}
            </Link>
            <Link
              href={`/auth/agency-register?return=${returnParam}`}
              className="btn btn-outline btn-sm"
            >
              {t("Create agency account")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

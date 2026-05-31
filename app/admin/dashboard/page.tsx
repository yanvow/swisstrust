"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Stats = {
  tenants: number;
  agencies: number;
  certificates: number;
  documents: number;
  pendingDocs: number;
  logsThisWeek: number;
};

type RecentTenant = {
  id: string;
  full_name: string | null;
  created_at: string;
  profile_complete: boolean | null;
};

type RecentCert = {
  id: string;
  cert_code: string;
  property_address: string | null;
  is_active: boolean | null;
  created_at: string;
  tenants?: { full_name: string | null } | null;
  agencies?: { company_name: string | null } | null;
};

type RecentLog = {
  id: string;
  viewer_type: string;
  accessed_at: string;
  certificates?: {
    cert_code: string;
    property_address: string | null;
    tenants?: { full_name: string | null } | null;
  } | null;
};

const VIEWER_ICON: Record<string, string> = {
  public: "👁",
  agency: "🏢",
  owner: "👤",
  tenant: "🪪",
};

export default function AdminDashboardPage() {
  const t = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [recentCerts, setRecentCerts] = useState<RecentCert[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [tenantUsage, setTenantUsage] = useState<{ name: string; used: number }[]>([]);
  const [agencyUsage, setAgencyUsage] = useState<{ name: string; used: number }[]>([]);
  const [usageTab, setUsageTab] = useState<"tenants" | "agencies">("tenants");

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [
        tenantsCount,
        agenciesCount,
        certsCount,
        docsCount,
        pendingCount,
        logsCount,
        recentT,
        recentC,
        recentL,
      ] = await Promise.all([
        sb.from("tenants").select("*", { count: "exact", head: true }),
        sb.from("agencies").select("*", { count: "exact", head: true }),
        sb.from("certificates").select("*", { count: "exact", head: true }).eq("is_active", true),
        sb.from("documents").select("*", { count: "exact", head: true }),
        sb.from("documents").select("*", { count: "exact", head: true }).in("status", ["pending", "flagged"]),
        sb.from("document_access_logs").select("*", { count: "exact", head: true }).gte("accessed_at", weekAgo),
        sb.from("tenants").select("id, full_name, created_at, profile_complete").order("created_at", { ascending: false }).limit(8),
        sb.from("certificates").select("id, cert_code, property_address, is_active, created_at, tenants(full_name), agencies(company_name)").order("created_at", { ascending: false }).limit(8),
        sb.from("document_access_logs").select("id, viewer_type, accessed_at, certificates(cert_code, property_address, tenants(full_name))").order("accessed_at", { ascending: false }).limit(10),
      ]);

      setStats({
        tenants: tenantsCount.count || 0,
        agencies: agenciesCount.count || 0,
        certificates: certsCount.count || 0,
        documents: docsCount.count || 0,
        pendingDocs: pendingCount.count || 0,
        logsThisWeek: logsCount.count || 0,
      });
      setRecentTenants((recentT.data as RecentTenant[]) || []);
      setRecentCerts((recentC.data as unknown as RecentCert[]) || []);
      setRecentLogs((recentL.data as unknown as RecentLog[]) || []);

      // Usage overview
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [tenantsRes, certsRes, agenciesRes, agentsRes] = await Promise.all([
        sb.from("tenants").select("id, full_name").order("full_name"),
        sb.from("certificates").select("tenant_id").gte("created_at", monthStart),
        sb.from("agencies").select("id, company_name").order("company_name"),
        sb.from("agency_agents").select("agency_id").eq("status", "active"),
      ]);
      const certsByTenant: Record<string, number> = {};
      (certsRes.data || []).forEach((c: { tenant_id: string }) => {
        certsByTenant[c.tenant_id] = (certsByTenant[c.tenant_id] || 0) + 1;
      });
      const agentsByAgency: Record<string, number> = {};
      (agentsRes.data || []).forEach((a: { agency_id: string }) => {
        agentsByAgency[a.agency_id] = (agentsByAgency[a.agency_id] || 0) + 1;
      });
      setTenantUsage(
        ((tenantsRes.data as { id: string; full_name: string | null }[]) || [])
          .map((x) => ({ name: x.full_name || "", used: certsByTenant[x.id] || 0 }))
          .sort((a, b) => b.used - a.used),
      );
      setAgencyUsage(
        ((agenciesRes.data as { id: string; company_name: string | null }[]) || [])
          .map((x) => ({ name: x.company_name || "", used: agentsByAgency[x.id] || 0 }))
          .sort((a, b) => b.used - a.used),
      );
    })();
  }, []);

  const monthLabel = new Date().toLocaleDateString("en-CH", { month: "long", year: "numeric" });

  return (
    <>
      <div className="page-title">{t("Admin Dashboard")}</div>
      <div className="page-subtitle">
        {stats ? `${t("Platform overview")} · ${stats.tenants} ${t("tenants")} · ${stats.certificates} ${t("active certificates")}` : t("Loading platform stats…")}
      </div>

      <div className="stat-grid mb-32">
        <StatBox value={stats?.tenants} label={t("Tenants")} />
        <StatBox value={stats?.agencies} label={t("Agencies")} />
        <StatBox value={stats?.certificates} label={t("Active certificates")} />
        <StatBox value={stats?.documents} label={t("Documents")} />
        <StatBox value={stats?.pendingDocs} label={t("Docs needing review")} color="var(--amber)" />
        <StatBox value={stats?.logsThisWeek} label={t("Scans this week")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          {stats && stats.pendingDocs > 0 && (
            <div className="card" style={{ border: "1.5px solid #FCD34D", background: "#FFFBEB", marginBottom: 16 }}>
              <div className="flex-between">
                <div>
                  <div className="font-bold mb-4">⚠️ {t("Documents need review")}</div>
                  <div className="text-sm text-gray">
                    {stats.pendingDocs} {t("document(s) pending or flagged — OCR review required.")}
                  </div>
                </div>
                <Link href="/admin/documents?filter=pending" className="btn btn-primary btn-sm">
                  {t("Review →")}
                </Link>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex-between mb-16">
              <div className="card-title">{t("Recent tenants")}</div>
              <Link href="/admin/tenants" className="text-xs text-gray" style={{ textDecoration: "underline" }}>
                {t("View all")}
              </Link>
            </div>
            {recentTenants.length === 0 ? (
              <div className="text-sm text-gray">{t("None yet.")}</div>
            ) : (
              recentTenants.map((tn) => (
                <ActivityRow key={tn.id} icon="👤">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{tn.full_name || t("Unnamed")}</div>
                    <div className="text-xs text-gray">
                      {new Date(tn.created_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <span className={`badge ${tn.profile_complete ? "badge-green" : "badge-amber"}`} style={{ fontSize: ".7rem" }}>
                    {tn.profile_complete ? t("Complete") : t("Incomplete")}
                  </span>
                </ActivityRow>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="card mb-16">
            <div className="flex-between mb-16">
              <div className="card-title">{t("Recent certificates")}</div>
              <Link href="/admin/certificates" className="text-xs text-gray" style={{ textDecoration: "underline" }}>
                {t("View all")}
              </Link>
            </div>
            {recentCerts.length === 0 ? (
              <div className="text-sm text-gray">{t("None yet.")}</div>
            ) : (
              recentCerts.map((c) => (
                <ActivityRow key={c.id} icon="🪪">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: ".8125rem" }}>{c.tenants?.full_name || "—"}</div>
                    <div className="text-xs text-gray">
                      {(c.property_address || "—") + " · " + (c.agencies?.company_name || c.cert_code)}
                    </div>
                  </div>
                  <span className={`badge ${c.is_active !== false ? "badge-green" : "badge-red"}`} style={{ fontSize: ".7rem" }}>
                    {c.is_active !== false ? t("✓ Valid") : t("✗ Not valid")}
                  </span>
                </ActivityRow>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-title mb-16">{t("Recent scans")}</div>
            {recentLogs.length === 0 ? (
              <div className="text-sm text-gray">{t("No scans yet.")}</div>
            ) : (
              recentLogs.map((l) => (
                <ActivityRow key={l.id} icon={VIEWER_ICON[l.viewer_type] || "👁"}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: ".8rem" }}>
                      {(l.certificates?.tenants?.full_name || "—") + " · "}
                      <span className="font-mono" style={{ fontSize: ".75rem" }}>{l.certificates?.cert_code || ""}</span>
                    </div>
                    <div className="text-xs text-gray">
                      {(l.certificates?.property_address || "") + " · " + l.viewer_type}
                    </div>
                  </div>
                  <span className="text-xs text-gray" style={{ whiteSpace: "nowrap" }}>
                    {new Date(l.accessed_at).toLocaleString("en-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </ActivityRow>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-4">
          <div className="card-title">{t("Member usage")}</div>
          <div className="text-xs text-gray">{monthLabel}</div>
        </div>
        <div className="card-subtitle" style={{ marginBottom: 16 }}>
          {t("Current-month allowance consumption per member. Bars turn amber at 80 % and red at 100 %.")}
        </div>
        <div style={{ display: "flex", borderBottom: "2px solid var(--gray-200)", marginBottom: 20 }}>
          {(["tenants", "agencies"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setUsageTab(tab)}
              style={{
                padding: "8px 18px",
                border: "none",
                background: "none",
                fontSize: ".825rem",
                fontWeight: 600,
                cursor: "pointer",
                borderBottom: `2px solid ${usageTab === tab ? "var(--charcoal)" : "transparent"}`,
                marginBottom: "-2px",
                color: usageTab === tab ? "var(--charcoal)" : "var(--gray-400)",
              }}
            >
              {tab === "tenants" ? t("Tenants — certificates") : t("Agencies — agent seats")}
            </button>
          ))}
        </div>
        {usageTab === "tenants"
          ? <UsageList rows={tenantUsage} limit={3} />
          : <UsageList rows={agencyUsage} limit={1} />}
      </div>
    </>
  );
}

function StatBox({ value, label, color }: { value: number | undefined; label: string; color?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-num" style={color ? { color } : undefined}>
        {value ?? "—"}
      </div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

function ActivityRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--gray-100)", fontSize: ".8125rem" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0, background: "var(--gray-100)" }}>{icon}</div>
      {children}
    </div>
  );
}

function UsageList({ rows, limit }: { rows: { name: string; used: number }[]; limit: number }) {
  const t = useT();
  if (rows.length === 0) return <div className="text-sm text-gray">{t("None yet.")}</div>;
  return (
    <div>
      {rows.map((r, i) => {
        const pct = Math.min(100, (r.used / limit) * 100);
        const cls = pct >= 100 ? "over" : pct >= 80 ? "warn" : "";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
            <div style={{ fontSize: ".8125rem", fontWeight: 600, width: 180, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>
              {r.name || <span className="text-gray">{t("Unnamed")}</span>}
            </div>
            <div style={{ flex: 1, background: "var(--gray-200)", borderRadius: 9999, height: 7, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 9999,
                  width: pct + "%",
                  transition: "width .4s ease",
                  background: cls === "over" ? "var(--red)" : cls === "warn" ? "var(--amber)" : "var(--charcoal)",
                }}
              />
            </div>
            <div style={{ fontSize: ".8rem", fontWeight: 600, width: 48, textAlign: "right", flexShrink: 0 }}>
              {r.used} / {limit}
            </div>
            <div style={{ fontSize: ".7rem", color: "var(--gray-400)", width: 52, flexShrink: 0 }}>{t("Free")} ({limit})</div>
          </div>
        );
      })}
    </div>
  );
}

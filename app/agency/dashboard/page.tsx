"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAgency } from "../_components/AgencyContext";
import { useT } from "@/lib/i18n";

type Tab = "team" | "certs" | "kpi";

type TenantSnippet = {
  full_name: string | null;
  monthly_gross_salary: number | null;
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
  rent_chf: number | null;
  total_chf: number | null;
  created_at: string;
  is_eligible: boolean;
  is_active: boolean;
  agency_id: string | null;
  unregistered_agency_name: string | null;
  tenants: TenantSnippet | null;
  _on_request?: boolean;
};

type Agent = {
  id: string;
  email: string;
  status: "active" | "pending" | "suspended" | string;
  first_name: string | null;
  last_name: string | null;
  invited_at: string;
  accepted_at: string | null;
  user_id: string | null;
};

export default function AgencyDashboardPage() {
  const t = useT();
  const { userId, agencyId, agencyName, isAdmin } = useAgency();
  const [tab, setTab] = useState<Tab>(isAdmin ? "team" : "certs");
  const [allCerts, setAllCerts] = useState<Cert[]>([]);
  const [ghosts, setGhosts] = useState<Cert[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ahaDismissed, setAhaDismissed] = useState(false);
  const [showAha, setShowAha] = useState(false);
  const [ahaMsg, setAhaMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    const sb = createClient();
    (async () => {
      const [directedRes, onRequestRes, ghostsRes] = await Promise.all([
        sb
          .from("certificates")
          .select(
            "*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets)",
          )
          .eq("agency_id", agencyId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        sb
          .from("access_requests")
          .select(
            "certificates(*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets))",
          )
          .eq("requester_user_id", userId)
          .eq("requester_type", "agency")
          .eq("status", "approved"),
        sb
          .from("certificates")
          .select(
            "*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets)",
          )
          .is("agency_id", null)
          .not("unregistered_agency_name", "is", null)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      const directed = (directedRes.data as Cert[]) || [];
      const onRequest = (
        ((onRequestRes.data as { certificates: Cert | null }[]) || [])
          .map((r) => r.certificates)
          .filter((c): c is Cert => !!c && c.is_active) as Cert[]
      ).map((c) => ({ ...c, _on_request: true }));
      setAllCerts([...directed, ...onRequest]);
      setGhosts((ghostsRes.data as Cert[]) || []);

      const ahaKey = `st_aha_seen_${agencyId}`;
      if (typeof window !== "undefined" && !localStorage.getItem(ahaKey) && directed.length > 0) {
        const n = directed.length;
        const eligible = directed.filter((c) => c.is_eligible).length;
        setAhaMsg(
          `${n} ${n !== 1 ? t("tenant dossiers are") : t("tenant dossier is")} ${t("already waiting for you")} — ${eligible} ${t("income-eligible.")} ${t("These applicants directed their verified Checks certificate to")} ${agencyName} ${t("before you signed up.")}`,
        );
        setShowAha(true);
      }

      if (isAdmin) {
        const { data: agentsData } = await sb
          .from("agency_agents")
          .select(
            "id, email, status, invited_at, accepted_at, first_name, last_name, user_id",
          )
          .eq("agency_id", agencyId)
          .neq("status", "removed")
          .order("invited_at", { ascending: false });
        setAgents((agentsData as Agent[]) || []);
      }
      setLoaded(true);
    })();
  }, [userId, agencyId, agencyName, isAdmin, t]);

  function dismissAha() {
    setShowAha(false);
    setAhaDismissed(true);
    if (agencyId) localStorage.setItem(`st_aha_seen_${agencyId}`, "1");
  }

  async function reloadAgents() {
    if (!agencyId) return;
    const sb = createClient();
    const { data } = await sb
      .from("agency_agents")
      .select("id, email, status, invited_at, accepted_at, first_name, last_name, user_id")
      .eq("agency_id", agencyId)
      .neq("status", "removed")
      .order("invited_at", { ascending: false });
    setAgents((data as Agent[]) || []);
  }

  async function claimGhost(certId: string) {
    if (!agencyId) return;
    const sb = createClient();
    const { error } = await sb
      .from("certificates")
      .update({ agency_id: agencyId })
      .eq("id", certId);
    if (error) {
      alert(t("Could not claim") + ": " + error.message);
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{t("Dashboard")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        {loaded
          ? `${agencyName} · ${isAdmin ? t("Admin") : t("Agent")}`
          : t("Loading…")}
      </p>

      {showAha && !ahaDismissed && (
        <div
          className="mb-6 rounded-[2px] px-8 py-7 relative text-white"
          style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)" }}
        >
          <button
            onClick={dismissAha}
            aria-label={t("Dismiss")}
            className="absolute top-3 right-4 bg-transparent border-none text-xl cursor-pointer leading-none"
            style={{ color: "rgba(255,255,255,.5)" }}
          >
            ×
          </button>
          <div className="text-2xl mb-2">👋 {t("Welcome to Checks")}</div>
          <div className="text-base opacity-90 mb-4 leading-relaxed">{ahaMsg}</div>
          <div className="text-xs opacity-60">
            {t(
              'Tenants directed their dossier to your agency before you even signed up. Click "View dossier" on any row to see their full verified documents.',
            )}
          </div>
        </div>
      )}

      <div className="flex border-b-2 border-gray-200 mb-7 -mb-[2px] overflow-x-auto">
        {isAdmin && (
          <TabBtn active={tab === "team"} onClick={() => setTab("team")}>
            {t("Team")}
          </TabBtn>
        )}
        <TabBtn active={tab === "certs"} onClick={() => setTab("certs")}>
          {t("Certificates")}
        </TabBtn>
        {isAdmin && (
          <TabBtn active={tab === "kpi"} onClick={() => setTab("kpi")}>
            {t("KPIs")}
          </TabBtn>
        )}
      </div>

      {tab === "team" && isAdmin && (
        <TeamTab
          agencyId={agencyId}
          agents={agents}
          reloadAgents={reloadAgents}
        />
      )}
      {tab === "certs" && (
        <CertsTab
          certs={allCerts}
          ghosts={ghosts}
          isAdmin={isAdmin}
          onClaim={claimGhost}
        />
      )}
      {tab === "kpi" && isAdmin && <KpiTab certs={allCerts} agents={agents} />}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-5 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors whitespace-nowrap flex-shrink-0",
        active
          ? "text-charcoal border-charcoal"
          : "text-gray-400 border-transparent hover:text-charcoal",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ── Team tab ─────────────────────────────────────────────────

function TeamTab({
  agencyId,
  agents,
  reloadAgents,
}: {
  agencyId: string;
  agents: Agent[];
  reloadAgents: () => Promise<void>;
}) {
  const t = useT();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [kpiAgent, setKpiAgent] = useState<Agent | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr(null);
    setInviteOk(false);
    setInviteLoading(true);
    const sb = createClient();
    const { error } = await sb.functions.invoke("invite-agent", {
      body: { agencyId, email: inviteEmail.trim().toLowerCase() },
    });
    setInviteLoading(false);
    if (error) {
      setInviteErr(error.message || t("Could not send invite."));
      return;
    }
    setInviteEmail("");
    setInviteOk(true);
    setTimeout(() => setInviteOk(false), 4000);
    await reloadAgents();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName, email, password } = createForm;
    if (password.length < 8) {
      setCreateErr(t("Password must be at least 8 characters."));
      return;
    }
    setCreateErr(null);
    setCreateOk(false);
    setCreateLoading(true);
    const sb = createClient();
    const { error } = await sb.functions.invoke("invite-agent", {
      body: {
        agencyId,
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        mode: "create",
      },
    });
    setCreateLoading(false);
    if (error) {
      setCreateErr(error.message || t("Could not create agent."));
      return;
    }
    setCreateForm({ firstName: "", lastName: "", email: "", password: "" });
    setCreateOk(true);
    setTimeout(() => setCreateOk(false), 4000);
    await reloadAgents();
  }

  async function toggleSuspend(agent: Agent) {
    const next = agent.status === "suspended" ? "active" : "suspended";
    const sb = createClient();
    const { error } = await sb
      .from("agency_agents")
      .update({ status: next })
      .eq("id", agent.id);
    if (error) {
      alert(t("Could not update agent") + ": " + error.message);
      return;
    }
    await reloadAgents();
  }

  async function deleteAgent(agent: Agent) {
    if (!confirm(t("Delete this agent? They will lose access immediately."))) return;
    const sb = createClient();
    const { error } = await sb.from("agency_agents").delete().eq("id", agent.id);
    if (error) {
      alert(t("Could not delete agent") + ": " + error.message);
      return;
    }
    await reloadAgents();
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="card-title mb-1">{t("Invite by email")}</div>
          <div className="card-subtitle mb-4">
            {t("Sends an invite email — the agent sets their own password.")}
          </div>
          <form onSubmit={handleInvite}>
            <div className="form-group mb-3">
              <label htmlFor="invite-email">{t("Agent email")}</label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="agent@agency.ch"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={inviteLoading} className="btn btn-primary w-full">
              {inviteLoading ? t("Sending…") : t("Send invite")}
            </button>
          </form>
          {inviteErr && <div className="text-red text-sm mt-2.5">{inviteErr}</div>}
          {inviteOk && (
            <div className="text-green text-sm mt-2.5 font-medium">✓ {t("Invite sent")}</div>
          )}
        </div>

        <div className="card">
          <div className="card-title mb-1">{t("Create agent")}</div>
          <div className="card-subtitle mb-4">
            {t(
              "Creates the account immediately. The agent will be prompted to change their password on first login.",
            )}
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div className="form-group mb-0">
                <label>{t("First name")}</label>
                <input
                  type="text"
                  required
                  placeholder="Jean"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                />
              </div>
              <div className="form-group mb-0">
                <label>{t("Last name")}</label>
                <input
                  type="text"
                  required
                  placeholder="Dupont"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group mb-2.5">
              <label>{t("Email")}</label>
              <input
                type="email"
                required
                placeholder="jean.dupont@agency.ch"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="form-group mb-3">
              <label>{t("Temporary password")}</label>
              <input
                type="password"
                required
                placeholder={t("Min. 8 characters")}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={createLoading} className="btn btn-primary w-full">
              {createLoading ? t("Creating…") : t("Create agent")}
            </button>
          </form>
          {createErr && <div className="text-red text-sm mt-2.5">{createErr}</div>}
          {createOk && (
            <div className="text-green text-sm mt-2.5 font-medium">✓ {t("Agent created")}</div>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Name")}</th>
              <th>{t("Email")}</th>
              <th>{t("Status")}</th>
              <th>{t("Joined")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-gray text-sm"
                  style={{ padding: 24, textAlign: "center" }}
                >
                  {t("No agents yet. Invite your first team member above.")}
                </td>
              </tr>
            ) : (
              agents.map((a) => {
                const name =
                  [a.first_name, a.last_name].filter(Boolean).join(" ") || "—";
                const joined = a.accepted_at
                  ? new Date(a.accepted_at).toLocaleDateString("en-CH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const badge =
                  a.status === "active"
                    ? "badge-green"
                    : a.status === "suspended"
                      ? "badge-amber"
                      : "badge-gray";
                const isSuspended = a.status === "suspended";
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="font-bold">{name}</div>
                    </td>
                    <td className="text-sm">{a.email}</td>
                    <td>
                      <span className={`badge ${badge}`}>
                        {a.status === "active"
                          ? t("Active")
                          : a.status === "suspended"
                            ? t("Suspended")
                            : t("Pending")}
                      </span>
                    </td>
                    <td className="text-sm text-gray">{joined}</td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          className="btn btn-outline btn-sm"
                          style={
                            !isSuspended
                              ? { color: "var(--amber)", borderColor: "var(--amber)" }
                              : undefined
                          }
                          onClick={() => toggleSuspend(a)}
                        >
                          {isSuspended ? t("Reactivate") : t("Suspend")}
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--red)", borderColor: "var(--red)" }}
                          onClick={() => deleteAgent(a)}
                        >
                          {t("Delete")}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setKpiAgent(a)}>
                          KPI
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {kpiAgent && <AgentKpiModal agent={kpiAgent} onClose={() => setKpiAgent(null)} />}
    </>
  );
}

function AgentKpiModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const t = useT();
  const [stats, setStats] = useState<{
    totalViews: number;
    lastActive: string | null;
    recent: { accessed_at: string; address: string | null }[];
  } | null>(null);

  useEffect(() => {
    if (!agent.user_id) {
      setStats({ totalViews: 0, lastActive: null, recent: [] });
      return;
    }
    const sb = createClient();
    (async () => {
      const [{ count }, { data: logs }] = await Promise.all([
        sb
          .from("document_access_logs")
          .select("id", { count: "exact", head: true })
          .eq("viewer_user_id", agent.user_id),
        sb
          .from("document_access_logs")
          .select("accessed_at, certificates(property_address)")
          .eq("viewer_user_id", agent.user_id)
          .order("accessed_at", { ascending: false })
          .limit(5),
      ]);
      const recent = ((logs as { accessed_at: string; certificates: { property_address: string | null } | null }[]) || []).map(
        (l) => ({
          accessed_at: l.accessed_at,
          address: l.certificates?.property_address || null,
        }),
      );
      setStats({
        totalViews: count || 0,
        lastActive: recent[0]?.accessed_at || null,
        recent,
      });
    })();
  }, [agent.user_id]);

  const name =
    [agent.first_name, agent.last_name].filter(Boolean).join(" ") || agent.email;

  return (
    <div className="fixed inset-0 bg-charcoal/45 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2px] w-full max-w-[520px] p-8 shadow-lg overflow-y-auto"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-lg">{name}</div>
        <div className="text-sm text-gray-400 mb-6">{agent.email}</div>
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-gray-100 rounded p-4">
            <div className="text-2xl font-bold">{stats ? stats.totalViews : "…"}</div>
            <div className="text-xs text-gray-400 mt-0.5">{t("Dossiers viewed")}</div>
          </div>
          <div className="flex-1 bg-gray-100 rounded p-4">
            <div className="text-base font-bold">
              {!stats
                ? "…"
                : !agent.user_id
                  ? t("Never logged in")
                  : stats.lastActive
                    ? new Date(stats.lastActive).toLocaleDateString("en-CH", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : t("No activity")}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{t("Last active")}</div>
          </div>
        </div>
        {stats && stats.recent.length > 0 && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-2">{t("Recent activity")}</div>
            {stats.recent.map((r, i) => (
              <div
                key={i}
                className="flex justify-between text-[0.8125rem] py-2 border-b border-gray-100"
              >
                <span>{r.address || t("Unknown address")}</span>
                <span className="text-gray-400">
                  {new Date(r.accessed_at).toLocaleDateString("en-CH", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-outline w-full" onClick={onClose}>
          {t("Close")}
        </button>
      </div>
    </div>
  );
}

// ── Certs tab ────────────────────────────────────────────────

function CertsTab({
  certs,
  ghosts,
  isAdmin,
  onClaim,
}: {
  certs: Cert[];
  ghosts: Cert[];
  isAdmin: boolean;
  onClaim: (certId: string) => Promise<void>;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [minSalary, setMinSalary] = useState<number>(0);
  const [occ, setOcc] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [groupMode, setGroupMode] = useState<"address" | "flat">("address");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const arr = certs.filter((c) => {
      const t = c.tenants || ({} as TenantSnippet);
      const hay = `${t.full_name || ""} ${c.property_address || ""} ${c.property_city || ""}`.toLowerCase();
      if (search && !hay.includes(search.toLowerCase())) return false;
      if (minSalary && (t.monthly_gross_salary || 0) < minSalary) return false;
      if (eligibleOnly && !c.is_eligible) return false;
      if (occ === "1" && (t.occupant_count || 1) !== 1) return false;
      if (occ === "2" && (t.occupant_count || 1) !== 2) return false;
      if (occ === "3" && (t.occupant_count || 1) < 3) return false;
      return true;
    });
    arr.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === "oldest" ? ta - tb : tb - ta;
    });
    return arr;
  }, [certs, search, minSalary, occ, eligibleOnly, sort]);

  const total = certs.length;
  const eligibleCount = certs.filter((c) => c.is_eligible).length;

  function toggleGroup(key: string) {
    setExpandedGroups((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {isAdmin && (
        <div className="stat-grid mb-6">
          <div className="stat-box">
            <div className="stat-num">{total}</div>
            <div className="stat-lbl">{t("Total certificates")}</div>
          </div>
          <div className="stat-box">
            <div className="stat-num" style={{ color: "var(--green)" }}>
              {eligibleCount}
            </div>
            <div className="stat-lbl">{t("Income eligible")}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center mb-5">
        <input
          type="text"
          placeholder={t("Search tenant or address…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-2 flex-1"
          style={{ width: "auto", minWidth: 180, maxWidth: 300 }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-sm px-3 py-2"
          style={{ width: "auto" }}
        >
          <option value="newest">{t("Newest first")}</option>
          <option value="oldest">{t("Oldest first")}</option>
        </select>
        <select
          value={minSalary}
          onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
          className="text-sm px-3 py-2"
          style={{ width: "auto" }}
        >
          <option value={0}>{t("Any salary")}</option>
          <option value={3000}>CHF 3,000+/mo</option>
          <option value={5000}>CHF 5,000+/mo</option>
          <option value={8000}>CHF 8,000+/mo</option>
          <option value={10000}>CHF 10,000+/mo</option>
        </select>
        <select
          value={occ}
          onChange={(e) => setOcc(e.target.value)}
          className="text-sm px-3 py-2"
          style={{ width: "auto" }}
        >
          <option value="">{t("Any occupants")}</option>
          <option value="1">1 {t("occupant")}</option>
          <option value="2">2 {t("occupants")}</option>
          <option value="3">3+ {t("occupants")}</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={eligibleOnly}
            onChange={(e) => setEligibleOnly(e.target.checked)}
          />
          {t("Eligible only")}
        </label>
        <select
          value={groupMode}
          onChange={(e) => setGroupMode(e.target.value as typeof groupMode)}
          className="text-sm px-3 py-2"
          style={{ width: "auto" }}
        >
          <option value="address">{t("Group by address")}</option>
          <option value="flat">{t("All certificates")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center text-gray-400" style={{ padding: 32 }}>
          {t("No certificates match your filters.")}
        </div>
      ) : groupMode === "flat" ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Tenant")}</th>
                <th>{t("Eligibility")}</th>
                <th>{t("Cert. date")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CertRow key={c.id} cert={c} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        groupCerts(filtered).map((g) => {
          const key = g.address;
          const open = expandedGroups.has(key);
          return (
            <div key={key} className="addr-group">
              <div
                className="flex items-center justify-between px-4 py-3.5 bg-gray-100 cursor-pointer gap-3 select-none hover:bg-gray-200"
                onClick={() => toggleGroup(key)}
              >
                <div>
                  <div className="font-semibold text-[0.9375rem]">
                    {g.address}
                    {g.city ? `, ${g.city}` : ""}
                  </div>
                  <div className="text-[0.8125rem] text-gray-400 mt-0.5">
                    {g.certs.length} {t("certificate(s)")} · {g.eligibleCount}{" "}
                    {t("eligible")}
                  </div>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">
                  {open ? "▲" : "▼"}
                </span>
              </div>
              {open && (
                <table>
                  <thead>
                    <tr>
                      <th>{t("Tenant")}</th>
                      <th>{t("Eligibility")}</th>
                      <th>{t("Cert. date")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.certs.map((c) => (
                      <CertRow key={c.id} cert={c} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      {ghosts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="text-lg font-bold">{t("Pending deliveries")}</div>
            <span className="badge badge-amber" style={{ fontSize: ".7rem" }}>
              {ghosts.length} {t("unclaimed")}
            </span>
          </div>
          <div className="text-sm text-gray-400 mb-4">
            {t(
              "These tenants directed their certificate to your agency before you joined Checks. Claim them to add them to your inbox.",
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Tenant")}</th>
                  <th>{t("Property applied for")}</th>
                  <th>{t("Cert. date")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ghosts.map((c) => (
                  <GhostRow key={c.id} cert={c} onClaim={onClaim} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        className="card card--flat mt-6"
        style={{ background: "var(--gray-100)", border: "none", padding: "14px 16px" }}
      >
        <div className="text-sm text-gray-400">
          💡 <strong>{t("Tip")}:</strong>{" "}
          {t(
            'Click "View dossier" to see the full verified documents for each applicant. All accesses are logged.',
          )}
        </div>
      </div>
    </>
  );
}

function groupCerts(certs: Cert[]) {
  const map = new Map<
    string,
    { address: string; city: string; certs: Cert[]; eligibleCount: number }
  >();
  for (const c of certs) {
    const key = (c.property_address || "").trim().toLowerCase() || "__unknown__";
    if (!map.has(key)) {
      map.set(key, {
        address: c.property_address || "Unknown address",
        city: c.property_city || "",
        certs: [],
        eligibleCount: 0,
      });
    }
    const g = map.get(key)!;
    g.certs.push(c);
    if (c.is_eligible) g.eligibleCount++;
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.certs[0].created_at).getTime() - new Date(a.certs[0].created_at).getTime(),
  );
}

function CertRow({ cert: c }: { cert: Cert }) {
  const t = useT();
  const tn = c.tenants || ({} as TenantSnippet);
  const date = new Date(c.created_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const salary = tn.monthly_gross_salary
    ? `CHF ${Number(tn.monthly_gross_salary).toLocaleString()}/mo`
    : "—";
  return (
    <tr>
      <td>
        <div className="font-bold">
          {tn.full_name || "—"}
          {c._on_request && (
            <span
              className="badge badge-gray ml-1.5 align-middle"
              style={{ fontSize: ".65rem" }}
            >
              {t("On Request")}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {tn.occupant_count || 1} {t("occ.")} · {salary} ·{" "}
          {tn.is_smoker ? t("Smoker") : t("Non-smoker")} ·{" "}
          {tn.has_pets ? t("Pets") : t("No pets")}
        </div>
      </td>
      <td>
        {c.is_eligible ? (
          <span className="badge badge-green">✓ {t("Eligible")}</span>
        ) : (
          <span className="badge badge-amber">{t("Review")}</span>
        )}
      </td>
      <td className="text-sm text-gray">{date}</td>
      <td>
        <Link
          href={`/agency/dossier?code=${encodeURIComponent(c.cert_code)}`}
          className="btn btn-primary btn-sm"
        >
          {t("View dossier")}
        </Link>
      </td>
    </tr>
  );
}

function GhostRow({
  cert: c,
  onClaim,
}: {
  cert: Cert;
  onClaim: (certId: string) => Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const tn = c.tenants || ({} as TenantSnippet);
  const date = new Date(c.created_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <tr>
      <td>
        <div className="font-bold">{tn.full_name || "—"}</div>
        <div className="text-xs text-gray-400">
          {tn.occupant_count || 1} {t("occupant(s)")} ·{" "}
          {tn.is_smoker ? t("Smoker") : t("No smoker")} ·{" "}
          {tn.has_pets ? t("Pets") : t("No pets")}
        </div>
      </td>
      <td>
        <div className="text-sm font-bold">
          {c.property_address || "—"}
          {c.property_city ? `, ${c.property_city}` : ""}
        </div>
        <div className="text-xs text-gray-400">
          {c.rooms ? `${c.rooms} ${t("rooms")}` : ""} · CHF{" "}
          {(c.total_chf || c.rent_chf || 0).toLocaleString()}/mo
        </div>
      </td>
      <td className="text-sm text-gray">{date}</td>
      <td>
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onClaim(c.id);
          }}
        >
          {busy ? t("Claiming…") : `${t("Claim")} →`}
        </button>
      </td>
    </tr>
  );
}

// ── KPI tab ──────────────────────────────────────────────────

function KpiTab({ certs, agents }: { certs: Cert[]; agents: Agent[] }) {
  const t = useT();
  const total = certs.length;
  const eligible = certs.filter((c) => c.is_eligible).length;
  const pct = total ? Math.round((100 * eligible) / total) : 0;
  const salaries = certs.map((c) => c.tenants?.monthly_gross_salary).filter(Boolean) as number[];
  const avgSalary = salaries.length
    ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length)
    : null;
  const addresses = new Set(
    certs.map((c) => (c.property_address || "").trim().toLowerCase()).filter(Boolean),
  );

  const salaryBuckets = [
    { label: "< 3k", fn: (s: number) => s < 3000 },
    { label: "3–5k", fn: (s: number) => s >= 3000 && s < 5000 },
    { label: "5–8k", fn: (s: number) => s >= 5000 && s < 8000 },
    { label: "8–10k", fn: (s: number) => s >= 8000 && s < 10000 },
    { label: "10k+", fn: (s: number) => s >= 10000 },
  ];
  const salaryCounts = salaryBuckets.map(
    (b) => certs.filter((c) => b.fn(c.tenants?.monthly_gross_salary || 0)).length,
  );
  const maxS = Math.max(1, ...salaryCounts);

  const occBuckets = [
    { label: `1 ${t("occ.")}`, fn: (n: number) => n === 1 },
    { label: `2 ${t("occ.")}`, fn: (n: number) => n === 2 },
    { label: `3 ${t("occ.")}`, fn: (n: number) => n === 3 },
    { label: `4+ ${t("occ.")}`, fn: (n: number) => n >= 4 },
  ];
  const occCounts = occBuckets.map(
    (b) => certs.filter((c) => b.fn(c.tenants?.occupant_count || 1)).length,
  );
  const maxO = Math.max(1, ...occCounts);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat num={total} lbl={t("Total certificates")} />
        <Stat
          num={`${eligible} (${pct}%)`}
          lbl={t("Income eligible")}
          color="var(--green)"
        />
        <Stat
          num={avgSalary ? `CHF ${Number(avgSalary).toLocaleString()}` : "—"}
          lbl={t("Avg monthly salary")}
        />
        <Stat num={addresses.size} lbl={t("Unique addresses")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="card-title mb-4">{t("Salary distribution")}</div>
          {salaryBuckets.map((b, i) => (
            <DistBar key={b.label} label={b.label} count={salaryCounts[i]} max={maxS} />
          ))}
        </div>
        <div className="card">
          <div className="card-title mb-4">{t("Occupants")}</div>
          {occBuckets.map((b, i) => (
            <DistBar key={b.label} label={b.label} count={occCounts[i]} max={maxO} />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-4">{t("Team activity")}</div>
        <div className="table-wrap" style={{ margin: 0 }}>
          <table>
            <thead>
              <tr>
                <th>{t("Agent")}</th>
                <th>{t("Status")}</th>
                <th>{t("Joined")}</th>
                <th>{t("Dossiers viewed")}</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-gray text-sm"
                    style={{ padding: 20, textAlign: "center" }}
                  >
                    {t("No agents yet.")}
                  </td>
                </tr>
              ) : (
                agents.map((a) => <AgentActivityRow key={a.id} agent={a} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ num, lbl, color }: { num: number | string; lbl: string; color?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-num" style={color ? { color } : undefined}>
        {num}
      </div>
      <div className="stat-lbl">{lbl}</div>
    </div>
  );
}

function DistBar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <div className="text-[0.8125rem] w-20 flex-shrink-0 text-gray-500">{label}</div>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-charcoal transition-all"
          style={{ width: `${Math.round((100 * count) / max)}%` }}
        />
      </div>
      <div className="text-[0.8125rem] font-semibold w-6 text-right flex-shrink-0">{count}</div>
    </div>
  );
}

function AgentActivityRow({ agent: a }: { agent: Agent }) {
  const t = useT();
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (!a.user_id) {
      setViews(0);
      return;
    }
    const sb = createClient();
    sb.from("document_access_logs")
      .select("id", { count: "exact", head: true })
      .eq("viewer_user_id", a.user_id)
      .then(({ count }) => setViews(count || 0));
  }, [a.user_id]);

  const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
  const joined = a.accepted_at
    ? new Date(a.accepted_at).toLocaleDateString("en-CH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const badge =
    a.status === "active"
      ? "badge-green"
      : a.status === "suspended"
        ? "badge-amber"
        : "badge-gray";
  const label =
    a.status === "active"
      ? t("Active")
      : a.status === "suspended"
        ? t("Suspended")
        : t("Pending");
  return (
    <tr>
      <td>
        <div className="font-bold">{name}</div>
        <div className="text-xs text-gray-400">{a.email}</div>
      </td>
      <td>
        <span className={`badge ${badge}`}>{label}</span>
      </td>
      <td className="text-sm text-gray">{joined}</td>
      <td className="text-sm font-bold">{views ?? "…"}</td>
    </tr>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useAgency } from "../_components/AgencyContext";
import { useT } from "@/lib/i18n";

type AgencyRow = {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  is_verified: boolean;
};

type Agent = {
  id: string;
  email: string;
  status: "active" | "pending" | "suspended" | string;
  invited_at: string;
  accepted_at: string | null;
};

export default function AgencyProfilePage() {
  const t = useT();
  const { userId, isAdmin } = useAgency();

  const [agency, setAgency] = useState<AgencyRow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      window.location.href = "/agency/dashboard";
      return;
    }
    const sb = createClient();
    (async () => {
      const { data, error } = await sb
        .from("agencies")
        .select("*")
        .eq("user_id", userId)
        .single<AgencyRow>();
      if (error || !data) {
        setSaveErr(
          t("Could not load agency profile") + ": " + (error?.message || "not found"),
        );
        return;
      }
      setAgency(data);
      await reloadAgents(data.id);
    })();
  }, [userId, isAdmin, t]);

  async function reloadAgents(agencyId: string) {
    const sb = createClient();
    const { data } = await sb
      .from("agency_agents")
      .select("id, email, status, invited_at, accepted_at")
      .eq("agency_id", agencyId)
      .neq("status", "removed")
      .order("invited_at", { ascending: false });
    setAgents((data as Agent[]) || []);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setInviteErr(null);
    setInviteSent(false);
    setInviteLoading(true);
    const sb = createClient();
    const { error } = await sb.functions.invoke("invite-agent", {
      body: { agencyId: agency.id, email: inviteEmail.trim().toLowerCase() },
    });
    setInviteLoading(false);
    if (error) {
      setInviteErr(error.message || t("Could not send invite."));
      return;
    }
    setInviteEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 4000);
    await reloadAgents(agency.id);
  }

  async function removeAgent(agentId: string) {
    const sb = createClient();
    const { error } = await sb
      .from("agency_agents")
      .update({ status: "removed" })
      .eq("id", agentId);
    if (error) {
      alert(t("Could not remove agent") + ": " + error.message);
      return;
    }
    if (agency) await reloadAgents(agency.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setSaveErr(null);
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("agencies")
      .update({
        company_name: agency.company_name.trim(),
        address: agency.address.trim(),
        contact_email: agency.contact_email.trim(),
      })
      .eq("id", agency.id);
    setSaving(false);
    if (error) {
      setSaveErr(t("Could not save") + ": " + error.message);
      return;
    }
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 3000);
  }

  if (!agency) {
    return (
      <div className="text-gray-400 text-sm">
        {saveErr ? <span className="text-red">{saveErr}</span> : t("Loading…")}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("Agency profile")}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {t("Your agency details shown to tenants and on certificates.")}
          </p>
        </div>
      </div>

      {/* Team section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-lg font-bold">{t("Team")}</div>
            <div className="text-sm text-gray-400">
              {t("Agents can view the certificate inbox but cannot edit the agency profile or see KPIs.")}
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <form onSubmit={invite} className="flex gap-3 items-end flex-wrap">
            <div className="form-group mb-0 flex-1" style={{ minWidth: 200 }}>
              <label htmlFor="invite-email">{t("Invite agent by email")}</label>
              <input
                id="invite-email"
                type="email"
                required
                placeholder="agent@agency.ch"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={inviteLoading}
              className="btn btn-primary whitespace-nowrap"
            >
              {inviteLoading ? t("Sending…") : t("Send invite")}
            </button>
          </form>
          {inviteErr && <div className="text-red text-sm mt-2.5">{inviteErr}</div>}
          {inviteSent && (
            <div className="text-green text-sm mt-2.5 font-medium">✓ {t("Invite sent")}</div>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Email")}</th>
                <th>{t("Status")}</th>
                <th>{t("Invited")}</th>
                <th>{t("Joined")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-gray text-sm" style={{ padding: 20, textAlign: "center" }}>
                    {t("No agents yet. Invite your first team member above.")}
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr key={a.id}>
                    <td className="text-sm">{a.email}</td>
                    <td>
                      <span
                        className={`badge ${a.status === "active" ? "badge-green" : "badge-amber"}`}
                      >
                        {a.status === "active" ? t("Active") : t("Pending")}
                      </span>
                    </td>
                    <td className="text-sm text-gray">
                      {new Date(a.invited_at).toLocaleDateString("en-CH", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="text-sm text-gray">
                      {a.accepted_at
                        ? new Date(a.accepted_at).toLocaleDateString("en-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: "var(--red)", borderColor: "var(--red)" }}
                        onClick={() => removeAgent(a.id)}
                      >
                        {t("Remove")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agency profile form */}
      <div className="card">
        <form onSubmit={save}>
          <div className="form-group">
            <label htmlFor="company_name">
              {t("Company name")} <span className="req">*</span>
            </label>
            <input
              id="company_name"
              type="text"
              required
              placeholder="Moser Vernet & Cie"
              value={agency.company_name || ""}
              onChange={(e) => setAgency({ ...agency, company_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="address">
              {t("Office address")} <span className="req">*</span>
            </label>
            <input
              id="address"
              type="text"
              required
              placeholder="Rue du Rhône 50, 1204 Genève"
              value={agency.address || ""}
              onChange={(e) => setAgency({ ...agency, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="contact_email">
              {t("Contact email")} <span className="req">*</span>
            </label>
            <input
              id="contact_email"
              type="email"
              required
              placeholder="contact@agency.ch"
              value={agency.contact_email || ""}
              onChange={(e) => setAgency({ ...agency, contact_email: e.target.value })}
            />
          </div>

          <div className="divider"></div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-gray-400">{t("Verification status")}</div>
              <div className="mt-1">
                {agency.is_verified ? (
                  <span className="badge badge-green">{t("Verified agency")}</span>
                ) : (
                  <>
                    <span className="badge badge-amber">{t("Pending verification")}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {t("Checks will verify your agency within 1–2 business days.")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {savedAt && <span className="text-green text-sm font-medium">✓ {t("Saved")}</span>}
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? t("Saving…") : t("Save changes")}
              </button>
            </div>
          </div>
          {saveErr && <div className="text-red text-sm mt-3">{saveErr}</div>}
        </form>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOwner } from "../_components/OwnerContext";
import { useT } from "@/lib/i18n";

type HistoryItem = {
  certCode: string;
  tenantName?: string;
  property?: string;
  mode?: "directed" | "on_request" | string;
  access?: "full" | "request" | "preview" | string;
  viewedAt: string;
};

function historyKey(userId: string) {
  return `checks:ownerRecent:${userId}`;
}

export default function OwnerDashboardPage() {
  const t = useT();
  const { userId, displayName } = useOwner();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [code, setCode] = useState("");

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(historyKey(userId)) || "[]");
      setHistory(Array.isArray(list) ? list : []);
    } catch {
      setHistory([]);
    }
  }, [userId]);

  function formatCode(raw: string) {
    let v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length > 3) v = v.slice(0, 3) + "-" + v.slice(3);
    if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8);
    return v.slice(0, 12);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const upper = code.trim().toUpperCase();
    if (upper.length !== 12) {
      alert(t("Please enter the full 12-character code (STD-XXXX-XXXX)."));
      return;
    }
    window.location.href = `/cert/cert-view?code=${encodeURIComponent(upper)}`;
  }

  const lookups = history.length;
  const fullCount = history.filter((h) => h.access === "full").length;
  const limitedCount = history.filter((h) => h.access !== "full").length;
  const lastDate = history[0]
    ? new Date(history[0].viewedAt).toLocaleDateString("en-CH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : t("No activity");

  return (
    <>
      <h1 className="text-2xl font-bold">{t("Owner dashboard")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        {t("Welcome back, {name}. Verify codes, open dossiers, and review your recent checks.").replace(
          "{name}",
          displayName,
        )}
      </p>

      <div className="alert alert-info">
        <div>🏠</div>
        <div>
          <strong>{t("Simple landlord workflow.")}</strong>{" "}
          {t(
            "Enter a certificate code or scan a Checks QR code to open the tenant dossier.",
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-num">{lookups}</div>
          <div className="stat-lbl">{t("Recent lookups")}</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: "var(--green)" }}>
            {fullCount}
          </div>
          <div className="stat-lbl">{t("Full dossiers unlocked")}</div>
        </div>
        <div className="stat-box">
          <div className="stat-num" style={{ color: "var(--amber)" }}>
            {limitedCount}
          </div>
          <div className="stat-lbl">{t("Limited or pending access")}</div>
        </div>
        <div className="stat-box">
          <div className="stat-num text-sm">{lastDate}</div>
          <div className="stat-lbl">{t("Last activity")}</div>
        </div>
      </div>

      <div className="card mb-6" id="verify-card">
        <div className="card-header">
          <div className="card-title">{t("Verify a tenant certificate")}</div>
          <div className="card-subtitle">
            {t(
              "Checks private owners use certificate codes and QR links rather than an agency inbox.",
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ alignItems: "end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="cert_code">{t("Certificate code")}</label>
              <input
                id="cert_code"
                type="text"
                className="code-input"
                placeholder="STD-XXXX-XXXX"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                required
              />
              <div className="form-hint">{t("Format: STD-XXXX-XXXX")}</div>
            </div>
            <button type="submit" className="btn btn-primary">
              {t("Open certificate")}
            </button>
          </div>
        </form>

        <div
          className="card mt-6 card--flat"
          style={{ background: "var(--gray-100)", border: "none", padding: "14px 16px" }}
        >
          <div className="text-sm text-gray-400">
            {t(
              "Tip: if a tenant shares a QR code, opening it directly lands on the same certificate view and your dashboard keeps a local history of what you checked.",
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("Access modes")}</div>
            <div className="card-subtitle">
              {t("The dashboard is designed around Checks's certificate model.")}
            </div>
          </div>
          <div className="doc-row doc-row--pending">
            <div className="doc-row__icon">🔔</div>
            <div className="doc-row__info">
              <div className="doc-row__name">{t("On-Request certificate")}</div>
              <div className="doc-row__desc">
                {t(
                  "You can view the public summary and request full access. The tenant approves or denies your request.",
                )}
              </div>
            </div>
            <span className="badge badge-amber">{t("Approval needed")}</span>
          </div>
          <div className="doc-row doc-row--pending" style={{ marginBottom: 0 }}>
            <div className="doc-row__icon">🎯</div>
            <div className="doc-row__info">
              <div className="doc-row__name">{t("Directed certificate")}</div>
              <div className="doc-row__desc">
                {t(
                  "If the tenant directed it to a régie account, private owners only see the public summary.",
                )}
              </div>
            </div>
            <span className="badge badge-gray">{t("Limited view")}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{t("How owners use Checks")}</div>
            <div className="card-subtitle">
              {t("Keep the owner experience simple and verification-first.")}
            </div>
          </div>
          <div className="steps">
            <Step num={1} title={t("Receive certificate")} desc={t("Ask the tenant for a QR code or certificate code.")} />
            <Step num={2} title={t("Open dossier")} desc={t("Verify the code and review the public or full view.")} />
            <Step
              num={3}
              title={t("Decide faster")}
              desc={t(
                "Use the certificate status, eligibility and documents to shortlist tenants.",
              )}
            />
          </div>
        </div>
      </div>

      <div className="card" id="recent-section">
        <div className="card-header">
          <div className="card-title">{t("Recent certificates viewed")}</div>
          <div className="card-subtitle">
            {t("Stored locally in this browser for the signed-in owner account.")}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Certificate")}</th>
                <th>{t("Tenant")}</th>
                <th>{t("Property")}</th>
                <th>{t("Outcome")}</th>
                <th>{t("Viewed")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-gray text-sm"
                    style={{ padding: 24, textAlign: "center" }}
                  >
                    {t("No certificates viewed yet.")}
                  </td>
                </tr>
              ) : (
                history.map((item, i) => <HistoryRow key={i} item={item} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="step">
      <div className="step__num">{num}</div>
      <div className="step__title">{title}</div>
      <div className="step__desc">{desc}</div>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const t = useT();
  const modeBadge =
    item.mode === "on_request" ? (
      <span className="badge badge-amber">{t("On-Request")}</span>
    ) : item.mode === "directed" ? (
      <span className="badge badge-gray">{t("Directed")}</span>
    ) : null;

  const accessBadge =
    item.access === "full" ? (
      <span className="badge badge-green">{t("Full dossier")}</span>
    ) : item.access === "request" ? (
      <span className="badge badge-amber">{t("Approval needed")}</span>
    ) : item.access === "preview" ? (
      <span className="badge badge-gray">{t("Public summary")}</span>
    ) : (
      <span className="badge badge-gray">{t("Viewed")}</span>
    );

  const date = new Date(item.viewedAt).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <tr>
      <td>
        <div className="font-bold font-mono">{item.certCode}</div>
        <div className="text-xs text-gray-400">{modeBadge}</div>
      </td>
      <td>{item.tenantName || "—"}</td>
      <td>{item.property || "—"}</td>
      <td>{accessBadge}</td>
      <td className="text-sm text-gray">{date}</td>
      <td>
        <Link
          href={`/cert/cert-view?code=${encodeURIComponent(item.certCode)}`}
          className="btn btn-outline btn-sm"
        >
          {t("Open")}
        </Link>
      </td>
    </tr>
  );
}

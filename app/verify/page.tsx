"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function VerifyPage() {
  const t = useT();
  const [code, setCode] = useState("");

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
    window.location.href = `/cert/${encodeURIComponent(upper)}`;
  }

  return (
    <>
      <nav className="nav">
        <div className="container flex-between w-full">
          <Link href="/" className="nav__logo">
            <div className="nav__logo-mark">C</div>
            Checks
          </Link>
          <div className="nav__links">
            <Link href="/auth/login" className="nav__link">
              {t("Sign in")}
            </Link>
            <Link href="/auth/tenant-register" className="btn btn-primary btn-sm">
              {t("Create dossier")}
            </Link>
          </div>
        </div>
      </nav>

      <div className="auth-wrap">
        <div className="verify-card">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔍</div>
            <h1 className="text-2xl mb-2">{t("Verify a tenant certificate")}</h1>
            <p className="text-sm text-gray-400">
              {t(
                "Enter the 12-character code from the tenant's certificate. Agencies and private owners can also scan the QR code directly.",
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="text-center block">{t("Certificate code")}</label>
              <input
                type="text"
                className="code-input"
                placeholder="STD-XXXX-XXXX"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                required
              />
              <div className="form-hint text-center mt-2">
                {t("Format: STD-XXXX-XXXX (e.g. STD-2G7K-X4NP)")}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full mt-2">
              {t("Verify certificate")}
            </button>
          </form>

          <div className="divider"></div>

          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              {t("Or scan the tenant's QR code with your phone to open directly.")}
            </p>
            <div className="flex justify-center items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{t("Professionals")}:</span>
              <Link
                href="/auth/login"
                className="text-sm font-bold"
                style={{ color: "var(--charcoal)" }}
              >
                {t("Sign in as a régie or private owner to see full dossier →")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

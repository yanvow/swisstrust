"use client";

import { useT } from "@/lib/i18n";

export default function LandingFooter() {
  const t = useT();
  const linkClass = "block text-sm text-gray-600 hover:text-charcoal py-1";
  const colTitle = "text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3";

  return (
    <footer className="bg-charcoal text-gray-200 pt-16 pb-8">
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 font-bold text-lg text-white mb-3">
              <span className="w-8 h-8 bg-red rounded-[2px] flex items-center justify-center text-white font-black">
                C
              </span>
              Checks
            </div>
            <p className="text-sm text-gray-400">
              {t(
                "Verified tenant identity for the Swiss rental market. Build your dossier once. Share securely with anyone.",
              )}
            </p>
          </div>

          <div>
            <div className={colTitle}>{t("Tenants")}</div>
            <a href="/auth/tenant-register.html" className={linkClass}>
              {t("Create dossier")}
            </a>
            <a href="/auth/login.html" className={linkClass}>
              {t("Sign in")}
            </a>
            <a href="/verify.html" className={linkClass}>
              {t("Verify a certificate")}
            </a>
          </div>

          <div>
            <div className={colTitle}>{t("Agencies")}</div>
            <a href="/auth/agency-register.html" className={linkClass}>
              {t("Register")}
            </a>
            <a href="/auth/login.html" className={linkClass}>
              {t("Agency login")}
            </a>
          </div>

          <div>
            <div className={colTitle}>{t("Owners")}</div>
            <a href="/auth/owner-register.html" className={linkClass}>
              {t("Register")}
            </a>
            <a href="/auth/login.html" className={linkClass}>
              {t("Owner login")}
            </a>
          </div>

          <div>
            <div className={colTitle}>{t("Legal")}</div>
            <a href="#" className={linkClass}>
              {t("Privacy policy")}
            </a>
            <a href="#" className={linkClass}>
              {t("Terms of service")}
            </a>
            <a href="#" className={linkClass}>
              {t("Data processing")}
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-400">
          <span>{t("© 2026 Checks SA. All rights reserved.")}</span>
          <div>
            <span className="text-red">+</span>&nbsp;{t("Made in Switzerland")}
          </div>
        </div>
      </div>
    </footer>
  );
}

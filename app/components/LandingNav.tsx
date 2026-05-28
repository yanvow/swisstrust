"use client";

import { useState } from "react";
import Link from "next/link";
import LangSwitcher from "./LangSwitcher";
import { useT } from "@/lib/i18n";

export default function LandingNav() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const linkClass =
    "px-3.5 py-2 text-[0.9rem] text-gray-600 rounded-[2px] hover:text-charcoal hover:bg-gray-100 transition-colors";

  const closeMenu = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 h-[60px] bg-white border-b border-gray-200 flex items-center">
      <div className="container-x w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg" onClick={closeMenu}>
          <span className="w-8 h-8 bg-red rounded-[2px] flex items-center justify-center text-white font-black">
            C
          </span>
          Checks
        </Link>

        <div
          className={[
            "items-center gap-2 ml-auto",
            "md:flex",
            open
              ? "flex absolute top-[60px] left-0 right-0 flex-col bg-white border-b border-gray-200 px-6 py-4"
              : "hidden md:flex",
          ].join(" ")}
        >
          <LangSwitcher />
          <a href="#how-it-works" className={linkClass} onClick={closeMenu}>
            {t("How it works")}
          </a>
          <a href="#agencies" className={linkClass} onClick={closeMenu}>
            {t("For agencies")}
          </a>
          <a href="#owners" className={linkClass} onClick={closeMenu}>
            {t("For owners")}
          </a>
          <a href="/auth/login.html" className={linkClass} onClick={closeMenu}>
            {t("Sign in")}
          </a>
          <a href="/auth/tenant-register.html" className="btn btn-primary btn-sm" onClick={closeMenu}>
            {t("Create dossier")}
          </a>
        </div>

        <button
          type="button"
          aria-label={t("Toggle menu")}
          aria-expanded={open}
          className="md:hidden text-2xl leading-none"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
}

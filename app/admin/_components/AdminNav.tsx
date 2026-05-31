"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

export default function AdminNav({
  displayName,
  onToggleSidebar,
}: {
  displayName: string;
  onToggleSidebar: () => void;
}) {
  const t = useT();
  async function signOut() {
    const sb = createClient();
    await sb.auth.signOut();
    window.location.href = "/auth/login";
  }
  return (
    <nav className="nav">
      <div className="container flex-between w-full">
        <button
          className="nav__hamburger"
          onClick={onToggleSidebar}
          aria-label="Open menu"
        >
          ☰
        </button>
        <Link href="/" className="nav__logo">
          <div className="nav__logo-mark">C</div>
          Checks{" "}
          <span
            style={{
              display: "inline-block",
              background: "#FF0000",
              color: "white",
              fontSize: ".65rem",
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: "4px",
              verticalAlign: "middle",
              marginLeft: "6px",
            }}
          >
            {t("Admin")}
          </span>
        </Link>
        <div className="nav__links">
          <span className="text-sm text-gray">{displayName}</span>
          <button onClick={signOut} className="btn btn-ghost btn-sm">
            {t("Sign out")}
          </button>
        </div>
      </div>
    </nav>
  );
}

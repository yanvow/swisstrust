"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

export default function TenantNav({
  displayName,
  onToggleSidebar,
}: {
  displayName: string;
  onToggleSidebar: () => void;
}) {
  const t = useT();
  const handleSignOut = async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 h-[60px] bg-white border-b border-gray-200 flex items-center">
      <div className="container-x w-full flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label={t("Open menu")}
          className="md:hidden text-2xl leading-none"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
          <span className="w-8 h-8 bg-red rounded-[2px] flex items-center justify-center text-white font-black">
            C
          </span>
          Checks
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-gray-400">{displayName}</span>
          <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
            {t("Sign out")}
          </button>
        </div>
      </div>
    </nav>
  );
}

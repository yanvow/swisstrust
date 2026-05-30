"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import OwnerNav from "./_components/OwnerNav";
import OwnerSidebar from "./_components/OwnerSidebar";
import { OwnerCtx, type OwnerContextValue } from "./_components/OwnerContext";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<OwnerContextValue | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const {
        data: { session: s },
      } = await sb.auth.getSession();
      if (!s) {
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = `/auth/login?return=${encodeURIComponent(returnPath)}`;
        return;
      }
      const role = s.user.user_metadata?.role as string | undefined;
      if (role !== "owner" && role !== "admin") {
        window.location.href = dashboardPathForRole(role);
        return;
      }

      setValue({
        userId: s.user.id,
        email: s.user.email || "",
        displayName:
          (s.user.user_metadata?.full_name as string) || s.user.email || "",
      });
      setReady(true);
    })();
  }, []);

  if (!ready || !value) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <OwnerCtx.Provider value={value}>
      <OwnerNav displayName={value.displayName} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="md:grid md:grid-cols-[220px_1fr] min-h-[calc(100vh-60px)]">
        <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="px-6 md:px-10 py-10 max-w-[1100px]">{children}</main>
      </div>
    </OwnerCtx.Provider>
  );
}

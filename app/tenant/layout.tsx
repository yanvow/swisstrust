"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import TenantNav from "./_components/TenantNav";
import TenantSidebar from "./_components/TenantSidebar";
import { TenantCtx, type TenantContextValue } from "./_components/TenantContext";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";

type TenantSession = {
  userId: string;
  displayName: string;
  email: string;
};

export default function TenantLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantSession | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
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
      if (role && role !== "tenant" && role !== "admin") {
        window.location.href = dashboardPathForRole(role);
        return;
      }

      setSession({
        userId: s.user.id,
        email: s.user.email || "",
        displayName: (s.user.user_metadata?.full_name as string) || s.user.email || "",
      });
      setReady(true);
    })();
  }, []);

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const value: TenantContextValue = { ...session, pendingCount, setPendingCount };

  return (
    <TenantCtx.Provider value={value}>
      <TenantNav displayName={session.displayName} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="md:grid md:grid-cols-[220px_1fr] min-h-[calc(100vh-60px)]">
        <TenantSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pendingRequestCount={pendingCount}
        />
        <main className="px-6 md:px-10 py-10 max-w-[900px]">{children}</main>
      </div>
    </TenantCtx.Provider>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AgencyNav from "./_components/AgencyNav";
import AgencySidebar from "./_components/AgencySidebar";
import { AgencyCtx, type AgencyContextValue } from "./_components/AgencyContext";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AgencyContextValue | null>(null);
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
      if (role !== "agency" && role !== "agent" && role !== "admin") {
        window.location.href = dashboardPathForRole(role);
        return;
      }

      const isAdmin = role === "agency" || role === "admin";
      let agencyId = "";
      let agencyName = "";
      let isVerified = false;

      if (role === "agency") {
        const { data } = await sb
          .from("agencies")
          .select("id, company_name, is_verified")
          .eq("user_id", s.user.id)
          .single();
        if (data) {
          agencyId = data.id;
          agencyName = data.company_name;
          isVerified = !!data.is_verified;
        }
      } else if (role === "agent") {
        const { data } = await sb
          .from("agency_agents")
          .select("agencies(id, company_name, is_verified)")
          .eq("user_id", s.user.id)
          .eq("status", "active")
          .single();
        const a = (data as { agencies?: { id: string; company_name: string; is_verified: boolean } } | null)
          ?.agencies;
        if (a) {
          agencyId = a.id;
          agencyName = a.company_name;
          isVerified = !!a.is_verified;
        }
      }

      setValue({
        userId: s.user.id,
        email: s.user.email || "",
        displayName:
          (s.user.user_metadata?.company_name as string) ||
          agencyName ||
          s.user.email ||
          "",
        agencyId,
        agencyName,
        isAdmin,
        isVerified,
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
    <AgencyCtx.Provider value={value}>
      <AgencyNav
        displayName={value.agencyName + (value.isAdmin ? "" : " (agent)")}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="md:grid md:grid-cols-[220px_1fr] min-h-[calc(100vh-60px)]">
        <AgencySidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isAdmin={value.isAdmin}
        />
        <main className="px-6 md:px-10 py-10 max-w-[1100px]">{children}</main>
      </div>
    </AgencyCtx.Provider>
  );
}

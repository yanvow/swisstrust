"use client";

import { useEffect } from "react";
import AuthShell from "../_components/AuthShell";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function CallbackPage() {
  const t = useT();

  useEffect(() => {
    const sb = createClient();

    (async () => {
      const role = new URLSearchParams(window.location.search).get("role");

      // The browser client's detectSessionInUrl handles code exchange
      // automatically; poll briefly for the session to materialize.
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await sb.auth.getSession();
        if (data?.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!session) {
        window.location.href = "/auth/login?error=oauth_failed";
        return;
      }

      // First-time OAuth: stamp the role in user_metadata if the URL provided
      // one and the user doesn't already have one.
      const existingRole = session.user.user_metadata?.role as string | undefined;
      if (role && !existingRole) {
        await sb.auth.updateUser({ data: { role } });
      }

      window.location.href = dashboardPathForRole(role || existingRole);
    })();
  }, []);

  return (
    <AuthShell>
      <p className="text-center text-gray-600">{t("Signing in…")}</p>
    </AuthShell>
  );
}

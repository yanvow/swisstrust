"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import { Field, TextInput, FormError, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Panel = "loading" | "form" | "error" | "success";

export default function ResetPasswordPage() {
  const t = useT();
  const [panel, setPanel] = useState<Panel>("loading");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sb = createClient();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (!code) {
        // Legacy implicit-flow link: #access_token + type=recovery in the hash —
        // Supabase JS will have already created the session via detectSessionInUrl.
        const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
        if (hashParams.get("type") === "recovery") {
          setPanel("form");
          return;
        }
        setPanel("error");
        return;
      }

      const { error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
      if (exchangeErr) {
        setPanel("error");
        return;
      }
      setPanel("form");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== password2) {
      setError(t("Passwords do not match."));
      return;
    }

    setLoading(true);
    const { error: err } = await sb.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    await sb.auth.signOut();
    setLoading(false);
    setPanel("success");
  };

  if (panel === "loading") {
    return (
      <AuthShell>
        <p className="text-center text-gray-600">{t("Verifying your reset link…")}</p>
      </AuthShell>
    );
  }

  if (panel === "error") {
    return (
      <AuthShell>
        <p className="text-red mb-4">{t("This reset link is invalid or has expired.")}</p>
        <Link href="/auth/forgot-password" className="btn btn-outline w-full">
          {t("Request a new link")}
        </Link>
      </AuthShell>
    );
  }

  if (panel === "success") {
    return (
      <AuthShell>
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[2px] px-4 py-4 text-sm text-[#15803D] mb-5">
          {t("Password updated successfully.")}
        </div>
        <Link href="/auth/login" className="btn btn-primary w-full">
          {t("Sign in with your new password")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("Set a new password")} subtitle={t("Choose a strong password for your account.")}>
      <form onSubmit={handleSubmit}>
        <Field id="password" label={t("New password")} required>
          <TextInput
            id="password"
            type="password"
            placeholder={t("At least 8 characters")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
        </Field>
        <Field id="password2" label={t("Confirm new password")} required>
          <TextInput
            id="password2"
            type="password"
            placeholder={t("Repeat your password")}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            minLength={8}
          />
        </Field>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Set new password")} />
      </form>
    </AuthShell>
  );
}

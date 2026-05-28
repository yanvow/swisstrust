"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import GoogleButton from "../_components/GoogleButton";
import { Field, TextInput, FormError, Divider, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const sb = createClient();

  // If a session already exists and there's no ?return target, jump straight
  // to the role-based dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const returnUrl = new URLSearchParams(window.location.search).get("return");
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (cancelled) return;
      if (session && !returnUrl) {
        window.location.href = dashboardPathForRole(session.user.user_metadata?.role);
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    setError(null);
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const returnUrl = new URLSearchParams(window.location.search).get("return");
    window.location.href = returnUrl || dashboardPathForRole(data.user.user_metadata?.role);
  };

  if (checkingSession) {
    return (
      <AuthShell>
        <p className="text-center text-gray-600">{t("Signing in…")}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("Welcome back")} subtitle={t("Sign in to your tenant, agency, or owner account")}>
      <GoogleButton label={t("Continue with Google")} onClick={handleGoogle} disabled={loading} />

      <Divider>{t("or sign in with email")}</Divider>

      <form onSubmit={handleSubmit}>
        <Field id="email" label={t("Email address")} required>
          <TextInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field
          id="password"
          label={t("Password")}
          required
          hint={
            <Link href="/auth/forgot-password" className="text-charcoal font-medium hover:underline">
              {t("Forgot password?")}
            </Link>
          }
        >
          <TextInput
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </Field>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Sign in")} loadingLabel={t("Signing in…")} />
      </form>

      <Divider>{t("or continue as")}</Divider>

      <div className="flex flex-col gap-2.5 mt-4">
        <Link
          href="/auth/tenant-register"
          className="btn btn-outline w-full text-base py-3.5"
        >
          {t("New tenant")}
        </Link>
        <div className="flex gap-2.5">
          <Link href="/auth/agency-register" className="btn btn-outline w-full">
            {t("New agency")}
          </Link>
          <Link href="/auth/owner-register" className="btn btn-outline w-full">
            {t("New owner")}
          </Link>
        </div>
      </div>

      <div className="text-center text-sm mt-6 pt-5 border-t border-gray-200">
        <Link href="/" className="text-gray-600 hover:text-charcoal">
          {t("← Back to homepage")}
        </Link>
      </div>
    </AuthShell>
  );
}

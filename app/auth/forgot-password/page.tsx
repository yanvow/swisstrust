"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import { Field, TextInput, FormError, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sb = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title={t("Reset your password")}>
        <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[2px] px-4 py-4 text-sm text-[#15803D] mb-5 leading-relaxed">
          {t("A reset link has been sent to")} <strong>{email}</strong>.{" "}
          {t("Check your inbox and click the link to set a new password. The link expires after 1 hour.")}
        </div>
        <Link href="/auth/login" className="btn btn-outline w-full">
          {t("Back to sign in")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("Reset your password")}
      subtitle={t("Enter your email address and we'll send you a link to set a new password.")}
    >
      <form onSubmit={handleSubmit}>
        <Field id="email" label={t("Email address")} required>
          <TextInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </Field>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Send reset link")} />
      </form>

      <div className="text-center text-sm mt-6 pt-5 border-t border-gray-200">
        <Link href="/auth/login" className="text-gray-600 hover:text-charcoal">
          {t("← Back to sign in")}
        </Link>
      </div>
    </AuthShell>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import GoogleButton from "../_components/GoogleButton";
import { Field, TextInput, FormError, Divider, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { validatePassword } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function TenantRegisterPage() {
  const t = useT();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?role=tenant` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(t(pwErr));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match."));
      return;
    }

    setLoading(true);
    const sb = createClient();
    const { error: err } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: "tenant", full_name: `${firstName.trim()} ${lastName.trim()}` },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    window.location.href = "/tenant/profile.html";
  };

  return (
    <AuthShell
      title={t("Create your tenant account")}
      subtitle={t("Verify your identity once. Apply to any property in Switzerland.")}
      maxWidth={520}
      topRight={
        <Link href="/auth/login" className="text-sm text-gray-600 hover:text-charcoal">
          {t("Already have an account? Sign in")}
        </Link>
      }
    >
      <GoogleButton label={t("Sign up with Google")} onClick={handleGoogle} disabled={loading} />

      <Divider>{t("or register with email")}</Divider>

      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[2px] px-4 py-3 mb-6 text-sm text-[#1D4ED8]">
        ℹ️&nbsp; {t("After registration, you'll be guided to complete your profile and upload documents.")}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field id="first_name" label={t("First name")} required>
            <TextInput
              id="first_name"
              placeholder="Sophie"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </Field>
          <Field id="last_name" label={t("Last name")} required>
            <TextInput
              id="last_name"
              placeholder="Müller"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field id="email" label={t("Email address")} required>
          <TextInput
            id="email"
            type="email"
            placeholder="sophie@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="password"
            label={t("Password")}
            required
            hint={t("8+ chars · uppercase · lowercase · number · symbol")}
          >
            <TextInput
              id="password"
              type="password"
              placeholder={t("Min. 8 characters")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field id="confirm_password" label={t("Confirm password")} required>
            <TextInput
              id="confirm_password"
              type="password"
              placeholder={t("Repeat password")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="my-4 h-px bg-gray-200" />

        <div className="flex items-start gap-2.5 mb-5">
          <input
            id="terms"
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
            className="mt-1 flex-shrink-0"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            {t("I agree to the")}{" "}
            <a href="#" className="text-charcoal font-semibold">
              {t("Terms of Service")}
            </a>{" "}
            {t("and")}{" "}
            <a href="#" className="text-charcoal font-semibold">
              {t("Privacy Policy")}
            </a>
            {t(". I understand my documents will be stored securely on Swiss servers.")}
          </label>
        </div>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Create account & continue")} />
      </form>

      <div className="text-center text-sm mt-6 pt-5 border-t border-gray-200 text-gray-600">
        {t("Already have an account?")}{" "}
        <Link href="/auth/login" className="text-charcoal font-semibold hover:underline">
          {t("Sign in")}
        </Link>
      </div>
    </AuthShell>
  );
}

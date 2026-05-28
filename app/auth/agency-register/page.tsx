"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import GoogleButton from "../_components/GoogleButton";
import { Field, TextInput, FormError, Divider, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { validatePassword } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function AgencyRegisterPage() {
  const t = useT();
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sb = createClient();

  const handleGoogle = async () => {
    setError(null);
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?role=agency` },
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
    const { error: err } = await sb.auth.signUp({
      email: accountEmail.trim(),
      password,
      options: {
        data: {
          role: "agency",
          company_name: companyName.trim(),
          address: address.trim(),
          contact_email: contactEmail.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    window.location.href = "/agency/dashboard.html";
  };

  return (
    <AuthShell
      title={t("Register your agency")}
      subtitle={t(
        "Access verified tenant dossiers. Free registration — your agency appears in the tenant directory immediately.",
      )}
      maxWidth={520}
      topRight={
        <Link href="/auth/login" className="text-sm text-gray-600 hover:text-charcoal">
          {t("Already registered? Sign in")}
        </Link>
      }
    >
      <div className="flex gap-4 mb-6">
        <Badge icon="✓" label={t("Verified documents")} />
        <Badge icon="🔒" label={t("Secure access")} />
        <Badge icon="📋" label={t("Audit trail")} />
      </div>

      <GoogleButton label={t("Sign up with Google")} onClick={handleGoogle} disabled={loading} />

      <Divider>{t("or register with email")}</Divider>

      <form onSubmit={handleSubmit}>
        <Field id="company_name" label={t("Agency / company name")} required>
          <TextInput
            id="company_name"
            placeholder="Moser Vernet & Cie"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
          />
        </Field>
        <Field id="address" label={t("Business address")} required>
          <TextInput
            id="address"
            placeholder="Rue Ami-Lullin 4, 1207 Genève"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            autoComplete="street-address"
          />
        </Field>
        <Field id="contact_email" label={t("Contact email")} required>
          <TextInput
            id="contact_email"
            type="email"
            placeholder="info@agence.ch"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </Field>

        <div className="my-4 h-px bg-gray-200" />

        <Field id="account_email" label={t("Account email (for login)")} required>
          <TextInput
            id="account_email"
            type="email"
            placeholder="admin@agence.ch"
            value={accountEmail}
            onChange={(e) => setAccountEmail(e.target.value)}
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
              placeholder={t("Repeat")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
        </div>

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
              {t("Agency Terms")}
            </a>{" "}
            {t("and confirm this agency is authorised to access tenant data in accordance with Swiss data protection law.")}
          </label>
        </div>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Register agency")} />
      </form>

      <div className="text-center text-sm mt-6 pt-5 border-t border-gray-200 text-gray-600">
        {t("Already registered?")}{" "}
        <Link href="/auth/login" className="text-charcoal font-semibold hover:underline">
          {t("Sign in")}
        </Link>
      </div>
    </AuthShell>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-[2px] px-3 py-3 text-center">
      <div className="text-xl font-bold">{icon}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

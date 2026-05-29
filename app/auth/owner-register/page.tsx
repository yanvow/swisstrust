"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import GoogleButton from "../_components/GoogleButton";
import { Field, TextInput, FormError, Divider, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { validatePassword } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function OwnerRegisterPage() {
  const t = useT();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    const sb = createClient();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?role=owner` },
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
    if (password !== password2) {
      setError(t("Passwords do not match."));
      return;
    }

    setLoading(true);
    const sb = createClient();
    const { error: err } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: "owner",
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          property_address: propertyAddress.trim() || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    window.location.href = "/owner/dashboard.html";
  };

  return (
    <AuthShell
      title={t("Register as private owner")}
      subtitle={t(
        "Scan any Checks QR certificate and instantly see a tenant's verified dossier — income, documents, and certificate status. Free forever for private landlords.",
      )}
      maxWidth={520}
      topRight={
        <Link href="/auth/login" className="text-sm text-gray-600 hover:text-charcoal">
          {t("Already registered? Sign in")}
        </Link>
      }
    >
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[2px] px-4 py-3 mb-6 text-sm text-[#1D4ED8]">
        🏠 <strong>{t("Private owner plan — free")}</strong>
        <br />
        <span className="font-normal">
          {t("View approved On-Request certificates and Directed certificates addressed to you · Full audit trail")}
        </span>
      </div>

      <GoogleButton label={t("Sign up with Google")} onClick={handleGoogle} disabled={loading} />

      <Divider>{t("or register with email")}</Divider>

      <form onSubmit={handleSubmit}>
        <Field id="first_name" label={t("First name")} required>
          <TextInput
            id="first_name"
            placeholder="Jean"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
        </Field>
        <Field id="last_name" label={t("Last name")} required>
          <TextInput
            id="last_name"
            placeholder="Dupont"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />
        </Field>
        <Field id="email" label={t("Email address")} required>
          <TextInput
            id="email"
            type="email"
            placeholder="jean.dupont@email.ch"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field
          id="property_address"
          label={t("Property address (optional)")}
          hint={t("Helps tenants know which property you manage. Can be added later.")}
        >
          <TextInput
            id="property_address"
            placeholder="Rue des Alpes 4, 1201 Genève"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            autoComplete="street-address"
          />
        </Field>
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
        <Field id="password2" label={t("Confirm password")} required>
          <TextInput
            id="password2"
            type="password"
            placeholder={t("Repeat password")}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>

        <div className="flex items-center justify-between mb-5 py-2">
          <span className="text-sm text-gray-600">
            {t("I agree to the")}{" "}
            <a href="#" className="text-charcoal font-semibold">
              {t("Terms of Service")}
            </a>{" "}
            {t("and")}{" "}
            <a href="#" className="text-charcoal font-semibold">
              {t("Privacy Policy")}
            </a>
          </span>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
            className="flex-shrink-0"
          />
        </div>

        <FormError message={error} />

        <SubmitButton loading={loading} defaultLabel={t("Create owner account")} />
      </form>

      <div className="text-center text-sm mt-6 pt-5 border-t border-gray-200 text-gray-600">
        {t("Are you a régie?")}{" "}
        <Link href="/auth/agency-register" className="text-charcoal font-semibold hover:underline">
          {t("Register as an agency →")}
        </Link>
        <br />
        {t("Looking to rent?")}{" "}
        <Link href="/auth/tenant-register" className="text-charcoal font-semibold hover:underline">
          {t("Create a tenant dossier →")}
        </Link>
      </div>
    </AuthShell>
  );
}

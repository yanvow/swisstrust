"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell from "../_components/AuthShell";
import { Field, TextInput, FormError, SubmitButton } from "../_components/FormBits";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Phase = "loading" | "form" | "error" | "success";

type InviteContext = {
  userId: string;
  inviteToken: string;
  agencyId: string;
  agencyName: string;
};

export default function AgentAcceptPage() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [invite, setInvite] = useState<InviteContext | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      // Supabase's detectSessionInUrl processes the invite link hash; poll
      // briefly for the session to materialize.
      let session = null;
      for (let i = 0; i < 16; i++) {
        const { data } = await sb.auth.getSession();
        if (data?.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      if (!session) {
        setErrorMsg(
          t(
            "This invitation link is invalid or has expired. Please ask your agency admin to send a new invite.",
          ),
        );
        setPhase("error");
        return;
      }

      const meta = session.user.user_metadata as
        | { invite_token?: string; agency_id?: string; agency_name?: string }
        | undefined;
      const inviteToken = meta?.invite_token;
      const agencyId = meta?.agency_id;

      if (!inviteToken || !agencyId) {
        setErrorMsg(t("The invitation data is incomplete. Please contact your agency admin."));
        setPhase("error");
        return;
      }

      setInvite({
        userId: session.user.id,
        inviteToken,
        agencyId,
        agencyName: meta?.agency_name || t("your agency"),
      });
      setPhase("form");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t("First name and last name are required."));
      return;
    }
    if (password.length < 8) {
      setFormError(t("Password must be at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setFormError(t("Passwords do not match."));
      return;
    }

    setSubmitting(true);
    const sb = createClient();

    const { error: pwErr } = await sb.auth.updateUser({ password });
    if (pwErr) {
      setFormError(pwErr.message);
      setSubmitting(false);
      return;
    }

    const { error: updErr } = await sb
      .from("agency_agents")
      .update({
        user_id: invite.userId,
        status: "active",
        accepted_at: new Date().toISOString(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
      })
      .eq("invite_token", invite.inviteToken)
      .eq("agency_id", invite.agencyId);

    if (updErr) {
      setFormError(updErr.message);
      setSubmitting(false);
      return;
    }

    setPhase("success");
    setTimeout(() => {
      window.location.href = "/agency/dashboard.html";
    }, 2000);
  };

  if (phase === "loading") {
    return (
      <AuthShell
        title={t("Verifying invitation…")}
        subtitle={t("Please wait while we set up your account.")}
      >
        <div className="h-2" />
      </AuthShell>
    );
  }

  if (phase === "error") {
    return (
      <AuthShell title={t("Invitation problem")} subtitle={errorMsg}>
        <Link href="/" className="btn btn-outline btn-sm">
          {t("Back to homepage")}
        </Link>
      </AuthShell>
    );
  }

  if (phase === "success") {
    return (
      <AuthShell
        title={t("Welcome aboard!")}
        subtitle={t("Your account is ready. Redirecting to your dashboard…")}
      >
        <div className="h-2" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("You've been invited!")}
      subtitle={
        <>
          {t("Complete your profile to join")}{" "}
          <strong className="text-charcoal">{invite?.agencyName}</strong> {t("on Checks.")}
        </>
      }
      maxWidth={520}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <Field id="first_name" label={t("First name")} required>
            <TextInput
              id="first_name"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </Field>
          <Field id="last_name" label={t("Last name")} required>
            <TextInput
              id="last_name"
              placeholder="Smith"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field
          id="phone"
          label={
            <>
              {t("Phone")}{" "}
              <span className="text-gray-400 font-normal">{t("(optional)")}</span>
            </>
          }
        >
          <TextInput
            id="phone"
            type="tel"
            placeholder="+41 79 000 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </Field>

        <Field id="password" label={t("Choose a password")} required>
          <TextInput
            id="password"
            type="password"
            placeholder={t("At least 8 characters")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>

        <Field id="confirm" label={t("Confirm password")} required>
          <TextInput
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </Field>

        <FormError message={formError} />

        <SubmitButton
          loading={submitting}
          defaultLabel={t("Complete setup")}
          loadingLabel={t("Setting up…")}
        />
      </form>
    </AuthShell>
  );
}

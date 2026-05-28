"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const SUPPORTED_LANGS = ["en", "fr"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const STORAGE_KEY = "checks:lang";

type Dict = Record<string, string>;

// French strings for the landing page. Mirrors the legacy lib/i18n.js EXACT.fr
// table — keep these in sync whenever English copy changes.
const FR: Dict = {
  "Checks — Verified Tenant Dossiers": "Checks — Dossiers locataires vérifiés",

  // Nav
  "How it works": "Comment ça marche",
  "For agencies": "Pour les régies",
  "For owners": "Pour les propriétaires",
  "Sign in": "Se connecter",
  "Create dossier": "Créer un dossier",
  "Toggle menu": "Afficher le menu",

  // Hero
  "Swiss rental identity platform": "Plateforme suisse d’identité locative",
  "One verified dossier.": "Un dossier vérifié.",
  "Share it securely with anyone.": "Partagez-le en toute sécurité avec qui vous voulez.",
  "Stop sending your passport, salary slips and debt records to strangers. Verify once. Share a QR certificate. Agencies see exactly what they need — nothing more.":
    "Arrêtez d’envoyer votre passeport, vos fiches de salaire et vos extraits de poursuite à des inconnus. Vérifiez une fois. Partagez un certificat QR. Les régies voient exactement ce qu’il leur faut — rien de plus.",
  "Create tenant dossier": "Créer un dossier locataire",
  "Register your agency": "Inscrire votre régie",
  "Free for tenants · Swiss data hosting · nFADP compliant":
    "Gratuit pour les locataires · Hébergement suisse · Conforme nLPD",

  // Cert card
  "Tenant Verification Certificate": "Certificat de vérification du locataire",
  "Identity Verified": "Identité vérifiée",
  "Valid certificate": "Certificat valide",
  Tenant: "Locataire",
  Status: "Statut",
  Eligibility: "Éligibilité",
  Household: "Ménage",
  "✓ Valid": "✓ Valide",
  "✓ Income qualifies": "✓ Revenu éligible",
  "2 occupants · No pets": "2 occupants · Sans animaux",

  // Problem section
  "The problem": "Le problème",
  "Swiss flat hunting is a privacy nightmare":
    "La recherche d’appartement en Suisse est un cauchemar pour la vie privée",
  "For every apartment, tenants hand over their passport, salary slips, debt records and personal references — to complete strangers. Most of those dossiers are never returned. Your data circulates indefinitely.":
    "Pour chaque appartement, les locataires remettent leur passeport, leurs fiches de salaire, leur extrait de poursuite et leurs références — à de parfaits inconnus. La plupart de ces dossiers ne sont jamais restitués. Vos données circulent indéfiniment.",
  "Strangers receive your sensitive documents per flat search":
    "Des inconnus reçoivent vos documents sensibles à chaque recherche",
  "No agencies have a secure document return policy":
    "Aucune régie n’a de politique sécurisée de retour des documents",
  "Many rental applications contain fraudulent documents":
    "De nombreux dossiers contiennent des documents frauduleux",
  "Traditional dossier": "Dossier traditionnel",
  "Passport copy sent to strangers · Salary slips emailed as PDFs · No access control · Data never deleted":
    "Copie de passeport envoyée à des inconnus · Fiches de salaire en PDF par e-mail · Aucun contrôle d’accès · Données jamais supprimées",
  "Checks certificate": "Certificat Checks",
  "Verified once · QR code shared · Agency sees only what they're authorised to see · Full audit trail":
    "Vérifié une fois · QR partagé · La régie ne voit que ce qu’elle est autorisée à voir · Journal d’audit complet",

  // How it works
  "Three steps to a verified dossier": "Trois étapes vers un dossier vérifié",
  "Complete your profile once. Generate a certificate per property. Done.":
    "Complétez votre profil une fois. Générez un certificat par bien. C’est tout.",
  "Upload documents": "Téléversez vos documents",
  "Passport, salary slips, Extract from the debt enforcement register. Our AI verifies and extracts the data automatically.":
    "Passeport, fiches de salaire, extrait de l’office des poursuites. Notre IA vérifie et extrait les données automatiquement.",
  "Build your dossier": "Construisez votre dossier",
  "Your verified identity, employment and household data — reviewed once, stored securely.":
    "Vos données d’identité, d’emploi et de ménage vérifiées — examinées une fois, stockées en toute sécurité.",
  "Share a QR certificate": "Partagez un certificat QR",
  "Generate a certificate for each property. The agency sees the full dossier. Others see only a verified summary.":
    "Générez un certificat pour chaque bien. La régie voit le dossier complet. Les autres ne voient qu’un résumé vérifié.",

  // Modes
  "Two certificate modes": "Deux modes de certificat",
  "You choose how your dossier is shared": "Vous choisissez comment votre dossier est partagé",
  "Generate a certificate for each property application — you stay in control of who can access your full dossier.":
    "Générez un certificat pour chaque candidature — vous gardez le contrôle de qui peut accéder à votre dossier complet.",
  Directed: "Dirigé",
  "Pre-authorise one specific régie or landlord. Only they unlock the full dossier when they scan.":
    "Pré-autorisez une régie ou un propriétaire spécifique. Seuls eux déverrouillent le dossier complet en scannant.",
  "Most private — recommended for targeted applications":
    "Le plus confidentiel — recommandé pour les candidatures ciblées",
  "On-Request": "Sur demande",
  "Professionals see your public summary and must request access. You approve or deny each one from your dashboard.":
    "Les professionnels voient votre résumé public et doivent demander l’accès. Vous approuvez ou refusez chaque demande depuis votre tableau de bord.",
  "You stay in control — approve each access request":
    "Vous gardez le contrôle — approuvez chaque demande d’accès",
  "Access tiers within each mode": "Niveaux d’accès dans chaque mode",
  "Regardless of mode, your raw documents are always protected behind authentication.":
    "Quel que soit le mode, vos documents bruts sont toujours protégés par authentification.",
  "Data point": "Donnée",
  "Public (anyone)": "Public (tout le monde)",
  "Authorised professional": "Professionnel autorisé",
  "Full name": "Nom complet",
  "Verification badge": "Badge de vérification",
  "Rent eligibility (income × 3 rule)": "Éligibilité au loyer (règle du revenu × 3)",
  "Occupants, smoker, pets": "Occupants, fumeur, animaux",
  "Certificate status (Valid / Not valid)": "Statut du certificat (Valide / Non valide)",
  "ID / Passport copy": "Copie de pièce d’identité / passeport",
  "Salary slips": "Fiches de salaire",
  "Extract from the debt enforcement register": "Extrait de l’office des poursuites",
  "Employer & exact income": "Employeur et revenu exact",

  // Cert status
  "Certificate status": "Statut du certificat",
  "Instant signal for agencies": "Signal instantané pour les régies",
  "Every certificate is either Valid or Not Valid — based on whether required documents are present and up to date.":
    "Chaque certificat est Valide ou Non valide — selon que les documents requis sont présents et à jour.",
  Valid: "Valide",
  "All required documents are verified and up to date. Clean debt enforcement register and current income documents.":
    "Tous les documents requis sont vérifiés et à jour. Extrait de poursuite vierge et documents de revenu actuels.",
  "✗ Not valid": "✗ Non valide",
  "Not valid": "Non valide",
  "One or more documents are missing, expired, or rejected. The tenant must update their dossier to restore validity.":
    "Un ou plusieurs documents sont manquants, expirés ou refusés. Le locataire doit mettre à jour son dossier pour rétablir la validité.",

  // Agency
  "Stop processing fraudulent dossiers": "Arrêtez de traiter des dossiers frauduleux",
  "Every Checks certificate is backed by AI-verified documents. You see the original files, extracted data, and a clear Valid / Not valid status — in seconds.":
    "Chaque certificat Checks repose sur des documents vérifiés par IA. Vous voyez les fichiers d’origine, les données extraites et un statut clair Valide / Non valide — en quelques secondes.",
  "Verified documents only": "Uniquement des documents vérifiés",
  "AI confidence scoring flags suspicious or unreadable documents before they reach you.":
    "Le score de confiance de l’IA signale les documents suspects ou illisibles avant qu’ils ne vous parviennent.",
  "Full audit trail": "Journal d’audit complet",
  "Every access is logged. Know exactly who viewed which dossier and when.":
    "Chaque accès est enregistré. Sachez exactement qui a consulté quel dossier et quand.",
  "One-click comparison": "Comparaison en un clic",
  "Compare applicants side by side — eligibility, certificate status, household details — from your dashboard.":
    "Comparez les candidats côte à côte — éligibilité, statut du certificat, détails du ménage — depuis votre tableau de bord.",
  "Register your agency — free": "Inscrire votre régie — gratuit",
  "Agency dashboard": "Tableau de bord régie",
  Eligible: "Éligible",
  Review: "À revoir",

  // Owners
  "For private owners": "Pour les propriétaires privés",
  "Rent out your property with confidence": "Louez votre bien en toute confiance",
  "No régie needed. As a private landlord, register a free account and scan any Checks QR code to instantly see a tenant's verified dossier — income, documents, and certificate status.":
    "Sans régie. En tant que propriétaire privé, créez un compte gratuit et scannez n’importe quel QR Checks pour voir instantanément le dossier vérifié d’un locataire — revenus, documents et statut du certificat.",
  "No subscription needed": "Aucun abonnement requis",
  "Free plan lets you view approved On-Request certificates and Directed certificates addressed to you.":
    "L’offre gratuite vous permet de consulter les certificats sur demande approuvés et les certificats dirigés qui vous sont adressés.",
  "Same verified quality as agencies": "La même qualité vérifiée que les régies",
  "AI-verified documents and certificate status — same as what a régie sees.":
    "Documents vérifiés par IA et statut du certificat — comme ce que voit une régie.",
  "Request access for Directed certificates": "Demandez l’accès aux certificats dirigés",
  "If a tenant uses Directed mode, you can request access and they approve directly.":
    "Si un locataire utilise le mode Dirigé, vous pouvez demander l’accès et il approuve directement.",
  "Register as private owner — free": "S’inscrire comme propriétaire privé — gratuit",
  "On-Request certificate scan": "Scan d’un certificat sur demande",
  "Sign in → scan QR → tap \"Request access\" → tenant approves → full dossier unlocked.":
    "Se connecter → scanner le QR → toucher « Demander l’accès » → le locataire approuve → dossier complet déverrouillé.",
  "Directed certificate scan": "Scan d’un certificat dirigé",
  "Only works if the tenant pre-authorised you. Otherwise shows public summary only.":
    "Fonctionne uniquement si le locataire vous a pré-autorisé. Sinon, seul le résumé public est affiché.",

  // Final CTA
  "Get started today": "Commencez aujourd’hui",
  "Your dossier. Your data. Your control.": "Votre dossier. Vos données. Votre contrôle.",
  "Verify once. Apply everywhere. Choose exactly how each certificate is shared.":
    "Vérifiez une fois. Postulez partout. Choisissez exactement comment chaque certificat est partagé.",
  "Register agency": "Inscrire une régie",
  "Private owner →": "Propriétaire privé →",
  "Already have an account?": "Vous avez déjà un compte ?",
  "Sign in →": "Se connecter →",

  // Footer
  Tenants: "Locataires",
  Agencies: "Régies",
  Owners: "Propriétaires",
  Legal: "Mentions légales",
  "Verify a certificate": "Vérifier un certificat",
  "Agency login": "Connexion régie",
  "Owner login": "Connexion propriétaire",
  Register: "S’inscrire",
  "Privacy policy": "Politique de confidentialité",
  "Terms of service": "Conditions d’utilisation",
  "Data processing": "Traitement des données",
  "Verified tenant identity for the Swiss rental market. Build your dossier once. Share securely with anyone.":
    "Identité locataire vérifiée pour le marché suisse de la location. Construisez votre dossier une fois. Partagez en toute sécurité avec qui vous voulez.",
  "© 2026 Checks SA. All rights reserved.": "© 2026 Checks SA. Tous droits réservés.",
  "Made in Switzerland": "Fait en Suisse",

  // ── Auth: shared ────────────────────────────────────────────────
  "Signing in…": "Connexion en cours…",
  "Welcome back": "Bon retour",
  "Sign in to your tenant, agency, or owner account":
    "Connectez-vous à votre compte locataire, régie ou propriétaire",
  "Continue with Google": "Continuer avec Google",
  "Sign up with Google": "S’inscrire avec Google",
  "or sign in with email": "ou connectez-vous par e-mail",
  "or register with email": "ou inscrivez-vous par e-mail",
  "or continue as": "ou continuer en tant que",
  "Email address": "Adresse e-mail",
  Password: "Mot de passe",
  "Forgot password?": "Mot de passe oublié ?",
  "← Back to homepage": "← Retour à l’accueil",
  "← Back to sign in": "← Retour à la connexion",
  "Back to sign in": "Retour à la connexion",
  "New tenant": "Nouveau locataire",
  "New agency": "Nouvelle régie",
  "New owner": "Nouveau propriétaire",
  "Already have an account? Sign in": "Vous avez déjà un compte ? Se connecter",
  "Already registered? Sign in": "Déjà inscrit ? Se connecter",
  "Already registered?": "Déjà inscrit ?",
  "Passwords do not match.": "Les mots de passe ne correspondent pas.",
  "Min. 8 characters": "Minimum 8 caractères",
  "Repeat password": "Répétez le mot de passe",
  "Repeat your password": "Répétez votre mot de passe",
  Repeat: "Répéter",
  "8+ chars · uppercase · lowercase · number · symbol":
    "8+ caractères · majuscule · minuscule · chiffre · symbole",
  "I agree to the": "J’accepte les",
  and: "et",
  "Terms of Service": "Conditions d’utilisation",
  "Privacy Policy": "Politique de confidentialité",
  ". I understand my documents will be stored securely on Swiss servers.":
    ". Je comprends que mes documents seront stockés en toute sécurité sur des serveurs suisses.",
  "Password must be at least 8 characters.": "Le mot de passe doit comporter au moins 8 caractères.",
  "Password must contain at least one uppercase letter.":
    "Le mot de passe doit contenir au moins une majuscule.",
  "Password must contain at least one lowercase letter.":
    "Le mot de passe doit contenir au moins une minuscule.",
  "Password must contain at least one number.":
    "Le mot de passe doit contenir au moins un chiffre.",
  "Password must contain at least one special character (e.g. !@#$%).":
    "Le mot de passe doit contenir au moins un caractère spécial (par ex. !@#$%).",

  // ── Auth: forgot / reset password ──────────────────────────────
  "Reset your password": "Réinitialiser votre mot de passe",
  "Enter your email address and we'll send you a link to set a new password.":
    "Saisissez votre adresse e-mail et nous vous enverrons un lien pour définir un nouveau mot de passe.",
  "Send reset link": "Envoyer le lien de réinitialisation",
  "A reset link has been sent to": "Un lien de réinitialisation a été envoyé à",
  "Check your inbox and click the link to set a new password. The link expires after 1 hour.":
    "Consultez votre boîte de réception et cliquez sur le lien pour définir un nouveau mot de passe. Le lien expire après 1 heure.",
  "Verifying your reset link…": "Vérification de votre lien de réinitialisation…",
  "This reset link is invalid or has expired.": "Ce lien de réinitialisation est invalide ou a expiré.",
  "Request a new link": "Demander un nouveau lien",
  "Set a new password": "Définir un nouveau mot de passe",
  "Choose a strong password for your account.": "Choisissez un mot de passe fort pour votre compte.",
  "New password": "Nouveau mot de passe",
  "Confirm new password": "Confirmer le nouveau mot de passe",
  "At least 8 characters": "Au moins 8 caractères",
  "Set new password": "Définir le nouveau mot de passe",
  "Password updated successfully.": "Mot de passe mis à jour avec succès.",
  "Sign in with your new password": "Connectez-vous avec votre nouveau mot de passe",

  // ── Auth: tenant register ──────────────────────────────────────
  "Create your tenant account": "Créer votre compte locataire",
  "Verify your identity once. Apply to any property in Switzerland.":
    "Vérifiez votre identité une fois. Postulez à tout bien en Suisse.",
  "After registration, you'll be guided to complete your profile and upload documents.":
    "Après l’inscription, vous serez guidé pour compléter votre profil et téléverser vos documents.",
  "First name": "Prénom",
  "Last name": "Nom",
  "Confirm password": "Confirmer le mot de passe",
  "Create account & continue": "Créer le compte et continuer",
  "Please wait…": "Veuillez patienter…",

  // ── Auth: agency register ──────────────────────────────────────
  "Access verified tenant dossiers. Free registration — your agency appears in the tenant directory immediately.":
    "Accédez aux dossiers locataires vérifiés. Inscription gratuite — votre régie apparaît immédiatement dans l’annuaire des locataires.",
  "Verified documents": "Documents vérifiés",
  "Secure access": "Accès sécurisé",
  "Audit trail": "Journal d’audit",
  "Agency / company name": "Nom de la régie / société",
  "Business address": "Adresse professionnelle",
  "Contact email": "E-mail de contact",
  "Account email (for login)": "E-mail du compte (pour la connexion)",
  "Agency Terms": "Conditions régie",
  "and confirm this agency is authorised to access tenant data in accordance with Swiss data protection law.":
    "et confirme que cette régie est autorisée à accéder aux données locataires conformément à la loi suisse sur la protection des données.",

  // ── Auth: owner register ───────────────────────────────────────
  "Register as private owner": "S’inscrire comme propriétaire privé",
  "Scan any Checks QR certificate and instantly see a tenant's verified dossier — income, documents, and certificate status. Free forever for private landlords.":
    "Scannez n’importe quel QR Checks et voyez instantanément le dossier vérifié d’un locataire — revenus, documents et statut du certificat. Gratuit à vie pour les propriétaires privés.",
  "Private owner plan — free": "Offre propriétaire privé — gratuite",
  "View approved On-Request certificates and Directed certificates addressed to you · Full audit trail":
    "Consultez les certificats sur demande approuvés et les certificats dirigés qui vous sont adressés · Journal d’audit complet",
  "Property address (optional)": "Adresse du bien (optionnel)",
  "Helps tenants know which property you manage. Can be added later.":
    "Aide les locataires à savoir quel bien vous gérez. Peut être ajouté plus tard.",
  "Create owner account": "Créer le compte propriétaire",
  "Are you a régie?": "Êtes-vous une régie ?",
  "Register as an agency →": "S’inscrire comme régie →",
  "Looking to rent?": "Vous cherchez à louer ?",
  "Create a tenant dossier →": "Créer un dossier locataire →",

  // ── Auth: agent-accept ─────────────────────────────────────────
  "Verifying invitation…": "Vérification de l’invitation…",
  "Please wait while we set up your account.":
    "Veuillez patienter pendant que nous configurons votre compte.",
  "Invitation problem": "Problème d’invitation",
  "Back to homepage": "Retour à l’accueil",
  "You've been invited!": "Vous avez été invité !",
  "Complete your profile to join": "Complétez votre profil pour rejoindre",
  "on Checks.": "sur Checks.",
  "your agency": "votre régie",
  "This invitation link is invalid or has expired. Please ask your agency admin to send a new invite.":
    "Ce lien d’invitation est invalide ou a expiré. Veuillez demander à votre administrateur de régie d’envoyer une nouvelle invitation.",
  "The invitation data is incomplete. Please contact your agency admin.":
    "Les données de l’invitation sont incomplètes. Veuillez contacter votre administrateur de régie.",
  "First name and last name are required.": "Le prénom et le nom sont obligatoires.",
  Phone: "Téléphone",
  "(optional)": "(optionnel)",
  "Choose a password": "Choisissez un mot de passe",
  "Complete setup": "Terminer la configuration",
  "Setting up…": "Configuration en cours…",
  "Welcome aboard!": "Bienvenue à bord !",
  "Your account is ready. Redirecting to your dashboard…":
    "Votre compte est prêt. Redirection vers votre tableau de bord…",

  // ── Tenant: chrome / sidebar ───────────────────────────────────
  "Sign out": "Se déconnecter",
  "Open menu": "Ouvrir le menu",
  "My dossier": "Mon dossier",
  Dashboard: "Tableau de bord",
  "My profile": "Mon profil",
  Documents: "Documents",
  Certificates: "Certificats",
  "My certificates": "Mes certificats",
  "New certificate": "Nouveau certificat",
  Other: "Autre",
  Account: "Compte",
  Settings: "Paramètres",
  Notifications: "Notifications",
  "Access requests": "Demandes d’accès",

  // ── Tenant: dashboard content ──────────────────────────────────
  "Welcome back,": "Bon retour,",
  there: "vous",
  "Here's your dossier status.": "Voici le statut de votre dossier.",
  pending: "en attente",
  "Dossier completion": "Avancement du dossier",
  "Complete your profile to generate certificates":
    "Complétez votre profil pour générer des certificats",
  complete: "terminé",
  "Personal information complete": "Informations personnelles complètes",
  "Employment details filled": "Détails d’emploi remplis",
  "Rental situation configured": "Situation locative configurée",
  "Rental situation not configured (income type / guarantor)":
    "Situation locative non configurée (type de revenu / garant)",
  "Configure →": "Configurer →",
  "All required documents uploaded": "Tous les documents requis téléversés",
  "required documents still missing": "documents requis manquants",
  "required document still missing": "document requis manquant",
  "Upload now →": "Téléverser maintenant →",
  "No certificates yet": "Aucun certificat pour l’instant",
  "certificates generated": "certificats générés",
  "certificate generated": "certificat généré",
  "Generate →": "Générer →",
  "Fix →": "Corriger →",
  "Documents uploaded": "Documents téléversés",
  "Verified ✓": "Vérifiés ✓",
  "Profile status": "Statut du profil",
  "✗ Not ready": "✗ Pas prêt",
  "Document status": "Statut des documents",
  "Upload all required documents to generate a certificate":
    "Téléversez tous les documents requis pour générer un certificat",
  Missing: "Manquant",
  Uploaded: "Téléversé",
  confidence: "de confiance",
  "Manage documents": "Gérer les documents",
  "Ready to apply for a flat?": "Prêt à postuler pour un appartement ?",
  "Generate a QR certificate for a specific property. Takes 2 minutes.":
    "Générez un certificat QR pour un bien spécifique. 2 minutes suffisent.",
  "New certificate →": "Nouveau certificat →",
  "Pending review": "En attente de revue",
  "Processing…": "Traitement…",
  "Auto-verified": "Auto-vérifié",
  Flagged: "Signalé",
  Rejected: "Refusé",
  "We couldn't find your tenant profile. Please contact support.":
    "Nous n’avons pas trouvé votre profil locataire. Veuillez contacter le support.",
  "Loading…": "Chargement…",

  // ── Tenant: access request card ────────────────────────────────
  "Private owner": "Propriétaire privé",
  Agency: "Régie",
  "Requesting access to": "Demande d’accès à",
  Approve: "Approuver",
  Deny: "Refuser",
  "Access approved — the professional can now view the full dossier.":
    "Accès approuvé — le professionnel peut maintenant consulter le dossier complet.",
  "Access denied.": "Accès refusé.",
};

const DICTS: Record<Lang, Dict> = { en: {}, fr: FR };

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("lang");
    if (fromUrl && (SUPPORTED_LANGS as readonly string[]).includes(fromUrl)) {
      return fromUrl as Lang;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) {
      return stored as Lang;
    }
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    if ((SUPPORTED_LANGS as readonly string[]).includes(browser)) {
      return browser as Lang;
    }
  } catch {
    // ignore
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Mounted gate so SSR markup matches the first client render (always English),
  // and we swap to the user's preferred language on mount.
  const [mounted, setMounted] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectInitial());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }, [lang, mounted]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: string) => {
      if (lang === "en") return key;
      return DICTS[lang][key] ?? key;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}

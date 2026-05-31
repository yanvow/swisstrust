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

  // ── Tenant: certificates ───────────────────────────────────────
  "One certificate per property. Share the QR code or manual code with your agency.":
    "Un certificat par bien. Partagez le QR ou le code avec votre régie.",
  "Certificate generated successfully": "Certificat généré avec succès",
  "share the QR code or code below with your agency.":
    "partagez le QR code ou le code ci-dessous avec votre régie.",
  "No certificates yet. Generate one when you find a property.":
    "Aucun certificat pour le moment. Générez-en un quand vous trouverez un bien.",
  "Applying to another property?": "Vous postulez pour un autre bien ?",
  "Create new certificate": "Créer un nouveau certificat",
  "Certificate code": "Code du certificat",
  Created: "Créé",
  "View certificate": "Voir le certificat",
  "Copy code": "Copier le code",
  Copied: "Copié",
  "Download PDF": "Télécharger le PDF",
  "Show access log": "Voir le journal d'accès",
  "Hide access log": "Masquer le journal d'accès",
  "No access events recorded yet.": "Aucun accès enregistré pour l'instant.",
  Last: "Derniers",
  "access events": "accès",
  "access event": "accès",
  "Anonymous scan": "Scan anonyme",
  "You (owner)": "Vous (propriétaire)",
  "Directed to": "Adressé à",
  "Pending delivery": "En attente de livraison",
  "Not yet on Checks": "Pas encore sur Checks",
  Mode: "Mode",
  Code: "Code",
  Dismiss: "Fermer",

  // ── Tenant: certificate-new ────────────────────────────────────
  "Fill in the property details. Your verified profile is added automatically.":
    "Remplissez les détails du bien. Votre profil vérifié est ajouté automatiquement.",
  "Profile & documents valid": "Profil et documents valides",
  "Profile not ready": "Profil incomplet",
  "Checking…": "Vérification…",
  "Your tenant data is pre-filled": "Vos données locataire sont pré-remplies",
  gross: "brut",
  "occupant(s)": "occupant(s)",
  Smoker: "Fumeur",
  "No smoker": "Non-fumeur",
  Pets: "Animaux",
  "No pets": "Sans animaux",
  "Sharing mode": "Mode de partage",
  "Choose who can access your full dossier when they scan the QR code.":
    "Choisissez qui peut accéder à votre dossier complet en scannant le QR code.",
  "Full dossier visible only to the one agency or landlord you pre-authorise.":
    "Dossier complet visible uniquement par la régie ou le propriétaire que vous pré-autorisez.",
  "Most private": "Le plus privé",
  "Professionals see your public summary and request access. You approve or deny each one.":
    "Les professionnels voient votre résumé public et demandent l'accès. Vous approuvez ou refusez chaque demande.",
  "You stay in control": "Vous gardez le contrôle",
  "Property details": "Détails du bien",
  "Property street address": "Adresse du bien",
  "Start typing a Swiss address…": "Commencez à taper une adresse suisse…",
  "Select from the dropdown — city, canton and postcode will fill automatically.":
    "Sélectionnez dans la liste — ville, canton et NPA seront remplis automatiquement.",
  City: "Ville",
  Postcode: "NPA",
  "Number of rooms (Nbr de pièces)": "Nombre de pièces",
  "Floor (Étage)": "Étage",
  "Desired move-in date": "Date d'emménagement souhaitée",
  "Move-in date must be tomorrow or later.":
    "La date d'emménagement doit être demain ou plus tard.",
  "Desired rent (CHF)": "Loyer souhaité (CHF)",
  "Rent (loyer)": "Loyer",
  Charges: "Charges",
  Total: "Total",
  "Income eligible": "Revenu éligible",
  "Income may not meet eligibility": "Le revenu pourrait ne pas être suffisant",
  "Additional information": "Informations complémentaires",
  "Parking desired": "Place de parking souhaitée",
  "I have visited the property": "J'ai visité le bien",
  "How did you hear about this property?": "Comment avez-vous connu ce bien ?",
  "Select…": "Sélectionner…",
  "Former tenant": "Ancien locataire",
  "Relocation agency": "Agence de relocation",
  "Agency website": "Site de la régie",
  "Authorised recipient": "Destinataire autorisé",
  "Agency / régie": "Régie",
  "Private landlord": "Propriétaire privé",
  "Select the régie managing this property": "Sélectionnez la régie qui gère ce bien",
  "Type to search agencies…": "Tapez pour rechercher une régie…",
  "Only this agency will have access to your full dossier.":
    "Seule cette régie aura accès à votre dossier complet.",
  "Agency not on Checks yet?": "La régie n'est pas encore sur Checks ?",
  "You can still apply — choose one of these options:":
    "Vous pouvez quand même postuler — choisissez une option :",
  "Switch to On-Request mode": "Passer en mode Sur demande",
  "Copy invite link": "Copier le lien d'invitation",
  "Direct by name anyway": "Diriger par nom quand même",
  "Copied!": "Copié !",
  "Your certificate will be held for this agency. They'll see it the moment they join Checks — no action needed on your part.":
    "Votre certificat sera réservé à cette régie. Ils le verront dès leur inscription sur Checks — aucune action requise de votre part.",
  "Agency name (as it will appear)": "Nom de la régie (tel qu'il apparaîtra)",
  "e.g. Agence Dupont & Fils": "ex. Agence Dupont & Fils",
  "The certificate will be created in Directed mode. The agency must sign up with this exact name to claim it.":
    "Le certificat sera créé en mode Direct. La régie doit s'inscrire avec ce nom exact pour le réclamer.",
  "Landlord email address": "Adresse e-mail du propriétaire",
  "The landlord must sign in with this exact email to access your full dossier.":
    "Le propriétaire doit se connecter avec cette adresse e-mail exacte pour accéder à votre dossier complet.",
  "On-Request certificate": "Certificat sur demande",
  "professionals see your public summary and must request full access. You'll be notified and can approve or deny each request from your dashboard.":
    "les professionnels voient votre résumé public et doivent demander un accès complet. Vous serez notifié et pourrez approuver ou refuser chaque demande depuis votre tableau de bord.",
  "Lettre de motivation": "Lettre de motivation",
  "Your cover letter": "Votre lettre de motivation",
  optional: "facultatif",
  "Introduce yourself and explain why you'd be a great tenant for this property…":
    "Présentez-vous et expliquez pourquoi vous seriez un excellent locataire pour ce bien…",
  "Only visible to the recipient once they unlock your certificate.":
    "Visible uniquement par le destinataire une fois votre certificat débloqué.",
  "Generate QR certificate": "Générer le certificat QR",
  "Generating…": "Génération…",
  Cancel: "Annuler",
  "Cannot generate certificate yet.": "Impossible de générer le certificat pour l'instant.",
  "Please resolve the following:": "Veuillez résoudre les points suivants :",
  "Complete profile →": "Compléter le profil →",
  "Upload documents →": "Téléverser les documents →",
  "Please complete your profile first.": "Veuillez d'abord compléter votre profil.",
  "Please enter the landlord email address.":
    "Veuillez saisir l'adresse e-mail du propriétaire.",
  "Please select an agency from the list, or use one of the options below.":
    "Veuillez sélectionner une régie dans la liste, ou utilisez une des options ci-dessous.",
  "Cannot generate certificate — the following issues must be resolved first:":
    "Impossible de générer le certificat — les problèmes suivants doivent d'abord être résolus :",
  "Error generating certificate": "Erreur lors de la génération du certificat",

  // ── Tenant: documents ──────────────────────────────────────────
  "Upload your supporting documents. Each file is stored securely and linked to your dossier.":
    "Téléversez vos documents justificatifs. Chaque fichier est stocké en sécurité et lié à votre dossier.",
  "Accepted formats": "Formats acceptés",
  "Max 10 MB per file.": "10 Mo max par fichier.",
  "Max 10 MB": "10 Mo max",
  "Documents are stored on Swiss servers and only shared with agencies you authorise.":
    "Les documents sont stockés sur des serveurs suisses et partagés uniquement avec les régies que vous autorisez.",
  "Loading your documents…": "Chargement de vos documents…",
  "Continue to generate certificate →": "Continuer pour générer un certificat →",
  "Not uploaded": "Non téléversé",
  "Expired — renew now": "Expiré — à renouveler",
  "Invalid — future date": "Invalide — date dans le futur",
  "Click or drag to upload": "Cliquez ou glissez pour téléverser",
  "Uploading…": "Téléversement…",
  "Analysing with AI…": "Analyse par IA…",
  "Analysing…": "Analyse…",
  Preview: "Aperçu",
  Replace: "Remplacer",
  Delete: "Supprimer",
  "Extracted data": "Données extraites",
  "Rental situation not configured": "Situation locative non configurée",
  "Go to": "Allez sur",
  "and fill in your rental situation to see all required documents (income type, guarantor, etc.).":
    "et remplissez votre situation locative pour voir tous les documents requis (type de revenu, garant, etc.).",
  "Close preview": "Fermer l'aperçu",
  "Loading preview…": "Chargement de l'aperçu…",
  "Could not load preview.": "Impossible de charger l'aperçu.",
  "Delete this document? You will need to re-upload it.":
    "Supprimer ce document ? Vous devrez le téléverser à nouveau.",
  "Upload failed": "Échec du téléversement",
  "Could not save document record": "Impossible d'enregistrer le document",
  "OCR error": "Erreur OCR",
  "Delete failed": "Échec de la suppression",
  "Failed to lock identity": "Échec du verrouillage de l'identité",
  "Failed to submit review request": "Échec de l'envoi de la demande de revue",
  "Identity verified": "Identité vérifiée",
  "Lock identity": "Verrouiller l'identité",
  "Not my document?": "Ce n'est pas mon document ?",
  "Review pending": "Revue en attente",
  "Name mismatch": "Nom différent",
  "Request manual review": "Demander une revue manuelle",
  "Date of birth mismatch — document shows":
    "Date de naissance différente — le document indique",
  "but the locked date of birth is": "mais la date verrouillée est",
  "Request a manual review to resolve this.":
    "Demandez une revue manuelle pour résoudre ce problème.",
  "Edit profile": "Modifier le profil",
  "Document shows": "Le document indique",
  "but the locked": "mais le",
  "guarantor name is": "nom du garant verrouillé est",
  "name is": "nom verrouillé est",
  "An admin is reviewing your request. Certificates cannot be generated until this is resolved.":
    "Un admin examine votre demande. Les certificats ne peuvent pas être générés jusqu'à résolution.",
  "If your name changed (e.g. after marriage), request a manual review. Certificates cannot be generated until this is resolved.":
    "Si votre nom a changé (ex. après mariage), demandez une revue manuelle. Les certificats ne peuvent pas être générés jusqu'à résolution.",
  "but your profile has": "mais votre profil a",
  "the guarantor profile": "le profil du garant",
  "your profile": "votre profil",
  has: "a",
  "(not set)": "(non renseigné)",
  "Update the profile name to match the document, then lock to generate certificates.":
    "Modifiez le nom du profil pour correspondre au document, puis verrouillez pour générer des certificats.",
  "Document expired — this document expired on":
    "Document expiré — ce document a expiré le",
  "You must obtain a renewed document and re-upload it.":
    "Vous devez obtenir un document renouvelé et le téléverser à nouveau.",
  "Nationality mismatch — document shows":
    "Nationalité différente — le document indique",
  "but your profile has,": "mais votre profil a,",
  Please: "Veuillez",
  "update your profile": "mettre à jour votre profil",
  "or re-upload the correct document.": "ou téléversez le bon document.",
  "Permit type mismatch — document shows permit":
    "Type de permis différent — le document indique le permis",
  "but your profile has permit": "mais votre profil a le permis",
  "Average gross salary across your 3 payslips":
    "Salaire brut moyen sur vos 3 fiches",
  "is lower than the monthly gross salary in your profile":
    "est inférieur au salaire brut mensuel de votre profil",
  "This statement shows a pay period of": "Cette fiche a une période de paie de",
  "which is in the future. Please upload a valid payslip.":
    "qui est dans le futur. Veuillez téléverser une fiche valide.",
  "an unknown period": "une période inconnue",
  "This statement is from": "Cette fiche est de",
  "which is more than 3 months ago. Please upload a more recent statement.":
    "qui date de plus de 3 mois. Veuillez téléverser une fiche plus récente.",
  "This attestation is": "Cette attestation a",
  "days old": "jours",
  day: "jour",
  days: "jours",
  "it must be issued within the last 3 months. Please obtain a new one and re-upload.":
    "elle doit dater de moins de 3 mois. Obtenez-en une nouvelle et téléversez-la.",
  "it will expire in": "elle expirera dans",
  "Consider renewing soon.": "Pensez à la renouveler bientôt.",
  "File is too large (max 10 MB). Please compress or use a different file.":
    "Fichier trop volumineux (max 10 Mo). Compressez ou utilisez un autre fichier.",
  "Guarantor name change": "Changement de nom du garant",
  "Your name change": "Votre changement de nom",
  "please describe the reason:": "veuillez décrire la raison :",
  "(e.g. name changed after marriage, typo in document)":
    "(ex. nom changé après mariage, faute de frappe sur le document)",
  "An admin will review your request. Certificates cannot be generated until the review is approved.":
    "Un admin examinera votre demande. Les certificats ne peuvent pas être générés jusqu'à approbation.",

  // ── Tenant: settings ───────────────────────────────────────────
  "Manage your account, payment methods, and billing.":
    "Gérez votre compte, vos moyens de paiement et votre facturation.",
  Options: "Options",
  Usage: "Utilisation",
  Payment: "Paiement",
  "Data management": "Gestion des données",
  "Delete all documents": "Supprimer tous les documents",
  "Permanently removes all uploaded files (passport, salary slips, etc.) from your dossier. Your profile information is kept.":
    "Supprime définitivement tous les fichiers téléversés (passeport, fiches de salaire, etc.) de votre dossier. Vos informations de profil sont conservées.",
  "Clear all profile information": "Effacer toutes les informations du profil",
  "Resets your name, employment, household and rental situation fields to blank. Documents are not affected.":
    "Réinitialise vos champs nom, emploi, ménage et situation locative. Les documents ne sont pas affectés.",
  "Clear information": "Effacer les informations",
  "Certificate viewed": "Certificat consulté",
  "Receive an email when a landlord or agency opens your certificate.":
    "Recevez un e-mail quand un propriétaire ou une régie consulte votre certificat.",
  "Access request decided": "Demande d'accès traitée",
  "Get notified when a landlord's full-dossier access request is approved or denied.":
    "Soyez notifié quand une demande d'accès complet est approuvée ou refusée.",
  "Weekly digest": "Récapitulatif hebdomadaire",
  "A weekly summary of your certificate activity and dossier views.":
    "Un récapitulatif hebdomadaire de votre activité.",
  "Product news": "Actualités produit",
  "Occasional emails about new Checks features and updates.":
    "E-mails occasionnels sur les nouveautés et mises à jour de Checks.",
  "Interface language": "Langue de l'interface",
  "Date format": "Format de date",
  "Applies to this browser. Full translation coming soon.":
    "S'applique à ce navigateur. Traduction complète bientôt disponible.",
  "Change email address": "Changer d'adresse e-mail",
  "A confirmation link will be sent to your new address. Your current email stays active until you confirm.":
    "Un lien de confirmation sera envoyé à votre nouvelle adresse. Votre e-mail actuel reste actif jusqu'à confirmation.",
  "New email address": "Nouvelle adresse e-mail",
  "Send confirmation": "Envoyer la confirmation",
  "Sending…": "Envoi…",
  "Change password": "Changer le mot de passe",
  "We'll send a password reset link to your current email address.":
    "Nous enverrons un lien de réinitialisation à votre adresse e-mail actuelle.",
  "Danger zone": "Zone dangereuse",
  "Delete my account": "Supprimer mon compte",
  "Permanently deletes your Checks account, all documents, certificates, and profile data. This action cannot be undone.":
    "Supprime définitivement votre compte Checks, tous vos documents, certificats et données. Cette action est irréversible.",
  "Delete account": "Supprimer le compte",
  "Deleting…": "Suppression…",
  "Your tenant profile has not been created yet.":
    "Votre profil locataire n'a pas encore été créé.",
  "Permanently delete all your uploaded documents? This cannot be undone.":
    "Supprimer définitivement tous vos documents téléversés ? Cette action est irréversible.",
  "All documents have been deleted.": "Tous les documents ont été supprimés.",
  "Clear all your profile information? Your documents will not be affected. This cannot be undone.":
    "Effacer toutes vos informations de profil ? Vos documents ne seront pas affectés. Cette action est irréversible.",
  "Profile information has been cleared.": "Les informations du profil ont été effacées.",
  "PERMANENTLY delete your Checks account?\n\nThis will remove all your documents, certificates, and data. You will be signed out immediately. This cannot be undone.":
    "Supprimer DÉFINITIVEMENT votre compte Checks ?\n\nCela supprimera tous vos documents, certificats et données. Vous serez déconnecté immédiatement. Cette action est irréversible.",
  "Could not delete account. Please contact support.":
    "Impossible de supprimer le compte. Contactez le support.",
  "Free plan": "Plan gratuit",
  Current: "Actuel",
  "3 certificates/month · Unlimited document uploads · Basic application tracking":
    "3 certificats/mois · Téléversement illimité · Suivi des candidatures de base",
  "Coming soon": "Bientôt disponible",
  "Upgrade to Premium": "Passer à Premium",
  "Monthly usage": "Utilisation mensuelle",
  Storage: "Stockage",
  "Certificates issued": "Certificats émis",
  "Monthly allowance resets on the 1st of each month. Upgrade for unlimited.":
    "Le quota mensuel se réinitialise le 1er de chaque mois. Passez en illimité.",
  "Document uploads are always unlimited on all plans.":
    "Le téléversement de documents est toujours illimité.",
  "Payment methods": "Moyens de paiement",
  "No payment methods added yet.": "Aucun moyen de paiement ajouté.",
  "Add payment method": "Ajouter un moyen de paiement",
  Default: "Défaut",
  "Set default": "Définir par défaut",
  Remove: "Supprimer",
  "Remove this payment method?": "Supprimer ce moyen de paiement ?",
  "Billing information": "Informations de facturation",
  "Your legal name": "Votre nom légal",
  "Billing email": "E-mail de facturation",
  Address: "Adresse",
  "Street, city, postcode, country": "Rue, ville, NPA, pays",
  "Phone number": "Numéro de téléphone",
  "Tax ID(s)": "Numéro(s) fiscaux",
  "optional — add multiple": "facultatif — plusieurs possibles",
  "Add Tax ID": "Ajouter un numéro fiscal",
  "Save billing information": "Enregistrer les informations",
  Saving: "Enregistrement",
  Saved: "Enregistré",
  "Saving…": "Enregistrement…",
  "Invoice history": "Historique des factures",
  "No invoices yet.": "Aucune facture pour l'instant.",
  paid: "payée",
  overdue: "en retard",
  Error: "Erreur",
  "Method type": "Type de moyen",
  "Select method": "Sélectionner un moyen",
  "Wire transfer (IBAN)": "Virement bancaire (IBAN)",
  "Credit card (Visa / Mastercard)": "Carte de crédit (Visa / Mastercard)",
  "Account holder": "Titulaire du compte",
  "Full legal name": "Nom légal complet",
  "Bank name": "Nom de la banque",
  "e.g. UBS, Credit Suisse": "ex. UBS, Crédit Suisse",
  "Card brand": "Type de carte",
  Select: "Sélectionner",
  "Cardholder name": "Nom du titulaire",
  "As printed on card": "Tel qu'imprimé sur la carte",
  "Last 4 digits": "4 derniers chiffres",
  "Expiry (MM/YY)": "Expiration (MM/AA)",
  "We store only the last 4 digits and expiry for display. Full card numbers are never stored.":
    "Nous ne stockons que les 4 derniers chiffres et l'expiration pour l'affichage. Les numéros complets ne sont jamais stockés.",
  "TWINT phone number": "Numéro TWINT",
  "Set as default payment method": "Définir comme moyen par défaut",
  "Add method": "Ajouter",
  Expires: "Expire le",
  "Wire transfer": "Virement",
  "IBAN not set": "IBAN non défini",
  "Please select a method type.": "Veuillez sélectionner un type.",
  "Account holder and IBAN are required.": "Le titulaire et l'IBAN sont requis.",
  "All card fields are required.": "Tous les champs carte sont requis.",
  "TWINT phone number is required.": "Le numéro TWINT est requis.",
  "Not authenticated": "Non authentifié",
  "A confirmation link has been sent to {email}. Click the link in that email to confirm the change.":
    "Un lien de confirmation a été envoyé à {email}. Cliquez sur le lien pour confirmer.",
  "A password reset link has been sent to {email}.":
    "Un lien de réinitialisation a été envoyé à {email}.",

  // ── Tenant: profile ────────────────────────────────────────────
  "This information is verified and used across all your certificates.":
    "Ces informations sont vérifiées et utilisées dans tous vos certificats.",
  "Your profile data is fixed — it won't change between certificates. Only property-specific details vary per certificate.":
    "Vos données de profil sont fixes — elles ne changent pas entre les certificats. Seuls les détails spécifiques au bien varient.",
  "Personal information": "Informations personnelles",
  "Full government name": "Nom complet officiel",
  "Exact name as on your passport or ID card":
    "Nom exact tel qu'indiqué sur le passeport ou la carte d'identité",
  "Must match your identity documents exactly.":
    "Doit correspondre exactement à vos documents d'identité.",
  "Date of birth": "Date de naissance",
  Nationality: "Nationalité",
  "Select nationality": "Sélectionner une nationalité",
  "Permit type": "Type de permis",
  "Current address": "Adresse actuelle",
  "Type of income": "Type de revenu",
  "Select all that apply — this determines which financial documents you'll need to upload.":
    "Sélectionnez tout ce qui s'applique — ceci détermine les documents à téléverser.",
  Employee: "Salarié",
  "You receive a salary from an employer — you will need to provide 3 months of salary slips.":
    "Vous recevez un salaire d'un employeur — vous devrez fournir 3 mois de fiches de salaire.",
  "Self-employed / Independent": "Indépendant",
  "You run your own business or work as a freelancer — you will need to provide balance sheets, tax assessments, bank statements, and proof of self-employed status.":
    "Vous dirigez votre entreprise ou êtes freelance — vous devrez fournir bilans, taxations fiscales, relevés bancaires et justificatif d'indépendance.",
  "Unemployed (receiving unemployment benefits)":
    "Au chômage (avec indemnités)",
  "You are currently receiving unemployment benefits (indemnités chômage / Arbeitslosengeld) — you will need to provide 3 months of benefit statements.":
    "Vous percevez des indemnités chômage — vous devrez fournir 3 mois d'attestations.",
  "Social assistance / Welfare": "Aide sociale",
  "You are supported by a social assistance organisation — you will need to provide a certificate of rent coverage.":
    "Vous êtes pris en charge par un service social — vous devrez fournir une attestation de prise en charge du loyer.",
  "No income": "Sans revenu",
  "You currently have no income of any kind.":
    "Vous n'avez actuellement aucun revenu.",
  Employment: "Emploi",
  "Employer name": "Nom de l'employeur",
  "Company name": "Nom de l'entreprise",
  "Job title / role": "Poste / fonction",
  "Your position": "Votre poste",
  "Employment start date": "Date de début d'emploi",
  "Monthly gross salary (CHF)": "Salaire mensuel brut (CHF)",
  "Used to calculate rent eligibility (salary ≥ 3× rent)":
    "Utilisé pour calculer l'éligibilité au loyer (salaire ≥ 3× loyer)",
  "Self-employment": "Activité indépendante",
  "Business name": "Nom de l'entreprise",
  "Company or trading name": "Nom de société ou commercial",
  "Type of activity": "Type d'activité",
  "e.g. IT consulting, retail": "ex. conseil IT, commerce",
  "Juridical form": "Forme juridique",
  "Select form": "Sélectionner une forme",
  "Business start date": "Date de début d'activité",
  "Average annual net income (CHF)": "Revenu net annuel moyen (CHF)",
  "Average over the last 2–3 years if available":
    "Moyenne sur les 2–3 dernières années si disponible",
  "Previous employment": "Emploi précédent",
  "Last employer name": "Dernier employeur",
  "Last job title": "Dernier poste",
  "Employment end date": "Date de fin d'emploi",
  "Unemployment benefits": "Indemnités chômage",
  "Benefit start date": "Date de début d'indemnités",
  "Monthly benefit amount (CHF)": "Montant mensuel d'indemnités (CHF)",
  "Social assistance organisation": "Organisme d'aide sociale",
  "Select organisation": "Sélectionner un organisme",
  "Number of occupants (including yourself)":
    "Nombre d'occupants (vous compris)",
  Adults: "Adultes",
  Children: "Enfants",
  "Does any occupant smoke?": "Un des occupants fume-t-il ?",
  "Do you have or plan to have pets?": "Avez-vous ou prévoyez-vous des animaux ?",
  "Which pets?": "Quels animaux ?",
  "e.g. dog, cat": "ex. chien, chat",
  "Plays an instrument": "Joue d'un instrument",
  "Do you or any occupant play a musical instrument?":
    "Vous ou un occupant joue-t-il d'un instrument ?",
  "Which instrument(s)?": "Quel(s) instrument(s) ?",
  "e.g. piano, guitar": "ex. piano, guitare",
  Vehicle: "Véhicule",
  "Do you own or regularly use a vehicle?":
    "Possédez-vous ou utilisez-vous régulièrement un véhicule ?",
  "What type?": "Quel type ?",
  "e.g. car, motorcycle, van": "ex. voiture, moto, fourgonnette",
  "Rental situation": "Situation locative",
  "Will anyone else be renting with you or providing support?":
    "Quelqu'un d'autre louera-t-il avec vous ou apportera-t-il un soutien ?",
  Guarantor: "Garant",
  "A third party will co-sign or provide financial guarantee on your behalf":
    "Un tiers cosignera ou apportera une garantie financière en votre nom",
  "Co-tenant": "Co-locataire",
  "Another person will be named on the lease and share full responsibility":
    "Une autre personne sera nommée sur le bail et partagera la pleine responsabilité",
  Roommate: "Colocataire",
  "Someone will live with you but is not on the lease":
    "Quelqu'un vivra avec vous mais n'est pas sur le bail",
  "Exact name as on passport or ID":
    "Nom exact tel qu'indiqué sur le passeport ou la pièce d'identité",
  "Guarantor's income type": "Type de revenu du garant",
  "Co-tenant's income type": "Type de revenu du co-locataire",
  "Roommate's income type": "Type de revenu du colocataire",
  "Select all that apply — this determines which financial documents the person will need to provide.":
    "Sélectionnez tout ce qui s'applique — ceci détermine les documents à fournir.",
  "Employed — will need to provide 3 months of salary slips.":
    "Salarié — devra fournir 3 mois de fiches de salaire.",
  "Runs their own business — will provide balance sheets, tax assessments, bank statements, and proof of income.":
    "Dirige sa propre entreprise — fournira bilans, taxations, relevés et justificatifs.",
  "Government identity locked": "Identité officielle verrouillée",
  "Guarantor identity locked": "Identité du garant verrouillée",
  "Your full name and date of birth have been verified against your identity document and are now read-only.":
    "Votre nom et date de naissance ont été vérifiés et sont maintenant en lecture seule.",
  "The guarantor's name and date of birth have been verified and are now read-only.":
    "Le nom et la date de naissance du garant ont été vérifiés et sont en lecture seule.",
  "Review request pending — an admin will process your request.":
    "Demande de revue en attente — un admin la traitera.",
  "Request a change": "Demander un changement",
  "Review requested": "Demande envoyée",
  "Please describe the change you need (e.g. name change after marriage, error in document):\n\nYour certificate cannot be generated until an admin reviews and approves the change.":
    "Décrivez le changement souhaité (ex. nom après mariage, erreur sur le document):\n\nVotre certificat ne pourra pas être généré tant qu'un admin n'aura pas approuvé.",
  "Please describe the change needed for your guarantor's information (e.g. name change, error in document):\n\nYour certificate cannot be generated until an admin reviews and approves the change.":
    "Décrivez le changement requis pour les informations du garant (ex. nom, erreur):\n\nVotre certificat ne pourra pas être généré tant qu'un admin n'aura pas approuvé.",
  "Household liability insurance": "Assurance responsabilité civile",
  "I have or plan to take out household liability insurance (RC ménage / Privathaftpflicht)":
    "J'ai ou prévois de souscrire une RC ménage",
  "Rental deposit method": "Méthode de garantie de loyer",
  "Not specified": "Non spécifié",
  "Bank guarantee (blocking account)": "Garantie bancaire (compte bloqué)",
  "Cash deposit": "Dépôt en espèces",
  "Insurance guarantee (e.g. SwissCaution, firstcaution)":
    "Garantie d'assurance (ex. SwissCaution, firstcaution)",
  "Cooperative share / membership": "Part / adhésion coopérative",
  "How you plan to provide the security deposit (caution)":
    "Comment vous prévoyez de fournir la caution",
  "Save profile": "Enregistrer le profil",
  "Next: Upload documents →": "Suivant : téléverser les documents →",

  // Common
  rooms: "pièces",
  Floor: "Étage",
  "Move-in": "Emménagement",

  // Admin
  Admin: "Admin",
  "Admin Dashboard": "Tableau de bord admin",
  "Loading platform stats…": "Chargement des statistiques…",
  "Platform overview": "Vue d’ensemble de la plateforme",
  tenants: "locataires",
  "active certificates": "certificats actifs",
  Overview: "Vue d’ensemble",
  Users: "Utilisateurs",
  Content: "Contenu",
  "Active certificates": "Certificats actifs",
  "Docs needing review": "Documents à examiner",
  "Scans this week": "Scans cette semaine",
  "Documents need review": "Documents à examiner",
  "document(s) pending or flagged — OCR review required.":
    "document(s) en attente ou signalés — examen OCR requis.",
  "Review →": "Examiner →",
  "Recent tenants": "Locataires récents",
  "View all": "Voir tout",
  "None yet.": "Aucun pour l’instant.",
  Unnamed: "Sans nom",
  Complete: "Complet",
  Incomplete: "Incomplet",
  "Recent certificates": "Certificats récents",
  "Recent scans": "Scans récents",
  "No scans yet.": "Aucun scan pour l’instant.",
  "Member usage": "Utilisation par membre",
  "Current-month allowance consumption per member. Bars turn amber at 80 % and red at 100 %.":
    "Consommation du mois en cours par membre. Les barres passent à l’orange à 80 % et au rouge à 100 %.",
  "Tenants — certificates": "Locataires — certificats",
  "Agencies — agent seats": "Régies — sièges agents",
  Free: "Gratuit",
  "tenant registered": "locataire inscrit",
  "tenants registered": "locataires inscrits",
  "owner registered": "propriétaire inscrit",
  "owners registered": "propriétaires inscrits",
  agencies: "régies",
  verified: "vérifiées",
  "Search by name, nationality, employer…":
    "Rechercher par nom, nationalité, employeur…",
  "Search by name, address, email…": "Rechercher par nom, adresse, e-mail…",
  "Search by name, address…": "Rechercher par nom, adresse…",
  "Search by tenant name or file name…":
    "Rechercher par nom du locataire ou du fichier…",
  "Search by tenant, agency, cert code, property…":
    "Rechercher par locataire, régie, code, bien…",
  "All profiles": "Tous les profils",
  "Complete only": "Complets uniquement",
  "Incomplete only": "Incomplets uniquement",
  "Identity review requests": "Demandes d’examen d’identité",
  "All agencies": "Toutes les régies",
  "Verified only": "Vérifiées uniquement",
  "Unverified only": "Non vérifiées uniquement",
  "Registered (has login)": "Inscrites (avec compte)",
  "Pre-seeded (no login)": "Pré-saisies (sans compte)",
  "All modes": "Tous les modes",
  "Active only": "Actifs uniquement",
  "Active + inactive": "Actifs + inactifs",
  "Inactive only": "Inactifs uniquement",
  "All types": "Tous les types",
  Pending: "En attente",
  Processing: "En traitement",
  "Nationality / Permit": "Nationalité / Permis",
  Employer: "Employeur",
  "Salary (gross)": "Salaire (brut)",
  Occupants: "Occupants",
  Joined: "Inscrit le",
  Unsuspend: "Réactiver",
  Suspended: "Suspendu",
  "Identity review": "Examen d’identité",
  Locked: "Verrouillé",
  "No tenants found.": "Aucun locataire trouvé.",
  "No owners found.": "Aucun propriétaire trouvé.",
  "No agencies found.": "Aucune régie trouvée.",
  "No certificates found.": "Aucun certificat trouvé.",
  "No documents found.": "Aucun document trouvé.",
  Verified: "Vérifiée",
  Unverified: "Non vérifiée",
  Registered: "Inscrite",
  "Pre-seeded": "Pré-saisie",
  "Agency details": "Détails de la régie",
  "Verified on Checks": "Vérifiée sur Checks",
  "No — unverified": "Non — non vérifiée",
  "Yes — verified ✓": "Oui — vérifiée ✓",
  "No — active": "Non — active",
  "Yes — suspended": "Oui — suspendue",
  "Delete agency": "Supprimer la régie",
  "No members yet.": "Aucun membre pour l’instant.",
  Accepted: "Accepté",
  Invited: "Invité le",
  "Add member by email": "Ajouter un membre par e-mail",
  "Company name, address and email are required.":
    "Nom, adresse et e-mail sont requis.",
  "Creating…": "Création…",
  "Create agency": "Créer la régie",
  "Create tenant": "Créer le locataire",
  "Full name is required.": "Le nom complet est requis.",
  "Legal full name": "Nom légal complet",
  "Job role": "Poste",
  "Employment start": "Début d’emploi",
  "Monthly gross (CHF)": "Salaire brut mensuel (CHF)",
  "Profile complete": "Profil complet",
  "Unnamed tenant": "Locataire sans nom",
  "Unnamed owner": "Propriétaire sans nom",
  "New tenant profile": "Nouveau profil de locataire",
  "Property address": "Adresse du bien",
  "Document type": "Type de document",
  Confidence: "Confiance",
  documents: "documents",
  "need review": "à examiner",
  "Auto-verified ✓": "Auto-vérifié ✓",
  "Flagged ⚠": "Signalé ⚠",
  "Rejected ✗": "Rejeté ✗",
  "View original document ↗": "Voir le document original ↗",
  "Generating link…": "Génération du lien…",
  "Link unavailable.": "Lien indisponible.",
  "Confidence score (0–1)": "Score de confiance (0–1)",
  "Rejection reason": "Motif de rejet",
  "(shown to tenant when rejected)":
    "(affiché au locataire en cas de rejet)",
  "Extracted OCR data": "Données extraites par OCR",
  "No extracted data yet.": "Aucune donnée extraite pour l’instant.",
  "Add field": "Ajouter un champ",
  "Mark verified": "Marquer vérifié",
  Reject: "Rejeter",
  "Delete document": "Supprimer le document",
  "Rejection reason (shown to tenant):":
    "Motif de rejet (affiché au locataire) :",
  Property: "Bien",
  certificates: "certificats",
  active: "actifs",
  "— (keep computed)": "— (garder calculé)",
  "No — Review required": "Non — examen requis",
  "Yes — Active": "Oui — actif",
  "No — Deactivated": "Non — désactivé",
  "Admin note": "Note admin",
  "(internal only, not shown to tenant)":
    "(interne uniquement, non visible au locataire)",
  "Deactivate this certificate? The QR code and cert code will no longer work.":
    "Désactiver ce certificat ? Le QR code et le code cesseront de fonctionner.",
  File: "Fichier",

  // UI parity fixes
  "Profile not completed.": "Profil non complété.",
  "Fill in your profile →": "Complétez votre profil →",
  "Could not generate download link.": "Impossible de générer le lien de téléchargement.",
  "Downloading…": "Téléchargement…",
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

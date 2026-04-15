// ============================================================
// Checks — lightweight runtime i18n
// Supports English, French, German, Italian.
// ============================================================

(function () {
  const STORAGE_KEY = 'checks:lang';
  const SUPPORTED = ['en', 'fr', 'de', 'it'];
  const FRONTEND_LANGS = ['en', 'fr']; // languages shown in the UI switcher

  const EXACT = {
    fr: {
      'Checks — Verified Tenant Dossiers': 'Checks — Dossiers locataires vérifiés',
      'Verify a certificate — Checks': 'Vérifier un certificat — Checks',
      'Sign in — Checks': 'Connexion — Checks',
      'Agency Dashboard — Checks': 'Tableau de bord régie — Checks',
      'Owner Dashboard — Checks': 'Tableau de bord propriétaire — Checks',
      'How it works': 'Comment ça marche',
      'For agencies': 'Pour les régies',
      'For owners': 'Pour les propriétaires',
      'Sign in': 'Se connecter',
      'Sign out': 'Se déconnecter',
      'Create dossier': 'Créer un dossier',
      'Create tenant dossier': 'Créer un dossier locataire',
      'Register your agency': 'Inscrire votre régie',
      'Swiss rental identity platform': 'Plateforme suisse d’identité locative',
      'One verified dossier.': 'Un dossier vérifié.',
      'Share it': 'Partagez-le',
      'securely': 'en toute sécurité',
      'with anyone.': 'avec qui vous voulez.',
      'The problem': 'Le problème',
      'Three certificate modes': 'Trois modes de certificat',
      'Trust Score': 'Trust Score',
      'Get started today': 'Commencez aujourd’hui',
      'Welcome back': 'Bon retour',
      'Sign in to your tenant, agency, or owner account': 'Connectez-vous à votre compte locataire, régie ou propriétaire',
      'Email address': 'Adresse e-mail',
      'Password': 'Mot de passe',
      'Forgot password?': 'Mot de passe oublié ?',
      'or continue as': 'ou continuer en tant que',
      'New tenant': 'Nouveau locataire',
      'New agency': 'Nouvelle régie',
      'New owner': 'Nouveau propriétaire',
      '← Back to homepage': '← Retour à l’accueil',
      'Register your agency — free': 'Inscrire votre régie — gratuit',
      'Create your tenant account': 'Créer votre compte locataire',
      'First name': 'Prénom',
      'Last name': 'Nom',
      'Confirm password': 'Confirmer le mot de passe',
      'Terms of Service': 'Conditions d’utilisation',
      'Privacy Policy': 'Politique de confidentialité',
      'Create account & continue': 'Créer le compte et continuer',
      'Register as private owner': 'S’inscrire comme propriétaire privé',
      'Private owner plan — free': 'Plan propriétaire privé — gratuit',
      'Create owner account': 'Créer un compte propriétaire',
      'Verify a certificate': 'Vérifier un certificat',
      'Verify a tenant certificate': 'Vérifier un certificat locataire',
      'Certificate code': 'Code du certificat',
      'Verify certificate': 'Vérifier le certificat',
      'Professionals:': 'Professionnels :',
      'Agency': 'Régie',
      'Agency profile': 'Profil régie',
      'Tools': 'Outils',
      'Verify by code': 'Vérifier par code',
      'Certificate inbox': 'Boîte de réception des certificats',
      'Loading…': 'Chargement…',
      'Total certificates': 'Certificats totaux',
      'Score A (Excellent)': 'Score A (Excellent)',
      'Score B (Good)': 'Score B (Bon)',
      'Income eligible': 'Revenu éligible',
      'All Trust Scores': 'Tous les Trust Scores',
      'Score A only': 'Score A seulement',
      'Score B only': 'Score B seulement',
      'Score C only': 'Score C seulement',
      'All properties': 'Tous les biens',
      'Newest first': 'Les plus récents',
      'Oldest first': 'Les plus anciens',
      'Property applied for': 'Bien visé',
      'Eligibility': 'Éligibilité',
      'Cert. date': 'Date cert.',
      'Agency profile not found.': 'Profil de régie introuvable.',
      'No certificates yet.': 'Aucun certificat pour le moment.',
      'View dossier': 'Voir le dossier',
      'Private owner': 'Propriétaire privé',
      'Owner dashboard': 'Tableau de bord propriétaire',
      'Recent lookups': 'Vérifications récentes',
      'Full dossiers unlocked': 'Dossiers complets débloqués',
      'Limited or pending access': 'Accès limités ou en attente',
      'Last activity': 'Dernière activité',
      'No activity': 'Aucune activité',
      'Access modes': 'Modes d’accès',
      'Full access': 'Accès complet',
      'Approval needed': 'Approbation requise',
      'Limited view': 'Vue limitée',
      'Recent certificates viewed': 'Certificats consultés récemment',
      'Certificate': 'Certificat',
      'Outcome': 'Résultat',
      'Viewed': 'Consulté',
      'No certificates viewed yet.': 'Aucun certificat consulté pour le moment.',
      'Open': 'Ouvrir',
      'Please wait…': 'Veuillez patienter…',
      'Passwords do not match.': 'Les mots de passe ne correspondent pas.',
      'Please enter the full 12-character code (STD-XXXX-XXXX).': 'Veuillez saisir le code complet à 12 caractères (STD-XXXX-XXXX).',
      'Repeat': 'Répéter',
      'Repeat password': 'Répéter le mot de passe',
      'Minimum 8 characters': 'Minimum 8 caractères',
      '✓ Copied': '✓ Copié',
      'Save profile': 'Enregistrer le profil',
      '✓ Saved': '✓ Enregistré'
    },
    de: {
      'Checks — Verified Tenant Dossiers': 'Checks — Verifizierte Mieterdossiers',
      'Verify a certificate — Checks': 'Zertifikat prüfen — Checks',
      'Sign in — Checks': 'Anmelden — Checks',
      'Agency Dashboard — Checks': 'Verwaltungs-Dashboard — Checks',
      'Owner Dashboard — Checks': 'Eigentümer-Dashboard — Checks',
      'How it works': 'So funktioniert es',
      'For agencies': 'Für Verwaltungen',
      'For owners': 'Für Eigentümer',
      'Sign in': 'Anmelden',
      'Sign out': 'Abmelden',
      'Create dossier': 'Dossier erstellen',
      'Create tenant dossier': 'Mieterdossier erstellen',
      'Register your agency': 'Ihre Verwaltung registrieren',
      'The problem': 'Das Problem',
      'Three certificate modes': 'Drei Zertifikatsmodi',
      'Get started today': 'Heute starten',
      'Welcome back': 'Willkommen zurück',
      'Email address': 'E-Mail-Adresse',
      'Password': 'Passwort',
      'Forgot password?': 'Passwort vergessen?',
      'New tenant': 'Neuer Mieter',
      'New agency': 'Neue Verwaltung',
      'New owner': 'Neuer Eigentümer',
      'Confirm password': 'Passwort bestätigen',
      'Terms of Service': 'Nutzungsbedingungen',
      'Privacy Policy': 'Datenschutzerklärung',
      'Create account & continue': 'Konto erstellen und fortfahren',
      'Verify a certificate': 'Zertifikat prüfen',
      'Verify a tenant certificate': 'Mieterzertifikat prüfen',
      'Certificate code': 'Zertifikatscode',
      'Verify certificate': 'Zertifikat prüfen',
      'Agency': 'Verwaltung',
      'Agency profile': 'Verwaltungsprofil',
      'Tools': 'Werkzeuge',
      'Verify by code': 'Per Code prüfen',
      'Certificate inbox': 'Zertifikatseingang',
      'Loading…': 'Wird geladen…',
      'Total certificates': 'Zertifikate gesamt',
      'No certificates yet.': 'Noch keine Zertifikate.',
      'View dossier': 'Dossier ansehen',
      'Private owner': 'Privateigentümer',
      'Owner dashboard': 'Eigentümer-Dashboard',
      'Recent lookups': 'Letzte Prüfungen',
      'Last activity': 'Letzte Aktivität',
      'No activity': 'Keine Aktivität',
      'Recent certificates viewed': 'Zuletzt angesehene Zertifikate',
      'Certificate': 'Zertifikat',
      'Outcome': 'Ergebnis',
      'Viewed': 'Angesehen',
      'Open': 'Öffnen',
      'Please wait…': 'Bitte warten…',
      'Passwords do not match.': 'Die Passwörter stimmen nicht überein.',
      'Please enter the full 12-character code (STD-XXXX-XXXX).': 'Bitte geben Sie den vollständigen 12-stelligen Code ein (STD-XXXX-XXXX).',
      '✓ Copied': '✓ Kopiert',
      'Save profile': 'Profil speichern',
      '✓ Saved': '✓ Gespeichert'
    },
    it: {
      'Checks — Verified Tenant Dossiers': 'Checks — Dossier locatari verificati',
      'Verify a certificate — Checks': 'Verifica un certificato — Checks',
      'Sign in — Checks': 'Accedi — Checks',
      'Agency Dashboard — Checks': 'Dashboard agenzia — Checks',
      'Owner Dashboard — Checks': 'Dashboard proprietario — Checks',
      'How it works': 'Come funziona',
      'For agencies': 'Per le agenzie',
      'For owners': 'Per i proprietari',
      'Sign in': 'Accedi',
      'Sign out': 'Esci',
      'Create dossier': 'Crea dossier',
      'Create tenant dossier': 'Crea dossier locatario',
      'Register your agency': 'Registra la tua agenzia',
      'The problem': 'Il problema',
      'Three certificate modes': 'Tre modalità di certificato',
      'Get started today': 'Inizia oggi',
      'Welcome back': 'Bentornato',
      'Email address': 'Indirizzo e-mail',
      'Password': 'Password',
      'Forgot password?': 'Password dimenticata?',
      'New tenant': 'Nuovo locatario',
      'New agency': 'Nuova agenzia',
      'New owner': 'Nuovo proprietario',
      'Confirm password': 'Conferma password',
      'Terms of Service': 'Termini di servizio',
      'Privacy Policy': 'Informativa sulla privacy',
      'Create account & continue': 'Crea account e continua',
      'Verify a certificate': 'Verifica un certificato',
      'Verify a tenant certificate': 'Verifica un certificato locatario',
      'Certificate code': 'Codice certificato',
      'Verify certificate': 'Verifica certificato',
      'Agency': 'Agenzia',
      'Agency profile': 'Profilo agenzia',
      'Tools': 'Strumenti',
      'Verify by code': 'Verifica tramite codice',
      'Certificate inbox': 'Posta certificati',
      'Loading…': 'Caricamento…',
      'Total certificates': 'Certificati totali',
      'No certificates yet.': 'Nessun certificato per ora.',
      'View dossier': 'Apri dossier',
      'Private owner': 'Proprietario privato',
      'Owner dashboard': 'Dashboard proprietario',
      'Recent lookups': 'Verifiche recenti',
      'Last activity': 'Ultima attività',
      'No activity': 'Nessuna attività',
      'Recent certificates viewed': 'Certificati visualizzati di recente',
      'Certificate': 'Certificato',
      'Outcome': 'Esito',
      'Viewed': 'Visualizzato',
      'Open': 'Apri',
      'Please wait…': 'Attendere…',
      'Passwords do not match.': 'Le password non corrispondono.',
      'Please enter the full 12-character code (STD-XXXX-XXXX).': 'Inserisci il codice completo di 12 caratteri (STD-XXXX-XXXX).',
      '✓ Copied': '✓ Copiato',
      'Save profile': 'Salva profilo',
      '✓ Saved': '✓ Salvato'
    },
  };

  const TEMPLATES = {
    en: {},
    fr: {
      owner_dashboard_welcome: 'Bon retour, {name}. Vérifiez des codes, ouvrez des dossiers et consultez vos vérifications récentes.',
      agency_dashboard_subtitle: 'Locataires ayant dirigé leur certificat Checks vers {agencyName}.',
      cert_issued_directed: 'Certificat émis le {date} · Dirigé vers : {target}',
      cert_open_banner: '🌐 Certificat Ouvert — dossier complet accessible · {viewerName}',
      cert_directed_banner: '🎯 Ciblé — {viewerName} — Accès complet au dossier'
    },
    de: {
      owner_dashboard_welcome: 'Willkommen zurück, {name}. Prüfen Sie Codes, öffnen Sie Dossiers und sehen Sie Ihre letzten Prüfungen.',
      agency_dashboard_subtitle: 'Mieter, die ihr Checks-Zertifikat an {agencyName} gerichtet haben.',
      cert_issued_directed: 'Zertifikat ausgestellt am {date} · Gerichtet an: {target}',
      cert_open_banner: '🌐 Offenes Zertifikat — vollständiges Dossier zugänglich · {viewerName}',
      cert_directed_banner: '🎯 Gerichtet — {viewerName} — Voller Dossierzugriff'
    },
    it: {
      owner_dashboard_welcome: 'Bentornato, {name}. Verifica i codici, apri i dossier e consulta le tue verifiche recenti.',
      agency_dashboard_subtitle: 'Locatari che hanno indirizzato il loro certificato Checks a {agencyName}.',
      cert_issued_directed: 'Certificato emesso il {date} · Indirizzato a: {target}',
      cert_open_banner: '🌐 Certificato Aperto — dossier completo accessibile · {viewerName}',
      cert_directed_banner: '🎯 Diretto — {viewerName} — Accesso completo al dossier'
    },
  };

  const PATTERNS = {
    fr: [
      [/^Welcome back, (.+)\. Verify codes, open dossiers, and review your recent checks\.$/, (_, name) => `Bon retour, ${name}. Vérifiez des codes, ouvrez des dossiers et consultez vos vérifications récentes.`],
      [/^Tenants who have directed their Checks certificate to (.+)\.$/, (_, agencyName) => `Locataires ayant dirigé leur certificat Checks vers ${agencyName}.`],
      [/^Certificate issued (.+) · Directed to: (.+)$/, (_, date, target) => `Certificat émis le ${date} · Dirigé vers : ${target}`],
      [/^🌐 Open certificate — full dossier accessible · (.+)$/, (_, viewerName) => `🌐 Certificat Ouvert — dossier complet accessible · ${viewerName}`],
      [/^🎯 Directed — (.+) — Full dossier access$/, (_, viewerName) => `🎯 Ciblé — ${viewerName} — Accès complet au dossier`]
    ],
    de: [
      [/^Welcome back, (.+)\. Verify codes, open dossiers, and review your recent checks\.$/, (_, name) => `Willkommen zurück, ${name}. Prüfen Sie Codes, öffnen Sie Dossiers und sehen Sie Ihre letzten Prüfungen.`],
      [/^Tenants who have directed their Checks certificate to (.+)\.$/, (_, agencyName) => `Mieter, die ihr Checks-Zertifikat an ${agencyName} gerichtet haben.`],
      [/^Certificate issued (.+) · Directed to: (.+)$/, (_, date, target) => `Zertifikat ausgestellt am ${date} · Gerichtet an: ${target}`],
      [/^🌐 Open certificate — full dossier accessible · (.+)$/, (_, viewerName) => `🌐 Offenes Zertifikat — vollständiges Dossier zugänglich · ${viewerName}`],
      [/^🎯 Directed — (.+) — Full dossier access$/, (_, viewerName) => `🎯 Gerichtet — ${viewerName} — Voller Dossierzugriff`]
    ],
    it: [
      [/^Welcome back, (.+)\. Verify codes, open dossiers, and review your recent checks\.$/, (_, name) => `Bentornato, ${name}. Verifica i codici, apri i dossier e consulta le tue verifiche recenti.`],
      [/^Tenants who have directed their Checks certificate to (.+)\.$/, (_, agencyName) => `Locatari che hanno indirizzato il loro certificato Checks a ${agencyName}.`],
      [/^Certificate issued (.+) · Directed to: (.+)$/, (_, date, target) => `Certificato emesso il ${date} · Indirizzato a: ${target}`],
      [/^🌐 Open certificate — full dossier accessible · (.+)$/, (_, viewerName) => `🌐 Certificato Aperto — dossier completo accessibile · ${viewerName}`],
      [/^🎯 Directed — (.+) — Full dossier access$/, (_, viewerName) => `🎯 Diretto — ${viewerName} — Accesso completo al dossier`]
    ],
  };

  function getInitialLanguage() {
    // 1. URL ?lang= param (highest priority — enables shareable localised links)
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (SUPPORTED.includes(urlLang)) return urlLang;
    // 2. localStorage (persists across pages)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    // 3. Browser language hint
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : 'en';
  }

  function updateUrl(lang) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      history.replaceState(null, '', url.toString());
    } catch (_) {
      // history API unavailable (e.g. file:// in some browsers)
    }
  }

  let currentLanguage = getInitialLanguage();
  let isApplying = false;

  function translateString(source) {
    if (!source || currentLanguage === 'en') return source;
    const exact = EXACT[currentLanguage]?.[source];
    if (exact) return exact;
    const patterns = PATTERNS[currentLanguage] || [];
    for (const [regex, replacer] of patterns) {
      if (regex.test(source)) return source.replace(regex, replacer);
    }
    return source;
  }

  function translateTextNode(node) {
    const original = node.__stOriginalText ?? node.nodeValue;
    node.__stOriginalText = original;
    const trimmed = original.trim();
    if (!trimmed) return;
    const translated = translateString(trimmed);
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    if (translated === trimmed) {
      node.nodeValue = original; // restore original when switching back to English
      return;
    }
    node.nodeValue = `${leading}${translated}${trailing}`;
  }

  function translateAttribute(el, attr) {
    const key = `stOriginal${attr.charAt(0).toUpperCase()}${attr.slice(1)}`;
    const original = el.dataset[key] ?? el.getAttribute(attr);
    if (!original) return;
    el.dataset[key] = original;
    const translated = translateString(original);
    if (translated && translated !== original) el.setAttribute(attr, translated);
    else if (currentLanguage === 'en') el.setAttribute(attr, original);
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script, style, textarea, .st-lang-switcher'));
  }

  function applyTranslations(root = document.body) {
    if (isApplying) return;
    isApplying = true;

    document.documentElement.lang = currentLanguage;
    const originalTitle = document.documentElement.dataset.stOriginalTitle ?? document.title;
    document.documentElement.dataset.stOriginalTitle = originalTitle;
    document.title = translateString(originalTitle);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!shouldSkipNode(node)) translateTextNode(node);
    }

    root.querySelectorAll('*').forEach((el) => {
      translateAttribute(el, 'placeholder');
      translateAttribute(el, 'title');
      translateAttribute(el, 'aria-label');
    });

    isApplying = false;
  }

  function formatTemplate(key, vars = {}) {
    const template = TEMPLATES[currentLanguage]?.[key] || TEMPLATES.en?.[key];
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
  }

  function injectSwitcher() {
    const navLinks = document.querySelector('.nav__links');
    if (!navLinks || navLinks.querySelector('.st-lang-switcher')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'st-lang-switcher';

    FRONTEND_LANGS.forEach((lang) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'st-lang-btn' + (lang === currentLanguage ? ' st-lang-btn--active' : '');
      btn.dataset.lang = lang;
      btn.textContent = lang.toUpperCase();
      btn.addEventListener('click', () => setLanguage(lang));
      wrapper.appendChild(btn);
    });

    navLinks.prepend(wrapper);
  }

  function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLanguage = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    updateUrl(lang);
    applyTranslations(document.body);
    // Update active button state
    document.querySelectorAll('.st-lang-btn').forEach(btn => {
      btn.classList.toggle('st-lang-btn--active', btn.dataset.lang === lang);
    });
  }

  function init() {
    // Reflect the active language in the URL immediately (even if set via localStorage/browser)
    updateUrl(currentLanguage);
    injectSwitcher();
    applyTranslations(document.body);

    // Only re-translate when new nodes are added (e.g. dynamic Supabase content).
    // Do NOT observe characterData — that would re-trigger on every text node
    // change we make ourselves, causing an infinite loop.
    const observer = new MutationObserver((mutations) => {
      const hasNewNodes = mutations.some(
        (m) => m.type === 'childList' && m.addedNodes.length > 0
      );
      if (hasNewNodes) applyTranslations(document.body);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.stI18n = {
    t: translateString,
    template: formatTemplate,
    getLanguage: () => currentLanguage,
    setLanguage,
    apply: () => applyTranslations(document.body),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

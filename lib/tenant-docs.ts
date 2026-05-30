// Document type registry + nationality map for the tenant documents page.

export type DocTypeDef = {
  key: string;
  label: string;
  icon: string;
  hint: string;
};

export function passportLabel(isSwiss: boolean): string {
  return isSwiss ? "Passport or Swiss ID" : "Passport";
}

export function passportHint(isSwiss: boolean): string {
  return isSwiss ? "Upload your passport or Swiss identity card." : "Upload your passport.";
}

export const DOC_TYPES: Record<string, DocTypeDef> = {
  passport_id: { key: "passport_id", label: "Passport", icon: "🪪", hint: "Upload your passport." },
  residence_permit: {
    key: "residence_permit",
    label: "Residence permit",
    icon: "📋",
    hint: "Required for B, C, G, L permit holders.",
  },
  betreibungsauszug: {
    key: "betreibungsauszug",
    label: "Extract from the debt enforcement register",
    icon: "⚖️",
    hint: "Must be issued within the last 3 months. Request it from your cantonal debt enforcement office (Betreibungsamt / Office des poursuites / Ufficio d'esecuzione).",
  },
  salary_slip_1: {
    key: "salary_slip_1",
    label: "Salary slip — most recent month",
    icon: "💰",
    hint: "Your most recent monthly salary slip.",
  },
  salary_slip_2: {
    key: "salary_slip_2",
    label: "Salary slip — 2nd most recent month",
    icon: "💰",
    hint: "The month before your most recent slip.",
  },
  salary_slip_3: {
    key: "salary_slip_3",
    label: "Salary slip — 3rd most recent month",
    icon: "💰",
    hint: "The oldest of the three required salary slips.",
  },
  balance_sheet: {
    key: "balance_sheet",
    label: "Balance sheets & P&L statements",
    icon: "📊",
    hint: "Last 2 years of balance sheets and profit & loss statements.",
  },
  tax_assessment: {
    key: "tax_assessment",
    label: "Tax assessment notice",
    icon: "🧾",
    hint: "Most recent tax assessment notice (avis de taxation / Steuerveranlagung).",
  },
  bank_statement: {
    key: "bank_statement",
    label: "Bank statements",
    icon: "🏦",
    hint: "Last 3 months of business bank account statements.",
  },
  net_income_proof: {
    key: "net_income_proof",
    label: "Net income proof",
    icon: "💵",
    hint: "Document confirming your net annual income (e.g. accountant letter, official statement).",
  },
  turnover_proof: {
    key: "turnover_proof",
    label: "Turnover / Revenue proof",
    icon: "📈",
    hint: "Document showing your annual turnover or revenue figures.",
  },
  avs_affiliation: {
    key: "avs_affiliation",
    label: "AVS/SVA affiliation certificate",
    icon: "🏛️",
    hint: "Certificate of affiliation with the social security office (Caisse de compensation AVS / SVA-Ausgleichskasse).",
  },
  commercial_register: {
    key: "commercial_register",
    label: "Extract from the Commercial Register",
    icon: "📝",
    hint: "Recent extract from the Swiss Commercial Register (Registre du commerce / Handelsregister) — order at zefix.ch.",
  },
  unemployment_benefit_1: {
    key: "unemployment_benefit_1",
    label: "Unemployment benefit statement — most recent month",
    icon: "📑",
    hint: "Your most recent monthly unemployment benefit statement (indemnités chômage / Arbeitslosengeld).",
  },
  unemployment_benefit_2: {
    key: "unemployment_benefit_2",
    label: "Unemployment benefit statement — 2nd most recent month",
    icon: "📑",
    hint: "The month before your most recent benefit statement.",
  },
  unemployment_benefit_3: {
    key: "unemployment_benefit_3",
    label: "Unemployment benefit statement — 3rd most recent month",
    icon: "📑",
    hint: "The oldest of the three required benefit statements.",
  },
  welfare_rent_coverage: {
    key: "welfare_rent_coverage",
    label: "Certificate of rent coverage",
    icon: "🏛️",
    hint: "Certificate from your social assistance organisation (e.g. Hospice général – Geneva, CSR – Vaud) confirming rent coverage.",
  },
  guarantor_id: {
    key: "guarantor_id",
    label: "Guarantor — Passport or ID",
    icon: "🪪",
    hint: "Passport or identity card of the guarantor.",
  },
  guarantor_betreibungsauszug: {
    key: "guarantor_betreibungsauszug",
    label: "Guarantor — Debt enforcement register extract",
    icon: "⚖️",
    hint: "Must be issued within the last 3 months — for the guarantor.",
  },
  guarantor_salary_slip_1: {
    key: "guarantor_salary_slip_1",
    label: "Guarantor — Salary slip (most recent)",
    icon: "💰",
    hint: "Most recent monthly salary slip of the guarantor.",
  },
  guarantor_salary_slip_2: {
    key: "guarantor_salary_slip_2",
    label: "Guarantor — Salary slip (2nd most recent)",
    icon: "💰",
    hint: "2nd most recent monthly salary slip of the guarantor.",
  },
  guarantor_salary_slip_3: {
    key: "guarantor_salary_slip_3",
    label: "Guarantor — Salary slip (3rd most recent)",
    icon: "💰",
    hint: "3rd most recent monthly salary slip of the guarantor.",
  },
  guarantor_balance_sheet: {
    key: "guarantor_balance_sheet",
    label: "Guarantor — Balance sheets & P&L",
    icon: "📊",
    hint: "Balance sheets and profit & loss statement of the guarantor (last 2 years).",
  },
  guarantor_tax_assessment: {
    key: "guarantor_tax_assessment",
    label: "Guarantor — Tax assessment notice",
    icon: "🧾",
    hint: "Most recent tax assessment notice for the guarantor.",
  },
  guarantor_bank_statement: {
    key: "guarantor_bank_statement",
    label: "Guarantor — Bank statements",
    icon: "🏦",
    hint: "Last 3 months of bank statements for the guarantor.",
  },
  guarantor_net_income_proof: {
    key: "guarantor_net_income_proof",
    label: "Guarantor — Net income proof",
    icon: "💵",
    hint: "Official attestation of net income for the guarantor.",
  },
};

export type DocSection = {
  title: string;
  subtitle?: string;
  types: DocTypeDef[];
};

export type TenantSelector = {
  isSwiss: boolean;
  needsGuarantor: boolean;
  guarantorIsEmployee: boolean;
  guarantorIsSelfEmployed: boolean;
  isEmployee: boolean;
  isSelfEmployed: boolean;
  isUnemployed: boolean;
  isOnWelfare: boolean;
};

export function buildDocSections(s: TenantSelector): DocSection[] {
  const sections: DocSection[] = [];

  const identity: DocTypeDef[] = [
    { ...DOC_TYPES.passport_id, label: passportLabel(s.isSwiss), hint: passportHint(s.isSwiss) },
  ];
  if (!s.isSwiss) identity.push(DOC_TYPES.residence_permit);
  identity.push(DOC_TYPES.betreibungsauszug);
  sections.push({ title: "Identity documents", types: identity });

  if (s.needsGuarantor) {
    const types = [DOC_TYPES.guarantor_id, DOC_TYPES.guarantor_betreibungsauszug];
    if (s.guarantorIsEmployee) {
      types.push(DOC_TYPES.guarantor_salary_slip_1);
      types.push(DOC_TYPES.guarantor_salary_slip_2);
      types.push(DOC_TYPES.guarantor_salary_slip_3);
    }
    if (s.guarantorIsSelfEmployed) {
      types.push(DOC_TYPES.guarantor_balance_sheet);
      types.push(DOC_TYPES.guarantor_tax_assessment);
      types.push(DOC_TYPES.guarantor_bank_statement);
      types.push(DOC_TYPES.guarantor_net_income_proof);
    }
    sections.push({
      title: "Guarantor documents",
      subtitle: "Your guarantor must provide the following documents.",
      types,
    });
    return sections;
  }

  if (s.isEmployee) {
    sections.push({
      title: "Proof of income — Employee",
      subtitle: "Three consecutive months of salary slips.",
      types: [DOC_TYPES.salary_slip_1, DOC_TYPES.salary_slip_2, DOC_TYPES.salary_slip_3],
    });
  }
  if (s.isSelfEmployed) {
    sections.push({
      title: "Proof of income — Self-employed",
      subtitle: "Financial statements and income evidence for self-employed applicants.",
      types: [
        DOC_TYPES.balance_sheet,
        DOC_TYPES.tax_assessment,
        DOC_TYPES.bank_statement,
        DOC_TYPES.net_income_proof,
        DOC_TYPES.turnover_proof,
      ],
    });
    sections.push({
      title: "Proof of self-employed status",
      subtitle: "Official documents confirming your independent activity.",
      types: [DOC_TYPES.avs_affiliation, DOC_TYPES.commercial_register],
    });
  }
  if (s.isUnemployed) {
    sections.push({
      title: "Proof of income — Unemployment benefits",
      subtitle: "Three consecutive months of unemployment benefit statements.",
      types: [
        DOC_TYPES.unemployment_benefit_1,
        DOC_TYPES.unemployment_benefit_2,
        DOC_TYPES.unemployment_benefit_3,
      ],
    });
  }
  if (s.isOnWelfare) {
    sections.push({
      title: "Social assistance / Welfare",
      subtitle:
        "Certificate confirming rent coverage from a social assistance organisation (e.g. Hospice général – Geneva, CSR – Vaud).",
      types: [DOC_TYPES.welfare_rent_coverage],
    });
  }
  return sections;
}

const NATIONALITY_MAP: Record<string, string> = {
  che: "Swiss", ch: "Swiss", switzerland: "Swiss", suisse: "Swiss", schweiz: "Swiss", svizzera: "Swiss",
  alb: "Albanian", al: "Albanian", albania: "Albanian",
  aut: "Austrian", at: "Austrian", austria: "Austrian",
  bel: "Belgian", be: "Belgian", belgium: "Belgian", belgique: "Belgian", belgien: "Belgian",
  bih: "Bosnian", ba: "Bosnian", bosnia: "Bosnian", "bosnia and herzegovina": "Bosnian",
  bgr: "Bulgarian", bg: "Bulgarian", bulgaria: "Bulgarian",
  hrv: "Croatian", hr: "Croatian", croatia: "Croatian",
  cze: "Czech", cz: "Czech", "czech republic": "Czech", czechia: "Czech",
  dnk: "Danish", dk: "Danish", denmark: "Danish",
  nld: "Dutch", nl: "Dutch", netherlands: "Dutch", holland: "Dutch",
  fin: "Finnish", fi: "Finnish", finland: "Finnish",
  fra: "French", fr: "French", france: "French",
  deu: "German", de: "German", germany: "German", deutschland: "German",
  grc: "Greek", gr: "Greek", greece: "Greek",
  hun: "Hungarian", hu: "Hungarian", hungary: "Hungarian",
  irl: "Irish", ie: "Irish", ireland: "Irish",
  ita: "Italian", it: "Italian", italy: "Italian", italia: "Italian",
  xkx: "Kosovan", xk: "Kosovan", kosovo: "Kosovan",
  lva: "Latvian", lv: "Latvian", latvia: "Latvian",
  ltu: "Lithuanian", lt: "Lithuanian", lithuania: "Lithuanian",
  lux: "Luxembourgish", lu: "Luxembourgish", luxembourg: "Luxembourgish",
  mkd: "Macedonian", mk: "Macedonian", "north macedonia": "Macedonian", macedonia: "Macedonian",
  mda: "Moldovan", md: "Moldovan", moldova: "Moldovan",
  mne: "Montenegrin", me: "Montenegrin", montenegro: "Montenegrin",
  nor: "Norwegian", no: "Norwegian", norway: "Norwegian",
  pol: "Polish", pl: "Polish", poland: "Polish",
  prt: "Portuguese", pt: "Portuguese", portugal: "Portuguese",
  rou: "Romanian", ro: "Romanian", romania: "Romanian",
  srb: "Serbian", rs: "Serbian", serbia: "Serbian",
  svk: "Slovak", sk: "Slovak", slovakia: "Slovak",
  svn: "Slovenian", si: "Slovenian", slovenia: "Slovenian",
  esp: "Spanish", es: "Spanish", spain: "Spanish",
  swe: "Swedish", se: "Swedish", sweden: "Swedish",
  tur: "Turkish", tr: "Turkish", turkey: "Turkish", türkiye: "Turkish",
  ukr: "Ukrainian", ua: "Ukrainian", ukraine: "Ukrainian",
  gbr: "British", gb: "British", uk: "British", "united kingdom": "British", "great britain": "British",
  dza: "Algerian", dz: "Algerian", algeria: "Algerian",
  ago: "Angolan", ao: "Angolan", angola: "Angolan",
  cmr: "Cameroonian", cm: "Cameroonian", cameroon: "Cameroonian",
  cod: "Congolese", cd: "Congolese", cog: "Congolese", cg: "Congolese", congo: "Congolese",
  egy: "Egyptian", eg: "Egyptian", egypt: "Egyptian",
  eth: "Ethiopian", et: "Ethiopian", ethiopia: "Ethiopian",
  gha: "Ghanaian", gh: "Ghanaian", ghana: "Ghanaian",
  civ: "Ivorian", ci: "Ivorian", "ivory coast": "Ivorian", "côte d'ivoire": "Ivorian",
  ken: "Kenyan", ke: "Kenyan", kenya: "Kenyan",
  mar: "Moroccan", ma: "Moroccan", morocco: "Moroccan", maroc: "Moroccan",
  nga: "Nigerian", ng: "Nigerian", nigeria: "Nigerian",
  sen: "Senegalese", sn: "Senegalese", senegal: "Senegalese",
  zaf: "South African", za: "South African", "south africa": "South African",
  tza: "Tanzanian", tz: "Tanzanian", tanzania: "Tanzanian",
  tun: "Tunisian", tn: "Tunisian", tunisia: "Tunisian",
  uga: "Ugandan", ug: "Ugandan", uganda: "Ugandan",
  usa: "American", us: "American", "united states": "American", "united states of america": "American",
  arg: "Argentine", ar: "Argentine", argentina: "Argentine",
  bra: "Brazilian", br: "Brazilian", brazil: "Brazilian", brasil: "Brazilian",
  can: "Canadian", ca: "Canadian", canada: "Canadian",
  chl: "Chilean", cl: "Chilean", chile: "Chilean",
  col: "Colombian", co: "Colombian", colombia: "Colombian",
  cub: "Cuban", cu: "Cuban", cuba: "Cuban",
  dom: "Dominican", do: "Dominican", "dominican republic": "Dominican",
  ecu: "Ecuadorian", ec: "Ecuadorian", ecuador: "Ecuadorian",
  mex: "Mexican", mx: "Mexican", mexico: "Mexican", méxico: "Mexican",
  per: "Peruvian", pe: "Peruvian", peru: "Peruvian", perú: "Peruvian",
  ven: "Venezuelan", ve: "Venezuelan", venezuela: "Venezuelan",
  afg: "Afghan", af: "Afghan", afghanistan: "Afghan",
  arm: "Armenian", am: "Armenian", armenia: "Armenian",
  aze: "Azerbaijani", az: "Azerbaijani", azerbaijan: "Azerbaijani",
  bgd: "Bangladeshi", bd: "Bangladeshi", bangladesh: "Bangladeshi",
  chn: "Chinese", cn: "Chinese", china: "Chinese",
  geo: "Georgian", ge: "Georgian", georgia: "Georgian",
  ind: "Indian", in: "Indian", india: "Indian",
  idn: "Indonesian", id: "Indonesian", indonesia: "Indonesian",
  irn: "Iranian", ir: "Iranian", iran: "Iranian",
  irq: "Iraqi", iq: "Iraqi", iraq: "Iraqi",
  isr: "Israeli", il: "Israeli", israel: "Israeli",
  jpn: "Japanese", jp: "Japanese", japan: "Japanese",
  jor: "Jordanian", jo: "Jordanian", jordan: "Jordanian",
  kaz: "Kazakh", kz: "Kazakh", kazakhstan: "Kazakh",
  kor: "Korean", kr: "Korean", "south korea": "Korean", korea: "Korean",
  lbn: "Lebanese", lb: "Lebanese", lebanon: "Lebanese",
  mys: "Malaysian", my: "Malaysian", malaysia: "Malaysian",
  pak: "Pakistani", pk: "Pakistani", pakistan: "Pakistani",
  pse: "Palestinian", ps: "Palestinian", palestine: "Palestinian",
  phl: "Philippine", ph: "Philippine", philippines: "Philippine",
  sau: "Saudi", sa: "Saudi", "saudi arabia": "Saudi",
  lka: "Sri Lankan", lk: "Sri Lankan", "sri lanka": "Sri Lankan",
  syr: "Syrian", sy: "Syrian", syria: "Syrian",
  tha: "Thai", th: "Thai", thailand: "Thai",
  vnm: "Vietnamese", vn: "Vietnamese", vietnam: "Vietnamese", "viet nam": "Vietnamese",
  aus: "Australian", au: "Australian", australia: "Australian",
  nzl: "New Zealander", nz: "New Zealander", "new zealand": "New Zealander",
};

export function normaliseNationality(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return NATIONALITY_MAP[raw.trim().toLowerCase()] || null;
}

export function nameTokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[,\.]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function nameMatchesProfile(ocrRaw: string, profileRaw: string): boolean {
  const ocrSet = new Set(nameTokens(ocrRaw));
  const profileToks = nameTokens(profileRaw);
  return profileToks.length > 0 && profileToks.every((t) => ocrSet.has(t));
}

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export const DOC_STATUS_LABEL: Record<string, string> = {
  pending: "Uploaded — Pending review",
  processing: "Processing…",
  auto_verified: "Auto-verified",
  flagged: "Flagged — Needs review",
  rejected: "Rejected — Please re-upload",
};

export const DOC_STATUS_BADGE: Record<string, string> = {
  pending: "badge badge-amber",
  processing: "badge badge-blue",
  auto_verified: "badge badge-green",
  flagged: "badge badge-amber",
  rejected: "badge badge-red",
};

export function formatOcrKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

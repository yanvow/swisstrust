// Constants for the tenant profile page — nationality options, permit types,
// juridical forms, social assistance organisations.

export const NATIONALITIES: { group: string; options: string[] }[] = [
  { group: "Switzerland", options: ["Swiss"] },
  {
    group: "Europe",
    options: [
      "Albanian", "Austrian", "Belgian", "Bosnian", "Bulgarian", "Croatian", "Czech",
      "Danish", "Dutch", "Finnish", "French", "German", "Greek", "Hungarian", "Irish",
      "Italian", "Kosovan", "Latvian", "Lithuanian", "Luxembourgish", "Macedonian",
      "Moldovan", "Montenegrin", "Norwegian", "Polish", "Portuguese", "Romanian",
      "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Turkish", "Ukrainian",
      "British",
    ],
  },
  {
    group: "Africa",
    options: [
      "Algerian", "Angolan", "Cameroonian", "Congolese", "Egyptian", "Ethiopian",
      "Ghanaian", "Ivorian", "Kenyan", "Moroccan", "Nigerian", "Senegalese",
      "South African", "Tanzanian", "Tunisian", "Ugandan",
    ],
  },
  {
    group: "Americas",
    options: [
      "American", "Argentine", "Brazilian", "Canadian", "Chilean", "Colombian", "Cuban",
      "Dominican", "Ecuadorian", "Mexican", "Peruvian", "Venezuelan",
    ],
  },
  {
    group: "Asia & Middle East",
    options: [
      "Afghan", "Armenian", "Azerbaijani", "Bangladeshi", "Chinese", "Georgian",
      "Indian", "Indonesian", "Iranian", "Iraqi", "Israeli", "Japanese", "Jordanian",
      "Kazakh", "Korean", "Kurdish", "Lebanese", "Malaysian", "Pakistani",
      "Palestinian", "Philippine", "Saudi", "Sri Lankan", "Syrian", "Thai",
      "Vietnamese",
    ],
  },
  { group: "Oceania", options: ["Australian", "New Zealander"] },
];

export const PERMIT_TYPES: { value: string; label: string }[] = [
  { value: "swiss", label: "Swiss citizen" },
  { value: "B", label: "B permit" },
  { value: "C", label: "C permit" },
  { value: "G", label: "G permit" },
  { value: "L", label: "L permit" },
];

export const JURIDICAL_FORMS: { value: string; label: string }[] = [
  { value: "sole_proprietorship", label: "Raison individuelle / Einzelunternehmen" },
  { value: "sarl_gmbh", label: "Sàrl / GmbH" },
  { value: "sa_ag", label: "SA / AG" },
  { value: "association", label: "Association / Verein" },
  { value: "foundation", label: "Fondation / Stiftung" },
  { value: "snc", label: "Société en nom collectif / Kollektivgesellschaft" },
  { value: "sc", label: "Société en commandite / Kommanditgesellschaft" },
  { value: "cooperative", label: "Coopérative / Genossenschaft" },
];

export const WELFARE_ORGS: { group: string; options: { value: string; label: string }[] }[] = [
  { group: "Zurich (ZH)", options: [{ value: "seb_zh", label: "Soziale Einrichtungen und Betriebe (SEB)" }] },
  { group: "Bern (BE)", options: [{ value: "sozialdienste_bern", label: "Soziale Dienste Stadt Bern" }] },
  { group: "Luzern (LU)", options: [{ value: "disg_lu", label: "Dienststelle Soziales und Gesellschaft (DISG)" }] },
  { group: "Uri (UR)", options: [{ value: "sozialamt_ur", label: "Sozialamt Kanton Uri" }] },
  { group: "Schwyz (SZ)", options: [{ value: "afso_sz", label: "Amt für Soziales (AFSO)" }] },
  { group: "Obwalden (OW)", options: [{ value: "fuersorge_ow", label: "Fürsorgebehörde Obwalden" }] },
  { group: "Nidwalden (NW)", options: [{ value: "sozialamt_nw", label: "Amt für Soziales Nidwalden" }] },
  { group: "Glarus (GL)", options: [{ value: "sozialamt_gl", label: "Sozialamt Glarus" }] },
  { group: "Zug (ZG)", options: [{ value: "sozialamt_zg", label: "Amt für Soziales Zug" }] },
  { group: "Fribourg (FR)", options: [{ value: "sasoc_fr", label: "Service de l'action sociale (SASoc)" }] },
  { group: "Solothurn (SO)", options: [{ value: "saso_so", label: "Amt für soziale Sicherheit Solothurn" }] },
  { group: "Basel-Stadt (BS)", options: [{ value: "sozialhilfe_bs", label: "Sozialhilfe Basel-Stadt" }] },
  { group: "Basel-Landschaft (BL)", options: [{ value: "sozialbeitraege_bl", label: "Amt für Sozialbeiträge Basel-Landschaft" }] },
  { group: "Schaffhausen (SH)", options: [{ value: "sozialamt_sh", label: "Sozialamt Schaffhausen" }] },
  { group: "Appenzell Ausserrhoden (AR)", options: [{ value: "sozialamt_ar", label: "Sozialamt Appenzell Ausserrhoden" }] },
  { group: "Appenzell Innerrhoden (AI)", options: [{ value: "sozialamt_ai", label: "Sozialamt Appenzell Innerrhoden" }] },
  { group: "St. Gallen (SG)", options: [{ value: "sozialamt_sg", label: "Amt für Soziales St.Gallen" }] },
  { group: "Graubünden (GR)", options: [{ value: "sozialamt_gr", label: "Amt für Soziales Graubünden" }] },
  { group: "Aargau (AG)", options: [{ value: "dgs_ag", label: "Departement Gesundheit und Soziales Aargau" }] },
  { group: "Thurgau (TG)", options: [{ value: "sozialamt_tg", label: "Amt für Soziales Thurgau" }] },
  { group: "Ticino (TI)", options: [{ value: "dasf_ti", label: "Divisione dell'azione sociale e delle famiglie (DASF)" }] },
  { group: "Vaud (VD)", options: [{ value: "csr_vd", label: "Centre social régional (CSR)" }] },
  { group: "Valais / Wallis (VS)", options: [{ value: "sas_vs", label: "Service de l'action sociale / Dienststelle für Sozialhilfe" }] },
  { group: "Neuchâtel (NE)", options: [{ value: "sai_ne", label: "Service des aides individuelles (SAI)" }] },
  { group: "Genève (GE)", options: [{ value: "hospice_ge", label: "Hospice général" }] },
  { group: "Jura (JU)", options: [{ value: "sas_ju", label: "Service de l'action sociale (SAS)" }] },
];

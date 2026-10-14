export type FeatureKey = "documents" | "document_chat" | "summary_analysis" | "detailed_analysis" | "contract_review" | "clients" | "legal_questions" | "regulatory_tracking" | "source_settings" | "activity_log";
export const FEATURE_CATALOG: readonly { key: FeatureKey; label: string; description: string; requires: readonly FeatureKey[] }[] = [
  { key: "documents", label: "Dokumenti", description: "Učitavanje, registar i radni prostor dokumenta.", requires: [] },
  { key: "document_chat", label: "Razgovor o dokumentu", description: "Pitanja o dokumentima i slikovni prilozi.", requires: ["documents"] },
  { key: "summary_analysis", label: "Sažetak dokumenta", description: "Sažeta obrada i izdvojene ključne činjenice.", requires: ["documents"] },
  { key: "detailed_analysis", label: "Detaljna analiza", description: "Iscrpna analiza odredbi, obveza i rokova.", requires: ["documents"] },
  { key: "contract_review", label: "Provjera ugovora", description: "Pravila za provjeru ugovornih rizika.", requires: ["documents"] },
  { key: "clients", label: "Klijenti", description: "Registar klijenata i povezanih predmeta.", requires: [] },
  { key: "legal_questions", label: "Pravna pitanja", description: "Pravno istraživanje uz dostupne izvore.", requires: [] },
  { key: "regulatory_tracking", label: "Praćenje propisa", description: "Pregled i označavanje regulatornih promjena.", requires: [] },
  { key: "source_settings", label: "Postavke izvora", description: "Pregled izvora i postavke administratora ureda.", requires: [] },
  { key: "activity_log", label: "Zapisnik aktivnosti", description: "Pregled aktivnosti ureda.", requires: [] },
] as const;

export const FEATURE_PRESETS: Record<"core" | "complete", FeatureKey[]> = {
  core: ["documents", "document_chat", "summary_analysis", "clients", "activity_log"],
  complete: FEATURE_CATALOG.map((feature) => feature.key),
};

export function isFeatureKey(value: string): value is FeatureKey {
  return FEATURE_CATALOG.some((feature) => feature.key === value);
}

export function hasFeature(firm: { features: readonly string[] } | null | undefined, key: string): boolean {
  const feature = FEATURE_CATALOG.find((entry) => entry.key === key);
  return Boolean(feature && firm?.features.includes(key) && feature.requires.every((dependency) => firm.features.includes(dependency)));
}

export function validateFeatures(value: unknown): FeatureKey[] {
  if (!Array.isArray(value) || value.some((key) => typeof key !== "string" || !isFeatureKey(key))) {
    throw new Error("Odaberite samo podržane funkcije.");
  }
  const keys = [...new Set(value)] as FeatureKey[];
  for (const feature of FEATURE_CATALOG) {
    if (keys.includes(feature.key) && feature.requires.some((key) => !keys.includes(key))) {
      throw new Error(`Funkcija „${feature.label}” zahtijeva uključene dokumente.`);
    }
  }
  return keys;
}

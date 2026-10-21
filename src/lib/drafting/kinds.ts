/** Client-safe list of documents the drafting assistant can prepare. */

export type DraftKindId = "ugovor-o-djelu" | "ugovor-o-radu" | "nda" | "zakup" | "kupoprodaja" | "punomoc" | "opomena" | "drugo";

export interface DraftKind {
  id: DraftKindId;
  label: string;
  /** Example shown in the description box. */
  hint: string;
  /** Document type stored with the saved draft. */
  docType: "Ugovor" | "Dokument";
}

export const DRAFT_KINDS: DraftKind[] = [
  { id: "ugovor-o-djelu", label: "Ugovor o djelu", docType: "Ugovor", hint: "npr. Studio Jadran d.o.o. izrađuje web-stranicu za Horvat d.o.o. do 1. 12. 2026. za 4.000 EUR + PDV, plaćanje u dva obroka." },
  { id: "ugovor-o-radu", label: "Ugovor o radu", docType: "Ugovor", hint: "npr. Ana Kovač, računovođa na neodređeno, puno radno vrijeme u Zagrebu, bruto plaća 1.800 EUR, probni rad 3 mjeseca." },
  { id: "nda", label: "Ugovor o povjerljivosti", docType: "Ugovor", hint: "npr. obostrani NDA između dvaju društava prije pregovora o suradnji, trajanje 3 godine, ugovorna kazna 10.000 EUR." },
  { id: "zakup", label: "Ugovor o zakupu", docType: "Ugovor", hint: "npr. zakup poslovnog prostora od 80 m² u Splitu na 5 godina, zakupnina 1.200 EUR mjesečno, jamčevina dvije zakupnine." },
  { id: "kupoprodaja", label: "Kupoprodajni ugovor", docType: "Ugovor", hint: "npr. prodaja rabljenog vozila Škoda Octavia 2019. za 14.500 EUR, isplata pri primopredaji." },
  { id: "punomoc", label: "Punomoć", docType: "Dokument", hint: "npr. punomoć odvjetniku za zastupanje u parnici radi naplate duga pred Općinskim sudom u Zagrebu." },
  { id: "opomena", label: "Opomena pred tužbu", docType: "Dokument", hint: "npr. dužnik nije platio račun br. 45/2026 od 3. 8. 2026. na 2.350 EUR; rok za plaćanje 8 dana." },
  { id: "drugo", label: "Drugi dokument", docType: "Dokument", hint: "Opišite koji dokument trebate, tko su strane i što mora sadržavati." },
];

export function draftKind(id: unknown): DraftKind | undefined {
  return DRAFT_KINDS.find((kind) => kind.id === id);
}

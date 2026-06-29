import type { AnalysisMode, ExtractionRequest } from "@/lib/types";

export function n8nSecret(): string {
  return process.env.N8N_SHARED_SECRET || "";
}

/** Webhook URL za odabranu vrstu obrade (uz fallback na zajednički). */
export function webhookUrlFor(mode: AnalysisMode): string {
  const fallback = process.env.N8N_DOC_WEBHOOK_URL || "";
  if (mode === "sazetak") return process.env.N8N_WEBHOOK_SAZETAK || fallback;
  return process.env.N8N_WEBHOOK_DETALJNA || fallback;
}

/** Bazni URL aplikacije (za izradu callbackUrl-a). */
export function getBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export interface FireParams {
  documentId: string;
  jobId: string;
  mode: AnalysisMode;
  filename: string;
  text: string;
  baseUrl: string;
  firmName: string;
  userName: string;
}

/** Šalje dokument n8n-u na obradu odabrane vrste (asinkrono — rezultat stiže na callback). */
export async function fireExtraction(p: FireParams): Promise<void> {
  const url = webhookUrlFor(p.mode);
  if (!url) throw new Error(`Webhook za "${p.mode}" nije postavljen (provjerite env varijable).`);

  const payload: ExtractionRequest = {
    v: 1,
    jobId: p.jobId,
    documentId: p.documentId,
    language: "hr",
    filename: p.filename,
    text: p.text,
    callbackUrl: `${p.baseUrl}/api/n8n/callback`,
    meta: { firm: p.firmName, uploadedBy: p.userName },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ltblaw-secret": n8nSecret() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n webhook vratio ${res.status}`);
}

/** Provjera dijeljene tajne na dolaznom callbacku. */
export function verifySecret(req: Request): boolean {
  const secret = n8nSecret();
  if (!secret) return true;
  return req.headers.get("x-ltblaw-secret") === secret;
}

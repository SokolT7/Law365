import type { DocumentRec, ExtractionRequest } from "@/lib/types";

export function n8nConfig() {
  return {
    webhookUrl: process.env.N8N_DOC_WEBHOOK_URL || "",
    secret: process.env.N8N_SHARED_SECRET || "",
  };
}

/** Bazni URL aplikacije (za izradu callbackUrl-a). */
export function getBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Šalje dokument n8n-u na obradu (asinkrono — n8n vraća rezultat na callback). */
export async function fireExtraction(
  doc: DocumentRec,
  text: string,
  baseUrl: string,
  firmName: string,
  userName: string
): Promise<void> {
  const { webhookUrl, secret } = n8nConfig();
  if (!webhookUrl) throw new Error("N8N_DOC_WEBHOOK_URL nije postavljen.");

  const payload: ExtractionRequest = {
    v: 1,
    jobId: doc.jobId,
    documentId: doc.id,
    language: "hr",
    filename: doc.filename,
    text,
    callbackUrl: `${baseUrl}/api/n8n/callback`,
    meta: { firm: firmName, uploadedBy: userName },
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ltblaw-secret": secret },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`n8n webhook vratio ${res.status}`);
}

/** Provjera dijeljene tajne na dolaznom callbacku. Ako tajna nije postavljena (lokalno), propušta. */
export function verifySecret(req: Request): boolean {
  const { secret } = n8nConfig();
  if (!secret) return true;
  return req.headers.get("x-ltblaw-secret") === secret;
}

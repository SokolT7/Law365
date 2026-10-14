import { NextResponse } from "next/server";
import { AccessError, apiError, ensureSameOrigin, requireFeature, requireSession } from "@/lib/auth";
import type { FeatureKey } from "@/lib/features";

/** Authorization is repeated on every request; navigation visibility is not a security boundary. */
export function apiRoute<T extends unknown[]>(feature: FeatureKey | null, handler: (req: Request, ...args: T) => Promise<Response>) {
  return async (req: Request, ...args: T): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") ensureSameOrigin(req);
      if (feature) await requireFeature(feature); else await requireSession();
      const response = await handler(req, ...args);
      if (feature) await requireFeature(feature); else await requireSession();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof SyntaxError) return NextResponse.json({error:"Neispravan zahtjev."},{status:400});
      return apiError(error);
    }
  };
}

/** Bound multipart data before parsing so chunked requests cannot bypass upload limits. */
export async function readUploadForm(request: Request): Promise<FormData> {
  const maxBytes = 26 * 1024 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Datoteka nije priložena.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new AccessError(413, "Zahtjev je prevelik."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData(); }
  catch { throw new AccessError(400, "Neispravan format datoteka."); }
}

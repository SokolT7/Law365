import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import { AccessError, readFirmData, writeFirmData } from "@/lib/platform";
import type { DB } from "@/lib/types";

/**
 * Public demo firm data. Serverless functions do not share a disk, so each visitor's copy of the demo firm
 * lives in Redis under an anonymous visitor cookie (set by middleware) and starts from the bundled seed.
 * Visitors never see each other's changes, and an untouched copy expires.
 */
export const VISITOR_COOKIE = "ltb_demo_visitor";
const TTL_SECONDS = 3 * 24 * 60 * 60;

let client: Redis | undefined;
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
/** Without Redis (a local single-process run) the instance's own copy is enough. */
const hasRedis = () => Boolean(url() && token());
function redis(): Redis {
  return (client ??= new Redis({ url: url()!, token: token()! }));
}

async function key(firmId: string): Promise<string> {
  const visitor = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) throw new AccessError(400, "Osvježite stranicu za početak demonstracije.");
  return `ltb:public-demo:v1:${visitor}:${firmId}`;
}

export async function readDemoFirmData(firmId: string): Promise<{ data: DB; revision: number } | null> {
  if (!hasRedis()) return readFirmData(firmId);
  const stored = await redis().get<{ data: DB; revision: number }>(await key(firmId));
  return stored ?? readFirmData(firmId);
}

export async function writeDemoFirmData(firmId: string, data: DB, expectedRevision: number): Promise<number> {
  if (!hasRedis()) return writeFirmData(firmId, data, expectedRevision);
  if (data.firm.id !== firmId) throw new AccessError(403, "Podaci ne pripadaju ovom uredu.");
  const k = await key(firmId);
  const current = (await redis().get<{ revision: number }>(k))?.revision ?? readFirmData(firmId)?.revision ?? 0;
  if (current !== expectedRevision) throw new AccessError(409, "Podaci su upravo promijenjeni. Osvježite stranicu i pokušajte ponovno.");
  try {
    await redis().set(k, { data, revision: expectedRevision + 1 }, { ex: TTL_SECONDS });
  } catch {
    throw new AccessError(413, "Demonstracijski prostor je pun. Uklonite veće dokumente ili otvorite demo u novom pregledniku.");
  }
  return expectedRevision + 1;
}

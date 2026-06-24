import type { Mode } from "@/lib/types";

/** "live" ako je postavljen ANTHROPIC_API_KEY, inače "demo". */
export function getMode(): Mode {
  return process.env.ANTHROPIC_API_KEY ? "live" : "demo";
}

export function getModel(): string {
  return process.env.LTBLAW_MODEL || "claude-opus-4-8";
}

/** Lijeno učitava Anthropic SDK; baca ako paket ili ključ nisu dostupni. */
export async function getClient() {
  const mod = await import("@anthropic-ai/sdk");
  const Anthropic = mod.default;
  return new Anthropic();
}

/** Pomoćnik: izvlači čisti tekst iz odgovora Messages API-ja. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function textOf(message: any): string {
  if (!message?.content) return "";
  return message.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((b: any) => b.type === "text")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

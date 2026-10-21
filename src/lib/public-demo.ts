import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Public demo (`LTB_PUBLIC_DEMO=1`): a read-and-play copy of LTB Law for ephemeral hosting such as Vercel.
 * It runs only on the bundled sample databases in /demo, copied to the instance's temporary disk, so
 * changes last until the instance restarts and never touch real firm data. Never set it for a real firm.
 */
export function isPublicDemo(): boolean {
  return process.env.LTB_PUBLIC_DEMO === "1";
}

/** Path of a writable copy of a bundled demo database (created on first use per instance). */
export function publicDemoFile(name: "platform.sqlite" | "legal.sqlite"): string {
  const target = path.join(tmpdir(), "ltb-demo", name);
  if (!existsSync(target)) {
    mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    copyFileSync(path.join(process.cwd(), "demo", name), target);
  }
  return target;
}

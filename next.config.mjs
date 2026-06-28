import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse / mammoth are server-only; keep them external to the bundle
  serverExternalPackages: ["pdf-parse", "mammoth"],
  // pin the tracing root to this app (a stray lockfile in the home dir confuses inference)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

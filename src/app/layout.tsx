import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { readDB } from "@/lib/db";
import { getMode } from "@/lib/ai/client";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  axes: ["opsz"],
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "LTBLaw — AI pravni sustav",
  description: "AI sustav za analizu pravnih dokumenata za odvjetnička društva.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await readDB();
  const mode = getMode();

  return (
    <html lang="hr" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="app">
          <Sidebar
            firmName={db.firm.name}
            mode={mode}
            userName={db.user.name}
            userRole={db.user.role}
          />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}

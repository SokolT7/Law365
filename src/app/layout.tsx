import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { readDB } from "@/lib/db";
import { getMode } from "@/lib/ai/client";

export const metadata: Metadata = {
  title: "LTBLaw — AI pravni sustav",
  description: "AI sustav za pregled ugovora i praćenje propisa za odvjetnička društva.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const db = readDB();
  const mode = getMode();

  return (
    <html lang="hr">
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

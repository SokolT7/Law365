import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { FeedbackProvider } from "@/components/Feedback";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "LTB Law — Privatni radni prostor", template: "%s · LTB Law" },
  description: "Privatni radni prostor za odvjetnička društva.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F6F7F9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="hr" className={inter.variable}><body><FeedbackProvider>{children}</FeedbackProvider></body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustAgent AI",
  description: "Automate enterprise security questionnaires with AI, grounded in your own policies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

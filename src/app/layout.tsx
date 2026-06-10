import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureApp — Web Security Scanner",
  description: "OWASP, SANS Top 25, CWE, NIST, PCI-DSS & GDPR compliant security scanner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#080d16] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

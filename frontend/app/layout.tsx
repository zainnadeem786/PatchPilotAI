import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatchPilot AI — Agentic Software Engineering",
  description: "Autonomous patch generation, regression testing, and security analysis for modern software repositories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-950 text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}

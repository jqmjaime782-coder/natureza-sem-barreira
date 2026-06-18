import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Natureza Sem Barreiras — ADEMO-Sofala",
  description: "Sistema de recolha de dados de acessibilidade — Gorongosa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Carga Máquina — Injetoras",
  description: "Planejamento de carga, apontamento e OEE para injetoras de plástico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex flex-col md:flex-row">
          <aside className="md:w-[220px] md:min-h-screen bg-panel border-b md:border-b-0 md:border-r border-border p-4 shrink-0">
            <div className="mb-5">
              <div className="text-[15px] font-semibold leading-tight">Carga Máquina</div>
              <div className="text-[11px] text-muted">Injeção de plástico · PCP</div>
            </div>
            <Nav />
          </aside>
          <main className="flex-1 p-6 max-w-[1280px] w-full mx-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

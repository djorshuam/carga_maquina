import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { QueryProvider } from "@/components/providers/QueryProvider";

const PORTFOLIO_URL = "https://djorshuam.github.io/jtech-portfolio/";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Carga Máquina — Injetoras",
  description: "Planejamento de carga, apontamento e OEE para injetoras de plástico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <QueryProvider>
          <div className="min-h-screen flex flex-col md:flex-row">
            <aside className="md:w-[220px] md:min-h-screen bg-panel border-b md:border-b-0 md:border-r border-border p-4 shrink-0">
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-5 flex items-center gap-2.5 group"
                title="Portfólio JTECH"
              >
                <Image
                  src="/jtech-logo.jpg"
                  alt="JTECH"
                  width={36}
                  height={36}
                  className="rounded-lg object-cover shrink-0"
                  style={{ objectPosition: "50% 30%" }}
                />
                <div>
                  <div className="text-[15px] font-semibold leading-tight group-hover:text-blue transition-colors">Carga Máquina</div>
                  <div className="text-[11px] text-muted">Injeção de plástico · PCP</div>
                </div>
              </a>
              <Nav />
            </aside>
            <main className="flex-1 p-6 max-w-[1280px] w-full mx-auto">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}

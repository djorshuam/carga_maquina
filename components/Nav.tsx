"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Planejamento",
    items: [
      { href: "/", label: "Carga (Gantt)" },
      { href: "/pedidos", label: "Demanda / Pedidos" },
      { href: "/operadores", label: "Operadores" },
    ],
  },
  {
    title: "Chão de fábrica",
    items: [
      { href: "/apontamentos", label: "Apontamento" },
      { href: "/oee", label: "Painel OEE" },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/maquinas", label: "Máquinas" },
      { href: "/moldes", label: "Moldes / Ciclo" },
      { href: "/receitas", label: "Receitas" },
      { href: "/materiais", label: "Matéria-prima" },
      { href: "/turnos", label: "Turnos / Calendário" },
    ],
  },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="section-title !mt-0">{g.title}</div>
          <div className="flex flex-col gap-0.5">
            {g.items.map((i) => {
              const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
              return (
                <Link key={i.href} href={i.href} className={`nav-link ${active ? "active" : ""}`}>
                  {i.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

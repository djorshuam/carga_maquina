"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { horasNecessarias } from "@/lib/calc";

type MoldeInfo = { id: string; cavidades: number; ciclo: number; setup: number; refugo: number; maquinas: { id: string; codigo: string; ativa: boolean }[] };

/** Calcula horas necessárias ao vivo e filtra máquinas compatíveis do molde selecionado (F-006). */
export function HorasPreview({ moldes, sugestoes, children }: { moldes: MoldeInfo[]; sugestoes: Record<string, number>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const molde = root.querySelector<HTMLSelectElement>('select[name="moldeId"]');
    const qtd = root.querySelector<HTMLInputElement>('input[name="quantidadePecas"]');
    const out = root.querySelector<HTMLInputElement>('input[name="_horas"]');
    const maq = root.querySelector<HTMLSelectElement>('select[name="maquinaId"]');
    if (!molde || !qtd || !out || !maq) return;

    const update = () => {
      const m = moldes.find((x) => x.id === molde.value);
      const q = Number(qtd.value);
      if (!m || q <= 0) {
        out.value = "";
      } else {
        const h = horasNecessarias({ quantidadePecas: q, numeroCavidades: m.cavidades, tempoCicloS: m.ciclo, tempoSetupMin: m.setup, incluiSetup: true, refugoPercentual: m.refugo });
        out.value = `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
      }
      // filtra opções de máquina
      const compat = new Set(m?.maquinas.map((x) => x.id) ?? []);
      let melhor: { id: string; oc: number } | null = null;
      for (const opt of Array.from(maq.options)) {
        if (opt.value === "AUTO" || opt.value === "") continue;
        const ok = compat.has(opt.value);
        opt.hidden = !ok;
        opt.disabled = !ok;
        const ativa = m?.maquinas.find((x) => x.id === opt.value)?.ativa;
        if (ok && ativa) {
          const oc = sugestoes[opt.value] ?? 0;
          if (!melhor || oc < melhor.oc) melhor = { id: opt.value, oc };
        }
      }
      const auto = Array.from(maq.options).find((o) => o.value === "AUTO");
      if (auto) {
        const cod = melhor ? m?.maquinas.find((x) => x.id === melhor!.id)?.codigo : null;
        auto.textContent = cod ? `Sugerir automaticamente → ${cod} (${Math.round(melhor!.oc * 100)}% ocupada)` : m ? "Sugerir automaticamente (nenhuma compatível ativa)" : "Sugerir automaticamente";
      }
    };
    update();
    molde.addEventListener("change", update);
    qtd.addEventListener("input", update);
    return () => {
      molde.removeEventListener("change", update);
      qtd.removeEventListener("input", update);
    };
  }, [moldes, sugestoes]);

  return <div ref={ref}>{children}</div>;
}

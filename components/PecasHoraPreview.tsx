"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { pecasPorHora } from "@/lib/calc";

/** Atualiza o campo readonly "_pecasHora" ao digitar ciclo/cavidades (F-002 RF-02). */
export function PecasHoraPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ciclo = root.querySelector<HTMLInputElement>('input[name="tempoCicloS"]');
    const cav = root.querySelector<HTMLInputElement>('input[name="numeroCavidades"]');
    const out = root.querySelector<HTMLInputElement>('input[name="_pecasHora"]');
    if (!ciclo || !cav || !out) return;
    const update = () => {
      const v = pecasPorHora(Number(ciclo.value), Number(cav.value));
      out.value = v > 0 ? Math.round(v).toLocaleString("pt-BR") : "";
    };
    update();
    ciclo.addEventListener("input", update);
    cav.addEventListener("input", update);
    return () => {
      ciclo.removeEventListener("input", update);
      cav.removeEventListener("input", update);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}

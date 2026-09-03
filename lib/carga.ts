import { prisma } from "@/lib/prisma";
import { capacidadeSemanalHoras, horasNecessarias, horasDiaTurnos, type TurnoHorario } from "@/lib/calc";

export type BlocoGantt = {
  pedidoId: string;
  numero: string;
  produto: string;
  tipo: "ordem" | "setup";
  inicioDia: number; // 0..7 (fração de dias desde início da semana)
  duracaoDias: number;
  excedente: boolean;
  prazo: Date;
  prioridade: string;
};

export type LinhaCarga = {
  maquinaId: string;
  codigo: string;
  tonelagem: number;
  status: string;
  capacidadeHoras: number;
  horasDia: number;
  cargaHoras: number;
  ocupacao: number; // 0..∞
  blocos: BlocoGantt[];
  pedidos: { id: string; numero: string; produto: string; horas: number; prazo: Date; prioridade: string; emRisco: boolean }[];
};

export function inicioSemana(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // segunda = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

export function turnosDe(m: {
  turno1Inicio: string | null; turno1Fim: string | null;
  turno2Inicio: string | null; turno2Fim: string | null;
  turno3Inicio: string | null; turno3Fim: string | null;
}): TurnoHorario[] {
  return [
    { inicio: m.turno1Inicio, fim: m.turno1Fim },
    { inicio: m.turno2Inicio, fim: m.turno2Fim },
    { inicio: m.turno3Inicio, fim: m.turno3Fim },
  ];
}

/** Monta a carga semanal por máquina: sequência de pedidos alocados, setup entre moldes diferentes, excedente. */
export async function cargaSemanal(semana: Date = inicioSemana()): Promise<LinhaCarga[]> {
  const fimSemana = new Date(semana.getTime() + 7 * 86400000);
  const maquinas = await prisma.maquina.findMany({
    orderBy: { codigo: "asc" },
    include: {
      paradas: { where: { inicio: { lt: fimSemana }, fim: { gt: semana } } },
      pedidos: {
        where: { apontamentos: { none: {} } }, // pedidos ainda em aberto (sem apontamento concluído) — simplificação MVP
        orderBy: [{ prioridade: "desc" }, { prazoEntrega: "asc" }],
        include: { molde: { include: { receita: true } } },
      },
    },
  });

  return maquinas.map((m) => {
    const turnos = turnosDe(m);
    const horasDia = horasDiaTurnos(turnos) * (m.eficienciaPercentual / 100);
    const paradasHoras = m.paradas.reduce((a, p) => {
      const ini = Math.max(p.inicio.getTime(), semana.getTime());
      const fim = Math.min(p.fim.getTime(), fimSemana.getTime());
      return a + Math.max(0, fim - ini) / 3600000;
    }, 0);
    const capacidade = capacidadeSemanalHoras({ turnos, diasOperacao: m.diasOperacao, eficienciaPercentual: m.eficienciaPercentual, paradasHoras });

    let cursorHoras = 0;
    let moldeAnterior: string | null = null;
    const blocos: BlocoGantt[] = [];
    const pedidos: LinhaCarga["pedidos"] = [];
    const diasPorHora = horasDia > 0 ? 1 / horasDia : 0;

    // Ordena por prioridade (URGENTE > ALTA > NORMAL) e prazo
    const ordem = { URGENTE: 0, ALTA: 1, NORMAL: 2 } as const;
    const lista = [...m.pedidos].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade] || a.prazoEntrega.getTime() - b.prazoEntrega.getTime());

    for (const p of lista) {
      const trocaMolde = moldeAnterior !== null && moldeAnterior !== p.moldeId;
      const setupH = trocaMolde || moldeAnterior === null ? p.molde.tempoSetupMin / 60 : 0;
      const prodH = horasNecessarias({
        quantidadePecas: p.quantidadePecas,
        numeroCavidades: p.molde.numeroCavidades,
        tempoCicloS: Number(p.molde.tempoCicloS),
        tempoSetupMin: 0,
        incluiSetup: false,
        refugoPercentual: p.molde.receita ? Number(p.molde.receita.percentualRefugoEsperado) : 0,
      });
      if (setupH > 0) {
        blocos.push({ pedidoId: p.id, numero: p.numero, produto: p.molde.produto, tipo: "setup", inicioDia: cursorHoras * diasPorHora, duracaoDias: setupH * diasPorHora, excedente: cursorHoras + setupH > capacidade, prazo: p.prazoEntrega, prioridade: p.prioridade });
        cursorHoras += setupH;
      }
      blocos.push({ pedidoId: p.id, numero: p.numero, produto: p.molde.produto, tipo: "ordem", inicioDia: cursorHoras * diasPorHora, duracaoDias: prodH * diasPorHora, excedente: cursorHoras + prodH > capacidade, prazo: p.prazoEntrega, prioridade: p.prioridade });
      cursorHoras += prodH;
      const fimPrevisto = new Date(semana.getTime() + cursorHoras * diasPorHora * 86400000);
      pedidos.push({ id: p.id, numero: p.numero, produto: p.molde.produto, horas: prodH + setupH, prazo: p.prazoEntrega, prioridade: p.prioridade, emRisco: fimPrevisto > p.prazoEntrega });
      moldeAnterior = p.moldeId;
    }

    return {
      maquinaId: m.id,
      codigo: m.codigo,
      tonelagem: m.tonelagem,
      status: m.status,
      capacidadeHoras: capacidade,
      horasDia,
      cargaHoras: cursorHoras,
      ocupacao: capacidade > 0 ? cursorHoras / capacidade : cursorHoras > 0 ? Infinity : 0,
      blocos,
      pedidos,
    };
  });
}

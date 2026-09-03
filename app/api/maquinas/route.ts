import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const maquinas = await prisma.maquina.findMany({
    orderBy: { codigo: "asc" },
    include: { paradas: { orderBy: { inicio: "asc" } }, _count: { select: { pedidos: true, moldes: true } } },
  });

  const data = maquinas.map((m) => ({
    id: m.id,
    codigo: m.codigo,
    tonelagem: m.tonelagem,
    fabricanteModelo: m.fabricanteModelo,
    dimensaoPratoMm: m.dimensaoPratoMm,
    cursoAberturaMm: m.cursoAberturaMm,
    capacidadeInjecaoG: m.capacidadeInjecaoG,
    custoHora: Number(m.custoHora),
    status: m.status,
    turno1Inicio: m.turno1Inicio, turno1Fim: m.turno1Fim,
    turno2Inicio: m.turno2Inicio, turno2Fim: m.turno2Fim,
    turno3Inicio: m.turno3Inicio, turno3Fim: m.turno3Fim,
    diasOperacao: m.diasOperacao,
    eficienciaPercentual: m.eficienciaPercentual,
    operadoresTurno1: m.operadoresTurno1,
    operadoresTurno2: m.operadoresTurno2,
    operadoresTurno3: m.operadoresTurno3,
    operadoresObs: m.operadoresObs,
    paradas: m.paradas.map((p) => ({ id: p.id, motivo: p.motivo, inicio: p.inicio.toISOString(), fim: p.fim.toISOString() })),
    counts: { pedidos: m._count.pedidos, moldes: m._count.moldes },
  }));

  return NextResponse.json(data);
}

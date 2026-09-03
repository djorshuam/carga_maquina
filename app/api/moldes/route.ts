import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [moldes, maquinas] = await Promise.all([
    prisma.molde.findMany({
      orderBy: { codigo: "asc" },
      include: { maquinas: { select: { id: true, codigo: true, status: true, tonelagem: true, dimensaoPratoMm: true } }, receita: { select: { id: true } }, _count: { select: { pedidos: true } } },
    }),
    prisma.maquina.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true, tonelagem: true, dimensaoPratoMm: true } }),
  ]);

  const data = moldes.map((m) => ({
    id: m.id,
    codigo: m.codigo,
    produto: m.produto,
    numeroCavidades: m.numeroCavidades,
    tempoCicloS: Number(m.tempoCicloS),
    tempoSetupMin: m.tempoSetupMin,
    maquinas: m.maquinas.map((x) => ({ id: x.id, codigo: x.codigo, status: x.status, tonelagem: x.tonelagem, dimensaoPratoMm: x.dimensaoPratoMm })),
    temReceita: !!m.receita,
    pedidosCount: m._count.pedidos,
  }));

  return NextResponse.json({ moldes: data, maquinas });
}

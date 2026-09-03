import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [maquinas, pedidos, recentes] = await Promise.all([
    prisma.maquina.findMany({ where: { status: { not: "INATIVA" } }, orderBy: { codigo: "asc" }, select: { id: true, codigo: true, tonelagem: true } }),
    prisma.pedido.findMany({ orderBy: { prazoEntrega: "asc" }, include: { molde: { select: { produto: true } }, maquina: { select: { codigo: true } } } }),
    prisma.apontamento.findMany({
      orderBy: [{ data: "desc" }, { turno: "desc" }], take: 30,
      include: { maquina: { select: { codigo: true } }, pedido: { select: { numero: true } }, _count: { select: { auditoria: true } } },
    }),
  ]);

  return NextResponse.json({
    maquinas,
    pedidos: pedidos.map((p) => ({ id: p.id, numero: p.numero, produto: p.molde.produto, maquinaCodigo: p.maquina?.codigo ?? null })),
    recentes: recentes.map((a) => ({
      id: a.id, data: a.data.toISOString(), turno: a.turno, maquinaCodigo: a.maquina.codigo, pedidoNumero: a.pedido.numero,
      pecasProduzidas: a.pecasProduzidas, pecasRefugadas: a.pecasRefugadas, tempoParadoMin: a.tempoParadoMin,
      motivoParada: a.motivoParada, auditoriaCount: a._count.auditoria,
    })),
  });
}

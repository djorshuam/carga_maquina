import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { horasNecessarias } from "@/lib/calc";
import { cargaSemanal } from "@/lib/carga";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ver = searchParams.get("ver");

  const [pedidos, moldes, carga, detalhe] = await Promise.all([
    prisma.pedido.findMany({
      orderBy: [{ prazoEntrega: "asc" }],
      include: { molde: { include: { receita: true } }, maquina: true, _count: { select: { apontamentos: true } } },
    }),
    prisma.molde.findMany({
      orderBy: { codigo: "asc" },
      include: { maquinas: { select: { id: true, codigo: true, status: true } }, receita: true },
    }),
    cargaSemanal(),
    ver
      ? prisma.pedido.findUnique({ where: { id: ver }, include: { molde: { include: { receita: { include: { composicao: { include: { material: true } } } } } } } })
      : null,
  ]);

  const pedidosData = pedidos.map((p) => {
    const horas = horasNecessarias({
      quantidadePecas: p.quantidadePecas,
      numeroCavidades: p.molde.numeroCavidades,
      tempoCicloS: Number(p.molde.tempoCicloS),
      tempoSetupMin: p.molde.tempoSetupMin,
      incluiSetup: true,
      refugoPercentual: p.molde.receita ? Number(p.molde.receita.percentualRefugoEsperado) : 0,
    });
    return {
      id: p.id, numero: p.numero, cliente: p.cliente, moldeId: p.moldeId,
      produto: p.molde.produto, quantidadePecas: p.quantidadePecas,
      prazoEntrega: p.prazoEntrega.toISOString(), prioridade: p.prioridade,
      maquinaId: p.maquinaId, maquinaCodigo: p.maquina?.codigo ?? null,
      apontamentosCount: p._count.apontamentos, horas,
    };
  });

  const moldesData = moldes.map((m) => ({
    id: m.id, codigo: m.codigo, produto: m.produto, numeroCavidades: m.numeroCavidades,
    tempoCicloS: Number(m.tempoCicloS), tempoSetupMin: m.tempoSetupMin,
    refugoPercentual: m.receita ? Number(m.receita.percentualRefugoEsperado) : 0,
    temReceita: !!m.receita,
    maquinas: m.maquinas.map((x) => ({ id: x.id, codigo: x.codigo, ativa: x.status === "ATIVA" })),
  }));

  const cargaData = carga.map((c) => ({ maquinaId: c.maquinaId, ocupacao: c.ocupacao, cargaHoras: c.cargaHoras, capacidadeHoras: c.capacidadeHoras, pedidos: c.pedidos.map((p) => ({ id: p.id, emRisco: p.emRisco })) }));

  const detalheData = detalhe && detalhe.molde.receita
    ? {
        id: detalhe.id, numero: detalhe.numero, quantidadePecas: detalhe.quantidadePecas, moldeId: detalhe.moldeId,
        percentualRefugoEsperado: Number(detalhe.molde.receita.percentualRefugoEsperado),
        composicao: detalhe.molde.receita.composicao.map((c) => ({
          id: c.id, materialNome: c.material.nome, pesoPorPecaG: Number(c.pesoPorPecaG),
          estoqueDisponivelKg: c.material.estoqueDisponivelKg == null ? null : Number(c.material.estoqueDisponivelKg),
        })),
      }
    : detalhe
      ? { id: detalhe.id, numero: detalhe.numero, quantidadePecas: detalhe.quantidadePecas, moldeId: detalhe.moldeId, semReceita: true }
      : null;

  return NextResponse.json({ pedidos: pedidosData, moldes: moldesData, carga: cargaData, detalhe: detalheData });
}

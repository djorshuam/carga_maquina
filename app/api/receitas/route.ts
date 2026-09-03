import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const moldeId = searchParams.get("molde");

  const [moldesList, materiais, molde] = await Promise.all([
    prisma.molde.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true, produto: true, receita: { select: { id: true } } } }),
    prisma.material.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    moldeId
      ? prisma.molde.findUnique({ where: { id: moldeId }, include: { receita: { include: { composicao: { include: { material: true } } } } } })
      : null,
  ]);

  const moldeDetail = molde
    ? {
        id: molde.id, codigo: molde.codigo, produto: molde.produto,
        receita: molde.receita
          ? {
              pesoPecaG: Number(molde.receita.pesoPecaG),
              percentualRefugoEsperado: Number(molde.receita.percentualRefugoEsperado),
              tempAlimentacao: molde.receita.tempAlimentacao, tempCompressao: molde.receita.tempCompressao,
              tempDosagem: molde.receita.tempDosagem, tempMolde: molde.receita.tempMolde,
              tempoAquecimentoInicialMin: molde.receita.tempoAquecimentoInicialMin,
              tempoResfriamentoS: molde.receita.tempoResfriamentoS == null ? null : Number(molde.receita.tempoResfriamentoS),
              composicao: molde.receita.composicao.map((c) => ({
                id: c.id, materialId: c.materialId, materialNome: c.material.nome, materialTipo: c.material.tipo,
                percentual: Number(c.percentual), pesoPorPecaG: Number(c.pesoPorPecaG),
                estoqueDisponivelKg: c.material.estoqueDisponivelKg == null ? null : Number(c.material.estoqueDisponivelKg),
              })),
            }
          : null,
      }
    : null;

  return NextResponse.json({
    moldes: moldesList.map((m) => ({ id: m.id, codigo: m.codigo, produto: m.produto, temReceita: !!m.receita })),
    materiais,
    molde: moldeDetail,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const materiais = await prisma.material.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { composicoes: true } } } });
  const data = materiais.map((m) => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipo,
    estoqueDisponivelKg: m.estoqueDisponivelKg == null ? null : Number(m.estoqueDisponivelKg),
    composicoesCount: m._count.composicoes,
  }));
  return NextResponse.json(data);
}

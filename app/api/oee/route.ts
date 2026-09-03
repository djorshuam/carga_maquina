import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { oeePeriodo } from "@/lib/oee";

export const dynamic = "force-dynamic";

function isoDay(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hoje = new Date();
  const ateIso = searchParams.get("ate") ?? isoDay(hoje);
  const deIso = searchParams.get("de") ?? isoDay(new Date(hoje.getTime() - 6 * 86400000));
  const maquinaParam = searchParams.get("maquina") || undefined;
  const de = new Date(deIso + "T00:00:00Z");
  const ate = new Date(ateIso + "T00:00:00Z");

  const maquinas = await prisma.maquina.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true } });
  const sel = maquinaParam && maquinas.some((m) => m.id === maquinaParam) ? maquinaParam : undefined;

  const [r, frotaCompleta, planejado] = await Promise.all([
    oeePeriodo(de, ate, sel),
    sel ? oeePeriodo(de, ate) : Promise.resolve(null),
    prisma.pedido.aggregate({ _sum: { quantidadePecas: true }, where: { apontamentos: { some: { data: { gte: de, lte: ate } } }, ...(sel ? { maquinaId: sel } : {}) } }),
  ]);

  return NextResponse.json({
    maquinas, sel: sel ?? null, de: deIso, ate: ateIso,
    frota: r.frota, porMaquina: r.porMaquina, totais: r.totais,
    frotaCompletaPorMaquina: (frotaCompleta ?? r).porMaquina,
    plaejadoPecas: planejado._sum.quantidadePecas ?? 0,
  });
}

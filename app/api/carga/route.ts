import { NextResponse } from "next/server";
import { cargaSemanal, inicioSemana } from "@/lib/carga";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const semanaParam = searchParams.get("semana");
  const base = semanaParam ? new Date(semanaParam + "T00:00:00Z") : new Date();
  const semana = inicioSemana(isNaN(base.getTime()) ? new Date() : base);
  const linhas = await cargaSemanal(semana);

  const data = linhas.map((l) => ({
    maquinaId: l.maquinaId, codigo: l.codigo, tonelagem: l.tonelagem, status: l.status,
    capacidadeHoras: l.capacidadeHoras, horasDia: l.horasDia, cargaHoras: l.cargaHoras, ocupacao: l.ocupacao,
    blocos: l.blocos.map((b) => ({ ...b, prazo: b.prazo.toISOString() })),
    pedidos: l.pedidos.map((p) => ({ ...p, prazo: p.prazo.toISOString() })),
  }));

  return NextResponse.json({ semana: semana.toISOString(), linhas: data });
}

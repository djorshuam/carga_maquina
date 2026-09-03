import { prisma } from "@/lib/prisma";
import { agregarOee, calcularOee, minutosTurno, type OeeInput, type OeeResult } from "@/lib/calc";
import { turnosDe } from "@/lib/carga";

export type OeeMaquina = {
  maquinaId: string;
  codigo: string;
  oee: OeeResult;
  produzidas: number;
  boas: number;
  refugadas: number;
  paradoMin: number;
  apontamentos: number;
};

export async function oeePeriodo(de: Date, ate: Date, maquinaId?: string): Promise<{ frota: OeeResult; porMaquina: OeeMaquina[]; totais: { produzidas: number; boas: number; refugadas: number; paradoMin: number } }> {
  const maquinas = await prisma.maquina.findMany({
    where: maquinaId ? { id: maquinaId } : undefined,
    orderBy: { codigo: "asc" },
    include: {
      apontamentos: {
        where: { data: { gte: de, lte: ate } },
        include: { pedido: { include: { molde: true } } },
      },
    },
  });

  const todos: OeeInput[] = [];
  const porMaquina: OeeMaquina[] = maquinas.map((m) => {
    const turnos = turnosDe(m);
    const inputs: OeeInput[] = m.apontamentos.map((a) => ({
      tempoPlanejadoMin: minutosTurno(turnos[a.turno - 1] ?? { inicio: null, fim: null }),
      tempoParadoMin: a.tempoParadoMin,
      pecasProduzidas: a.pecasProduzidas,
      pecasRefugadas: a.pecasRefugadas,
      tempoCicloPadraoS: Number(a.pedido.molde.tempoCicloS),
      cavidades: a.pedido.molde.numeroCavidades,
    }));
    todos.push(...inputs);
    const produzidas = inputs.reduce((s, i) => s + i.pecasProduzidas, 0);
    const refugadas = inputs.reduce((s, i) => s + i.pecasRefugadas, 0);
    return {
      maquinaId: m.id,
      codigo: m.codigo,
      oee: inputs.length === 1 ? calcularOee(inputs[0]) : agregarOee(inputs),
      produzidas,
      boas: produzidas - refugadas,
      refugadas,
      paradoMin: inputs.reduce((s, i) => s + i.tempoParadoMin, 0),
      apontamentos: inputs.length,
    };
  });

  const totais = porMaquina.reduce(
    (t, m) => ({ produzidas: t.produzidas + m.produzidas, boas: t.boas + m.boas, refugadas: t.refugadas + m.refugadas, paradoMin: t.paradoMin + m.paradoMin }),
    { produzidas: 0, boas: 0, refugadas: 0, paradoMin: 0 },
  );
  return { frota: agregarOee(todos), porMaquina, totais };
}

// Motor de cálculo — regras RN-05..RN-10 do SDD. Funções puras, sem I/O.

export const HORAS_SEMANA_DIAS = 7;

export type TurnoHorario = { inicio: string | null; fim: string | null };

/** Minutos entre "HH:MM" e "HH:MM", tratando virada de dia. */
export function minutosTurno(t: TurnoHorario): number {
  if (!t.inicio || !t.fim) return 0;
  const [hi, mi] = t.inicio.split(":").map(Number);
  const [hf, mf] = t.fim.split(":").map(Number);
  let m = hf * 60 + mf - (hi * 60 + mi);
  if (m <= 0) m += 24 * 60;
  return m;
}

export type CapacidadeInput = {
  turnos: TurnoHorario[];
  diasOperacao: number;
  eficienciaPercentual: number;
  paradasHoras?: number;
};

/** RN-05: capacidade disponível (h/semana) = horas turnos × dias × eficiência − paradas. */
export function capacidadeSemanalHoras(i: CapacidadeInput): number {
  const horasDia = i.turnos.reduce((a, t) => a + minutosTurno(t), 0) / 60;
  const bruto = horasDia * i.diasOperacao * (i.eficienciaPercentual / 100);
  return Math.max(0, bruto - (i.paradasHoras ?? 0));
}

export function horasDiaTurnos(turnos: TurnoHorario[]): number {
  return turnos.reduce((a, t) => a + minutosTurno(t), 0) / 60;
}

/** F-002 RF-02: peças por hora. */
export function pecasPorHora(tempoCicloS: number, cavidades: number): number {
  if (tempoCicloS <= 0 || cavidades <= 0) return 0;
  return (3600 / tempoCicloS) * cavidades;
}

/** RN-06: horas necessárias = (qtd / cavidades) × ciclo, + setup se houver troca de molde. */
export function horasNecessarias(p: {
  quantidadePecas: number;
  numeroCavidades: number;
  tempoCicloS: number;
  tempoSetupMin: number;
  incluiSetup: boolean;
  refugoPercentual?: number;
}): number {
  const fator = 1 + (p.refugoPercentual ?? 0) / 100;
  const tiros = Math.ceil((p.quantidadePecas * fator) / Math.max(1, p.numeroCavidades));
  const horasProducao = (tiros * p.tempoCicloS) / 3600;
  const setup = p.incluiSetup ? p.tempoSetupMin / 60 : 0;
  return horasProducao + setup;
}

/** RN-07: consumo por material = líquido + refugo esperado (kg). */
export function consumoMaterial(p: {
  pesoPorPecaG: number;
  quantidadePecas: number;
  refugoPercentual: number;
}) {
  const liquidoKg = (p.pesoPorPecaG * p.quantidadePecas) / 1000;
  const refugoKg = liquidoKg * (p.refugoPercentual / 100);
  return { liquidoKg, refugoKg, totalKg: liquidoKg + refugoKg };
}

export type SituacaoEstoque = "DISPONIVEL" | "INSUFICIENTE" | "NAO_VERIFICADO";

export function situacaoEstoque(
  estoqueKg: number | null | undefined,
  necessarioKg: number,
): SituacaoEstoque {
  if (estoqueKg == null) return "NAO_VERIFICADO";
  return estoqueKg >= necessarioKg ? "DISPONIVEL" : "INSUFICIENTE";
}

export type OeeInput = {
  tempoPlanejadoMin: number;
  tempoParadoMin: number;
  pecasProduzidas: number;
  pecasRefugadas: number;
  tempoCicloPadraoS: number;
  cavidades: number;
};

export type OeeResult = {
  disponibilidade: number;
  performance: number;
  qualidade: number;
  oee: number;
  pecasBoas: number;
} | null;

/** Seção 002 — Indicador OEE. Retorna null quando não há dados (F-008 caso de borda). */
export function calcularOee(i: OeeInput): OeeResult {
  if (i.tempoPlanejadoMin <= 0 || i.pecasProduzidas <= 0) return null;
  const tempoRodandoMin = Math.max(0, i.tempoPlanejadoMin - i.tempoParadoMin);
  const disponibilidade = clamp01(tempoRodandoMin / i.tempoPlanejadoMin);
  const tiros = i.pecasProduzidas / Math.max(1, i.cavidades);
  const tempoTeoricoMin = (tiros * i.tempoCicloPadraoS) / 60;
  const performance = tempoRodandoMin > 0 ? clamp01(tempoTeoricoMin / tempoRodandoMin) : 0;
  const pecasBoas = Math.max(0, i.pecasProduzidas - i.pecasRefugadas);
  const qualidade = clamp01(pecasBoas / i.pecasProduzidas);
  return {
    disponibilidade,
    performance,
    qualidade,
    oee: disponibilidade * performance * qualidade,
    pecasBoas,
  };
}

/** Agrega vários apontamentos (mesma máquina ou frota) num OEE único. */
export function agregarOee(itens: OeeInput[]): OeeResult {
  if (itens.length === 0) return null;
  const s = itens.reduce(
    (a, i) => {
      const rodando = Math.max(0, i.tempoPlanejadoMin - i.tempoParadoMin);
      const tiros = i.pecasProduzidas / Math.max(1, i.cavidades);
      return {
        planejado: a.planejado + i.tempoPlanejadoMin,
        rodando: a.rodando + rodando,
        teorico: a.teorico + (tiros * i.tempoCicloPadraoS) / 60,
        produzidas: a.produzidas + i.pecasProduzidas,
        refugadas: a.refugadas + i.pecasRefugadas,
      };
    },
    { planejado: 0, rodando: 0, teorico: 0, produzidas: 0, refugadas: 0 },
  );
  if (s.planejado <= 0 || s.produzidas <= 0) return null;
  const disponibilidade = clamp01(s.rodando / s.planejado);
  const performance = s.rodando > 0 ? clamp01(s.teorico / s.rodando) : 0;
  const pecasBoas = Math.max(0, s.produzidas - s.refugadas);
  const qualidade = clamp01(pecasBoas / s.produzidas);
  return { disponibilidade, performance, qualidade, oee: disponibilidade * performance * qualidade, pecasBoas };
}

export function zonaOee(v: number): "red" | "yellow" | "green" {
  if (v < 0.6) return "red";
  if (v < 0.8) return "yellow";
  return "green";
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export const fmt = {
  h: (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`,
  kg: (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`,
  int: (n: number) => n.toLocaleString("pt-BR"),
  pct: (n: number) => `${Math.round(n * 100)}%`,
  data: (d: Date | string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
};

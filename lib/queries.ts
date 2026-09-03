// Query keys e fetchers do lado do cliente — camada de leitura via TanStack Query.
// Escritas continuam via Server Actions em lib/actions/*.

export const qk = {
  maquinas: ["maquinas"] as const,
  moldes: ["moldes"] as const,
  materiais: ["materiais"] as const,
  pedidos: (ver?: string) => ["pedidos", ver ?? ""] as const,
  carga: (semana: string) => ["carga", semana] as const,
  oee: (de: string, ate: string, maquina?: string) => ["oee", de, ate, maquina ?? ""] as const,
  receitas: (moldeId?: string) => ["receitas", moldeId ?? ""] as const,
  apontamentos: ["apontamentos"] as const,
  operadoresDisponibilidade: (data: string) => ["operadores-disponibilidade", data] as const,
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao carregar dados.");
  return res.json() as Promise<T>;
}

export type MaquinaDTO = {
  id: string; codigo: string; tonelagem: number; fabricanteModelo: string;
  dimensaoPratoMm: number; cursoAberturaMm: number; capacidadeInjecaoG: number; custoHora: number;
  status: "ATIVA" | "MANUTENCAO" | "INATIVA";
  turno1Inicio: string | null; turno1Fim: string | null;
  turno2Inicio: string | null; turno2Fim: string | null;
  turno3Inicio: string | null; turno3Fim: string | null;
  diasOperacao: number; eficienciaPercentual: number;
  operadoresTurno1: number; operadoresTurno2: number; operadoresTurno3: number; operadoresObs: string;
  paradas: { id: string; motivo: string; inicio: string; fim: string }[];
  counts: { pedidos: number; moldes: number };
};

export type MoldeDTO = {
  id: string; codigo: string; produto: string; numeroCavidades: number; tempoCicloS: number; tempoSetupMin: number;
  maquinas: { id: string; codigo: string; status: string; tonelagem: number; dimensaoPratoMm: number }[];
  temReceita: boolean; pedidosCount: number;
};

export type MaterialDTO = { id: string; nome: string; tipo: string; estoqueDisponivelKg: number | null; composicoesCount: number };

export type PedidoDTO = {
  id: string; numero: string; cliente: string; moldeId: string; produto: string; quantidadePecas: number;
  prazoEntrega: string; prioridade: "NORMAL" | "ALTA" | "URGENTE"; maquinaId: string | null; maquinaCodigo: string | null;
  apontamentosCount: number; horas: number;
};

export type PedidosResponse = {
  pedidos: PedidoDTO[];
  moldes: { id: string; codigo: string; produto: string; numeroCavidades: number; tempoCicloS: number; tempoSetupMin: number; refugoPercentual: number; temReceita: boolean; maquinas: { id: string; codigo: string; ativa: boolean }[] }[];
  carga: { maquinaId: string; ocupacao: number; cargaHoras: number; capacidadeHoras: number; pedidos: { id: string; emRisco: boolean }[] }[];
  detalhe: { id: string; numero: string; quantidadePecas: number; moldeId: string; percentualRefugoEsperado?: number; semReceita?: boolean; composicao?: { id: string; materialNome: string; pesoPorPecaG: number; estoqueDisponivelKg: number | null }[] } | null;
};

export type BlocoGanttDTO = { pedidoId: string; numero: string; produto: string; tipo: "ordem" | "setup"; inicioDia: number; duracaoDias: number; excedente: boolean; prazo: string; prioridade: string };
export type LinhaCargaDTO = {
  maquinaId: string; codigo: string; tonelagem: number; status: string;
  capacidadeHoras: number; horasDia: number; cargaHoras: number; ocupacao: number;
  blocos: BlocoGanttDTO[];
  pedidos: { id: string; numero: string; produto: string; horas: number; prazo: string; prioridade: string; emRisco: boolean }[];
};
export type CargaResponse = { semana: string; linhas: LinhaCargaDTO[] };

export type OeeValue = { disponibilidade: number; performance: number; qualidade: number; oee: number; pecasBoas: number } | null;
export type OeeResponse = {
  maquinas: { id: string; codigo: string }[]; sel: string | null; de: string; ate: string;
  frota: OeeValue; porMaquina: { maquinaId: string; codigo: string; oee: OeeValue; produzidas: number; boas: number; refugadas: number; paradoMin: number; apontamentos: number }[];
  totais: { produzidas: number; boas: number; refugadas: number; paradoMin: number };
  frotaCompletaPorMaquina: OeeResponse["porMaquina"];
  plaejadoPecas: number;
};

export type ReceitasResponse = {
  moldes: { id: string; codigo: string; produto: string; temReceita: boolean }[];
  materiais: { id: string; nome: string }[];
  molde: {
    id: string; codigo: string; produto: string;
    receita: {
      pesoPecaG: number; percentualRefugoEsperado: number; tempAlimentacao: number | null; tempCompressao: number | null;
      tempDosagem: number | null; tempMolde: number | null; tempoAquecimentoInicialMin: number; tempoResfriamentoS: number | null;
      composicao: { id: string; materialId: string; materialNome: string; materialTipo: string; percentual: number; pesoPorPecaG: number; estoqueDisponivelKg: number | null }[];
    } | null;
  } | null;
};

export type ApontamentosResponse = {
  maquinas: { id: string; codigo: string; tonelagem: number }[];
  pedidos: { id: string; numero: string; produto: string; maquinaCodigo: string | null }[];
  recentes: { id: string; data: string; turno: number; maquinaCodigo: string; pedidoNumero: string; pecasProduzidas: number; pecasRefugadas: number; tempoParadoMin: number; motivoParada: string | null; auditoriaCount: number }[];
};

export const api = {
  maquinas: () => getJson<MaquinaDTO[]>("/api/maquinas"),
  moldes: () => getJson<{ moldes: MoldeDTO[]; maquinas: { id: string; codigo: string; tonelagem: number; dimensaoPratoMm: number }[] }>("/api/moldes"),
  materiais: () => getJson<MaterialDTO[]>("/api/materiais"),
  pedidos: (ver?: string) => getJson<PedidosResponse>(`/api/pedidos${ver ? `?ver=${ver}` : ""}`),
  carga: (semana: string) => getJson<CargaResponse>(`/api/carga?semana=${semana}`),
  oee: (de: string, ate: string, maquina?: string) => getJson<OeeResponse>(`/api/oee?de=${de}&ate=${ate}${maquina ? `&maquina=${maquina}` : ""}`),
  receitas: (moldeId?: string) => getJson<ReceitasResponse>(`/api/receitas${moldeId ? `?molde=${moldeId}` : ""}`),
  apontamentos: () => getJson<ApontamentosResponse>("/api/apontamentos"),
  operadoresDisponibilidade: (data: string) => getJson<{ disponibilidade: { turno: number; quantidade: number }[] }>(`/api/operadores?data=${data}`),
};

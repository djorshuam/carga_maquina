// Dados de exemplo (baseados nos mockups). Rode: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.maquina.count();
  if (existing > 0) {
    console.log("Banco já tem dados — seed ignorado.");
    return;
  }

  const turnos = { turno1Inicio: "06:00", turno1Fim: "14:20", turno2Inicio: "14:20", turno2Fim: "22:40", turno3Inicio: "22:40", turno3Fim: "06:00" };
  const [inj01, inj02, inj03, inj04, inj05] = await Promise.all([
    prisma.maquina.create({ data: { codigo: "INJ-01", tonelagem: 120, fabricanteModelo: "Haitian MA1200", dimensaoPratoMm: 470, capacidadeInjecaoG: 180, custoHora: 95, ...turnos, operadoresTurno1: 1, operadoresTurno2: 1, operadoresTurno3: 1 } }),
    prisma.maquina.create({ data: { codigo: "INJ-02", tonelagem: 180, fabricanteModelo: "Haitian MA1800", dimensaoPratoMm: 560, capacidadeInjecaoG: 320, custoHora: 120, ...turnos, operadoresTurno1: 2, operadoresTurno2: 2, operadoresTurno3: 1 } }),
    prisma.maquina.create({ data: { codigo: "INJ-03", tonelagem: 250, fabricanteModelo: "Romi PRIMAX 250", dimensaoPratoMm: 640, capacidadeInjecaoG: 550, custoHora: 150, turno1Inicio: "06:00", turno1Fim: "14:20", turno2Inicio: "14:20", turno2Fim: "22:40", operadoresTurno1: 2, operadoresTurno2: 1 } }),
    prisma.maquina.create({ data: { codigo: "INJ-04", tonelagem: 350, fabricanteModelo: "Romi PRIMAX 350", dimensaoPratoMm: 760, capacidadeInjecaoG: 900, custoHora: 190, turno1Inicio: "06:00", turno1Fim: "14:20", turno2Inicio: "14:20", turno2Fim: "22:40", operadoresTurno1: 2, operadoresTurno2: 1 } }),
    prisma.maquina.create({ data: { codigo: "INJ-05", tonelagem: 500, fabricanteModelo: "Haitian JU5000", dimensaoPratoMm: 900, capacidadeInjecaoG: 1600, custoHora: 240, status: "MANUTENCAO", turno1Inicio: "06:00", turno1Fim: "14:20", operadoresTurno1: 2 } }),
  ]);

  const [pp, regr, mb] = await Promise.all([
    prisma.material.create({ data: { nome: "PP Homopolímero H103", tipo: "RESINA_VIRGEM", estoqueDisponivelKg: 4800 } }),
    prisma.material.create({ data: { nome: "Regranulado PP interno", tipo: "RECICLO", estoqueDisponivelKg: 1200 } }),
    prisma.material.create({ data: { nome: "Masterbatch Azul 5021", tipo: "MASTERBATCH", estoqueDisponivelKg: 8 } }),
  ]);
  await prisma.material.create({ data: { nome: "PEAD Injeção", tipo: "RESINA_VIRGEM" } });

  const pote = await prisma.molde.create({ data: { codigo: "M-2280", produto: "Pote 250ml Rosca", numeroCavidades: 4, tempoCicloS: 18.5, tempoSetupMin: 90, maquinas: { connect: [{ id: inj01.id }, { id: inj02.id }] } } });
  const tampa = await prisma.molde.create({ data: { codigo: "M-1140", produto: "Tampa 500ml", numeroCavidades: 8, tempoCicloS: 12, tempoSetupMin: 60, maquinas: { connect: [{ id: inj01.id }, { id: inj02.id }, { id: inj03.id }] } } });
  const balde = await prisma.molde.create({ data: { codigo: "M-3310", produto: "Balde 10L", numeroCavidades: 1, tempoCicloS: 38, tempoSetupMin: 150, maquinas: { connect: [{ id: inj04.id }, { id: inj05.id }] } } });
  await prisma.molde.create({ data: { codigo: "M-0900", produto: "Caixa organizadora 20L", numeroCavidades: 1, tempoCicloS: 45, tempoSetupMin: 180, maquinas: { connect: [{ id: inj04.id }] } } });

  await prisma.receita.create({
    data: {
      moldeId: pote.id, pesoPecaG: 12, percentualRefugoEsperado: 3, tempAlimentacao: 190, tempCompressao: 210, tempDosagem: 225, tempMolde: 35, tempoAquecimentoInicialMin: 25, tempoResfriamentoS: 7.5,
      composicao: { create: [{ materialId: pp.id, percentual: 85, pesoPorPecaG: 10.2 }, { materialId: regr.id, percentual: 13, pesoPorPecaG: 1.56 }, { materialId: mb.id, percentual: 2, pesoPorPecaG: 0.24 }] },
    },
  });
  await prisma.receita.create({
    data: { moldeId: tampa.id, pesoPecaG: 4.2, percentualRefugoEsperado: 2, tempAlimentacao: 185, tempCompressao: 205, tempDosagem: 220, tempMolde: 30, tempoAquecimentoInicialMin: 20, composicao: { create: [{ materialId: pp.id, percentual: 98, pesoPorPecaG: 4.116 }, { materialId: mb.id, percentual: 2, pesoPorPecaG: 0.084 }] } },
  });

  const d = (days: number) => new Date(Date.now() + days * 86400000);
  await prisma.pedido.createMany({
    data: [
      { numero: "PC-8834", cliente: "Embalagens Norte", moldeId: pote.id, quantidadePecas: 42000, prazoEntrega: d(9), prioridade: "NORMAL", maquinaId: inj01.id },
      { numero: "PC-8829", cliente: "Distribuidora Sul", moldeId: tampa.id, quantidadePecas: 18500, prazoEntrega: d(7), prioridade: "ALTA", maquinaId: inj01.id },
      { numero: "PC-8841", cliente: "Tintas Rio", moldeId: balde.id, quantidadePecas: 6200, prazoEntrega: d(6), prioridade: "URGENTE", maquinaId: inj04.id },
      { numero: "PC-8850", cliente: "Cosméticos Bela", moldeId: pote.id, quantidadePecas: 60000, prazoEntrega: d(12), prioridade: "NORMAL", maquinaId: inj02.id },
      { numero: "PC-8852", cliente: "Atacadão Central", moldeId: tampa.id, quantidadePecas: 9000, prazoEntrega: d(15), prioridade: "NORMAL" },
    ],
  });

  const pc8829 = await prisma.pedido.findUnique({ where: { numero: "PC-8829" } });
  const pc8841 = await prisma.pedido.findUnique({ where: { numero: "PC-8841" } });
  const hoje = new Date();
  const dia = (off: number) => new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - off));
  await prisma.apontamento.createMany({
    data: [
      { maquinaId: inj01.id, pedidoId: pc8829!.id, data: dia(1), turno: 1, pecasProduzidas: 3600, pecasRefugadas: 110, tempoParadoMin: 40, motivoParada: "SETUP" },
      { maquinaId: inj01.id, pedidoId: pc8829!.id, data: dia(1), turno: 2, pecasProduzidas: 3900, pecasRefugadas: 60, tempoParadoMin: 15, motivoParada: "AJUSTE_PROCESSO" },
      { maquinaId: inj01.id, pedidoId: pc8829!.id, data: dia(2), turno: 1, pecasProduzidas: 3400, pecasRefugadas: 200, tempoParadoMin: 90, motivoParada: "FALTA_MATERIAL" },
      { maquinaId: inj04.id, pedidoId: pc8841!.id, data: dia(1), turno: 1, pecasProduzidas: 700, pecasRefugadas: 12, tempoParadoMin: 25, motivoParada: "MANUTENCAO_CORRETIVA" },
      { maquinaId: inj04.id, pedidoId: pc8841!.id, data: dia(2), turno: 1, pecasProduzidas: 520, pecasRefugadas: 30, tempoParadoMin: 180, motivoParada: "MANUTENCAO_CORRETIVA" },
    ],
  });

  await prisma.disponibilidadeOperadores.createMany({ data: [{ data: dia(0), turno: 1, quantidade: 7 }, { data: dia(0), turno: 2, quantidade: 5 }, { data: dia(0), turno: 3, quantidade: 2 }] });

  console.log("Seed concluído.");
}

main().finally(() => prisma.$disconnect());

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusMaquina" AS ENUM ('ATIVA', 'MANUTENCAO', 'INATIVA');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('RESINA_VIRGEM', 'RECICLO', 'MASTERBATCH', 'OUTRO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "MotivoParada" AS ENUM ('SETUP', 'FALTA_MATERIAL', 'MANUTENCAO_CORRETIVA', 'AJUSTE_PROCESSO', 'FALTA_OPERADOR', 'OUTRO');

-- CreateTable
CREATE TABLE "Maquina" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tonelagem" INTEGER NOT NULL,
    "fabricanteModelo" TEXT NOT NULL DEFAULT '',
    "dimensaoPratoMm" INTEGER NOT NULL DEFAULT 0,
    "cursoAberturaMm" INTEGER NOT NULL DEFAULT 0,
    "capacidadeInjecaoG" INTEGER NOT NULL DEFAULT 0,
    "custoHora" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StatusMaquina" NOT NULL DEFAULT 'ATIVA',
    "turno1Inicio" TEXT,
    "turno1Fim" TEXT,
    "turno2Inicio" TEXT,
    "turno2Fim" TEXT,
    "turno3Inicio" TEXT,
    "turno3Fim" TEXT,
    "diasOperacao" INTEGER NOT NULL DEFAULT 5,
    "eficienciaPercentual" INTEGER NOT NULL DEFAULT 85,
    "operadoresTurno1" INTEGER NOT NULL DEFAULT 1,
    "operadoresTurno2" INTEGER NOT NULL DEFAULT 1,
    "operadoresTurno3" INTEGER NOT NULL DEFAULT 0,
    "operadoresObs" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParadaProgramada" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParadaProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Molde" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "numeroCavidades" INTEGER NOT NULL,
    "tempoCicloS" DECIMAL(8,2) NOT NULL,
    "tempoSetupMin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Molde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "moldeId" TEXT NOT NULL,
    "pesoPecaG" DECIMAL(10,3) NOT NULL,
    "percentualRefugoEsperado" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "tempAlimentacao" INTEGER,
    "tempCompressao" INTEGER,
    "tempDosagem" INTEGER,
    "tempMolde" INTEGER,
    "tempoAquecimentoInicialMin" INTEGER NOT NULL DEFAULT 0,
    "tempoResfriamentoS" DECIMAL(8,2),

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComposicaoItem" (
    "id" TEXT NOT NULL,
    "receitaId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "pesoPorPecaG" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "ComposicaoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL DEFAULT 'RESINA_VIRGEM',
    "estoqueDisponivelKg" DECIMAL(12,2),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente" TEXT NOT NULL DEFAULT '',
    "moldeId" TEXT NOT NULL,
    "quantidadePecas" INTEGER NOT NULL,
    "prazoEntrega" TIMESTAMP(3) NOT NULL,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "maquinaId" TEXT,
    "inicioPlanejado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apontamento" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turno" INTEGER NOT NULL,
    "pecasProduzidas" INTEGER NOT NULL,
    "pecasRefugadas" INTEGER NOT NULL,
    "tempoParadoMin" INTEGER NOT NULL DEFAULT 0,
    "motivoParada" "MotivoParada",
    "observacao" TEXT NOT NULL DEFAULT '',
    "confirmado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apontamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApontamentoAuditoria" (
    "id" TEXT NOT NULL,
    "apontamentoId" TEXT NOT NULL,
    "alteradoPor" TEXT NOT NULL,
    "valorAnterior" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApontamentoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisponibilidadeOperadores" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turno" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "DisponibilidadeOperadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MoldeMaquinas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MoldeMaquinas_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Maquina_codigo_key" ON "Maquina"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Molde_codigo_key" ON "Molde"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_moldeId_key" ON "Receita"("moldeId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_nome_key" ON "Material"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_numero_key" ON "Pedido"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Apontamento_maquinaId_pedidoId_data_turno_key" ON "Apontamento"("maquinaId", "pedidoId", "data", "turno");

-- CreateIndex
CREATE UNIQUE INDEX "DisponibilidadeOperadores_data_turno_key" ON "DisponibilidadeOperadores"("data", "turno");

-- CreateIndex
CREATE INDEX "_MoldeMaquinas_B_index" ON "_MoldeMaquinas"("B");

-- AddForeignKey
ALTER TABLE "ParadaProgramada" ADD CONSTRAINT "ParadaProgramada_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_moldeId_fkey" FOREIGN KEY ("moldeId") REFERENCES "Molde"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComposicaoItem" ADD CONSTRAINT "ComposicaoItem_receitaId_fkey" FOREIGN KEY ("receitaId") REFERENCES "Receita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComposicaoItem" ADD CONSTRAINT "ComposicaoItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_moldeId_fkey" FOREIGN KEY ("moldeId") REFERENCES "Molde"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apontamento" ADD CONSTRAINT "Apontamento_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apontamento" ADD CONSTRAINT "Apontamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApontamentoAuditoria" ADD CONSTRAINT "ApontamentoAuditoria_apontamentoId_fkey" FOREIGN KEY ("apontamentoId") REFERENCES "Apontamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoldeMaquinas" ADD CONSTRAINT "_MoldeMaquinas_A_fkey" FOREIGN KEY ("A") REFERENCES "Maquina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoldeMaquinas" ADD CONSTRAINT "_MoldeMaquinas_B_fkey" FOREIGN KEY ("B") REFERENCES "Molde"("id") ON DELETE CASCADE ON UPDATE CASCADE;


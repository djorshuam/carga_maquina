"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, num, optStr, str, type ActionResult } from "@/lib/actions/helpers";
import { minutosTurno } from "@/lib/calc";
import { turnosDe } from "@/lib/carga";

const motivo = z.enum(["SETUP", "FALTA_MATERIAL", "MANUTENCAO_CORRETIVA", "AJUSTE_PROCESSO", "FALTA_OPERADOR", "OUTRO"]).nullable();

export async function registrarApontamento(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const maquinaId = str(fd.get("maquinaId"));
    const pedidoId = str(fd.get("pedidoId"));
    const turno = Math.round(num(fd.get("turno"), 1));
    const dataStr = str(fd.get("data"));
    const data = new Date(dataStr + "T00:00:00Z");
    if (!maquinaId || !pedidoId) return { ok: false, error: "Selecione máquina e ordem." };
    if (isNaN(data.getTime())) return { ok: false, error: "Data inválida." };
    if (![1, 2, 3].includes(turno)) return { ok: false, error: "Turno inválido." };

    const pecasProduzidas = Math.round(num(fd.get("pecasProduzidas")));
    const pecasRefugadas = Math.round(num(fd.get("pecasRefugadas")));
    const tempoParadoMin = Math.round(num(fd.get("tempoParadoMin")));
    if (pecasProduzidas < 0 || pecasRefugadas < 0 || tempoParadoMin < 0) return { ok: false, error: "Valores não podem ser negativos." };
    if (pecasRefugadas > pecasProduzidas) return { ok: false, error: "Peças refugadas não podem exceder produzidas (RN-09)." };

    const maquina = await prisma.maquina.findUnique({ where: { id: maquinaId } });
    if (!maquina) return { ok: false, error: "Máquina não encontrada." };
    const t = turnosDe(maquina)[turno - 1];
    if (!t.inicio || !t.fim) return { ok: false, error: `Turno ${turno} não está ativo nessa máquina.` };
    const tempoPlanejado = minutosTurno(t);
    if (tempoParadoMin > tempoPlanejado) return { ok: false, error: `Tempo parado excede a duração do turno (${tempoPlanejado} min).` };

    // Caso de borda: turno que ainda não começou
    const agora = new Date();
    const hoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
    if (data > hoje) return { ok: false, error: "Não é possível apontar um turno futuro." };
    if (data.getTime() === hoje.getTime()) {
      const [hi, mi] = t.inicio.split(":").map(Number);
      const inicioTurnoMin = hi * 60 + mi;
      const agoraMin = agora.getHours() * 60 + agora.getMinutes();
      if (agoraMin < inicioTurnoMin && turno !== 3) return { ok: false, error: "Esse turno ainda não começou hoje." };
    }

    const motivoParada = tempoParadoMin > 0 ? motivo.parse(optStr(fd.get("motivoParada"))) : null;
    if (tempoParadoMin > 0 && !motivoParada) return { ok: false, error: "Informe o motivo da parada." };

    const payload = { pecasProduzidas, pecasRefugadas, tempoParadoMin, motivoParada, observacao: str(fd.get("observacao")) };
    const existente = await prisma.apontamento.findUnique({ where: { maquinaId_pedidoId_data_turno: { maquinaId, pedidoId, data, turno } } });

    if (existente) {
      // RF-02: edição gera trilha de auditoria
      const alteradoPor = str(fd.get("alteradoPor")) || "operador";
      await prisma.$transaction([
        prisma.apontamentoAuditoria.create({
          data: {
            apontamentoId: existente.id,
            alteradoPor,
            valorAnterior: {
              pecasProduzidas: existente.pecasProduzidas,
              pecasRefugadas: existente.pecasRefugadas,
              tempoParadoMin: existente.tempoParadoMin,
              motivoParada: existente.motivoParada,
              observacao: existente.observacao,
            },
          },
        }),
        prisma.apontamento.update({ where: { id: existente.id }, data: payload }),
      ]);
    } else {
      await prisma.apontamento.create({ data: { maquinaId, pedidoId, data, turno, ...payload } });
    }

    revalidatePath("/apontamentos");
    revalidatePath("/oee");
    revalidatePath("/");
    return { ok: true, message: existente ? "Apontamento atualizado (auditoria registrada)." : "Apontamento registrado." };
  } catch (e) {
    return fail(e);
  }
}

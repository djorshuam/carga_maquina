"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, num, optStr, str, type ActionResult } from "@/lib/actions/helpers";

const schema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  tonelagem: z.number().int().positive("Tonelagem deve ser > 0"),
  fabricanteModelo: z.string(),
  dimensaoPratoMm: z.number().int().min(0),
  cursoAberturaMm: z.number().int().min(0),
  capacidadeInjecaoG: z.number().int().min(0),
  custoHora: z.number().min(0),
  status: z.enum(["ATIVA", "MANUTENCAO", "INATIVA"]),
});

export async function salvarMaquina(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = optStr(fd.get("id"));
    const data = schema.parse({
      codigo: str(fd.get("codigo")).toUpperCase(),
      tonelagem: num(fd.get("tonelagem")),
      fabricanteModelo: str(fd.get("fabricanteModelo")),
      dimensaoPratoMm: num(fd.get("dimensaoPratoMm")),
      cursoAberturaMm: num(fd.get("cursoAberturaMm")),
      capacidadeInjecaoG: num(fd.get("capacidadeInjecaoG")),
      custoHora: num(fd.get("custoHora")),
      status: str(fd.get("status")) || "ATIVA",
    });

    if (id) {
      // F-001 caso de borda: inativar com carga futura → aviso (o confirm fica no cliente; aqui só registramos)
      await prisma.maquina.update({ where: { id }, data });
    } else {
      await prisma.maquina.create({ data });
    }
    revalidatePath("/maquinas");
    revalidatePath("/");
    return { ok: true, message: id ? "Máquina atualizada." : "Máquina cadastrada." };
  } catch (e) {
    return fail(e);
  }
}

export async function excluirMaquina(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    const carga = await prisma.pedido.count({ where: { maquinaId: id, apontamentos: { none: {} } } });
    if (carga > 0) {
      return { ok: false, error: `Máquina tem ${carga} pedido(s) alocado(s). Marque como inativa em vez de excluir (RF-02).` };
    }
    await prisma.maquina.delete({ where: { id } });
    revalidatePath("/maquinas");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const turnoRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const hora = z.string().regex(turnoRe, "Horário no formato HH:MM").nullable();

export async function salvarTurnos(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    const t = (k: string) => optStr(fd.get(k));
    const data = z
      .object({
        turno1Inicio: hora, turno1Fim: hora,
        turno2Inicio: hora, turno2Fim: hora,
        turno3Inicio: hora, turno3Fim: hora,
        diasOperacao: z.number().int().min(1).max(7),
        eficienciaPercentual: z.number().int().min(1).max(100),
      })
      .parse({
        turno1Inicio: t("turno1Inicio"), turno1Fim: t("turno1Fim"),
        turno2Inicio: t("turno2Inicio"), turno2Fim: t("turno2Fim"),
        turno3Inicio: t("turno3Inicio"), turno3Fim: t("turno3Fim"),
        diasOperacao: num(fd.get("diasOperacao"), 5),
        eficienciaPercentual: num(fd.get("eficienciaPercentual"), 85),
      });
    await prisma.maquina.update({ where: { id }, data });
    revalidatePath("/turnos");
    revalidatePath("/");
    return { ok: true, message: "Calendário salvo." };
  } catch (e) {
    return fail(e);
  }
}

export async function adicionarParada(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const maquinaId = str(fd.get("maquinaId"));
    const motivo = str(fd.get("motivo")) || "Parada programada";
    const inicio = new Date(str(fd.get("inicio")));
    const fim = new Date(str(fd.get("fim")));
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return { ok: false, error: "Informe início e fim." };
    if (fim <= inicio) return { ok: false, error: "Fim deve ser depois do início." };
    await prisma.paradaProgramada.create({ data: { maquinaId, motivo, inicio, fim } });
    revalidatePath("/turnos");
    revalidatePath("/");
    return { ok: true, message: "Parada adicionada." };
  } catch (e) {
    return fail(e);
  }
}

export async function removerParada(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await prisma.paradaProgramada.delete({ where: { id: str(fd.get("id")) } });
    revalidatePath("/turnos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function salvarOperadores(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    await prisma.maquina.update({
      where: { id },
      data: {
        operadoresTurno1: Math.max(0, Math.round(num(fd.get("operadoresTurno1")))),
        operadoresTurno2: Math.max(0, Math.round(num(fd.get("operadoresTurno2")))),
        operadoresTurno3: Math.max(0, Math.round(num(fd.get("operadoresTurno3")))),
        operadoresObs: str(fd.get("operadoresObs")),
      },
    });
    revalidatePath("/operadores");
    return { ok: true, message: "Necessidade salva." };
  } catch (e) {
    return fail(e);
  }
}

export async function salvarDisponibilidade(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const data = new Date(str(fd.get("data")));
    if (isNaN(data.getTime())) return { ok: false, error: "Data inválida." };
    for (const turno of [1, 2, 3]) {
      const quantidade = Math.max(0, Math.round(num(fd.get(`turno${turno}`))));
      await prisma.disponibilidadeOperadores.upsert({
        where: { data_turno: { data, turno } },
        update: { quantidade },
        create: { data, turno, quantidade },
      });
    }
    revalidatePath("/operadores");
    return { ok: true, message: "Disponibilidade registrada." };
  } catch (e) {
    return fail(e);
  }
}

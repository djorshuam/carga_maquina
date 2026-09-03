"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, num, optStr, str, type ActionResult } from "@/lib/actions/helpers";
import { cargaSemanal } from "@/lib/carga";

const schema = z.object({
  numero: z.string().min(1, "Nº do pedido é obrigatório"),
  cliente: z.string(),
  moldeId: z.string().min(1, "Selecione o produto/molde"),
  quantidadePecas: z.number().int().positive("Quantidade deve ser > 0"),
  prazoEntrega: z.date(),
  prioridade: z.enum(["NORMAL", "ALTA", "URGENTE"]),
  maquinaId: z.string().nullable(),
});

/** F-006 RF-02: sugere a máquina compatível ativa com menor ocupação. */
export async function sugerirMaquina(moldeId: string): Promise<string | null> {
  const molde = await prisma.molde.findUnique({ where: { id: moldeId }, include: { maquinas: true } });
  if (!molde) return null;
  const compativeis = molde.maquinas.filter((m) => m.status === "ATIVA");
  if (compativeis.length === 0) return null;
  const carga = await cargaSemanal();
  const ranked = compativeis
    .map((m) => ({ id: m.id, ocupacao: carga.find((c) => c.maquinaId === m.id)?.ocupacao ?? 0 }))
    .sort((a, b) => a.ocupacao - b.ocupacao);
  return ranked[0].id;
}

export async function salvarPedido(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = optStr(fd.get("id"));
    const prazo = new Date(str(fd.get("prazoEntrega")));
    if (isNaN(prazo.getTime())) return { ok: false, error: "Prazo de entrega inválido." };
    let maquinaId = optStr(fd.get("maquinaId"));
    const moldeId = str(fd.get("moldeId"));
    if (maquinaId === "AUTO") maquinaId = await sugerirMaquina(moldeId);

    const data = schema.parse({
      numero: str(fd.get("numero")).toUpperCase(),
      cliente: str(fd.get("cliente")),
      moldeId,
      quantidadePecas: num(fd.get("quantidadePecas")),
      prazoEntrega: prazo,
      prioridade: str(fd.get("prioridade")) || "NORMAL",
      maquinaId,
    });

    if (data.maquinaId) {
      const molde = await prisma.molde.findUnique({ where: { id: data.moldeId }, include: { maquinas: { select: { id: true, status: true, codigo: true } } } });
      if (!molde) return { ok: false, error: "Molde não encontrado." };
      const alvo = molde.maquinas.find((m) => m.id === data.maquinaId);
      if (!alvo) return { ok: false, error: "Máquina fora da lista de compatíveis do molde (RN-08)." };
      if (alvo.status === "INATIVA") return { ok: false, error: `Máquina ${alvo.codigo} está inativa e não pode receber carga (RN-01).` };
    }

    if (id) await prisma.pedido.update({ where: { id }, data });
    else await prisma.pedido.create({ data });

    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true, message: data.maquinaId ? "Pedido adicionado à carga." : "Pedido salvo — aguardando alocação." };
  } catch (e) {
    return fail(e);
  }
}

export async function alocarPedido(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    let maquinaId = optStr(fd.get("maquinaId"));
    const pedido = await prisma.pedido.findUnique({ where: { id }, include: { molde: { include: { maquinas: true } } } });
    if (!pedido) return { ok: false, error: "Pedido não encontrado." };
    if (maquinaId === "AUTO") maquinaId = await sugerirMaquina(pedido.moldeId);
    if (maquinaId) {
      const alvo = pedido.molde.maquinas.find((m) => m.id === maquinaId);
      if (!alvo) return { ok: false, error: "Máquina incompatível com o molde (RN-08)." };
      if (alvo.status === "INATIVA") return { ok: false, error: "Máquina inativa (RN-01)." };
    }
    await prisma.pedido.update({ where: { id }, data: { maquinaId } });
    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function excluirPedido(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    const ap = await prisma.apontamento.count({ where: { pedidoId: id } });
    if (ap > 0) return { ok: false, error: "Pedido já tem apontamentos; não pode ser excluído." };
    await prisma.pedido.delete({ where: { id } });
    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

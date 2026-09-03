"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, num, optStr, str, type ActionResult } from "@/lib/actions/helpers";

const schema = z.object({
  codigo: z.string().min(1, "Código do molde é obrigatório"),
  produto: z.string().min(1, "Produto é obrigatório"),
  numeroCavidades: z.number().int().min(1, "Nº de cavidades deve ser ≥ 1 (RN-03)"),
  tempoCicloS: z.number().positive("Tempo de ciclo deve ser > 0"),
  tempoSetupMin: z.number().int().min(0),
  maquinaIds: z.array(z.string()),
});

export async function salvarMolde(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = optStr(fd.get("id"));
    const data = schema.parse({
      codigo: str(fd.get("codigo")).toUpperCase(),
      produto: str(fd.get("produto")),
      numeroCavidades: num(fd.get("numeroCavidades")),
      tempoCicloS: num(fd.get("tempoCicloS")),
      tempoSetupMin: num(fd.get("tempoSetupMin")),
      maquinaIds: fd.getAll("maquinaIds").map(String),
    });

    // RN-02: compatibilidade restrita por tonelagem/prato — validamos que as máquinas existem;
    // a regra de tonelagem mínima é sugerida na UI (filtro), não bloqueia o PCP que conhece a máquina.
    const maquinas = await prisma.maquina.findMany({ where: { id: { in: data.maquinaIds } }, select: { id: true } });

    const payload = {
      codigo: data.codigo,
      produto: data.produto,
      numeroCavidades: data.numeroCavidades,
      tempoCicloS: data.tempoCicloS,
      tempoSetupMin: data.tempoSetupMin,
      maquinas: { set: maquinas.map((m) => ({ id: m.id })) },
    };

    if (id) await prisma.molde.update({ where: { id }, data: payload });
    else await prisma.molde.create({ data: { ...payload, maquinas: { connect: maquinas.map((m) => ({ id: m.id })) } } });

    revalidatePath("/moldes");
    revalidatePath("/");
    const aviso = maquinas.length === 0 ? " Atenção: molde sem máquina compatível — não poderá ser alocado." : "";
    return { ok: true, message: (id ? "Molde atualizado." : "Molde cadastrado.") + aviso };
  } catch (e) {
    return fail(e);
  }
}

export async function excluirMolde(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    const pedidos = await prisma.pedido.count({ where: { moldeId: id } });
    if (pedidos > 0) return { ok: false, error: `Molde usado em ${pedidos} pedido(s); não pode ser excluído.` };
    await prisma.molde.delete({ where: { id } });
    revalidatePath("/moldes");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function salvarMaterial(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = optStr(fd.get("id"));
    const nome = str(fd.get("nome"));
    if (!nome) return { ok: false, error: "Nome é obrigatório." };
    const tipo = z.enum(["RESINA_VIRGEM", "RECICLO", "MASTERBATCH", "OUTRO"]).parse(str(fd.get("tipo")) || "RESINA_VIRGEM");
    const estoqueRaw = str(fd.get("estoqueDisponivelKg"));
    const estoqueDisponivelKg = estoqueRaw === "" ? null : num(fd.get("estoqueDisponivelKg"));
    const data = { nome, tipo, estoqueDisponivelKg };
    if (id) await prisma.material.update({ where: { id }, data });
    else await prisma.material.create({ data });
    revalidatePath("/materiais");
    revalidatePath("/pedidos");
    return { ok: true, message: "Material salvo." };
  } catch (e) {
    return fail(e);
  }
}

export async function excluirMaterial(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const id = str(fd.get("id"));
    const uso = await prisma.composicaoItem.count({ where: { materialId: id } });
    if (uso > 0) return { ok: false, error: "Material usado em receitas; não pode ser excluído." };
    await prisma.material.delete({ where: { id } });
    revalidatePath("/materiais");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** F-003: salva receita + composição. RN-04: soma % = 100. */
export async function salvarReceita(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const moldeId = str(fd.get("moldeId"));
    const pesoPecaG = num(fd.get("pesoPecaG"));
    if (pesoPecaG <= 0) return { ok: false, error: "Peso da peça deve ser > 0." };
    const percentualRefugoEsperado = num(fd.get("percentualRefugoEsperado"), 3);

    const materialIds = fd.getAll("materialId").map(String);
    const percentuais = fd.getAll("percentual").map((v) => num(v));
    const itens = materialIds
      .map((materialId, i) => ({ materialId, percentual: percentuais[i] ?? 0 }))
      .filter((i) => i.materialId && i.percentual > 0);

    if (itens.length === 0) return { ok: false, error: "Informe ao menos um material na composição." };
    const soma = itens.reduce((a, i) => a + i.percentual, 0);
    if (Math.abs(soma - 100) > 0.01) return { ok: false, error: `Soma da composição deve ser 100% (RN-04). Atual: ${soma.toFixed(2)}%.` };

    const dupl = new Set(itens.map((i) => i.materialId));
    if (dupl.size !== itens.length) return { ok: false, error: "Material repetido na composição." };

    const base = {
      pesoPecaG,
      percentualRefugoEsperado,
      tempAlimentacao: optInt(fd.get("tempAlimentacao")),
      tempCompressao: optInt(fd.get("tempCompressao")),
      tempDosagem: optInt(fd.get("tempDosagem")),
      tempMolde: optInt(fd.get("tempMolde")),
      tempoAquecimentoInicialMin: Math.round(num(fd.get("tempoAquecimentoInicialMin"))),
      tempoResfriamentoS: optNumber(fd.get("tempoResfriamentoS")),
    };
    const composicao = itens.map((i) => ({
      materialId: i.materialId,
      percentual: i.percentual,
      pesoPorPecaG: (pesoPecaG * i.percentual) / 100,
    }));

    await prisma.$transaction(async (tx) => {
      const r = await tx.receita.upsert({
        where: { moldeId },
        update: base,
        create: { moldeId, ...base },
      });
      await tx.composicaoItem.deleteMany({ where: { receitaId: r.id } });
      await tx.composicaoItem.createMany({ data: composicao.map((c) => ({ ...c, receitaId: r.id })) });
    });

    revalidatePath("/receitas");
    revalidatePath("/pedidos");
    revalidatePath("/");
    return { ok: true, message: "Receita salva." };
  } catch (e) {
    return fail(e);
  }
}

function optInt(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Math.round(Number(s.replace(",", ".")));
  return Number.isFinite(n) ? n : null;
}
function optNumber(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

import { prisma } from "@/lib/prisma";
import { alocarPedido, excluirPedido, salvarPedido } from "@/lib/actions/pedidos";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { consumoMaterial, fmt, horasNecessarias, situacaoEstoque } from "@/lib/calc";
import { cargaSemanal } from "@/lib/carga";
import { HorasPreview } from "@/components/HorasPreview";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PRIO = { NORMAL: ["neutral", "Normal"], ALTA: ["warn", "Alta"], URGENTE: ["bad", "Urgente"] } as const;

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ edit?: string; ver?: string }> }) {
  const { edit, ver } = await searchParams;
  const [pedidos, moldes, carga, editando] = await Promise.all([
    prisma.pedido.findMany({ orderBy: [{ prazoEntrega: "asc" }], include: { molde: { include: { receita: true } }, maquina: true, _count: { select: { apontamentos: true } } } }),
    prisma.molde.findMany({ orderBy: { codigo: "asc" }, include: { maquinas: { select: { id: true, codigo: true, status: true } }, receita: true } }),
    cargaSemanal(),
    edit ? prisma.pedido.findUnique({ where: { id: edit } }) : null,
  ]);

  const moldesJson = moldes.map((m) => ({
    id: m.id,
    cavidades: m.numeroCavidades,
    ciclo: Number(m.tempoCicloS),
    setup: m.tempoSetupMin,
    refugo: m.receita ? Number(m.receita.percentualRefugoEsperado) : 0,
    maquinas: m.maquinas.map((x) => ({ id: x.id, codigo: x.codigo, ativa: x.status === "ATIVA" })),
  }));

  const detalhe = ver ? await prisma.pedido.findUnique({ where: { id: ver }, include: { molde: { include: { receita: { include: { composicao: { include: { material: true } } } } } } } }) : null;

  return (
    <>
      <PageHeader title="Demanda — pedidos / ordens" sub="Quantidade solicitada gera automaticamente as horas necessárias usando o tempo de ciclo do molde (RN-06). Máquina sugerida = compatível ativa com menor carga." />

      <Panel title={editando ? `Editar ${editando.numero}` : "Novo pedido / ordem"}>
        <ActionForm key={editando?.id ?? "new"} action={salvarPedido} submitLabel={editando ? "Salvar alterações" : "Adicionar à carga"} resetOnSuccess={!editando}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <HorasPreview moldes={moldesJson} sugestoes={Object.fromEntries(carga.map((c) => [c.maquinaId, c.ocupacao]))}>
            <FormGrid>
              <Field label="Produto / molde" span={2}>
                <select className="input" name="moldeId" defaultValue={editando?.moldeId ?? ""} required>
                  <option value="">Selecione…</option>
                  {moldes.map((m) => <option key={m.id} value={m.id}>{m.produto} ({m.codigo}){m.maquinas.length === 0 ? " — sem máquina compatível" : ""}</option>)}
                </select>
              </Field>
              <Field label="Cliente"><input className="input" name="cliente" defaultValue={editando?.cliente} /></Field>
              <Field label="Pedido nº"><input className="input" name="numero" defaultValue={editando?.numero} placeholder="PC-8834" required /></Field>
              <Field label="Quantidade (peças)"><input className="input" name="quantidadePecas" type="number" min={1} defaultValue={editando?.quantidadePecas} required /></Field>
              <Field label="Prazo de entrega"><input className="input" name="prazoEntrega" type="date" defaultValue={editando ? editando.prazoEntrega.toISOString().slice(0, 10) : ""} required /></Field>
              <Field label="Prioridade">
                <select className="input" name="prioridade" defaultValue={editando?.prioridade ?? "NORMAL"}>
                  <option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option>
                </select>
              </Field>
              <Field label="Horas necessárias (calculado)" hint="produção + setup + refugo esperado"><input className="input" name="_horas" readOnly value="" /></Field>
              <Field label="Máquina" span={2} hint="Automática = compatível ativa com menor ocupação">
                <select className="input" name="maquinaId" defaultValue={editando?.maquinaId ?? "AUTO"}>
                  <option value="AUTO">Sugerir automaticamente</option>
                  <option value="">Deixar sem alocação</option>
                  {moldes.flatMap((m) => m.maquinas.map((x) => ({ moldeId: m.id, ...x }))).filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).map((x) => (
                    <option key={x.id} value={x.id}>{x.codigo}{x.status !== "ATIVA" ? ` (${x.status.toLowerCase()})` : ""}</option>
                  ))}
                </select>
              </Field>
            </FormGrid>
          </HorasPreview>
          {editando && <Link href="/pedidos" className="btn mt-4 mr-2 inline-flex">Cancelar</Link>}
        </ActionForm>
      </Panel>

      {detalhe && (
        <Panel className="mt-5" title={`Consumo projetado — ${detalhe.numero} (${fmt.int(detalhe.quantidadePecas)} peças)`} desc="RN-07: consumo líquido + refugo esperado. Comparado com o estoque manual do material.">
          {!detalhe.molde.receita ? (
            <Empty>Molde sem receita — <Link href={`/receitas?molde=${detalhe.moldeId}`} className="text-blue underline">cadastrar receita</Link>.</Empty>
          ) : (
            <table className="tbl">
              <thead><tr><th>Material</th><th>Consumo líquido</th><th>+ Refugo ({Number(detalhe.molde.receita.percentualRefugoEsperado)}%)</th><th>Total necessário</th><th>Estoque</th><th>Situação</th></tr></thead>
              <tbody>
                {detalhe.molde.receita.composicao.map((c) => {
                  const k = consumoMaterial({ pesoPorPecaG: Number(c.pesoPorPecaG), quantidadePecas: detalhe.quantidadePecas, refugoPercentual: Number(detalhe.molde.receita!.percentualRefugoEsperado) });
                  const est = c.material.estoqueDisponivelKg == null ? null : Number(c.material.estoqueDisponivelKg);
                  const s = situacaoEstoque(est, k.totalKg);
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.material.nome}</td>
                      <td>{fmt.kg(k.liquidoKg)}</td>
                      <td>{fmt.kg(k.refugoKg)}</td>
                      <td className="font-semibold">{fmt.kg(k.totalKg)}</td>
                      <td>{est == null ? "—" : fmt.kg(est)}</td>
                      <td>{s === "DISPONIVEL" ? <Tag kind="ok">Disponível</Tag> : s === "INSUFICIENTE" ? <Tag kind="bad">Insuficiente — comprar</Tag> : <Tag kind="neutral">Não verificado</Tag>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      <Panel className="mt-5" title="Fila de pedidos" desc="Status: alocado / aguardando alocação / excede capacidade / inviável no prazo.">
        {pedidos.length === 0 ? (
          <Empty>Nenhum pedido ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Prazo</th><th>Prior.</th><th>Horas nec.</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {pedidos.map((p) => {
                const horas = horasNecessarias({ quantidadePecas: p.quantidadePecas, numeroCavidades: p.molde.numeroCavidades, tempoCicloS: Number(p.molde.tempoCicloS), tempoSetupMin: p.molde.tempoSetupMin, incluiSetup: true, refugoPercentual: p.molde.receita ? Number(p.molde.receita.percentualRefugoEsperado) : 0 });
                const linha = carga.find((c) => c.maquinaId === p.maquinaId);
                const info = linha?.pedidos.find((x) => x.id === p.id);
                const concluido = p._count.apontamentos > 0;
                const [pk, pl] = PRIO[p.prioridade];
                let status: React.ReactNode;
                if (concluido) status = <Tag kind="info">em produção / apontado</Tag>;
                else if (!p.maquina) status = <Tag kind="warn">Aguardando alocação</Tag>;
                else if (linha && linha.cargaHoras > linha.capacidadeHoras && info) status = <Tag kind="bad">Excede capacidade — revisar</Tag>;
                else if (info?.emRisco) status = <Tag kind="bad">Inviável no prazo</Tag>;
                else status = <Tag kind="ok">Alocado — {p.maquina.codigo}</Tag>;
                return (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.numero}</td>
                    <td>{p.cliente || "—"}</td>
                    <td>{p.molde.produto}</td>
                    <td>{fmt.int(p.quantidadePecas)}</td>
                    <td>{fmt.data(p.prazoEntrega)}</td>
                    <td><Tag kind={pk}>{pl}</Tag></td>
                    <td>{fmt.h(horas)}</td>
                    <td>{status}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/pedidos?ver=${p.id}`} className="btn !py-1 !px-2 !text-[12px] mr-1">Consumo</Link>
                      <Link href={`/pedidos?edit=${p.id}`} className="btn !py-1 !px-2 !text-[12px] mr-1">Editar</Link>
                      {!p.maquina && <span className="mr-1"><InlineAction action={alocarPedido} label="Alocar auto" hidden={{ id: p.id, maquinaId: "AUTO" }} /></span>}
                      <InlineAction action={excluirPedido} label="Excluir" danger hidden={{ id: p.id }} confirmText={`Excluir ${p.numero}?`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

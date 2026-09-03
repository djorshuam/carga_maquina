"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { alocarPedido, excluirPedido, salvarPedido } from "@/lib/actions/pedidos";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { consumoMaterial, fmt, situacaoEstoque } from "@/lib/calc";
import { HorasPreview } from "@/components/HorasPreview";
import { api, qk } from "@/lib/queries";
import Link from "next/link";

const PRIO = { NORMAL: ["neutral", "Normal"], ALTA: ["warn", "Alta"], URGENTE: ["bad", "Urgente"] } as const;

export function PedidosClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const ver = sp.get("ver") ?? undefined;
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: qk.pedidos(ver), queryFn: () => api.pedidos(ver) });
  const pedidos = data?.pedidos ?? [];
  const moldes = data?.moldes ?? [];
  const carga = data?.carga ?? [];
  const detalhe = data?.detalhe ?? null;
  const editando = pedidos.find((p) => p.id === editId) ?? null;

  const moldesJson = moldes.map((m) => ({ id: m.id, cavidades: m.numeroCavidades, ciclo: m.tempoCicloS, setup: m.tempoSetupMin, refugo: m.refugoPercentual, maquinas: m.maquinas }));
  const sugestoes = Object.fromEntries(carga.map((c) => [c.maquinaId, c.ocupacao]));

  return (
    <>
      <PageHeader title="Demanda — pedidos / ordens" sub="Quantidade solicitada gera automaticamente as horas necessárias usando o tempo de ciclo do molde (RN-06). Máquina sugerida = compatível ativa com menor carga." />

      <Panel title={editando ? `Editar ${editando.numero}` : "Novo pedido / ordem"}>
        <ActionForm key={editando?.id ?? "new"} action={salvarPedido} submitLabel={editando ? "Salvar alterações" : "Adicionar à carga"} resetOnSuccess={!editando} invalidate={[qk.pedidos(ver), qk.pedidos(undefined)]} onSuccess={() => setEditId(null)}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <HorasPreview moldes={moldesJson} sugestoes={sugestoes}>
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
              <Field label="Prazo de entrega"><input className="input" name="prazoEntrega" type="date" defaultValue={editando ? editando.prazoEntrega.slice(0, 10) : ""} required /></Field>
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
                    <option key={x.id} value={x.id}>{x.codigo}{!x.ativa ? " (inativa)" : ""}</option>
                  ))}
                </select>
              </Field>
            </FormGrid>
          </HorasPreview>
          {editando && <button type="button" className="btn mt-4 mr-2" onClick={() => setEditId(null)}>Cancelar</button>}
        </ActionForm>
      </Panel>

      {detalhe && (
        <Panel className="mt-5" title={`Consumo projetado — ${detalhe.numero} (${fmt.int(detalhe.quantidadePecas)} peças)`} desc="RN-07: consumo líquido + refugo esperado. Comparado com o estoque manual do material.">
          {detalhe.semReceita || !detalhe.composicao ? (
            <Empty>Molde sem receita — <Link href={`/receitas?molde=${detalhe.moldeId}`} className="text-blue underline">cadastrar receita</Link>.</Empty>
          ) : (
            <table className="tbl">
              <thead><tr><th>Material</th><th>Consumo líquido</th><th>+ Refugo ({detalhe.percentualRefugoEsperado}%)</th><th>Total necessário</th><th>Estoque</th><th>Situação</th></tr></thead>
              <tbody>
                {detalhe.composicao.map((c) => {
                  const k = consumoMaterial({ pesoPorPecaG: c.pesoPorPecaG, quantidadePecas: detalhe.quantidadePecas, refugoPercentual: detalhe.percentualRefugoEsperado ?? 0 });
                  const s = situacaoEstoque(c.estoqueDisponivelKg, k.totalKg);
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.materialNome}</td>
                      <td>{fmt.kg(k.liquidoKg)}</td>
                      <td>{fmt.kg(k.refugoKg)}</td>
                      <td className="font-semibold">{fmt.kg(k.totalKg)}</td>
                      <td>{c.estoqueDisponivelKg == null ? "—" : fmt.kg(c.estoqueDisponivelKg)}</td>
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
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : pedidos.length === 0 ? (
          <Empty>Nenhum pedido ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Prazo</th><th>Prior.</th><th>Horas nec.</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {pedidos.map((p) => {
                const linha = carga.find((c) => c.maquinaId === p.maquinaId);
                const info = linha?.pedidos.find((x) => x.id === p.id);
                const [pk, pl] = PRIO[p.prioridade];
                let status: React.ReactNode;
                if (p.apontamentosCount > 0) status = <Tag kind="info">em produção / apontado</Tag>;
                else if (!p.maquinaId) status = <Tag kind="warn">Aguardando alocação</Tag>;
                else if (linha && linha.cargaHoras > linha.capacidadeHoras && info) status = <Tag kind="bad">Excede capacidade — revisar</Tag>;
                else if (info?.emRisco) status = <Tag kind="bad">Inviável no prazo</Tag>;
                else status = <Tag kind="ok">Alocado — {p.maquinaCodigo}</Tag>;
                return (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.numero}</td>
                    <td>{p.cliente || "—"}</td>
                    <td>{p.produto}</td>
                    <td>{fmt.int(p.quantidadePecas)}</td>
                    <td>{fmt.data(p.prazoEntrega)}</td>
                    <td><Tag kind={pk}>{pl}</Tag></td>
                    <td>{fmt.h(p.horas)}</td>
                    <td>{status}</td>
                    <td className="whitespace-nowrap">
                      <button className="btn !py-1 !px-2 !text-[12px] mr-1" onClick={() => router.push(`/pedidos?ver=${p.id}`)}>Consumo</button>
                      <button className="btn !py-1 !px-2 !text-[12px] mr-1" onClick={() => setEditId(p.id)}>Editar</button>
                      {!p.maquinaId && <span className="mr-1"><InlineAction action={alocarPedido} label="Alocar auto" hidden={{ id: p.id, maquinaId: "AUTO" }} invalidate={[qk.pedidos(ver), qk.pedidos(undefined)]} /></span>}
                      <InlineAction action={excluirPedido} label="Excluir" danger hidden={{ id: p.id }} confirmText={`Excluir ${p.numero}?`} invalidate={[qk.pedidos(ver), qk.pedidos(undefined)]} />
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

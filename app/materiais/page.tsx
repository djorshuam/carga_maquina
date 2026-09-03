"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { excluirMaterial, salvarMaterial } from "@/lib/actions/moldes";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { api, qk } from "@/lib/queries";

const TIPO = { RESINA_VIRGEM: "Resina virgem", RECICLO: "Reciclo", MASTERBATCH: "Corante / masterbatch", OUTRO: "Outro" } as const;

export default function MateriaisPage() {
  const [editId, setEditId] = useState<string | null>(null);
  const { data: materiais, isLoading } = useQuery({ queryKey: qk.materiais, queryFn: api.materiais });
  const editando = materiais?.find((m) => m.id === editId) ?? null;

  return (
    <>
      <PageHeader title="Matéria-prima" sub="Estoque mantido manualmente neste sistema (decisão do MVP). Deixe o estoque em branco para 'não verificado' — nunca é tratado como zero." />

      <Panel title={editando ? `Editar ${editando.nome}` : "Novo material"}>
        <ActionForm key={editando?.id ?? "new"} action={salvarMaterial} submitLabel={editando ? "Salvar alterações" : "Salvar material"} resetOnSuccess={!editando} invalidate={[qk.materiais]} onSuccess={() => setEditId(null)}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <FormGrid cols={3}>
            <Field label="Nome"><input className="input" name="nome" defaultValue={editando?.nome} placeholder="PP Homopolímero H103" required /></Field>
            <Field label="Tipo">
              <select className="input" name="tipo" defaultValue={editando?.tipo ?? "RESINA_VIRGEM"}>
                {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Estoque disponível (kg)" hint="em branco = não verificado"><input className="input" name="estoqueDisponivelKg" type="number" min={0} step="0.1" defaultValue={editando?.estoqueDisponivelKg == null ? "" : editando.estoqueDisponivelKg} /></Field>
          </FormGrid>
          {editando && <button type="button" className="btn mt-4 mr-2" onClick={() => setEditId(null)}>Cancelar</button>}
        </ActionForm>
      </Panel>

      <Panel title="Materiais" className="mt-5">
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : !materiais || materiais.length === 0 ? (
          <Empty>Nenhum material ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Material</th><th>Tipo</th><th>Estoque</th><th>Receitas</th><th></th></tr></thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.nome}</td>
                  <td>{TIPO[m.tipo as keyof typeof TIPO]}</td>
                  <td>{m.estoqueDisponivelKg == null ? <Tag kind="neutral">não verificado</Tag> : <Tag kind={m.estoqueDisponivelKg > 0 ? "ok" : "bad"}>{m.estoqueDisponivelKg.toLocaleString("pt-BR")} kg</Tag>}</td>
                  <td>{m.composicoesCount}</td>
                  <td className="whitespace-nowrap">
                    <button className="btn !py-1 !px-2 !text-[12px] mr-1" onClick={() => setEditId(m.id)}>Editar</button>
                    <InlineAction action={excluirMaterial} label="Excluir" danger hidden={{ id: m.id }} confirmText={`Excluir ${m.nome}?`} invalidate={[qk.materiais]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

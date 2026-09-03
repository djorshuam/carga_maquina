"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { excluirMolde, salvarMolde } from "@/lib/actions/moldes";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { PecasHoraPreview } from "@/components/PecasHoraPreview";
import { pecasPorHora, fmt } from "@/lib/calc";
import { api, qk } from "@/lib/queries";
import Link from "next/link";

export default function MoldesPage() {
  const [editId, setEditId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: qk.moldes, queryFn: api.moldes });
  const moldes = data?.moldes ?? [];
  const maquinas = data?.maquinas ?? [];
  const editando = moldes.find((m) => m.id === editId) ?? null;
  const selecionadas = new Set(editando?.maquinas.map((m) => m.id) ?? []);

  return (
    <>
      <PageHeader title="Moldes / Tempo de Ciclo" sub="Aqui entra o dado mais sensível do cálculo: quanto tempo cada tiro leva e quantas peças saem por tiro." />

      <Panel title={editando ? `Editar ${editando.codigo}` : "Novo molde / produto"} desc="Peças/hora = 3600 ÷ ciclo × cavidades. Máquinas compatíveis: escolha por tonelagem e dimensão do prato (RN-02).">
        <ActionForm key={editando?.id ?? "new"} action={salvarMolde} submitLabel={editando ? "Salvar alterações" : "Salvar molde"} resetOnSuccess={!editando} invalidate={[qk.moldes]} onSuccess={() => setEditId(null)}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <PecasHoraPreview>
            <FormGrid>
              <Field label="Produto" span={2}><input className="input" name="produto" defaultValue={editando?.produto} placeholder="Pote 250ml Rosca" required /></Field>
              <Field label="Código do molde"><input className="input" name="codigo" defaultValue={editando?.codigo} placeholder="M-2280" required /></Field>
              <Field label="Nº de cavidades"><input className="input" name="numeroCavidades" type="number" min={1} defaultValue={editando?.numeroCavidades ?? 1} required /></Field>
              <Field label="Tempo de ciclo (s)" hint="segundos por tiro"><input className="input" name="tempoCicloS" type="number" min={0.1} step="0.1" defaultValue={editando?.tempoCicloS} required /></Field>
              <Field label="Peças / hora (calculado)"><input className="input" name="_pecasHora" readOnly value="" /></Field>
              <Field label="Tempo de setup (min)" hint="troca de molde + ajuste"><input className="input" name="tempoSetupMin" type="number" min={0} defaultValue={editando?.tempoSetupMin ?? 0} /></Field>
              <Field label="Máquinas compatíveis" span={4} hint="por tonelagem e dimensão do prato">
                {maquinas.length === 0 ? (
                  <div className="text-[12px] text-muted">Nenhuma máquina cadastrada — <Link href="/maquinas" className="text-blue underline">cadastre primeiro</Link>.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {maquinas.map((m) => (
                      <label key={m.id} className="inline-flex items-center gap-1.5 border border-border rounded-md px-2 py-1 text-[12px] cursor-pointer hover:bg-bg">
                        <input type="checkbox" name="maquinaIds" value={m.id} defaultChecked={selecionadas.has(m.id)} />
                        {m.codigo} <span className="text-muted">· {m.tonelagem}t{m.dimensaoPratoMm ? ` · ${m.dimensaoPratoMm}mm` : ""}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Field>
            </FormGrid>
          </PecasHoraPreview>
          {editando && <button type="button" className="btn mt-4 mr-2" onClick={() => setEditId(null)}>Cancelar</button>}
        </ActionForm>
      </Panel>

      <Panel title="Moldes cadastrados" className="mt-5">
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : moldes.length === 0 ? (
          <Empty>Nenhum molde ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Molde</th><th>Produto</th><th>Cav.</th><th>Ciclo</th><th>Peças/h</th><th>Setup</th><th>Máquinas compatíveis</th><th>Receita</th><th></th></tr></thead>
            <tbody>
              {moldes.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.codigo}</td>
                  <td>{m.produto}</td>
                  <td>{m.numeroCavidades}</td>
                  <td>{m.tempoCicloS} s</td>
                  <td>{fmt.int(Math.round(pecasPorHora(m.tempoCicloS, m.numeroCavidades)))}</td>
                  <td>{m.tempoSetupMin} min</td>
                  <td>{m.maquinas.length === 0 ? <Tag kind="warn">sem máquina — órfão</Tag> : m.maquinas.map((x) => x.codigo).join(", ")}</td>
                  <td>{m.temReceita ? <Tag kind="ok">cadastrada</Tag> : <Link href={`/receitas?molde=${m.id}`} className="text-blue underline text-[12px]">cadastrar</Link>}</td>
                  <td className="whitespace-nowrap">
                    <button className="btn !py-1 !px-2 !text-[12px] mr-1" onClick={() => setEditId(m.id)}>Editar</button>
                    <InlineAction action={excluirMolde} label="Excluir" danger hidden={{ id: m.id }} confirmText={`Excluir ${m.codigo}?`} invalidate={[qk.moldes]} />
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

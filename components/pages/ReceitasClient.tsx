"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { salvarReceita } from "@/lib/actions/moldes";
import { ActionForm } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { api, qk } from "@/lib/queries";
import Link from "next/link";

const LINHAS = 5;

export function ReceitasClient() {
  const sp = useSearchParams();
  const moldeId = sp.get("molde") ?? undefined;
  const { data, isLoading } = useQuery({ queryKey: qk.receitas(moldeId), queryFn: () => api.receitas(moldeId) });
  const moldes = data?.moldes ?? [];
  const materiais = data?.materiais ?? [];
  const molde = data?.molde ?? null;
  const r = molde?.receita ?? null;
  const linhas = Array.from({ length: LINHAS }, (_, i) => r?.composicao[i] ?? null);

  return (
    <>
      <PageHeader title="Receita e parâmetros de processo" sub="Composição de material e parâmetros. Usado para calcular consumo de resina por pedido e checar disponibilidade de estoque." />

      <Panel title="Selecione o molde">
        {isLoading ? (
          <div className="text-[13px] text-muted py-2">Carregando…</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {moldes.length === 0 && <Empty>Cadastre um molde primeiro.</Empty>}
            {moldes.map((m) => (
              <Link key={m.id} href={`/receitas?molde=${m.id}`} className={`btn ${m.id === moldeId ? "primary" : ""}`}>
                {m.codigo} · {m.produto} {m.temReceita ? <Tag kind="ok">ok</Tag> : <Tag kind="warn">sem receita</Tag>}
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {molde && (
        <Panel className="mt-5" title={`Receita do molde — ${molde.codigo} (${molde.produto})`} desc="Soma dos percentuais deve ser 100% (RN-04). Peso por peça de cada material = peso total × %.">
          <ActionForm key={molde.id} action={salvarReceita} submitLabel="Salvar receita" resetOnSuccess={false} invalidate={[qk.receitas(moldeId), qk.moldes]}>
            <input type="hidden" name="moldeId" value={molde.id} />
            <div className="section-title !mt-0">Composição (receita)</div>
            {materiais.length === 0 ? (
              <div className="text-[12px] text-muted">Nenhum material — <Link href="/materiais" className="text-blue underline">cadastre matéria-prima</Link>.</div>
            ) : (
              <table className="tbl max-w-[640px]">
                <thead><tr><th>Material</th><th>% na mistura</th></tr></thead>
                <tbody>
                  {linhas.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <select className="input" name="materialId" defaultValue={c?.materialId ?? ""}>
                          <option value="">—</option>
                          {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </select>
                      </td>
                      <td><input className="input" name="percentual" type="number" min={0} max={100} step="0.01" defaultValue={c ? c.percentual : ""} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="section-title">Parâmetros de processo</div>
            <FormGrid>
              <Field label="Peso total da peça (g)"><input className="input" name="pesoPecaG" type="number" min={0.001} step="0.001" defaultValue={r?.pesoPecaG ?? ""} required /></Field>
              <Field label="% refugo esperado" hint="aumenta tiros necessários e consumo"><input className="input" name="percentualRefugoEsperado" type="number" min={0} max={100} step="0.1" defaultValue={r?.percentualRefugoEsperado ?? 3} /></Field>
              <Field label="Temp. zona alimentação (°C)"><input className="input" name="tempAlimentacao" type="number" defaultValue={r?.tempAlimentacao ?? ""} /></Field>
              <Field label="Temp. zona compressão (°C)"><input className="input" name="tempCompressao" type="number" defaultValue={r?.tempCompressao ?? ""} /></Field>
              <Field label="Temp. zona dosagem (°C)"><input className="input" name="tempDosagem" type="number" defaultValue={r?.tempDosagem ?? ""} /></Field>
              <Field label="Temp. do molde (°C)"><input className="input" name="tempMolde" type="number" defaultValue={r?.tempMolde ?? ""} /></Field>
              <Field label="Tempo de aquecimento inicial (min)" hint="até estabilizar as zonas — entra no setup"><input className="input" name="tempoAquecimentoInicialMin" type="number" min={0} defaultValue={r?.tempoAquecimentoInicialMin ?? 0} /></Field>
              <Field label="Tempo de resfriamento por tiro (s)" hint="já incluso no tempo de ciclo"><input className="input" name="tempoResfriamentoS" type="number" min={0} step="0.1" defaultValue={r?.tempoResfriamentoS ?? ""} /></Field>
            </FormGrid>
          </ActionForm>

          {r && r.composicao.length > 0 && (
            <>
              <div className="section-title">Composição salva</div>
              <table className="tbl max-w-[720px]">
                <thead><tr><th>Material</th><th>Tipo</th><th>%</th><th>Peso por peça</th><th>Estoque</th></tr></thead>
                <tbody>
                  {r.composicao.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.materialNome}</td>
                      <td className="text-muted">{c.materialTipo.toLowerCase().replace("_", " ")}</td>
                      <td>{c.percentual}%</td>
                      <td>{c.pesoPorPecaG.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} g</td>
                      <td>{c.estoqueDisponivelKg == null ? <Tag kind="neutral">não verificado</Tag> : <Tag kind="ok">{c.estoqueDisponivelKg.toLocaleString("pt-BR")} kg</Tag>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Panel>
      )}
    </>
  );
}

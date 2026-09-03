import { prisma } from "@/lib/prisma";
import { excluirMolde, salvarMolde } from "@/lib/actions/moldes";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { PecasHoraPreview } from "@/components/PecasHoraPreview";
import { pecasPorHora, fmt } from "@/lib/calc";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MoldesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [moldes, maquinas, editando] = await Promise.all([
    prisma.molde.findMany({ orderBy: { codigo: "asc" }, include: { maquinas: { select: { id: true, codigo: true } }, receita: { select: { id: true } }, _count: { select: { pedidos: true } } } }),
    prisma.maquina.findMany({ orderBy: { codigo: "asc" } }),
    edit ? prisma.molde.findUnique({ where: { id: edit }, include: { maquinas: { select: { id: true } } } }) : null,
  ]);
  const selecionadas = new Set(editando?.maquinas.map((m) => m.id) ?? []);

  return (
    <>
      <PageHeader title="Moldes / Tempo de Ciclo" sub="Aqui entra o dado mais sensível do cálculo: quanto tempo cada tiro leva e quantas peças saem por tiro." />

      <Panel title={editando ? `Editar ${editando.codigo}` : "Novo molde / produto"} desc="Peças/hora = 3600 ÷ ciclo × cavidades. Máquinas compatíveis: escolha por tonelagem e dimensão do prato (RN-02).">
        <ActionForm key={editando?.id ?? "new"} action={salvarMolde} submitLabel={editando ? "Salvar alterações" : "Salvar molde"} resetOnSuccess={!editando}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <PecasHoraPreview>
            <FormGrid>
              <Field label="Produto" span={2}><input className="input" name="produto" defaultValue={editando?.produto} placeholder="Pote 250ml Rosca" required /></Field>
              <Field label="Código do molde"><input className="input" name="codigo" defaultValue={editando?.codigo} placeholder="M-2280" required /></Field>
              <Field label="Nº de cavidades"><input className="input" name="numeroCavidades" type="number" min={1} defaultValue={editando?.numeroCavidades ?? 1} required /></Field>
              <Field label="Tempo de ciclo (s)" hint="segundos por tiro"><input className="input" name="tempoCicloS" type="number" min={0.1} step="0.1" defaultValue={editando ? Number(editando.tempoCicloS) : undefined} required /></Field>
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
          {editando && <Link href="/moldes" className="btn mt-4 mr-2 inline-flex">Cancelar</Link>}
        </ActionForm>
      </Panel>

      <Panel title="Moldes cadastrados" className="mt-5">
        {moldes.length === 0 ? (
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
                  <td>{Number(m.tempoCicloS)} s</td>
                  <td>{fmt.int(Math.round(pecasPorHora(Number(m.tempoCicloS), m.numeroCavidades)))}</td>
                  <td>{m.tempoSetupMin} min</td>
                  <td>{m.maquinas.length === 0 ? <Tag kind="warn">sem máquina — órfão</Tag> : m.maquinas.map((x) => x.codigo).join(", ")}</td>
                  <td>{m.receita ? <Tag kind="ok">cadastrada</Tag> : <Link href={`/receitas?molde=${m.id}`} className="text-blue underline text-[12px]">cadastrar</Link>}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/moldes?edit=${m.id}`} className="btn !py-1 !px-2 !text-[12px] mr-1">Editar</Link>
                    <InlineAction action={excluirMolde} label="Excluir" danger hidden={{ id: m.id }} confirmText={`Excluir ${m.codigo}?`} />
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

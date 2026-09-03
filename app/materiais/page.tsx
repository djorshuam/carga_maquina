import { prisma } from "@/lib/prisma";
import { excluirMaterial, salvarMaterial } from "@/lib/actions/moldes";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TIPO = { RESINA_VIRGEM: "Resina virgem", RECICLO: "Reciclo", MASTERBATCH: "Corante / masterbatch", OUTRO: "Outro" } as const;

export default async function MateriaisPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [materiais, editando] = await Promise.all([
    prisma.material.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { composicoes: true } } } }),
    edit ? prisma.material.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <>
      <PageHeader title="Matéria-prima" sub="Estoque mantido manualmente neste sistema (decisão do MVP). Deixe o estoque em branco para 'não verificado' — nunca é tratado como zero." />

      <Panel title={editando ? `Editar ${editando.nome}` : "Novo material"}>
        <ActionForm key={editando?.id ?? "new"} action={salvarMaterial} submitLabel={editando ? "Salvar alterações" : "Salvar material"} resetOnSuccess={!editando}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <FormGrid cols={3}>
            <Field label="Nome"><input className="input" name="nome" defaultValue={editando?.nome} placeholder="PP Homopolímero H103" required /></Field>
            <Field label="Tipo">
              <select className="input" name="tipo" defaultValue={editando?.tipo ?? "RESINA_VIRGEM"}>
                {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Estoque disponível (kg)" hint="em branco = não verificado"><input className="input" name="estoqueDisponivelKg" type="number" min={0} step="0.1" defaultValue={editando?.estoqueDisponivelKg == null ? "" : Number(editando.estoqueDisponivelKg)} /></Field>
          </FormGrid>
          {editando && <Link href="/materiais" className="btn mt-4 mr-2 inline-flex">Cancelar</Link>}
        </ActionForm>
      </Panel>

      <Panel title="Materiais" className="mt-5">
        {materiais.length === 0 ? (
          <Empty>Nenhum material ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Material</th><th>Tipo</th><th>Estoque</th><th>Receitas</th><th></th></tr></thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td className="font-semibold">{m.nome}</td>
                  <td>{TIPO[m.tipo]}</td>
                  <td>{m.estoqueDisponivelKg == null ? <Tag kind="neutral">não verificado</Tag> : <Tag kind={Number(m.estoqueDisponivelKg) > 0 ? "ok" : "bad"}>{Number(m.estoqueDisponivelKg).toLocaleString("pt-BR")} kg</Tag>}</td>
                  <td>{m._count.composicoes}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/materiais?edit=${m.id}`} className="btn !py-1 !px-2 !text-[12px] mr-1">Editar</Link>
                    <InlineAction action={excluirMaterial} label="Excluir" danger hidden={{ id: m.id }} confirmText={`Excluir ${m.nome}?`} />
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

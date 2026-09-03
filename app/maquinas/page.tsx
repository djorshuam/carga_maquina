import { prisma } from "@/lib/prisma";
import { excluirMaquina, salvarMaquina } from "@/lib/actions/maquinas";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_TAG = { ATIVA: ["ok", "Ativa"], MANUTENCAO: ["warn", "Em manutenção"], INATIVA: ["neutral", "Inativa"] } as const;

export default async function MaquinasPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [maquinas, editando] = await Promise.all([
    prisma.maquina.findMany({ orderBy: { codigo: "asc" }, include: { _count: { select: { pedidos: true, moldes: true } } } }),
    edit ? prisma.maquina.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <>
      <PageHeader title="Máquinas" sub="Dados fixos da injetora — usados para saber quais moldes ela aceita e sua capacidade máxima." />

      <Panel title={editando ? `Editar ${editando.codigo}` : "Nova máquina"} desc="Código único. Máquina inativa não recebe carga (RN-01). Máquina com carga alocada não pode ser excluída — marque como inativa (RF-02).">
        <ActionForm key={editando?.id ?? "new"} action={salvarMaquina} submitLabel={editando ? "Salvar alterações" : "Salvar máquina"} resetOnSuccess={!editando}
          confirmText={editando && editando.status === "ATIVA" ? undefined : undefined}>
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <FormGrid>
            <Field label="Código da máquina"><input className="input" name="codigo" defaultValue={editando?.codigo} placeholder="INJ-01" required /></Field>
            <Field label="Tonelagem" hint="toneladas de fechamento"><input className="input" name="tonelagem" type="number" min={1} defaultValue={editando?.tonelagem} required /></Field>
            <Field label="Fabricante / Modelo"><input className="input" name="fabricanteModelo" defaultValue={editando?.fabricanteModelo} placeholder="Haitian MA1200" /></Field>
            <Field label="Status">
              <select className="input" name="status" defaultValue={editando?.status ?? "ATIVA"}>
                <option value="ATIVA">Ativa</option>
                <option value="MANUTENCAO">Em manutenção</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </Field>
            <Field label="Dimensão do prato (mm)"><input className="input" name="dimensaoPratoMm" type="number" min={0} defaultValue={editando?.dimensaoPratoMm} /></Field>
            <Field label="Curso de abertura (mm)"><input className="input" name="cursoAberturaMm" type="number" min={0} defaultValue={editando?.cursoAberturaMm} /></Field>
            <Field label="Capacidade de injeção (g)"><input className="input" name="capacidadeInjecaoG" type="number" min={0} defaultValue={editando?.capacidadeInjecaoG} /></Field>
            <Field label="Custo/hora (R$)"><input className="input" name="custoHora" type="number" min={0} step="0.01" defaultValue={editando ? Number(editando.custoHora) : undefined} /></Field>
          </FormGrid>
          {editando && <Link href="/maquinas" className="btn mt-4 mr-2 inline-flex">Cancelar</Link>}
        </ActionForm>
      </Panel>

      <Panel title="Máquinas cadastradas" className="mt-5">
        {maquinas.length === 0 ? (
          <Empty>Nenhuma máquina ainda.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Código</th><th>Ton.</th><th>Fabricante / Modelo</th><th>Prato</th><th>Injeção</th><th>Custo/h</th><th>Moldes</th><th>Pedidos</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {maquinas.map((m) => {
                const [kind, label] = STATUS_TAG[m.status];
                return (
                  <tr key={m.id}>
                    <td className="font-semibold">{m.codigo}</td>
                    <td>{m.tonelagem}t</td>
                    <td>{m.fabricanteModelo || "—"}</td>
                    <td>{m.dimensaoPratoMm ? `${m.dimensaoPratoMm} mm` : "—"}</td>
                    <td>{m.capacidadeInjecaoG ? `${m.capacidadeInjecaoG} g` : "—"}</td>
                    <td>{Number(m.custoHora) ? `R$ ${Number(m.custoHora).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td>{m._count.moldes}</td>
                    <td>{m._count.pedidos}</td>
                    <td><Tag kind={kind}>{label}</Tag></td>
                    <td className="whitespace-nowrap">
                      <Link href={`/maquinas?edit=${m.id}`} className="btn !py-1 !px-2 !text-[12px] mr-1">Editar</Link>
                      <InlineAction action={excluirMaquina} label="Excluir" danger hidden={{ id: m.id }} confirmText={`Excluir ${m.codigo}?`} />
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

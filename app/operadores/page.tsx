import { prisma } from "@/lib/prisma";
import { salvarDisponibilidade, salvarOperadores } from "@/lib/actions/maquinas";
import { ActionForm } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OperadoresPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams;
  const hoje = new Date();
  const dataIso = sp.data ?? new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())).toISOString().slice(0, 10);
  const data = new Date(dataIso + "T00:00:00Z");
  const [maquinas, disp] = await Promise.all([
    prisma.maquina.findMany({ orderBy: { codigo: "asc" } }),
    prisma.disponibilidadeOperadores.findMany({ where: { data } }),
  ]);
  const disponivel = (t: number) => disp.find((d) => d.turno === t)?.quantidade ?? null;
  const necessario = (t: number) => maquinas.filter((m) => m.status === "ATIVA").reduce((a, m) => a + ((m as Record<string, unknown>)[`operadoresTurno${t}`] as number), 0);

  return (
    <>
      <PageHeader title="Necessidade de operadores por turno" sub="Sem cadastro nominal — apenas quantas pessoas cada máquina exige por turno, para checar se há mão de obra suficiente." />

      <Panel title={`Painel de cobertura — ${new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`} desc="Necessário = soma das máquinas ativas. Disponível = informado manualmente (ou vindo de outro sistema de escala, fora do MVP).">
        <form method="get" className="flex items-end gap-2 mb-4">
          <div className="field"><label>Data</label><input className="input" type="date" name="data" defaultValue={dataIso} /></div>
          <button className="btn" type="submit">Ver</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((t) => {
            const n = necessario(t);
            const d = disponivel(t);
            const falta = d == null ? null : n - d;
            return (
              <div key={t} className="card">
                <div className="label">Turno {t}</div>
                <div className="flex gap-6 my-2">
                  <div><div className="text-[11px] text-muted">Necessário</div><div className="text-xl font-semibold">{n}</div></div>
                  <div><div className="text-[11px] text-muted">Disponível</div><div className="text-xl font-semibold">{d ?? "—"}</div></div>
                </div>
                {d == null ? <Tag kind="neutral">disponível não informado</Tag> : falta! > 0 ? <Tag kind="bad">falta {falta} operador{falta! > 1 ? "es" : ""}</Tag> : <Tag kind="ok">cobertura completa</Tag>}
              </div>
            );
          })}
        </div>
        <div className="section-title">Informar operadores disponíveis nesta data</div>
        <ActionForm key={dataIso} action={salvarDisponibilidade} submitLabel="Registrar disponibilidade" resetOnSuccess={false}>
          <input type="hidden" name="data" value={dataIso} />
          <FormGrid cols={3}>
            {[1, 2, 3].map((t) => (
              <Field key={t} label={`Disponíveis — Turno ${t}`}><input className="input" name={`turno${t}`} type="number" min={0} defaultValue={disponivel(t) ?? ""} /></Field>
            ))}
          </FormGrid>
        </ActionForm>
      </Panel>

      <Panel className="mt-5" title="Necessidade por máquina" desc="Quantidade de operadores que cada máquina exige em cada turno.">
        {maquinas.length === 0 ? (
          <Empty>Nenhuma máquina cadastrada.</Empty>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {maquinas.map((m) => (
              <div key={m.id} className="border border-border rounded-lg p-3">
                <div className="font-semibold mb-2">{m.codigo} <span className="text-muted font-normal">· {m.tonelagem}t</span> {m.status !== "ATIVA" && <Tag kind="neutral">{m.status.toLowerCase()}</Tag>}</div>
                <ActionForm action={salvarOperadores} submitLabel="Salvar" resetOnSuccess={false}>
                  <input type="hidden" name="id" value={m.id} />
                  <FormGrid cols={4}>
                    <Field label="Turno 1"><input className="input" name="operadoresTurno1" type="number" min={0} defaultValue={m.operadoresTurno1} /></Field>
                    <Field label="Turno 2"><input className="input" name="operadoresTurno2" type="number" min={0} defaultValue={m.operadoresTurno2} /></Field>
                    <Field label="Turno 3"><input className="input" name="operadoresTurno3" type="number" min={0} defaultValue={m.operadoresTurno3} /></Field>
                    <Field label="Observação"><input className="input" name="operadoresObs" defaultValue={m.operadoresObs} /></Field>
                  </FormGrid>
                </ActionForm>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

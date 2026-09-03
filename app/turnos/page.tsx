import { prisma } from "@/lib/prisma";
import { adicionarParada, removerParada, salvarTurnos } from "@/lib/actions/maquinas";
import { ActionForm, InlineAction } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { capacidadeSemanalHoras, fmt, horasDiaTurnos } from "@/lib/calc";
import { turnosDe } from "@/lib/carga";
import Link from "next/link";

export default async function TurnosPage({ searchParams }: { searchParams: Promise<{ maquina?: string }> }) {
  const { maquina: maquinaId } = await searchParams;
  const maquinas = await prisma.maquina.findMany({ orderBy: { codigo: "asc" }, include: { paradas: { orderBy: { inicio: "asc" } } } });
  const m = maquinas.find((x) => x.id === maquinaId) ?? maquinas[0];

  return (
    <>
      <PageHeader title="Turnos e calendário" sub="Define a capacidade disponível real da máquina: horas de turnos ativos × dias × eficiência − paradas programadas (RN-05)." />

      <Panel title="Máquina">
        <div className="flex flex-wrap gap-2">
          {maquinas.length === 0 && <Empty>Nenhuma máquina — <Link href="/maquinas" className="text-blue underline">cadastre primeiro</Link>.</Empty>}
          {maquinas.map((x) => {
            const cap = capacidadeSemanalHoras({ turnos: turnosDe(x), diasOperacao: x.diasOperacao, eficienciaPercentual: x.eficienciaPercentual });
            return (
              <Link key={x.id} href={`/turnos?maquina=${x.id}`} className={`btn ${x.id === m?.id ? "primary" : ""}`}>
                {x.codigo} <span className="opacity-70">· {fmt.h(cap)}/sem</span>
              </Link>
            );
          })}
        </div>
      </Panel>

      {m && (
        <>
          <Panel className="mt-5" title={`Turnos — ${m.codigo}`} desc="Deixe início/fim em branco para turno inativo. Eficiência desconta micro-paradas e refugo.">
            <ActionForm key={m.id} action={salvarTurnos} submitLabel="Salvar calendário" resetOnSuccess={false}>
              <input type="hidden" name="id" value={m.id} />
              <FormGrid cols={3}>
                {[1, 2, 3].map((t) => {
                  const ini = (m as Record<string, unknown>)[`turno${t}Inicio`] as string | null;
                  const fim = (m as Record<string, unknown>)[`turno${t}Fim`] as string | null;
                  return (
                    <Field key={t} label={`Turno ${t}`} hint="início – fim (HH:MM)">
                      <div className="flex gap-2 items-center">
                        <input className="input" name={`turno${t}Inicio`} type="time" defaultValue={ini ?? ""} />
                        <span className="text-muted">–</span>
                        <input className="input" name={`turno${t}Fim`} type="time" defaultValue={fim ?? ""} />
                      </div>
                    </Field>
                  );
                })}
                <Field label="Dias de operação por semana"><input className="input" name="diasOperacao" type="number" min={1} max={7} defaultValue={m.diasOperacao} /></Field>
                <Field label="Eficiência considerada (%)" hint="desconta micro-paradas, refugo"><input className="input" name="eficienciaPercentual" type="number" min={1} max={100} defaultValue={m.eficienciaPercentual} /></Field>
                <Field label="Horas úteis / dia (calculado)"><input className="input" readOnly value={fmt.h(horasDiaTurnos(turnosDe(m)))} /></Field>
              </FormGrid>
            </ActionForm>
            <div className="mt-3 text-[12px] text-muted">
              Capacidade semanal (sem paradas): <b className="text-text">{fmt.h(capacidadeSemanalHoras({ turnos: turnosDe(m), diasOperacao: m.diasOperacao, eficienciaPercentual: m.eficienciaPercentual }))}</b>
            </div>
          </Panel>

          <Panel className="mt-5" title="Paradas programadas" desc="Manutenção preventiva, feriado, troca de equipamento — descontadas da capacidade da semana em que ocorrem.">
            <ActionForm key={`p-${m.id}`} action={adicionarParada} submitLabel="+ Adicionar parada">
              <input type="hidden" name="maquinaId" value={m.id} />
              <FormGrid cols={3}>
                <Field label="Motivo"><input className="input" name="motivo" placeholder="Manutenção preventiva" /></Field>
                <Field label="Início"><input className="input" name="inicio" type="datetime-local" required /></Field>
                <Field label="Fim"><input className="input" name="fim" type="datetime-local" required /></Field>
              </FormGrid>
            </ActionForm>
            {m.paradas.length === 0 ? (
              <div className="mt-4"><Empty>Nenhuma parada programada.</Empty></div>
            ) : (
              <table className="tbl mt-4">
                <thead><tr><th>Motivo</th><th>Início</th><th>Fim</th><th>Duração</th><th></th></tr></thead>
                <tbody>
                  {m.paradas.map((p) => (
                    <tr key={p.id}>
                      <td>{p.motivo}</td>
                      <td>{p.inicio.toLocaleString("pt-BR")}</td>
                      <td>{p.fim.toLocaleString("pt-BR")}</td>
                      <td><Tag kind="neutral">{fmt.h((p.fim.getTime() - p.inicio.getTime()) / 3600000)}</Tag></td>
                      <td><InlineAction action={removerParada} label="Remover" danger hidden={{ id: p.id }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

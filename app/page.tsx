import { cargaSemanal, inicioSemana } from "@/lib/carga";
import { Gantt } from "@/components/Gantt";
import { KpiCard, PageHeader, Panel, Tag, Empty } from "@/components/ui";
import { fmt } from "@/lib/calc";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const sp = await searchParams;
  const base = sp.semana ? new Date(sp.semana + "T00:00:00Z") : new Date();
  const semana = inicioSemana(isNaN(base.getTime()) ? new Date() : base);
  const linhas = await cargaSemanal(semana);

  const ativas = linhas.filter((l) => l.status === "ATIVA");
  const sobrecarga = ativas.filter((l) => l.ocupacao > 1).length;
  const ociosas = ativas.filter((l) => l.ocupacao < 0.5).length;
  const capTotal = ativas.reduce((a, l) => a + l.capacidadeHoras, 0);
  const cargaTotal = ativas.reduce((a, l) => a + l.cargaHoras, 0);
  const emRisco = linhas.flatMap((l) => l.pedidos.filter((p) => p.emRisco));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const prev = new Date(semana.getTime() - 7 * 86400000);
  const next = new Date(semana.getTime() + 7 * 86400000);

  return (
    <>
      <PageHeader title="Carga Máquina — Injetoras" sub={`Semana de ${fmt.data(semana)} a ${fmt.data(new Date(semana.getTime() + 6 * 86400000))} · capacidade real (turnos × eficiência − paradas) vs. horas alocadas`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Ocupação da frota" value={capTotal > 0 ? fmt.pct(cargaTotal / capTotal) : "—"} tone={cargaTotal / capTotal > 1 ? "red" : cargaTotal / capTotal > 0.85 ? "yellow" : "green"} sub={`${fmt.h(cargaTotal)} de ${fmt.h(capTotal)}`} />
        <KpiCard label="Máquinas em sobrecarga" value={sobrecarga} tone={sobrecarga > 0 ? "red" : "green"} />
        <KpiCard label="Máquinas ociosas (<50%)" value={ociosas} tone={ociosas > 0 ? "yellow" : "green"} />
        <KpiCard label="Pedidos com prazo em risco" value={emRisco.length} tone={emRisco.length > 0 ? "red" : "green"} />
      </div>

      <Panel title="Gantt semanal por máquina" desc="Azul = ordem · Cinza = setup (troca de molde) · Vermelho = excede a capacidade disponível do período. Ordens sequenciadas por prioridade e prazo.">
        <div className="flex items-center gap-2 mb-3 text-[12px]">
          <Link className="btn !py-1 !px-2 !text-[12px]" href={`/?semana=${iso(prev)}`}>← semana anterior</Link>
          <Link className="btn !py-1 !px-2 !text-[12px]" href="/">hoje</Link>
          <Link className="btn !py-1 !px-2 !text-[12px]" href={`/?semana=${iso(next)}`}>próxima semana →</Link>
        </div>
        {linhas.length === 0 ? <Empty>Nenhuma máquina cadastrada. Comece em <Link href="/maquinas" className="text-blue underline">Cadastros → Máquinas</Link>.</Empty> : <Gantt linhas={linhas} semana={semana} />}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <Panel title="Ordens alocadas" desc="Sequência prevista por máquina e sinalização de prazo.">
          {linhas.every((l) => l.pedidos.length === 0) ? (
            <Empty>Nenhum pedido alocado nesta semana.</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Máquina</th><th>Pedido</th><th>Produto</th><th>Horas</th><th>Prazo</th><th>Status</th></tr>
              </thead>
              <tbody>
                {linhas.flatMap((l) =>
                  l.pedidos.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{l.codigo}</td>
                      <td>{p.numero}</td>
                      <td>{p.produto}</td>
                      <td>{fmt.h(p.horas)}</td>
                      <td>{fmt.data(p.prazo)}</td>
                      <td>{p.emRisco ? <Tag kind="bad">prazo em risco</Tag> : <Tag kind="ok">no prazo</Tag>}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Capacidade por máquina" desc="RN-05: horas dos turnos ativos × dias × eficiência − paradas programadas na semana.">
          <table className="tbl">
            <thead><tr><th>Máquina</th><th>Capacidade</th><th>Carga</th><th>Ocupação</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.maquinaId}>
                  <td className="font-medium">{l.codigo}</td>
                  <td>{fmt.h(l.capacidadeHoras)}</td>
                  <td>{fmt.h(l.cargaHoras)}</td>
                  <td>
                    {l.status !== "ATIVA" ? <Tag kind="neutral">{l.status.toLowerCase()}</Tag> : l.ocupacao === Infinity ? <Tag kind="bad">sem turnos</Tag> : <Tag kind={l.ocupacao > 1 ? "bad" : l.ocupacao > 0.85 ? "warn" : "ok"}>{fmt.pct(l.ocupacao)}</Tag>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { oeePeriodo } from "@/lib/oee";
import { Gauge } from "@/components/Gauge";
import { Empty, KpiCard, PageHeader, Panel, Tag } from "@/components/ui";
import { fmt, zonaOee } from "@/lib/calc";
import Link from "next/link";

export const dynamic = "force-dynamic";

function isoDay(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export default async function OeePage({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; maquina?: string }> }) {
  const sp = await searchParams;
  const hoje = new Date();
  const ateIso = sp.ate ?? isoDay(hoje);
  const deIso = sp.de ?? isoDay(new Date(hoje.getTime() - 6 * 86400000));
  const de = new Date(deIso + "T00:00:00Z");
  const ate = new Date(ateIso + "T00:00:00Z");
  const maquinas = await prisma.maquina.findMany({ orderBy: { codigo: "asc" }, select: { id: true, codigo: true } });
  const sel = sp.maquina && maquinas.some((m) => m.id === sp.maquina) ? sp.maquina : undefined;

  const r = await oeePeriodo(de, ate, sel);
  const foco = sel ? r.porMaquina[0]?.oee ?? null : r.frota;
  const titulo = sel ? `OEE — ${maquinas.find((m) => m.id === sel)?.codigo}` : "OEE — frota";

  const [frotaCompleta, planejado] = await Promise.all([
    sel ? oeePeriodo(de, ate) : Promise.resolve(r),
    prisma.pedido.aggregate({ _sum: { quantidadePecas: true }, where: { apontamentos: { some: { data: { gte: de, lte: ate } } }, ...(sel ? { maquinaId: sel } : {}) } }),
  ]);

  return (
    <>
      <PageHeader title="Painel de OEE" sub="Disponibilidade × Performance × Qualidade — calculado automaticamente a partir dos apontamentos. Sem apontamento = 'sem dados', nunca 0%." />

      <Panel title="Período e máquina">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="field"><label>De</label><input className="input" type="date" name="de" defaultValue={deIso} /></div>
          <div className="field"><label>Até</label><input className="input" type="date" name="ate" defaultValue={ateIso} /></div>
          <div className="field"><label>Máquina</label>
            <select className="input" name="maquina" defaultValue={sel ?? ""}>
              <option value="">Frota (todas)</option>
              {maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
            </select>
          </div>
          <button className="btn primary" type="submit">Aplicar</button>
        </form>
      </Panel>

      <Panel className="mt-5" title={titulo} desc={`${fmt.data(de)} a ${fmt.data(ate)} · zonas: vermelho < 60% · amarelo 60–80% · verde ≥ 80%`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <Gauge label="OEE" value={foco?.oee ?? null} size={220} />
          <Gauge label="Disponibilidade" value={foco?.disponibilidade ?? null} />
          <Gauge label="Performance" value={foco?.performance ?? null} />
          <Gauge label="Qualidade" value={foco?.qualidade ?? null} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <KpiCard label="Produzido vs. planejado" value={`${fmt.int(r.totais.produzidas)} / ${fmt.int(planejado._sum.quantidadePecas ?? 0)}`} sub="peças apontadas / qtd. dos pedidos apontados" />
          <KpiCard label="Peças boas" value={fmt.int(r.totais.boas)} tone="green" />
          <KpiCard label="Rejeitadas" value={fmt.int(r.totais.refugadas)} tone={r.totais.refugadas > 0 ? "red" : undefined} />
          <KpiCard label="Tempo parado" value={`${fmt.int(r.totais.paradoMin)} min`} tone={r.totais.paradoMin > 0 ? "yellow" : undefined} />
        </div>
      </Panel>

      <Panel className="mt-5" title="OEE por máquina" desc="Comparação rápida da frota no período. Clique numa máquina para ver o detalhe.">
        {frotaCompleta.porMaquina.length === 0 ? (
          <Empty>Nenhuma máquina cadastrada.</Empty>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {frotaCompleta.porMaquina.map((m) => {
              const v = m.oee?.oee ?? null;
              const z = v == null ? null : zonaOee(v);
              return (
                <Link key={m.maquinaId} href={`/oee?de=${deIso}&ate=${ateIso}&maquina=${m.maquinaId}`} className={`card hover:border-blue transition-colors ${sel === m.maquinaId ? "!border-blue" : ""}`}>
                  <div className="font-semibold text-[13px] mb-1">{m.codigo}</div>
                  <Gauge label="" value={v} size={120} />
                  <div className="text-[11px] text-muted mt-1 flex justify-between">
                    <span>{m.apontamentos} apont.</span>
                    {z && <Tag kind={z === "green" ? "ok" : z === "yellow" ? "warn" : "bad"}>{z === "green" ? "bom" : z === "yellow" ? "atenção" : "crítico"}</Tag>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Gauge } from "@/components/Gauge";
import { Empty, KpiCard, PageHeader, Panel, Tag } from "@/components/ui";
import { fmt, zonaOee } from "@/lib/calc";
import { api, qk } from "@/lib/queries";
import Link from "next/link";

function isoDay(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export function OeeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const hoje = new Date();
  const ateIso = sp.get("ate") ?? isoDay(hoje);
  const deIso = sp.get("de") ?? isoDay(new Date(hoje.getTime() - 6 * 86400000));
  const sel = sp.get("maquina") ?? undefined;

  const { data, isLoading } = useQuery({ queryKey: qk.oee(deIso, ateIso, sel), queryFn: () => api.oee(deIso, ateIso, sel) });

  const foco = sel ? data?.porMaquina[0]?.oee ?? null : data?.frota ?? null;
  const titulo = sel ? `OEE — ${data?.maquinas.find((m) => m.id === sel)?.codigo ?? ""}` : "OEE — frota";

  return (
    <>
      <PageHeader title="Painel de OEE" sub="Disponibilidade × Performance × Qualidade — calculado automaticamente a partir dos apontamentos. Sem apontamento = 'sem dados', nunca 0%." />

      <Panel title="Período e máquina">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const params = new URLSearchParams();
            params.set("de", String(fd.get("de")));
            params.set("ate", String(fd.get("ate")));
            const maq = String(fd.get("maquina") || "");
            if (maq) params.set("maquina", maq);
            router.push(`/oee?${params.toString()}`);
          }}
        >
          <div className="field"><label>De</label><input className="input" type="date" name="de" defaultValue={deIso} /></div>
          <div className="field"><label>Até</label><input className="input" type="date" name="ate" defaultValue={ateIso} /></div>
          <div className="field"><label>Máquina</label>
            <select className="input" name="maquina" defaultValue={sel ?? ""}>
              <option value="">Frota (todas)</option>
              {data?.maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo}</option>)}
            </select>
          </div>
          <button className="btn primary" type="submit">Aplicar</button>
        </form>
      </Panel>

      <Panel className="mt-5" title={titulo} desc={`${fmt.data(deIso)} a ${fmt.data(ateIso)} · zonas: vermelho < 60% · amarelo 60–80% · verde ≥ 80%`}>
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
              <Gauge label="OEE" value={foco?.oee ?? null} size={220} />
              <Gauge label="Disponibilidade" value={foco?.disponibilidade ?? null} />
              <Gauge label="Performance" value={foco?.performance ?? null} />
              <Gauge label="Qualidade" value={foco?.qualidade ?? null} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <KpiCard label="Produzido vs. planejado" value={`${fmt.int(data?.totais.produzidas ?? 0)} / ${fmt.int(data?.plaejadoPecas ?? 0)}`} sub="peças apontadas / qtd. dos pedidos apontados" />
              <KpiCard label="Peças boas" value={fmt.int(data?.totais.boas ?? 0)} tone="green" />
              <KpiCard label="Rejeitadas" value={fmt.int(data?.totais.refugadas ?? 0)} tone={(data?.totais.refugadas ?? 0) > 0 ? "red" : undefined} />
              <KpiCard label="Tempo parado" value={`${fmt.int(data?.totais.paradoMin ?? 0)} min`} tone={(data?.totais.paradoMin ?? 0) > 0 ? "yellow" : undefined} />
            </div>
          </>
        )}
      </Panel>

      <Panel className="mt-5" title="OEE por máquina" desc="Comparação rápida da frota no período. Clique numa máquina para ver o detalhe.">
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : !data || data.frotaCompletaPorMaquina.length === 0 ? (
          <Empty>Nenhuma máquina cadastrada.</Empty>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.frotaCompletaPorMaquina.map((m) => {
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

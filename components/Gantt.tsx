import type { LinhaCargaDTO } from "@/lib/queries";
import { fmt } from "@/lib/calc";
import { Tag } from "@/components/ui";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function Gantt({ linhas, semana }: { linhas: LinhaCargaDTO[]; semana: Date }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid text-[11px] text-muted border-b border-border pb-1.5 mb-1.5" style={{ gridTemplateColumns: "190px repeat(7, 1fr)" }}>
          <div>Máquina</div>
          {DIAS.map((d, i) => {
            const dt = new Date(semana.getTime() + i * 86400000);
            return (
              <div key={d} className="text-center">
                {d} <span className="opacity-70">{fmt.data(dt)}</span>
              </div>
            );
          })}
        </div>
        {linhas.map((l) => {
          const tone = l.ocupacao > 1 ? "bad" : l.ocupacao > 0.85 ? "warn" : "ok";
          return (
            <div key={l.maquinaId} className="grid items-center border-b border-border py-2" style={{ gridTemplateColumns: "190px 1fr" }}>
              <div className="pr-3">
                <div className="text-[13px] font-semibold">
                  {l.codigo} <span className="text-muted font-normal">· {l.tonelagem}t</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                  {l.status !== "ATIVA" ? (
                    <Tag kind="neutral">{l.status === "MANUTENCAO" ? "manutenção" : "inativa"}</Tag>
                  ) : (
                    <Tag kind={tone}>{l.ocupacao === Infinity ? "sem capacidade" : fmt.pct(l.ocupacao)}</Tag>
                  )}
                  <span>
                    {fmt.h(l.cargaHoras)} / {fmt.h(l.capacidadeHoras)}
                  </span>
                </div>
              </div>
              <div className="relative h-9 rounded bg-[#f8f9fb] border border-border overflow-hidden">
                {/* grade de dias */}
                {DIAS.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-border/70" style={{ left: `${(i / 7) * 100}%` }} />
                ))}
                {l.blocos.map((b, i) => {
                  const left = Math.min(100, (b.inicioDia / 7) * 100);
                  const width = Math.max(0.4, Math.min(100 - left, (b.duracaoDias / 7) * 100));
                  const bg = b.excedente ? "var(--red)" : b.tipo === "setup" ? "var(--setup)" : "var(--blue)";
                  const title = `${b.numero} · ${b.produto} · ${b.tipo === "setup" ? "setup" : "ordem"}${b.excedente ? " · EXCEDE CAPACIDADE" : ""} · prazo ${fmt.data(b.prazo)}`;
                  return (
                    <div
                      key={i}
                      title={title}
                      className="absolute top-1.5 bottom-1.5 rounded-sm text-[10px] text-white px-1 overflow-hidden whitespace-nowrap leading-6"
                      style={{ left: `${left}%`, width: `${width}%`, background: bg, opacity: b.tipo === "setup" ? 0.9 : 1 }}
                    >
                      {b.tipo === "ordem" && width > 6 ? b.numero : ""}
                    </div>
                  );
                })}
                {l.cargaHoras > l.capacidadeHoras && l.horasDia > 0 && (
                  <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-red" style={{ left: `${Math.min(100, (l.capacidadeHoras / l.horasDia / 7) * 100)}%` }} title="limite de capacidade" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

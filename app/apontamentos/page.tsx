"use client";

import { useQuery } from "@tanstack/react-query";
import { registrarApontamento } from "@/lib/actions/apontamentos";
import { ActionForm } from "@/components/ActionForm";
import { Empty, Field, FormGrid, PageHeader, Panel, Tag } from "@/components/ui";
import { fmt } from "@/lib/calc";
import { api, qk } from "@/lib/queries";

const MOTIVOS = {
  SETUP: "Setup / troca de molde",
  FALTA_MATERIAL: "Falta de material",
  MANUTENCAO_CORRETIVA: "Manutenção corretiva",
  AJUSTE_PROCESSO: "Ajuste de processo",
  FALTA_OPERADOR: "Falta de operador",
  OUTRO: "Outro",
} as const;

export default function ApontamentosPage() {
  const { data, isLoading } = useQuery({ queryKey: qk.apontamentos, queryFn: api.apontamentos });
  const maquinas = data?.maquinas ?? [];
  const pedidos = data?.pedidos ?? [];
  const recentes = data?.recentes ?? [];
  const hoje = new Date();
  const hojeIso = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Apontamento de produção" sub="Registro do que foi realmente produzido no turno — alimenta o cálculo de OEE. Reapontar o mesmo turno atualiza o registro com trilha de auditoria." />

      <Panel title="Registrar apontamento" desc="Peças refugadas não podem exceder produzidas (RN-09). Turno futuro é bloqueado. Motivo obrigatório quando há tempo parado.">
        <ActionForm action={registrarApontamento} submitLabel="Registrar apontamento" invalidate={[qk.apontamentos]}>
          <FormGrid>
            <Field label="Máquina">
              <select className="input" name="maquinaId" required>
                <option value="">Selecione…</option>
                {maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo} · {m.tonelagem}t</option>)}
              </select>
            </Field>
            <Field label="Data"><input className="input" name="data" type="date" defaultValue={hojeIso} max={hojeIso} required /></Field>
            <Field label="Turno">
              <select className="input" name="turno" defaultValue="1">
                <option value="1">Turno 1</option><option value="2">Turno 2</option><option value="3">Turno 3</option>
              </select>
            </Field>
            <Field label="Ordem de produção">
              <select className="input" name="pedidoId" required>
                <option value="">Selecione…</option>
                {pedidos.map((p) => <option key={p.id} value={p.id}>{p.numero} · {p.produto}{p.maquinaCodigo ? ` · ${p.maquinaCodigo}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Peças produzidas"><input className="input" name="pecasProduzidas" type="number" min={0} required /></Field>
            <Field label="Peças refugadas"><input className="input" name="pecasRefugadas" type="number" min={0} defaultValue={0} /></Field>
            <Field label="Tempo parado (min)"><input className="input" name="tempoParadoMin" type="number" min={0} defaultValue={0} /></Field>
            <Field label="Motivo da parada">
              <select className="input" name="motivoParada" defaultValue="">
                <option value="">—</option>
                {Object.entries(MOTIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Responsável" hint="usado na trilha de auditoria em caso de reapontamento"><input className="input" name="alteradoPor" placeholder="operador" /></Field>
            <Field label="Observação" span={3}><input className="input" name="observacao" /></Field>
          </FormGrid>
        </ActionForm>
      </Panel>

      <Panel className="mt-5" title="Últimos apontamentos">
        {isLoading ? (
          <div className="text-[13px] text-muted py-6 text-center">Carregando…</div>
        ) : recentes.length === 0 ? (
          <Empty>Nenhum apontamento registrado.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Data</th><th>Turno</th><th>Máquina</th><th>Ordem</th><th>Produzidas</th><th>Refugo</th><th>Boas</th><th>Parado</th><th>Motivo</th><th>Auditoria</th></tr></thead>
            <tbody>
              {recentes.map((a) => (
                <tr key={a.id}>
                  <td>{fmt.data(a.data)}</td>
                  <td>T{a.turno}</td>
                  <td className="font-medium">{a.maquinaCodigo}</td>
                  <td>{a.pedidoNumero}</td>
                  <td>{fmt.int(a.pecasProduzidas)}</td>
                  <td>{fmt.int(a.pecasRefugadas)}</td>
                  <td>{fmt.int(a.pecasProduzidas - a.pecasRefugadas)}</td>
                  <td>{a.tempoParadoMin} min</td>
                  <td>{a.motivoParada ? MOTIVOS[a.motivoParada as keyof typeof MOTIVOS] : "—"}</td>
                  <td>{a.auditoriaCount > 0 ? <Tag kind="warn">{a.auditoriaCount} alteração(ões)</Tag> : <Tag kind="neutral">original</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}

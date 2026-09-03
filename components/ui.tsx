import type { ReactNode } from "react";

export function Panel({
  title,
  desc,
  children,
  className = "",
}: {
  title?: string;
  desc?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && <h2>{title}</h2>}
      {desc && <p className="desc">{desc}</p>}
      {children}
    </section>
  );
}

export type TagKind = "ok" | "warn" | "bad" | "info" | "neutral";

export function Tag({ kind, children }: { kind: TagKind; children: ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  span = 1,
  children,
}: {
  label: string;
  hint?: string;
  span?: 1 | 2 | 3 | 4;
  children: ReactNode;
}) {
  const spanClass = span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : span === 4 ? "md:col-span-4" : "";
  return (
    <div className={`field ${spanClass}`}>
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "red" | "yellow" | "green" | "blue";
  sub?: string;
}) {
  const color =
    tone === "red" ? "text-red" : tone === "yellow" ? "text-yellow" : tone === "green" ? "text-green" : tone === "blue" ? "text-blue" : "";
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`value ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-xl font-semibold m-0 mb-1">{title}</h1>
      <p className="text-[13px] text-muted m-0">{sub}</p>
    </header>
  );
}

export function FormGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  return <div className={`grid grid-cols-1 ${c} gap-3`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-[13px] text-muted py-6 text-center border border-dashed border-border rounded-lg">{children}</div>;
}

export function Notice({ kind, children }: { kind: "ok" | "bad" | "warn"; children: ReactNode }) {
  const cls = kind === "ok" ? "bg-green-bg text-green" : kind === "bad" ? "bg-red-bg text-red" : "bg-yellow-bg text-yellow";
  return <div className={`rounded-md px-3 py-2 text-[13px] font-medium ${cls}`}>{children}</div>;
}

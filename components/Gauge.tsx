import { zonaOee } from "@/lib/calc";

/** Velocímetro semicircular (F-008 RF-02). value em 0..1, ou null = sem dados. */
export function Gauge({
  label,
  value,
  size = 180,
}: {
  label: string;
  value: number | null;
  size?: number;
}) {
  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r = w / 2 - 12;
  const stroke = size * 0.11;

  const arc = (from: number, to: number) => {
    // from/to em 0..1, mapeados para 180°..0°
    const a0 = Math.PI - from * Math.PI;
    const a1 = Math.PI - to * Math.PI;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };

  const zone = value == null ? null : zonaOee(value);
  const color = zone === "red" ? "var(--red)" : zone === "yellow" ? "var(--yellow)" : zone === "green" ? "var(--green)" : "var(--muted)";
  const ang = value == null ? Math.PI : Math.PI - Math.min(1, Math.max(0, value)) * Math.PI;
  const nx = cx + (r - stroke * 0.2) * Math.cos(ang);
  const ny = cy - (r - stroke * 0.2) * Math.sin(ang);

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label}: ${value == null ? "sem dados" : Math.round(value * 100) + "%"}`}>
        <path d={arc(0, 0.6)} stroke="var(--red-bg)" strokeWidth={stroke} fill="none" />
        <path d={arc(0.6, 0.8)} stroke="var(--yellow-bg)" strokeWidth={stroke} fill="none" />
        <path d={arc(0.8, 1)} stroke="var(--green-bg)" strokeWidth={stroke} fill="none" />
        {value != null && <path d={arc(0, Math.max(0.001, value))} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={value == null ? "var(--setup)" : "var(--text)"} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="var(--text)" />
        <text x={cx} y={cy - r * 0.35} textAnchor="middle" fontSize={size * 0.15} fontWeight={600} fill={value == null ? "var(--muted)" : "var(--text)"}>
          {value == null ? "—" : `${Math.round(value * 100)}%`}
        </text>
      </svg>
      <div className="text-[12px] text-muted -mt-1">{label}</div>
      {value == null && <div className="tag neutral mt-1">sem dados</div>}
    </div>
  );
}

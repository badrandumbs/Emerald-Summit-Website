// Small pieces shared by the metrics views (the app's metrics_widgets.dart):
// stat tiles, a labelled bar list, pie chart, and a section heading.
import { useState, type ReactNode } from 'react';

export function StatTiles({ stats }: { stats: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-border p-4">
          <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function MetricsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function BarList({ rows, total, emptyText }: { rows: [string, number][]; total: number; emptyText: string }) {
  if (rows.length === 0 || total === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...rows.map(([, n]) => n));
  return (
    <ul className="space-y-2">
      {rows.map(([label, n]) => (
        <li key={label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {n} · {Math.round((n / total) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const PIE_PALETTE = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
  '#F97316', // orange
];
const MUTED_SLICE_COLOR = '#475569';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

export function PieChart({
  rows,
  total,
  emptyText,
  mutedLabel,
}: {
  rows: [string, number][];
  total: number;
  emptyText: string;
  mutedLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (rows.length === 0 || total === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  const sum = rows.reduce((acc, [, n]) => acc + n, 0) || total;
  let colorIdx = 0;
  let angle = 0;
  const slices = rows.map(([label, n]) => {
    const color =
      mutedLabel && label === mutedLabel
        ? MUTED_SLICE_COLOR
        : PIE_PALETTE[colorIdx++ % PIE_PALETTE.length];
    const sweep = (n / sum) * 360;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    return {
      label,
      n,
      pct: Math.round((n / total) * 100),
      color,
      startAngle,
      endAngle,
      fullCircle: sweep >= 359.99,
    };
  });

  const active = hovered != null ? slices[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border p-5 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" role="img" aria-label="Pie chart">
          {slices.map((s, i) => {
            const dimmed = hovered != null && hovered !== i;
            const isHovered = hovered === i;
            return s.fullCircle ? (
              <circle
                key={s.label}
                cx={100}
                cy={100}
                r={92}
                fill={s.color}
                opacity={dimmed ? 0.35 : 1}
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${s.label}: ${s.n} (${s.pct}%)`}</title>
              </circle>
            ) : (
              <path
                key={s.label}
                d={pieWedgePath(100, 100, isHovered ? 96 : 92, s.startAngle, s.endAngle)}
                fill={s.color}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                strokeLinejoin="round"
                opacity={dimmed ? 0.35 : 1}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>{`${s.label}: ${s.n} (${s.pct}%)`}</title>
              </path>
            );
          })}
        </svg>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-2">
        <ul className="space-y-2">
          {slices.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors ${
                hovered === i ? 'bg-accent/70' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {s.n} ({s.pct}%)
              </span>
            </li>
          ))}
        </ul>
        {active && (
          <p className="px-2 text-xs text-muted-foreground">
            {active.label}: {active.n} of {total} ({active.pct}%)
          </p>
        )}
      </div>
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: [T, string][];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={selected === value}
          onClick={() => onSelect(value)}
          className={
            selected === value
              ? 'rounded-full bg-emerald px-3 py-1 text-sm font-semibold text-white'
              : 'rounded-full border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-accent'
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** A table of counts shaded by size, rows × columns, with totals. */
export function HeatTable({
  table,
  cornerLabel,
  emptyText,
}: {
  table: import('../models/metrics').CrossTab;
  cornerLabel: string;
  emptyText: string;
}) {
  if (table.rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  const shade = (n: number) => (n === 0 || table.maxCell === 0 ? undefined : `rgba(16, 185, 129, ${0.12 + 0.55 * (n / table.maxCell)})`);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">{cornerLabel}</th>
            {table.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 text-right font-medium">{c}</th>)}
            <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r} className="border-b border-border last:border-0">
              <th scope="row" className="max-w-[14rem] truncate px-3 py-2 text-left font-normal">{r}</th>
              {table.columns.map((c) => {
                const n = table.count(r, c);
                return <td key={c} className="px-3 py-2 text-right tabular-nums" style={{ background: shade(n) }}>{n || ''}</td>;
              })}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{table.rowTotals.get(r) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

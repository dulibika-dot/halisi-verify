import { formatNumber } from '../../utils/format';

interface TooltipEntry {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
  payload?: { fill?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  showTotal?: boolean;
}

/** Shared tooltip used by every Recharts chart */
export function ChartTooltip({ active, label, payload, showTotal }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-40 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-3 text-xs shadow-xl shadow-slate-900/10 backdrop-blur">
      {label !== undefined && <p className="mb-2 font-semibold text-slate-900">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-500">
              <span className="size-2.5 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
              {p.name}
            </span>
            <span className="tabular font-semibold text-slate-900">{formatNumber(Number(p.value) || 0)}</span>
          </div>
        ))}
      </div>
      {showTotal && payload.length > 1 && (
        <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
          <span className="text-slate-500">Total</span>
          <span className="tabular font-semibold text-slate-900">{formatNumber(total)}</span>
        </div>
      )}
    </div>
  );
}

export function ChartLegend({ items }: { items: ReadonlyArray<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <span className="size-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

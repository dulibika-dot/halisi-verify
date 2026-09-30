import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCompact, formatNumber, percent } from '../../utils/format';
import { ChartTooltip } from './ChartParts';
import { RESULT_SERIES } from './chartTheme';

interface ResultsDonutProps {
  verified: number;
  suspicious: number;
  invalid: number;
  /** "Genuine" reads better than "Verified" on the admin view */
  verifiedLabel?: string;
}

export function ResultsDonut({ verified, suspicious, invalid, verifiedLabel = 'Verified' }: ResultsDonutProps) {
  const values = { verified, suspicious, invalid };
  const data = RESULT_SERIES.map((s) => ({
    name: s.key === 'verified' ? verifiedLabel : s.label,
    value: values[s.key],
    fill: s.color,
  }));
  const total = verified + suspicious + invalid;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              stroke="#fff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={700}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-slate-900">{formatCompact(total)}</span>
          <span className="text-xs text-slate-500">checks</span>
        </div>
      </div>
      <ul className="w-full space-y-3">
        {data.map((d) => (
          <li key={d.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
                {d.name}
              </span>
              <span className="tabular whitespace-nowrap text-slate-500">
                <span className="font-semibold text-slate-900">{formatNumber(d.value)}</span> · {percent(d.value, total)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percent(d.value, total)}%`, background: d.fill }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

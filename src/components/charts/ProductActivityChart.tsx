import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProductActivity } from '../../types';
import { ChartLegend, ChartTooltip } from './ChartParts';
import { axisProps, CHART_COLORS, RESULT_SERIES } from './chartTheme';

const truncate = (s: string, n = 20) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Horizontal stacked bars: verification results per product */
export function ProductActivityChart({ data }: { data: ProductActivity[] }) {
  const height = Math.max(200, data.length * 44);
  return (
    <div>
      <ChartLegend items={RESULT_SERIES} />
      <div className="mt-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="productName"
              {...axisProps}
              width={140}
              tick={{ fill: '#475569', fontSize: 12 }}
              tickFormatter={(v: string) => truncate(v)}
            />
            <Tooltip content={<ChartTooltip showTotal />} cursor={{ fill: 'rgb(148 163 184 / 0.08)' }} />
            {RESULT_SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="a"
                fill={s.color}
                stroke="#fff"
                strokeWidth={1}
                radius={i === RESULT_SERIES.length - 1 ? [0, 4, 4, 0] : 0}
                maxBarSize={22}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


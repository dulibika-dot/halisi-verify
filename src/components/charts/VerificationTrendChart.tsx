import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '../../types';
import { ChartLegend, ChartTooltip } from './ChartParts';
import { axisProps, CHART_COLORS, RESULT_SERIES } from './chartTheme';

/** Area chart of verification results per day (series overlap, not stacked, so each line shows its own count) */
export function VerificationTrendChart({ data, height = 280 }: { data: TrendPoint[]; height?: number }) {
  return (
    <div>
      <ChartLegend items={RESULT_SERIES} />
      <div className="mt-4 -ml-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {RESULT_SERIES.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" {...axisProps} minTickGap={24} dy={6} />
            <YAxis {...axisProps} width={40} allowDecimals={false} />
            <Tooltip content={<ChartTooltip showTotal />} cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '4 4' }} />
            {RESULT_SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


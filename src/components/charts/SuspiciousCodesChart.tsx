import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SuspiciousActivity } from '../../types';
import { formatCode } from '../../utils/format';
import { ChartLegend, ChartTooltip } from './ChartParts';
import { axisProps, CHART_COLORS } from './chartTheme';

interface Props {
  data: SuspiciousActivity[];
  threshold: number;
}

/** Codes with the most verification attempts, coloured by risk level */
export function SuspiciousCodesChart({ data, threshold }: Props) {
  const rows = data.slice(0, 7).map((d) => ({
    label: formatCode(d.code),
    product: d.productName,
    count: d.verificationCount,
    fill: d.riskLevel === 'high' ? CHART_COLORS.invalid : d.riskLevel === 'medium' ? CHART_COLORS.suspicious : CHART_COLORS.axis,
  }));

  return (
    <div>
      <ChartLegend
        items={[
          { label: 'High risk', color: CHART_COLORS.invalid },
          { label: 'Medium risk', color: CHART_COLORS.suspicious },
          { label: 'Normal', color: CHART_COLORS.axis },
        ]}
      />
      <div className="mt-4" style={{ height: Math.max(200, rows.length * 42) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 18, right: 16, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...axisProps} width={96} tick={{ fill: '#475569', fontSize: 12, fontFamily: 'ui-monospace, monospace' }} />
            <Tooltip
              cursor={{ fill: 'rgb(148 163 184 / 0.08)' }}
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  label={payload?.[0]?.payload?.product}
                  payload={payload?.map((p) => ({ name: 'Verifications', value: Number(p.value), color: p.payload?.fill, dataKey: 'count' }))}
                />
              )}
            />
            <ReferenceLine
              x={threshold}
              stroke={CHART_COLORS.axis}
              strokeDasharray="4 4"
              label={{ value: `Limit (${threshold})`, position: 'top', fill: CHART_COLORS.axis, fontSize: 10 }}
            />
            <Bar dataKey="count" name="Verifications" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

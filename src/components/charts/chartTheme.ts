/**
 * Chart colours. Verification results use a fixed status palette
 * (never reused for anything else), and they are always shown with a
 * text label/legend so colour is never the only signal.
 */
export const CHART_COLORS = {
  verified: '#0ca30c',
  suspicious: '#fab219',
  invalid: '#d03b3b',
  primary: '#2a78d6', // single-series magnitude charts
  grid: '#e2e8f0',
  axis: '#94a3b8',
} as const;

export const RESULT_SERIES = [
  { key: 'verified', label: 'Verified', color: CHART_COLORS.verified },
  { key: 'suspicious', label: 'Suspicious', color: CHART_COLORS.suspicious },
  { key: 'invalid', label: 'Invalid', color: CHART_COLORS.invalid },
] as const;

export const axisProps = {
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

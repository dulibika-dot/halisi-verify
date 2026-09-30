import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { Card } from './Card';
import { Skeleton } from './States';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate';

const toneStyles: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  red: 'bg-rose-50 text-rose-600 ring-rose-100',
  blue: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  /** % change vs previous period */
  change?: number;
  /** true when an increase is bad news (e.g. suspicious verifications) */
  invertChange?: boolean;
  loading?: boolean;
  /** Page to open when the card is clicked */
  to?: string;
  /** Or an action to run when clicked (e.g. apply a filter) */
  onClick?: () => void;
  /** Highlights the card (e.g. its filter is active) */
  active?: boolean;
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, change, invertChange, loading, to, onClick, active }: StatCardProps) {
  const up = (change ?? 0) >= 0;
  const good = invertChange ? !up : up;
  const clickable = !!(to || onClick);

  const body = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden p-5 transition duration-200',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5',
        active && 'border-brand-400 ring-4 ring-brand-500/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('flex size-10 items-center justify-center rounded-xl ring-4 transition group-hover:scale-105', toneStyles[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
      {loading || value === undefined ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <p className="mt-1 text-[28px] leading-9 font-semibold tracking-tight text-slate-900">{formatNumber(value)}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {change !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
                  good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                )}
              >
                {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(change)}%
              </span>
            )}
            {hint && <span className="text-slate-500">{hint}</span>}
            {clickable && (
              <span className="ml-auto flex items-center gap-1 font-semibold text-brand-700 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                View <ArrowRight className="size-3.5" />
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );

  return <Clickable to={to} onClick={onClick} label={label}>{body}</Clickable>;
}

function Clickable({ to, onClick, label, children }: { to?: string; onClick?: () => void; label: string; children: ReactNode }) {
  const ring = 'block rounded-2xl text-left focus-visible:ring-4 focus-visible:ring-brand-500/30 focus-visible:outline-none';
  if (to) {
    return (
      <Link to={to} className={ring} aria-label={`${label}: view details`}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
        className={ring}
        aria-label={`${label}: filter`}
      >
        {children}
      </div>
    );
  }
  return <>{children}</>;
}

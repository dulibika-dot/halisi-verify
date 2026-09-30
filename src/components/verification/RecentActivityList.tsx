import { ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import type { ActivityItem, VerificationResult } from '../../types';
import { cn } from '../../utils/cn';
import { formatCode, timeAgo } from '../../utils/format';
import { EmptyState, Skeleton, StatusBadge } from '../ui';

const icons: Record<VerificationResult, { icon: typeof ShieldCheck; className: string }> = {
  verified: { icon: ShieldCheck, className: 'bg-emerald-50 text-emerald-600' },
  suspicious: { icon: TriangleAlert, className: 'bg-amber-50 text-amber-600' },
  invalid: { icon: XCircle, className: 'bg-rose-50 text-rose-600' },
};

export function RecentActivityList({ items, loading }: { items: ActivityItem[] | null; loading?: boolean }) {
  if (loading || !items) {
    return (
      <ul className="space-y-4 px-5 pb-5 sm:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (items.length === 0) return <EmptyState title="No activity yet" description="Verifications will appear here in real time." />;

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => {
        const { icon: Icon, className } = icons[a.result];
        return (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70 sm:px-6">
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', className)}>
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{a.productName}</p>
              <p className="truncate text-xs text-slate-500">
                <span className="font-mono">{formatCode(a.code)}</span> · {a.location}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={a.result} />
              <span className="text-[11px] whitespace-nowrap text-slate-400">{timeAgo(a.timestamp)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

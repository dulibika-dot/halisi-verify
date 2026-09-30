import type { ReactNode } from 'react';
import { MapPin, Phone, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { SuspiciousActivity } from '../../types';
import { cn } from '../../utils/cn';
import { formatCode, timeAgo } from '../../utils/format';

interface Props {
  item: SuspiciousActivity;
  actions?: ReactNode;
  className?: string;
}

/** Clear, calm warning card for a code that is being checked far too often. */
export function SuspiciousAlert({ item, actions, className }: Props) {
  const high = item.riskLevel === 'high';
  const Icon = high ? ShieldAlert : TriangleAlert;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5',
        high ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn(
            'relative flex size-11 shrink-0 items-center justify-center rounded-xl',
            high ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700',
          )}
        >
          <span className={cn('absolute inset-0 animate-ping-slow rounded-xl opacity-40', high ? 'bg-rose-200' : 'bg-amber-200')} />
          <Icon className="relative size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-bold tracking-wider uppercase', high ? 'text-rose-700' : 'text-amber-800')}>
            ⚠ Suspicious code detected
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-slate-900">{formatCode(item.code)}</p>
          <p className="mt-0.5 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{item.verificationCount} verification attempts</span> on one{' '}
            {item.productName} code · batch {item.batchNumber}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> Mostly {item.primaryLocation}
              {item.locations.length > 1 && ` + ${item.locations.length - 1} more`}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" /> {item.uniquePhones} different phones
            </span>
            <span>Last attempt {timeAgo(item.lastSeen)}</span>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">{actions}</div>}
      </div>
    </div>
  );
}

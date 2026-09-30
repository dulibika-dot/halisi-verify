import { useEffect, useRef, useState } from 'react';
import { Bell, TriangleAlert, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import * as api from '../../services/api';
import { cn } from '../../utils/cn';
import { formatCode, timeAgo } from '../../utils/format';

interface Props {
  manufacturerId?: string;
  viewAllPath: string;
}

/** Bell icon with the latest suspicious / invalid verifications */
export function NotificationsMenu({ manufacturerId, viewAllPath }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useAsync(() => api.getRecentActivity(60, manufacturerId), [manufacturerId]);
  const alerts = (data ?? []).filter((a) => a.result !== 'verified').slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {alerts.length > 0 && (
          <span className="absolute top-2 right-2.5 flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Alerts</p>
            <span className="text-xs text-slate-500">{alerts.length} recent</span>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {alerts.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No alerts right now 🎉</li>}
            {alerts.map((a) => (
              <li key={a.id} className="flex gap-3 px-4 py-3 transition hover:bg-slate-50">
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                    a.result === 'suspicious' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600',
                  )}
                >
                  {a.result === 'suspicious' ? <TriangleAlert className="size-4" /> : <XCircle className="size-4" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-800">
                    {a.result === 'suspicious' ? 'Suspicious verification' : 'Invalid code checked'}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {a.productName} · <span className="font-mono">{formatCode(a.code)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {a.location} · {timeAgo(a.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to={viewAllPath}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}

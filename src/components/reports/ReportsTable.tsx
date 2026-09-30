import { useMemo, useState } from 'react';
import { Eye, FileWarning, MapPin } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import * as api from '../../services/api';
import type { CounterfeitReport, ReportStatus } from '../../types';
import { cn } from '../../utils/cn';
import { formatCode, formatDate, timeAgo } from '../../utils/format';
import { Button, Card, DataTable, EmptyState, ErrorState, SearchInput, StatusBadge, Toolbar, type Column } from '../ui';
import { ReportDetailsModal } from './ReportDetailsModal';

const TABS: Array<{ value: 'all' | ReportStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'resolved', label: 'Resolved' },
];

interface Props {
  manufacturerId?: string;
  editable?: boolean;
}

/** Counterfeit reports list — admins can update status, manufacturers can view. */
export function ReportsTable({ manufacturerId, editable }: Props) {
  const { data, loading, error, reload } = useAsync(() => api.getReports(manufacturerId), [manufacturerId]);
  const [tab, setTab] = useState<'all' | ReportStatus>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<CounterfeitReport | null>(null);
  const q = useDebounce(search).toLowerCase();

  const searched = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.code.includes(q.replace(/\s/g, '')) ||
          r.reference.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      ),
    [data, q],
  );
  const rows = tab === 'all' ? searched : searched.filter((r) => r.status === tab);

  const columns: Column<CounterfeitReport>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (r) => r.productName,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.productName}</p>
          <p className="text-xs text-slate-500">{r.reference}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Verification code', render: (r) => <span className="font-mono text-[13px]">{formatCode(r.code)}</span> },
    { key: 'reason', header: 'Report reason', sortValue: (r) => r.reason, render: (r) => <span className="line-clamp-1">{r.reason}</span> },
    {
      key: 'location',
      header: 'Location',
      sortValue: (r) => r.location,
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5 text-slate-400" />
          {r.location}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <div className="whitespace-nowrap">
          <p>{formatDate(r.createdAt)}</p>
          <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewing(r)}>
          {editable ? 'Review' : 'View'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="scroll-thin mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => {
          const count = t.value === 'all' ? searched.length : searched.filter((r) => r.status === t.value).length;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition',
                tab === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {t.label}
              <span className={cn('rounded-full px-2 py-0.5 text-xs', tab === t.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search product, code, location…" />
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            loading={loading}
            empty={<EmptyState icon={FileWarning} title="No reports here" description="Customer reports sent by SMS will appear in this list." />}
            mobileCard={(r) => (
              <div className="space-y-2" onClick={() => setViewing(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{r.productName}</p>
                    <p className="font-mono text-xs text-slate-500">{formatCode(r.code)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-slate-600">{r.reason}</p>
                <p className="text-xs text-slate-400">
                  {r.location} · {timeAgo(r.createdAt)} · {r.reference}
                </p>
              </div>
            )}
          />
        )}
      </Card>

      <ReportDetailsModal report={viewing} onClose={() => setViewing(null)} editable={editable} onUpdated={() => reload(true)} />
    </>
  );
}

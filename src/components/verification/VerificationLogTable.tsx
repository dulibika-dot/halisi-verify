import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ListChecks, MessageSquareText, Smartphone } from 'lucide-react';
import { LOCATION_NAMES } from '../../data/locations';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import * as api from '../../services/api';
import type { VerificationResult, VerificationWithDetails } from '../../types';
import { cn } from '../../utils/cn';
import { DAY } from '../../utils/dates';
import { downloadCsv } from '../../utils/export';
import { formatCode, formatDate, formatNumber, formatTime } from '../../utils/format';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  Segmented,
  StatusBadge,
  Toolbar,
  type Column,
} from '../ui';

type Period = '1' | '7' | '30' | 'all';

interface Props {
  manufacturerId?: string;
  showManufacturer?: boolean;
}

const RESULT_CHIPS: Array<{ value: VerificationResult; label: string; className: string }> = [
  { value: 'verified', label: 'Verified', className: 'bg-emerald-500' },
  { value: 'suspicious', label: 'Suspicious', className: 'bg-amber-400' },
  { value: 'invalid', label: 'Invalid', className: 'bg-rose-500' },
];

export function VerificationLogTable({ manufacturerId, showManufacturer }: Props) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getVerificationLogs(manufacturerId), [manufacturerId]);
  const [search, setSearch] = useState('');
  // Dashboard cards link here with ?result=suspicious&period=all etc.
  const [params] = useSearchParams();
  const initialResult = params.get('result');
  const initialPeriod = params.get('period');
  const [result, setResult] = useState<'all' | VerificationResult>(
    initialResult === 'verified' || initialResult === 'suspicious' || initialResult === 'invalid' ? initialResult : 'all',
  );
  const [location, setLocation] = useState('all');
  const [period, setPeriod] = useState<Period>(
    initialPeriod === '1' || initialPeriod === '7' || initialPeriod === 'all' ? initialPeriod : '30',
  );
  const q = useDebounce(search).toLowerCase().replace(/\s/g, '');

  // Everything except the result filter — used for the summary chips
  const base = useMemo(() => {
    const since = period === 'all' ? 0 : Date.now() - Number(period) * DAY;
    return (data ?? []).filter(
      (v) =>
        new Date(v.timestamp).getTime() >= since &&
        (location === 'all' || v.location === location) &&
        (v.code.includes(q) || (v.productName ?? '').toLowerCase().replace(/\s/g, '').includes(q)),
    );
  }, [data, period, location, q]);

  const rows = result === 'all' ? base : base.filter((v) => v.result === result);
  const counts = RESULT_CHIPS.map((c) => ({ ...c, count: base.filter((v) => v.result === c.value).length }));

  const exportRows = () => {
    downloadCsv(
      'verification-logs.csv',
      rows.map((v) => ({
        date: formatDate(v.timestamp),
        time: formatTime(v.timestamp),
        product: v.productName ?? 'Unregistered',
        manufacturer: v.manufacturerName ?? '',
        code: v.code,
        result: v.result,
        location: v.location,
        verification_count: v.countAtTime,
        phone: v.phone,
      })),
    );
    toast.success('Export complete', `${formatNumber(rows.length)} log entries downloaded.`);
  };

  const columns: Column<VerificationWithDetails>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (v) => v.productName ?? '',
      render: (v) => (
        <div className="min-w-0">
          <p className={cn('truncate font-medium', v.productName ? 'text-slate-900' : 'text-slate-400 italic')}>
            {v.productName ?? 'Unregistered code'}
          </p>
          {showManufacturer && <p className="truncate text-xs text-slate-500">{v.manufacturerName ?? '—'}</p>}
        </div>
      ),
    },
    { key: 'code', header: 'Verification code', sortValue: (v) => v.code, render: (v) => <span className="font-mono text-[13px]">{formatCode(v.code)}</span> },
    { key: 'date', header: 'Date', sortValue: (v) => v.timestamp, render: (v) => <span className="whitespace-nowrap">{formatDate(v.timestamp)}</span> },
    { key: 'time', header: 'Time', render: (v) => <span className="tabular text-slate-500">{formatTime(v.timestamp)}</span> },
    { key: 'result', header: 'Result', sortValue: (v) => v.result, render: (v) => <StatusBadge status={v.result} /> },
    { key: 'location', header: 'Location', sortValue: (v) => v.location, render: (v) => v.location },
    {
      key: 'count',
      header: 'Verification count',
      align: 'right',
      sortValue: (v) => v.countAtTime,
      render: (v) => (
        <span className={cn('tabular font-semibold', v.result === 'suspicious' ? 'text-amber-700' : 'text-slate-700')}>#{v.countAtTime}</span>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      hideOnTablet: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          {v.channel === 'sms' ? <Smartphone className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
          {v.channel === 'sms' ? 'SMS' : 'Simulator'}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setResult('all')}
            className={cn(
              'rounded-xl border px-3.5 py-2 text-sm transition',
              result === 'all' ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            All <span className="ml-1 font-semibold">{formatNumber(base.length)}</span>
          </button>
          {counts.map((c) => (
            <button
              key={c.value}
              onClick={() => setResult(c.value)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition',
                result === c.value ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <span className={cn('size-2 rounded-full', c.className)} />
              {c.label} <span className="font-semibold">{formatNumber(c.count)}</span>
            </button>
          ))}
        </div>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: '1', label: '24h' },
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search code or product…" />
          <FilterSelect
            label="Location"
            value={location}
            onChange={setLocation}
            options={[{ value: 'all', label: 'All locations' }, ...LOCATION_NAMES.map((l) => ({ value: l, label: l }))]}
            className="sm:w-44"
          />
          <Button variant="secondary" icon={Download} onClick={exportRows} disabled={!rows.length} className="sm:ml-auto">
            Export
          </Button>
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(v) => v.id}
            loading={loading}
            pageSize={12}
            rowClassName={(v) => (v.result === 'suspicious' ? 'bg-amber-50/30' : undefined)}
            empty={<EmptyState icon={ListChecks} title="No verifications found" description="No checks match these filters. Try a longer period or clear the search." />}
            mobileCard={(v) => (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{v.productName ?? 'Unregistered code'}</p>
                  <p className="font-mono text-xs text-slate-500">{formatCode(v.code)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {v.location} · {formatDate(v.timestamp)} {formatTime(v.timestamp)} · #{v.countAtTime}
                  </p>
                </div>
                <StatusBadge status={v.result} />
              </div>
            )}
          />
        )}
      </Card>
    </>
  );
}

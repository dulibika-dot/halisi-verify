import { useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle2, Eye, Info, Search, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterSelect,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
  Skeleton,
  StatCard,
  StatusBadge,
  Toolbar,
  type Column,
} from '../../components/ui';
import { SuspiciousAlert } from '../../components/verification/SuspiciousAlert';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import type { SuspiciousActivity, SuspiciousStatus } from '../../types';
import { cn } from '../../utils/cn';
import { formatCode, formatDateTime, timeAgo } from '../../utils/format';

const STATUS_ACTIONS: Record<Exclude<SuspiciousStatus, 'suspicious'>, { title: string; label: string; message: string; tone: 'danger' | 'primary'; toast: string }> = {
  investigating: {
    title: 'Open an investigation?',
    label: 'Start investigation',
    message: 'The code stays active while your team checks the shops where it was scanned. The manufacturer is notified.',
    tone: 'primary',
    toast: 'Investigation opened',
  },
  blocked: {
    title: 'Block this code?',
    label: 'Block code',
    message: 'Every future SMS for this code will get a "DEACTIVATED — do not use" reply. Use this once a code is confirmed as copied onto fake products.',
    tone: 'danger',
    toast: 'Code blocked',
  },
  normal: {
    title: 'Mark as normal?',
    label: 'Mark normal',
    message: 'Removes the warning flag. Do this if the checks turned out to be legitimate (e.g. a shop demonstrating verification to customers).',
    tone: 'primary',
    toast: 'Marked as normal',
  },
};

export function SuspiciousActivityPage() {
  useDocumentTitle('Suspicious Activity');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getSuspiciousActivity(), []);
  const settings = useAsync(() => api.getSettings(), []);
  const threshold = settings.data?.suspiciousThreshold ?? 3;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [highOnly, setHighOnly] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  /** Stat cards filter the table below and scroll to it */
  const showInTable = (nextStatus: string, nextHighOnly = false) => {
    setStatus(nextStatus);
    setHighOnly(nextHighOnly);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [viewing, setViewing] = useState<SuspiciousActivity | null>(null);
  const [pending, setPending] = useState<{ item: SuspiciousActivity; status: Exclude<SuspiciousStatus, 'suspicious'> } | null>(null);
  const [saving, setSaving] = useState(false);
  const q = useDebounce(search).toLowerCase().replace(/\s/g, '');

  const all = data ?? [];
  const rows = useMemo(
    () =>
      all.filter(
        (s) =>
          (status === 'all' || s.status === status) &&
          (!highOnly || (s.riskLevel === 'high' && s.status !== 'blocked')) &&
          (s.code.includes(q) || s.productName.toLowerCase().replace(/\s/g, '').includes(q) || s.primaryLocation.toLowerCase().includes(q)),
      ),
    [all, status, q],
  );
  const featured = all.filter((s) => s.status === 'suspicious' && s.riskLevel === 'high').slice(0, 2);
  const max = Math.max(1, ...all.map((s) => s.verificationCount));

  const apply = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await api.updateSuspiciousStatus(pending.item.code, pending.status);
      toast.success(STATUS_ACTIONS[pending.status].toast, `${formatCode(pending.item.code)} · ${pending.item.productName}`);
      setViewing(null);
      await reload(true);
    } catch (e) {
      toast.error('Action failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const rowActions = (s: SuspiciousActivity) => (
    <div className="flex justify-end gap-0.5">
      <IconButton icon={Eye} label="View details" onClick={() => setViewing(s)} />
      {(s.status === 'suspicious' || s.status === 'normal') && (
        <IconButton icon={Search} label="Start investigation" onClick={() => setPending({ item: s, status: 'investigating' })} />
      )}
      {s.status !== 'blocked' && <IconButton icon={Ban} label="Block code" tone="danger" onClick={() => setPending({ item: s, status: 'blocked' })} />}
      {s.status !== 'normal' && s.status !== 'suspicious' && (
        <IconButton icon={CheckCircle2} label="Mark normal" onClick={() => setPending({ item: s, status: 'normal' })} />
      )}
    </div>
  );

  const columns: Column<SuspiciousActivity>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (s) => s.productName,
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{s.productName}</p>
          <p className="truncate text-xs text-slate-500">{s.manufacturerName}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Code', sortValue: (s) => s.code, render: (s) => <span className="font-mono text-[13px] font-semibold">{formatCode(s.code)}</span> },
    {
      key: 'count',
      header: 'Verifications',
      sortValue: (s) => s.verificationCount,
      render: (s) => (
        <div className="flex w-32 items-center gap-2">
          <span className={cn('tabular w-7 text-right font-semibold', s.verificationCount > threshold ? 'text-slate-900' : 'text-slate-500')}>
            {s.verificationCount}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', s.riskLevel === 'high' ? 'bg-rose-500' : s.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-slate-300')}
              style={{ width: `${(s.verificationCount / max) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortValue: (s) => s.primaryLocation,
      render: (s) => (
        <span>
          {s.primaryLocation}
          {s.locations.length > 1 && <span className="text-xs text-slate-400"> +{s.locations.length - 1}</span>}
        </span>
      ),
    },
    { key: 'risk', header: 'Risk', hideOnTablet: true, sortValue: (s) => s.verificationCount, render: (s) => <StatusBadge status={s.riskLevel} /> },
    { key: 'status', header: 'Status', sortValue: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
    { key: 'last', header: 'Last seen', hideOnTablet: true, sortValue: (s) => s.lastSeen, render: (s) => <span className="whitespace-nowrap text-slate-500">{timeAgo(s.lastSeen)}</span> },
    { key: 'actions', header: '', align: 'right', render: rowActions },
  ];

  const count = (fn: (s: SuspiciousActivity) => boolean) => (data ? all.filter(fn).length : undefined);
  const copy = pending ? STATUS_ACTIONS[pending.status] : null;

  return (
    <>
      <PageHeader
        title="Suspicious Activity"
        description="A genuine product is normally verified once or twice. When one code is checked many times — often in different places — it has likely been copied onto counterfeit packaging."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="High-risk codes"
          value={count((s) => s.riskLevel === 'high' && s.status !== 'blocked')}
          icon={ShieldAlert}
          tone="red"
          hint={`${settings.data?.highRiskThreshold ?? 20}+ checks`}
          active={highOnly}
          onClick={() => showInTable('all', !highOnly)}
        />
        <StatCard
          label="Flagged codes"
          value={count((s) => s.status === 'suspicious')}
          icon={TriangleAlert}
          tone="amber"
          hint={`more than ${threshold} checks`}
          active={!highOnly && status === 'suspicious'}
          onClick={() => showInTable(status === 'suspicious' && !highOnly ? 'all' : 'suspicious')}
        />
        <StatCard
          label="Under investigation"
          value={count((s) => s.status === 'investigating')}
          icon={Search}
          tone="blue"
          active={!highOnly && status === 'investigating'}
          onClick={() => showInTable(status === 'investigating' && !highOnly ? 'all' : 'investigating')}
        />
        <StatCard
          label="Blocked codes"
          value={count((s) => s.status === 'blocked')}
          icon={Ban}
          tone="slate"
          active={!highOnly && status === 'blocked'}
          onClick={() => showInTable(status === 'blocked' && !highOnly ? 'all' : 'blocked')}
        />
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <Skeleton className="h-36 w-full rounded-2xl" />
        ) : (
          featured.map((s) => (
            <SuspiciousAlert
              key={s.code}
              item={s}
              actions={
                <>
                  <Button size="sm" variant="secondary" icon={Search} onClick={() => setPending({ item: s, status: 'investigating' })}>
                    Investigate
                  </Button>
                  <Button size="sm" variant="danger" icon={Ban} onClick={() => setPending({ item: s, status: 'blocked' })}>
                    Block code
                  </Button>
                </>
              }
            />
          ))
        )}
      </div>

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <p>
          Rule: a code verified <strong>more than {threshold} times</strong> is flagged as suspicious; <strong>{settings.data?.highRiskThreshold ?? 20}+</strong> is high risk.
          Codes at exactly the limit are shown as <em>Normal</em> for comparison. Change the thresholds in System Settings.
        </p>
      </div>

      <div ref={tableRef} className="scroll-mt-20" />
      <Card className="mt-4 overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search code, product, location…" />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setHighOnly(false);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'suspicious', label: 'Suspicious' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'normal', label: 'Normal' },
            ]}
            className="sm:w-44"
          />
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(s) => s.code}
            loading={loading}
            initialSort={{ key: 'count', dir: 'desc' }}
            rowClassName={(s) => (s.riskLevel === 'high' && s.status === 'suspicious' ? 'bg-rose-50/40' : undefined)}
            empty={<EmptyState icon={ShieldCheck} title="Nothing suspicious" description="No codes match these filters." />}
            mobileCard={(s) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{s.productName}</p>
                    <p className="font-mono text-xs text-slate-500">{formatCode(s.code)}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-900">{s.verificationCount}</strong> checks · {s.primaryLocation}
                  </span>
                  {rowActions(s)}
                </div>
              </div>
            )}
          />
        )}
      </Card>

      <SuspiciousDetailsModal item={viewing} onClose={() => setViewing(null)} onAction={(status) => viewing && setPending({ item: viewing, status })} />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={apply}
        loading={saving}
        tone={copy?.tone}
        title={copy?.title ?? ''}
        confirmLabel={copy?.label}
        message={
          <>
            <p className="mb-2 font-mono text-base font-semibold text-slate-900">{pending && formatCode(pending.item.code)}</p>
            {copy?.message}
          </>
        }
      />
    </>
  );
}

function SuspiciousDetailsModal({
  item,
  onClose,
  onAction,
}: {
  item: SuspiciousActivity | null;
  onClose: () => void;
  onAction: (status: 'investigating' | 'blocked' | 'normal') => void;
}) {
  const logs = useAsync(
    () => (item ? api.getVerificationLogs().then((l) => l.filter((v) => v.code === item.code)) : Promise.resolve([])),
    [item?.code],
  );
  if (!item) return null;

  const byLocation = new Map<string, number>();
  (logs.data ?? []).forEach((l) => byLocation.set(l.location, (byLocation.get(l.location) ?? 0) + 1));
  const locations = [...byLocation.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Code investigation"
      description={`${item.productName} · ${item.manufacturerName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {item.status !== 'normal' && item.status !== 'suspicious' && (
            <Button variant="secondary" icon={CheckCircle2} onClick={() => onAction('normal')}>
              Mark normal
            </Button>
          )}
          {item.status !== 'investigating' && item.status !== 'blocked' && (
            <Button variant="secondary" icon={Search} onClick={() => onAction('investigating')}>
              Investigate
            </Button>
          )}
          {item.status !== 'blocked' && (
            <Button variant="danger" icon={Ban} onClick={() => onAction('blocked')}>
              Block code
            </Button>
          )}
        </>
      }
    >
      <SuspiciousAlert item={item} />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Checks by location</p>
          {logs.loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <ul className="space-y-2">
              {locations.map(([loc, n]) => (
                <li key={loc} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700">{loc}</span>
                    <span className="tabular font-semibold text-slate-900">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(n / item.verificationCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <dl className="space-y-3 text-sm">
          {[
            ['Batch', item.batchNumber],
            ['First check', formatDateTime(item.firstSeen)],
            ['Latest check', formatDateTime(item.lastSeen)],
            ['Different phones', String(item.uniquePhones)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={item.status} />
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}

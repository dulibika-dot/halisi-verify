import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Barcode, Copy, Download, Eye, Info, RotateCcw, TriangleAlert } from 'lucide-react';
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
  StatusBadge,
  Toolbar,
  type Column,
} from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import { USE_MOCK_API } from '../../services/config';
import type { CodeWithDetails } from '../../types';
import { cn } from '../../utils/cn';
import { copyToClipboard, downloadCsv } from '../../utils/export';
import { formatCode, formatDate, formatDateTime } from '../../utils/format';

export function CodesPage() {
  useDocumentTitle('Verification Codes');
  const mId = useManufacturerId();
  const toast = useToast();
  const [params] = useSearchParams();
  const { data, loading, error, reload } = useAsync(() => api.getVerificationCodes(mId), [mId]);
  const settings = useAsync(() => api.getSettings(), []);
  const threshold = settings.data?.suspiciousThreshold ?? 3;

  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState(params.get('batch') ?? 'all');
  const [status, setStatus] = useState('all');
  const [viewing, setViewing] = useState<CodeWithDetails | null>(null);
  const [toggling, setToggling] = useState<CodeWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const q = useDebounce(search).toLowerCase().replace(/\s/g, '');

  const batches = useMemo(() => [...new Set((data ?? []).map((c) => c.batchNumber))].sort(), [data]);
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (c) =>
          (batch === 'all' || c.batchNumber === batch) &&
          (status === 'all' ||
            (status === 'flagged' ? c.verificationCount > threshold : c.status === status)) &&
          (c.code.includes(q) || c.productName.toLowerCase().includes(q)),
      ),
    [data, batch, status, q, threshold],
  );

  const copy = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) {
      toast.success('Code copied', formatCode(code));
    } else {
      toast.error('Copy failed', 'Your browser blocked clipboard access.');
    }
  };

  const exportRows = () => {
    downloadCsv(
      'verification-codes.csv',
      rows.map((c) => ({
        product: c.productName,
        batch: c.batchNumber,
        code: c.code,
        status: c.status,
        verifications: c.verificationCount,
        created: formatDate(c.createdAt),
      })),
    );
    toast.success('Export complete', `${rows.length} codes downloaded as CSV.`);
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    setSaving(true);
    const deactivate = toggling.status === 'active';
    try {
      await (deactivate ? api.deactivateCode(toggling.code) : api.reactivateCode(toggling.code));
      toast.success(deactivate ? 'Code deactivated' : 'Code reactivated', deactivate ? 'Customers checking this code will be warned.' : 'The code can be verified again.');
      await reload(true);
    } catch (e) {
      toast.error('Action failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
      setToggling(null);
    }
  };

  const columns: Column<CodeWithDetails>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (c) => c.code,
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[13px] font-semibold tracking-wide text-slate-800">
          {formatCode(c.code)}
        </span>
      ),
    },
    { key: 'product', header: 'Product', sortValue: (c) => c.productName, render: (c) => <span className="font-medium text-slate-900">{c.productName}</span> },
    { key: 'batch', header: 'Batch', sortValue: (c) => c.batchNumber, render: (c) => <span className="font-mono text-xs">{c.batchNumber}</span> },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'count',
      header: 'Verifications',
      align: 'right',
      sortValue: (c) => c.verificationCount,
      render: (c) => (
        <span className={cn('tabular inline-flex items-center gap-1 font-semibold', c.verificationCount > threshold ? 'text-amber-700' : 'text-slate-700')}>
          {c.verificationCount > threshold && <TriangleAlert className="size-3.5" />}
          {c.verificationCount}
        </span>
      ),
    },
    { key: 'created', header: 'Created', hideOnTablet: true, sortValue: (c) => c.createdAt, render: (c) => formatDate(c.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => <CodeActions code={c} onView={setViewing} onCopy={copy} onToggle={setToggling} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Verification Codes"
        description="Unique 9-digit codes printed on each unit. Customers send them by SMS to confirm the product is genuine."
        actions={
          <Button variant="secondary" icon={Download} onClick={exportRows} disabled={!rows.length}>
            Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          {USE_MOCK_API ? (
            <>
              Prototype note: a real batch has one code per unit (thousands). This demo lists <strong>20 sample codes per batch</strong> to keep things fast.
            </>
          ) : (
            <>
              New batches get <strong>one code per unit</strong> (up to 10,000 per batch in this prototype). The pre-loaded demo batches only include 20 sample codes each.
            </>
          )}
        </p>
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search code or product…" />
          <FilterSelect
            label="Batch"
            value={batch}
            onChange={setBatch}
            options={[{ value: 'all', label: 'All batches' }, ...batches.map((b) => ({ value: b, label: b }))]}
            className="sm:w-44"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'deactivated', label: 'Deactivated' },
              { value: 'flagged', label: 'Checked too often' },
            ]}
            className="sm:w-48"
          />
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(c) => c.code}
            loading={loading}
            pageSize={12}
            initialSort={{ key: 'count', dir: 'desc' }}
            empty={<EmptyState icon={Barcode} title="No codes match" description="Try another batch, status or search term." />}
            mobileCard={(c) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold tracking-wide text-slate-900">{formatCode(c.code)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.productName} · {c.batchNumber} · {c.verificationCount} checks
                  </p>
                  <StatusBadge status={c.status} className="mt-1.5" />
                </div>
                <CodeActions code={c} onView={setViewing} onCopy={copy} onToggle={setToggling} />
              </div>
            )}
          />
        )}
      </Card>

      <CodeDetailsModal code={viewing} onClose={() => setViewing(null)} manufacturerId={mId} threshold={threshold} />

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={confirmToggle}
        loading={saving}
        tone={toggling?.status === 'active' ? 'danger' : 'primary'}
        title={toggling?.status === 'active' ? 'Deactivate this code?' : 'Reactivate this code?'}
        confirmLabel={toggling?.status === 'active' ? 'Deactivate' : 'Reactivate'}
        message={
          toggling?.status === 'active' ? (
            <>
              Customers who send <span className="font-mono font-semibold">{toggling && formatCode(toggling.code)}</span> will be told the code is
              deactivated and not to use the product. Use this for damaged, stolen or recalled stock.
            </>
          ) : (
            'The code will verify as genuine again.'
          )
        }
      />
    </>
  );
}

function CodeActions({
  code,
  onView,
  onCopy,
  onToggle,
}: {
  code: CodeWithDetails;
  onView: (c: CodeWithDetails) => void;
  onCopy: (c: string) => void;
  onToggle: (c: CodeWithDetails) => void;
}) {
  return (
    <div className="flex shrink-0 justify-end gap-0.5">
      <IconButton icon={Eye} label="View details" onClick={() => onView(code)} />
      <IconButton icon={Copy} label="Copy code" onClick={() => onCopy(code.code)} />
      {code.status === 'active' ? (
        <IconButton icon={Ban} label="Deactivate code" tone="danger" onClick={() => onToggle(code)} />
      ) : (
        <IconButton icon={RotateCcw} label="Reactivate code" onClick={() => onToggle(code)} />
      )}
    </div>
  );
}

function CodeDetailsModal({
  code,
  onClose,
  manufacturerId,
  threshold,
}: {
  code: CodeWithDetails | null;
  onClose: () => void;
  manufacturerId: string;
  threshold: number;
}) {
  const logs = useAsync(
    () => (code ? api.getVerificationLogs(manufacturerId).then((l) => l.filter((v) => v.code === code.code)) : Promise.resolve([])),
    [code?.code, manufacturerId],
  );
  if (!code) return null;
  return (
    <Modal open onClose={onClose} title="Code details" description={`${code.productName} · Batch ${code.batchNumber}`}>
      <div className="rounded-2xl bg-gradient-to-br from-ink-950 to-ink-800 p-5 text-center text-white">
        <p className="text-xs tracking-widest text-slate-400 uppercase">Verification code</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-[0.2em]">{formatCode(code.code)}</p>
        <p className="mt-2 text-xs text-slate-400">Customer sends: VERIFY {code.code}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={code.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Times verified</dt>
          <dd className={cn('mt-0.5 font-semibold', code.verificationCount > threshold ? 'text-amber-700' : 'text-slate-900')}>
            {code.verificationCount}
            {code.verificationCount > threshold && ' — suspicious'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Created</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{formatDate(code.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Last verified</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{code.lastVerifiedAt ? formatDateTime(code.lastVerifiedAt) : 'Never'}</dd>
        </div>
      </dl>
      <p className="mt-6 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Verification history</p>
      {logs.loading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : logs.data?.length ? (
        <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {logs.data.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
              <span className="text-slate-600">
                #{v.countAtTime} · {v.location} · <span className="text-slate-400">{formatDateTime(v.timestamp)}</span>
              </span>
              <StatusBadge status={v.result} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">This code hasn't been verified yet.</p>
      )}
    </Modal>
  );
}

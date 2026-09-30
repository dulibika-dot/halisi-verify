import { useMemo, useState } from 'react';
import { Ban, Building2, CheckCircle2, Eye, KeyRound, Mail, MapPin, Phone, Plus, RotateCcw } from 'lucide-react';
import { AddManufacturerModal, CreateLoginModal } from '../../components/manufacturers/ManufacturerModals';
import {
  Avatar,
  Badge,
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
  StatusBadge,
  Toolbar,
  type Column,
} from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import type { ManufacturerStatus, ManufacturerWithStats } from '../../types';
import { formatDate, formatNumber } from '../../utils/format';

interface PendingAction {
  manufacturer: ManufacturerWithStats;
  status: ManufacturerStatus;
}

const ACTION_COPY: Record<ManufacturerStatus, { title: string; label: string; message: string; tone: 'danger' | 'primary' }> = {
  active: { title: 'Approve manufacturer?', label: 'Approve', message: 'They will be able to register products and generate verification codes.', tone: 'primary' },
  suspended: { title: 'Suspend manufacturer?', label: 'Suspend', message: 'They will not be able to create new batches. Existing codes keep verifying.', tone: 'danger' },
  pending: { title: 'Move to pending?', label: 'Confirm', message: '', tone: 'primary' },
};

export function ManufacturersPage() {
  useDocumentTitle('Manufacturers');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getManufacturers(), []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [viewing, setViewing] = useState<ManufacturerWithStats | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loginFor, setLoginFor] = useState<ManufacturerWithStats | null>(null);
  const q = useDebounce(search).toLowerCase();

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          (status === 'all' || m.status === status) &&
          (m.name.toLowerCase().includes(q) || m.county.toLowerCase().includes(q) || m.industry.toLowerCase().includes(q)),
      ),
    [data, status, q],
  );

  const applyStatus = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await api.updateManufacturerStatus(pending.manufacturer.id, pending.status);
      toast.success('Manufacturer updated', `${pending.manufacturer.name} is now ${pending.status}.`);
      setViewing(null);
      await reload(true);
    } catch (e) {
      toast.error('Update failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  const actionsFor = (m: ManufacturerWithStats) => (
    <div className="flex justify-end gap-0.5">
      <IconButton icon={Eye} label="View details" onClick={() => setViewing(m)} />
      {!m.loginEmail && <IconButton icon={KeyRound} label="Create login" onClick={() => setLoginFor(m)} />}
      {m.status === 'pending' && <IconButton icon={CheckCircle2} label="Approve" onClick={() => setPending({ manufacturer: m, status: 'active' })} />}
      {m.status === 'active' && <IconButton icon={Ban} label="Suspend" tone="danger" onClick={() => setPending({ manufacturer: m, status: 'suspended' })} />}
      {m.status === 'suspended' && <IconButton icon={RotateCcw} label="Reactivate" onClick={() => setPending({ manufacturer: m, status: 'active' })} />}
    </div>
  );

  const columns: Column<ManufacturerWithStats>[] = [
    {
      key: 'name',
      header: 'Manufacturer',
      sortValue: (m) => m.name,
      render: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{m.name}</p>
            <p className="truncate text-xs text-slate-500">{m.industry}</p>
          </div>
        </div>
      ),
    },
    { key: 'county', header: 'County', sortValue: (m) => m.county, render: (m) => m.county },
    { key: 'products', header: 'Products', align: 'right', sortValue: (m) => m.productCount, render: (m) => <span className="tabular">{m.productCount}</span> },
    {
      key: 'verifications',
      header: 'Verifications',
      align: 'right',
      sortValue: (m) => m.verificationCount,
      render: (m) => <span className="tabular">{formatNumber(m.verificationCount)}</span>,
    },
    {
      key: 'suspicious',
      header: 'Suspicious',
      align: 'right',
      sortValue: (m) => m.suspiciousCount,
      render: (m) => <span className={m.suspiciousCount ? 'tabular font-semibold text-amber-700' : 'tabular text-slate-400'}>{m.suspiciousCount}</span>,
    },
    {
      key: 'login',
      header: 'Login',
      sortValue: (m) => m.loginEmail ?? '',
      render: (m) =>
        m.loginEmail ? (
          <span className="block max-w-44 truncate text-xs text-slate-600" title={m.loginEmail}>
            {m.loginEmail}
          </span>
        ) : (
          <Badge tone="slate">No login</Badge>
        ),
    },
    { key: 'joined', header: 'Joined', hideOnTablet: true, sortValue: (m) => m.joinedAt, render: (m) => formatDate(m.joinedAt) },
    { key: 'status', header: 'Status', sortValue: (m) => m.status, render: (m) => <StatusBadge status={m.status} /> },
    { key: 'actions', header: '', align: 'right', render: actionsFor },
  ];

  const copy = pending ? ACTION_COPY[pending.status] : null;

  return (
    <>
      <PageHeader
        title="Manufacturers"
        description="Companies registered to issue SMS verification codes. Add new companies, give them a login, approve or suspend them."
        actions={
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Add manufacturer
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, county, industry…" />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending approval' },
              { value: 'suspended', label: 'Suspended' },
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
            rowKey={(m) => m.id}
            loading={loading}
            empty={<EmptyState icon={Building2} title="No manufacturers found" description="Try a different search or status." />}
            mobileCard={(m) => (
              <div className="flex items-center gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    {m.county} · {m.productCount} products
                  </p>
                  <StatusBadge status={m.status} className="mt-1" />
                </div>
                {actionsFor(m)}
              </div>
            )}
          />
        )}
      </Card>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        description={viewing?.industry}
        footer={
          viewing && (
            <>
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing.status === 'pending' && (
                <Button icon={CheckCircle2} onClick={() => setPending({ manufacturer: viewing, status: 'active' })}>
                  Approve
                </Button>
              )}
              {viewing.status === 'active' && (
                <Button variant="danger" icon={Ban} onClick={() => setPending({ manufacturer: viewing, status: 'suspended' })}>
                  Suspend
                </Button>
              )}
              {viewing.status === 'suspended' && (
                <Button icon={RotateCcw} onClick={() => setPending({ manufacturer: viewing, status: 'active' })}>
                  Reactivate
                </Button>
              )}
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ['Products', viewing.productCount],
                ['Batches', viewing.batchCount],
                ['Verifications', viewing.verificationCount],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-lg font-semibold text-slate-900">{formatNumber(Number(v))}</p>
                  <p className="text-xs text-slate-500">{k}</p>
                </div>
              ))}
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={viewing.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Registration no.</dt>
                <dd className="mt-0.5 font-mono text-xs font-medium">{viewing.registrationNo}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Contact person</dt>
                <dd className="mt-0.5 font-medium">{viewing.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Joined</dt>
                <dd className="mt-0.5 font-medium">{formatDate(viewing.joinedAt)}</dd>
              </div>
            </dl>
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-slate-400" />
                {viewing.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-slate-400" />
                {viewing.phone}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-slate-400" />
                {viewing.address}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Login account</p>
                <p className="truncate font-medium text-slate-900">{viewing.loginEmail ?? 'None yet — nobody can sign in for this company'}</p>
              </div>
              {!viewing.loginEmail && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={KeyRound}
                  onClick={() => {
                    setLoginFor(viewing);
                    setViewing(null);
                  }}
                >
                  Create login
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <AddManufacturerModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => reload(true)} />
      <CreateLoginModal manufacturer={loginFor} onClose={() => setLoginFor(null)} onCreated={() => reload(true)} />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={applyStatus}
        loading={saving}
        tone={copy?.tone}
        title={copy?.title ?? ''}
        confirmLabel={copy?.label}
        message={
          <>
            <strong className="text-slate-900">{pending?.manufacturer.name}</strong> — {copy?.message}
          </>
        }
      />
    </>
  );
}

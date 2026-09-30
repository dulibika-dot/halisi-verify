import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Barcode, Download, Eye, Layers, Plus } from 'lucide-react';
import { CreateBatchModal } from '../../components/products/CreateBatchModal';
import {
  Button,
  Card,
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
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import type { BatchWithProduct } from '../../types';
import { downloadCsv } from '../../utils/export';
import { formatCode, formatDate, formatNumber } from '../../utils/format';

export function BatchesPage() {
  useDocumentTitle('Product Batches');
  const mId = useManufacturerId();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const batches = useAsync(() => api.getBatches(mId), [mId]);
  const products = useAsync(() => api.getProducts(mId), [mId]);

  const [search, setSearch] = useState(params.get('product') ?? '');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<BatchWithProduct | null>(null);
  const q = useDebounce(search).toLowerCase();

  const rows = useMemo(
    () =>
      (batches.data ?? []).filter(
        (b) =>
          (status === 'all' || b.status === status) &&
          (category === 'all' || b.category === category) &&
          (b.productName.toLowerCase().includes(q) || b.batchNumber.toLowerCase().includes(q)),
      ),
    [batches.data, status, category, q],
  );

  const exportCodes = async (b: BatchWithProduct) => {
    const codes = (await api.getVerificationCodes(mId)).filter((c) => c.batchId === b.id);
    downloadCsv(
      `${b.batchNumber}-codes.csv`,
      codes.map((c) => ({ product: c.productName, batch: c.batchNumber, code: c.code, status: c.status, verifications: c.verificationCount })),
    );
    toast.success('Export started', `${codes.length} sample codes from ${b.batchNumber} downloaded as CSV.`);
  };

  const columns: Column<BatchWithProduct>[] = [
    {
      key: 'product',
      header: 'Product',
      sortValue: (b) => b.productName,
      render: (b) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Layers className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{b.productName}</p>
            <p className="text-xs text-slate-500">{b.category}</p>
          </div>
        </div>
      ),
    },
    { key: 'batch', header: 'Batch no.', sortValue: (b) => b.batchNumber, render: (b) => <span className="font-mono text-[13px] font-medium">{b.batchNumber}</span> },
    { key: 'units', header: 'Units', align: 'right', sortValue: (b) => b.quantity, render: (b) => <span className="tabular">{formatNumber(b.quantity)}</span> },
    {
      key: 'codes',
      header: 'Verification codes',
      hideOnTablet: true,
      render: (b) => (
        <div className="space-y-1">
          <StatusBadge status={b.codeStatus} />
          {b.codeRange && (
            <p className="font-mono text-[11px] text-slate-500">
              {formatCode(b.codeRange.first)} … {formatCode(b.codeRange.last)}
            </p>
          )}
        </div>
      ),
    },
    { key: 'created', header: 'Created', sortValue: (b) => b.createdAt, render: (b) => <span className="whitespace-nowrap">{formatDate(b.createdAt)}</span> },
    { key: 'status', header: 'Status', sortValue: (b) => b.status, render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Eye} label="View batch" onClick={() => setViewing(b)} />
          <IconButton icon={Barcode} label="View codes" onClick={() => navigate(`/manufacturer/codes?batch=${b.batchNumber}`)} />
          <IconButton icon={Download} label="Export codes (CSV)" onClick={() => void exportCodes(b)} />
        </div>
      ),
    },
  ];

  const categories = [...new Set((batches.data ?? []).map((b) => b.category))];

  return (
    <>
      <PageHeader
        title="Product Batches"
        description="Every production run you register, with its unique SMS verification codes."
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Create Product Batch
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search product or batch no…" />
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
            className="sm:w-48"
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'recalled', label: 'Recalled' },
              { value: 'expired', label: 'Expired' },
            ]}
            className="sm:w-40"
          />
        </Toolbar>
        {batches.error ? (
          <ErrorState message={batches.error} onRetry={() => batches.reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(b) => b.id}
            loading={batches.loading}
            empty={
              <EmptyState
                icon={Layers}
                title="No batches found"
                description={search ? `Nothing matches “${search}”.` : 'Create your first product batch to generate verification codes.'}
                action={
                  search ? (
                    <Button variant="secondary" onClick={() => setSearch('')}>
                      Clear search
                    </Button>
                  ) : (
                    <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                      Create Product Batch
                    </Button>
                  )
                }
              />
            }
            mobileCard={(b) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{b.productName}</p>
                    <p className="font-mono text-xs text-slate-500">{b.batchNumber}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {formatNumber(b.quantity)} units · {formatDate(b.createdAt)}
                  </span>
                  <div className="flex">
                    <IconButton icon={Eye} label="View batch" onClick={() => setViewing(b)} />
                    <IconButton icon={Download} label="Export codes" onClick={() => void exportCodes(b)} />
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </Card>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Batch ${viewing.batchNumber}` : ''}
        description={viewing?.productName}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
            <Button icon={Barcode} onClick={() => viewing && navigate(`/manufacturer/codes?batch=${viewing.batchNumber}`)}>
              View codes
            </Button>
          </>
        }
      >
        {viewing && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Product', viewing.productName],
              ['Category', viewing.category],
              ['Units produced', formatNumber(viewing.quantity)],
              ['Codes generated', formatNumber(viewing.codesGenerated)],
              ['Manufactured', formatDate(viewing.manufacturingDate)],
              ['Expires', formatDate(viewing.expiryDate)],
              ['Registered', formatDate(viewing.createdAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={viewing.status} />
              </dd>
            </div>
            {viewing.codeRange && (
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Code series (first … last)</dt>
                <dd className="mt-1 font-mono text-sm">
                  {formatCode(viewing.codeRange.first)} … {formatCode(viewing.codeRange.last)}
                </dd>
                <dd className="mt-2 text-xs text-slate-500">Codes are random, not sequential, so they can't be guessed.</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>

      <CreateBatchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        manufacturerId={mId}
        products={products.data ?? []}
        onCreated={() => {
          void batches.reload(true);
          void products.reload(true);
        }}
      />
    </>
  );
}

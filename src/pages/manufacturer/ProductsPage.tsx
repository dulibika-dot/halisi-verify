import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Plus, TriangleAlert } from 'lucide-react';
import { CreateBatchModal } from '../../components/products/CreateBatchModal';
import { Badge, Button, Card, EmptyState, ErrorState, FilterSelect, PageHeader, SearchInput, Skeleton, StatusBadge } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import type { ProductWithStats } from '../../types';
import { formatCompact, formatNumber } from '../../utils/format';

export function ProductsPage() {
  useDocumentTitle('Products');
  const mId = useManufacturerId();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api.getProducts(mId), [mId]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const q = useDebounce(search).toLowerCase();

  const categories = useMemo(() => [...new Set((data ?? []).map((p) => p.category))], [data]);
  const filtered = (data ?? []).filter(
    (p) => (category === 'all' || p.category === category) && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Products"
        description="Your registered products. Each product can have many production batches with their own verification codes."
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Create Product Batch
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search products or SKU…" />
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          className="sm:w-52"
        />
      </div>

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={() => reload()} />
        </Card>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search || category !== 'all' ? 'No products match your filters' : 'No products yet'}
            description={search || category !== 'all' ? 'Try a different search or category.' : 'Create your first batch to register a product.'}
            action={
              <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                Create Product Batch
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => navigate(`/manufacturer/batches?product=${encodeURIComponent(p.name)}`)} />
          ))}
        </div>
      )}

      <CreateBatchModal open={createOpen} onClose={() => setCreateOpen(false)} manufacturerId={mId} products={data ?? []} onCreated={() => reload(true)} />
    </>
  );
}

function ProductCard({ product: p, onOpen }: { product: ProductWithStats; onOpen: () => void }) {
  return (
    <Card className="group flex flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ring-1 ring-brand-200/60">
          <Package className="size-5" />
        </span>
        <StatusBadge status={p.status} />
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{p.name}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone="teal">{p.category}</Badge>
        <span className="font-mono">{p.sku}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-500">{p.description}</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <dt className="text-[11px] text-slate-500">Batches</dt>
          <dd className="text-sm font-semibold text-slate-900">{p.batchCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Units</dt>
          <dd className="text-sm font-semibold text-slate-900">{formatCompact(p.totalUnits)}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500">Checks</dt>
          <dd className="text-sm font-semibold text-slate-900">{formatNumber(p.verificationCount)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        {p.suspiciousCount > 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <TriangleAlert className="size-3.5" /> {p.suspiciousCount} suspicious checks
          </span>
        ) : (
          <span className="text-xs text-slate-400">No suspicious activity</span>
        )}
        <button onClick={onOpen} className="flex items-center gap-1 text-sm font-semibold text-brand-700 transition group-hover:gap-1.5">
          Batches <ArrowRight className="size-4" />
        </button>
      </div>
    </Card>
  );
}

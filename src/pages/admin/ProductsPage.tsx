import { useMemo, useState } from 'react';
import { Package, TriangleAlert } from 'lucide-react';
import { Badge, Card, DataTable, EmptyState, ErrorState, FilterSelect, PageHeader, SearchInput, StatusBadge, Toolbar, type Column } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import type { ProductWithStats } from '../../types';
import { formatDate, formatNumber } from '../../utils/format';

export function AdminProductsPage() {
  useDocumentTitle('Products');
  const { data, loading, error, reload } = useAsync(() => api.getProducts(), []);
  const [search, setSearch] = useState('');
  const [manufacturer, setManufacturer] = useState('all');
  const [category, setCategory] = useState('all');
  const q = useDebounce(search).toLowerCase();

  const manufacturers = useMemo(() => [...new Set((data ?? []).map((p) => p.manufacturerName))].sort(), [data]);
  const categories = useMemo(() => [...new Set((data ?? []).map((p) => p.category))].sort(), [data]);
  const rows = (data ?? []).filter(
    (p) =>
      (manufacturer === 'all' || p.manufacturerName === manufacturer) &&
      (category === 'all' || p.category === category) &&
      (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
  );

  const columns: Column<ProductWithStats>[] = [
    {
      key: 'name',
      header: 'Product',
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Package className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{p.name}</p>
            <p className="font-mono text-xs text-slate-500">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'manufacturer', header: 'Manufacturer', sortValue: (p) => p.manufacturerName, render: (p) => p.manufacturerName },
    { key: 'category', header: 'Category', sortValue: (p) => p.category, render: (p) => <Badge tone="teal">{p.category}</Badge> },
    { key: 'batches', header: 'Batches', align: 'right', sortValue: (p) => p.batchCount, render: (p) => <span className="tabular">{p.batchCount}</span> },
    { key: 'units', header: 'Units', align: 'right', hideOnTablet: true, sortValue: (p) => p.totalUnits, render: (p) => <span className="tabular">{formatNumber(p.totalUnits)}</span> },
    {
      key: 'checks',
      header: 'Checks',
      align: 'right',
      sortValue: (p) => p.verificationCount,
      render: (p) => (
        <span className="tabular inline-flex items-center gap-1.5">
          {formatNumber(p.verificationCount)}
          {p.suspiciousCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700" title={`${p.suspiciousCount} suspicious`}>
              <TriangleAlert className="size-3" />
              {p.suspiciousCount}
            </span>
          )}
        </span>
      ),
    },
    { key: 'created', header: 'Registered', hideOnTablet: true, sortValue: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <>
      <PageHeader title="Products" description="Every product registered by every manufacturer in the system." />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search product or SKU…" />
          <FilterSelect
            label="Manufacturer"
            value={manufacturer}
            onChange={setManufacturer}
            options={[{ value: 'all', label: 'All manufacturers' }, ...manufacturers.map((m) => ({ value: m, label: m }))]}
            className="sm:w-52"
          />
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
            className="sm:w-48"
          />
        </Toolbar>
        {error ? (
          <ErrorState message={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(p) => p.id}
            loading={loading}
            initialSort={{ key: 'checks', dir: 'desc' }}
            empty={<EmptyState icon={Package} title="No products found" description="Try different filters." />}
            mobileCard={(p) => (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.manufacturerName} · {p.category}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {p.batchCount} batches · {formatNumber(p.verificationCount)} checks
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            )}
          />
        )}
      </Card>
    </>
  );
}

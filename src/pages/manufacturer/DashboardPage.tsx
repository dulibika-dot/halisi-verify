import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, FileWarning, Layers, MessageSquareText, Package, Plus, ScanLine, ShieldCheck, TriangleAlert } from 'lucide-react';
import { ProductActivityChart } from '../../components/charts/ProductActivityChart';
import { ResultsDonut } from '../../components/charts/ResultsDonut';
import { VerificationTrendChart } from '../../components/charts/VerificationTrendChart';
import { CreateBatchModal } from '../../components/products/CreateBatchModal';
import { Button, Card, CardHeader, ErrorState, PageHeader, Segmented, Skeleton, StatCard } from '../../components/ui';
import { RecentActivityList } from '../../components/verification/RecentActivityList';
import { SuspiciousAlert } from '../../components/verification/SuspiciousAlert';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function ManufacturerDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const mId = useManufacturerId();
  const navigate = useNavigate();
  const [days, setDays] = useState<'7' | '30'>('30');
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useAsync(() => api.getDashboardStats(mId), [mId]);
  const trend = useAsync(() => api.getVerificationTrend(Number(days), mId), [days, mId]);
  const byProduct = useAsync(() => api.getProductActivity(mId), [mId]);
  const recent = useAsync(() => api.getRecentActivity(8, mId), [mId]);
  const suspicious = useAsync(() => api.getSuspiciousActivity(mId), [mId]);
  const products = useAsync(() => api.getProducts(mId), [mId]);
  const manufacturer = useAsync(() => api.getManufacturer(mId), [mId]);

  const s = stats.data;
  const topAlert = suspicious.data?.find((x) => x.status === 'suspicious' || x.status === 'investigating');

  const refreshAll = () => {
    void stats.reload(true);
    void products.reload(true);
  };

  return (
    <>
      <PageHeader
        eyebrow={manufacturer.data?.name ?? 'Manufacturer'}
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description="Here's how your products are being verified by customers across Kenya."
        actions={
          <>
            <Button variant="secondary" icon={MessageSquareText} onClick={() => navigate('/manufacturer/simulator')}>
              Try SMS simulator
            </Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              Create Product Batch
            </Button>
          </>
        }
      />

      {stats.error ? (
        <Card>
          <ErrorState message={stats.error} onRetry={() => stats.reload()} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total Products" value={s?.products} icon={Package} tone="brand" hint="registered" to="/manufacturer/products" />
          <StatCard label="Product Batches" value={s?.batches} icon={Layers} tone="violet" hint="in circulation" to="/manufacturer/batches" />
          <StatCard label="Verification Requests" value={s?.verifications} icon={ScanLine} tone="blue" change={s?.verificationsChange} hint="vs last week" to="/manufacturer/activity?period=all" />
          <StatCard label="Verified Products" value={s?.verified} icon={ShieldCheck} tone="green" hint="genuine checks" to="/manufacturer/activity?result=verified&period=all" />
          <StatCard label="Suspicious Verifications" value={s?.suspicious} icon={TriangleAlert} tone="amber" change={s?.suspiciousChange} invertChange hint="vs last week" to="/manufacturer/activity?result=suspicious&period=all" />
          <StatCard label="Counterfeit Reports" value={s?.reports} icon={FileWarning} tone="red" hint="from customers" to="/manufacturer/reports" />
        </div>
      )}

      {topAlert && (
        <SuspiciousAlert
          className="mt-6 animate-slide-up"
          item={topAlert}
          actions={
            <Button size="sm" variant="secondary" onClick={() => navigate('/manufacturer/activity')}>
              View activity
            </Button>
          }
        />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Verification activity"
            description={`Customer checks over the last ${days} days`}
            action={<Segmented value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />}
          />
          <div className="p-5 sm:p-6">{trend.loading || !trend.data ? <Skeleton className="h-[300px] w-full rounded-xl" /> : <VerificationTrendChart data={trend.data} />}</div>
        </Card>

        <Card>
          <CardHeader title="Genuine vs suspicious" description="All-time verification results" />
          <div className="p-5 sm:p-6">
            {!s ? (
              <Skeleton className="mx-auto size-44 rounded-full" />
            ) : (
              <ResultsDonut verified={s.verified} suspicious={s.suspicious} invalid={s.invalid} />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Verification activity by product" description="Which of your products customers check most" />
          <div className="p-5 sm:p-6">
            {byProduct.loading || !byProduct.data ? <Skeleton className="h-[240px] w-full rounded-xl" /> : <ProductActivityChart data={byProduct.data} />}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Recent activity"
            description="Latest customer verifications"
            action={
              <button onClick={() => navigate('/manufacturer/activity')} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                View all
              </button>
            }
          />
          <div className="mt-3 flex-1">
            <RecentActivityList items={recent.data} loading={recent.loading} />
          </div>
        </Card>
      </div>

      <Card className="mt-6 flex flex-col items-start gap-4 overflow-hidden bg-gradient-to-r from-ink-950 to-ink-800 p-6 text-white sm:flex-row sm:items-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
          <Boxes className="size-6 text-brand-300" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Launching a new production run?</p>
          <p className="text-sm text-slate-400">Create a batch and unique SMS codes are generated for every unit automatically.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
          Create batch
        </Button>
      </Card>

      <CreateBatchModal open={createOpen} onClose={() => setCreateOpen(false)} manufacturerId={mId} products={products.data ?? []} onCreated={refreshAll} />
    </>
  );
}

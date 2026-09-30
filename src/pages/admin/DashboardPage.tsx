import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ChevronRight, FileWarning, MapPinned, Package, ScanLine, ShieldAlert, ShieldCheck, TriangleAlert, UserPlus } from 'lucide-react';
import { ResultsDonut } from '../../components/charts/ResultsDonut';
import { SuspiciousCodesChart } from '../../components/charts/SuspiciousCodesChart';
import { VerificationTrendChart } from '../../components/charts/VerificationTrendChart';
import { Button, Card, CardHeader, DemoPill, ErrorState, PageHeader, Segmented, Skeleton, StatCard } from '../../components/ui';
import { RecentActivityList } from '../../components/verification/RecentActivityList';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';

export function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const navigate = useNavigate();
  const [days, setDays] = useState<'7' | '30'>('30');

  const stats = useAsync(() => api.getDashboardStats(), []);
  const trend = useAsync(() => api.getVerificationTrend(Number(days)), [days]);
  const suspicious = useAsync(() => api.getSuspiciousActivity(), []);
  const settings = useAsync(() => api.getSettings(), []);
  const hotspots = useAsync(() => api.getHotspots(), []);
  const recent = useAsync(() => api.getRecentActivity(7), []);
  const reports = useAsync(() => api.getReports(), []);
  const manufacturers = useAsync(() => api.getManufacturers(), []);

  const s = stats.data;
  const flagged = (suspicious.data ?? []).filter((x) => x.status === 'suspicious');
  const pendingReports = (reports.data ?? []).filter((r) => r.status === 'pending').length;
  const pendingMfrs = (manufacturers.data ?? []).filter((m) => m.status === 'pending').length;
  const topHotspots = (hotspots.data ?? []).slice(0, 5);
  const hotspotMax = Math.max(1, ...topHotspots.map((h) => h.suspicious + h.invalid));

  const actions = [
    { icon: ShieldAlert, label: 'Suspicious codes to review', count: flagged.length, to: '/admin/suspicious', tone: 'bg-amber-50 text-amber-600' },
    { icon: FileWarning, label: 'Pending counterfeit reports', count: pendingReports, to: '/admin/reports', tone: 'bg-rose-50 text-rose-600' },
    { icon: UserPlus, label: 'Manufacturers awaiting approval', count: pendingMfrs, to: '/admin/manufacturers', tone: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="System overview"
        description="Nationwide product verification activity, counterfeit signals and customer reports."
        actions={
          <>
            <Button variant="secondary" icon={MapPinned} onClick={() => navigate('/admin/hotspots')}>
              Hotspots
            </Button>
            <Button icon={ShieldAlert} onClick={() => navigate('/admin/suspicious')}>
              Review suspicious activity
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
          <StatCard label="Total Manufacturers" value={s?.manufacturers} icon={Building2} tone="violet" hint="registered" to="/admin/manufacturers" />
          <StatCard label="Total Products" value={s?.products} icon={Package} tone="brand" hint="in the registry" to="/admin/products" />
          <StatCard label="Verification Requests" value={s?.verifications} icon={ScanLine} tone="blue" change={s?.verificationsChange} hint="vs last week" to="/admin/logs?period=all" />
          <StatCard label="Verified Products" value={s?.verified} icon={ShieldCheck} tone="green" hint="genuine checks" to="/admin/logs?result=verified&period=all" />
          <StatCard label="Suspicious Verifications" value={s?.suspicious} icon={TriangleAlert} tone="amber" change={s?.suspiciousChange} invertChange hint="vs last week" to="/admin/logs?result=suspicious&period=all" />
          <StatCard label="Counterfeit Reports" value={s?.reports} icon={FileWarning} tone="red" hint="from customers" to="/admin/reports" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Verification trends"
            description={`All verification requests, last ${days} days`}
            action={<Segmented value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />}
          />
          <div className="p-5 sm:p-6">{trend.loading || !trend.data ? <Skeleton className="h-[300px] w-full rounded-xl" /> : <VerificationTrendChart data={trend.data} />}</div>
        </Card>

        <Card>
          <CardHeader title="Verification results" description="Genuine, suspicious and invalid checks" />
          <div className="p-5 sm:p-6">
            {!s ? <Skeleton className="mx-auto size-44 rounded-full" /> : <ResultsDonut verified={s.verified} suspicious={s.suspicious} invalid={s.invalid} verifiedLabel="Genuine" />}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Suspicious activity"
            description="Codes receiving unusually high numbers of verification requests"
            action={
              <Link to="/admin/suspicious" className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                Investigate <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="p-5 sm:p-6">
            {suspicious.loading || !suspicious.data ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : (
              <SuspiciousCodesChart data={suspicious.data} threshold={settings.data?.suspiciousThreshold ?? 3} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Needs attention" description="Items waiting for an admin" />
          <ul className="space-y-2 p-5 sm:p-6">
            {actions.map((a) => (
              <li key={a.label}>
                <Link to={a.to} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300 hover:shadow-sm">
                  <span className={cn('flex size-10 items-center justify-center rounded-xl', a.tone)}>
                    <a.icon className="size-5" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-700">{a.label}</span>
                  <span className="text-lg font-semibold text-slate-900">{a.count}</span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Top hotspots"
            description="Where suspicious + invalid checks concentrate"
            action={<DemoPill label="Simulated" />}
          />
          <ul className="space-y-4 p-5 sm:p-6">
            {hotspots.loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              : topHotspots.map((h, i) => (
                  <li key={h.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        <span className="mr-2 text-slate-400">{i + 1}</span>
                        {h.name}
                      </span>
                      <span className="tabular text-slate-500">{formatNumber(h.suspicious + h.invalid)} flagged</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-700"
                        style={{ width: `${((h.suspicious + h.invalid) / hotspotMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
          </ul>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <CardHeader
            title="Live verification feed"
            description="Latest SMS checks across all manufacturers"
            action={
              <Link to="/admin/logs" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                View logs
              </Link>
            }
          />
          <div className="mt-3 flex-1">
            <RecentActivityList items={recent.data} loading={recent.loading} />
          </div>
        </Card>
      </div>
    </>
  );
}

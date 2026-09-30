import { useEffect, useState } from 'react';
import { FileWarning, MapPin, Package, ScanLine, TriangleAlert, XCircle } from 'lucide-react';
import { hotspotLevel, KenyaMap } from '../../components/map/KenyaMap';
import { Badge, Card, CardHeader, DemoPill, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import { USE_MOCK_API } from '../../services/config';
import { cn } from '../../utils/cn';
import { formatNumber, percent } from '../../utils/format';

const LEVEL_BADGE = { high: { tone: 'red', label: 'High concentration' }, medium: { tone: 'amber', label: 'Medium' }, low: { tone: 'teal', label: 'Low' } } as const;

export function HotspotsPage() {
  useDocumentTitle('Hotspots');
  const { data, loading, error, reload } = useAsync(() => api.getHotspots(), []);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (data && !selected) setSelected(data[0]?.name ?? null);
  }, [data, selected]);

  const current = data?.find((h) => h.name === selected);

  return (
    <>
      <PageHeader
        title="Verification Hotspots"
        description="Where suspicious and invalid verification attempts are concentrated. Use it to decide where to send market inspectors."
        actions={<DemoPill label={USE_MOCK_API ? 'Simulated map · demo data' : 'Simplified map'} />}
      />

      {error ? (
        <Card>
          <ErrorState message={error} onRetry={() => reload()} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <Card className="overflow-hidden">
            <CardHeader title="Kenya — counterfeit signal map" description="Tap a circle to see details. Locations are approximate." />
            <div className="p-4 sm:p-6">
              {loading || !data ? (
                <Skeleton className="mx-auto aspect-[500/580] w-full max-w-xl rounded-2xl" />
              ) : (
                <div className="mx-auto max-w-xl">
                  <KenyaMap hotspots={data} selected={selected} onSelect={setSelected} />
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden">
              {!current ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div key={current.name} className="animate-fade-in">
                  <div className="bg-gradient-to-br from-ink-950 to-ink-800 p-6 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin className="size-3.5" /> {current.county} County
                        </p>
                        <p className="mt-1 text-2xl font-semibold">{current.name}</p>
                      </div>
                      <Badge tone={LEVEL_BADGE[hotspotLevel(current)].tone}>{LEVEL_BADGE[hotspotLevel(current)].label}</Badge>
                    </div>
                    <p className="mt-4 text-sm text-slate-300">
                      {percent(current.suspicious + current.invalid, current.totalVerifications)}% of checks here were suspicious or invalid.
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-px bg-slate-100">
                    {[
                      { icon: ScanLine, label: 'Total checks', value: current.totalVerifications, className: 'text-sky-600' },
                      { icon: TriangleAlert, label: 'Suspicious', value: current.suspicious, className: 'text-amber-600' },
                      { icon: XCircle, label: 'Invalid codes', value: current.invalid, className: 'text-rose-600' },
                      { icon: FileWarning, label: 'Customer reports', value: current.reports, className: 'text-violet-600' },
                    ].map((m) => (
                      <div key={m.label} className="bg-white p-4">
                        <m.icon className={cn('size-4', m.className)} />
                        <p className="mt-2 text-xl font-semibold text-slate-900">{formatNumber(m.value)}</p>
                        <p className="text-xs text-slate-500">{m.label}</p>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-center gap-3 border-t border-slate-100 p-4 text-sm">
                    <Package className="size-4 text-slate-400" />
                    <span className="text-slate-500">Most targeted product:</span>
                    <span className="font-semibold text-slate-900">{current.topProduct ?? 'None'}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Ranking" description="Locations by flagged checks" />
              <ul className="p-3">
                {(data ?? []).map((h, i) => {
                  const flagged = h.suspicious + h.invalid;
                  return (
                    <li key={h.name}>
                      <button
                        onClick={() => setSelected(h.name)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                          selected === h.name ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50',
                        )}
                      >
                        <span className="w-5 text-xs font-semibold text-slate-400">{i + 1}</span>
                        <span className="flex-1 font-medium text-slate-800">{h.name}</span>
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            hotspotLevel(h) === 'high' ? 'bg-rose-500' : hotspotLevel(h) === 'medium' ? 'bg-amber-400' : 'bg-teal-500',
                          )}
                        />
                        <span className="tabular w-10 text-right font-semibold text-slate-900">{flagged}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

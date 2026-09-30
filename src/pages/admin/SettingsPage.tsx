import { useEffect, useState, type FormEvent } from 'react';
import { Database, MessageSquareText, RadioTower, RefreshCw, Save, Server, ShieldAlert, type LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Input, PageHeader, Select, Skeleton, Toggle } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import { USE_MOCK_API } from '../../services/config';
import type { SystemSettings } from '../../types';

export function SettingsPage() {
  useDocumentTitle('System Settings');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getSettings(), []);
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof SystemSettings, string>>>({});
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const next: typeof errors = {};
    if (!Number.isInteger(form.suspiciousThreshold) || form.suspiciousThreshold < 1 || form.suspiciousThreshold > 50)
      next.suspiciousThreshold = 'Enter a whole number between 1 and 50.';
    if (!Number.isInteger(form.highRiskThreshold) || form.highRiskThreshold <= form.suspiciousThreshold)
      next.highRiskThreshold = 'Must be higher than the suspicious threshold.';
    if (!/^\d{4,6}$/.test(form.smsShortcode)) next.smsShortcode = 'Shortcodes are 4–6 digits.';
    if (!/^[A-Z]{3,12}$/.test(form.verifyKeyword)) next.verifyKeyword = 'Use 3–12 capital letters.';
    if (!/^[A-Z]{3,12}$/.test(form.reportKeyword)) next.reportKeyword = 'Use 3–12 capital letters.';
    if (form.verifyKeyword === form.reportKeyword) next.reportKeyword = 'Must differ from the verify keyword.';
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings(form);
      toast.success('Settings saved', 'New rules apply to the next verification.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={() => reload()} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="System Settings" description="Detection rules, SMS configuration and integration status." />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={save} noValidate className="space-y-6 lg:col-span-2">
          {loading || !form ? (
            <Card className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Counterfeit detection" description="When should a code be flagged?" />
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <Input
                    label="Suspicious after (checks)"
                    type="number"
                    min={1}
                    value={form.suspiciousThreshold}
                    onChange={(e) => set('suspiciousThreshold', Number(e.target.value))}
                    error={errors.suspiciousThreshold}
                    hint="A code checked more times than this is flagged."
                  />
                  <Input
                    label="High risk from (checks)"
                    type="number"
                    min={2}
                    value={form.highRiskThreshold}
                    onChange={(e) => set('highRiskThreshold', Number(e.target.value))}
                    error={errors.highRiskThreshold}
                    hint="Shown in red on dashboards and alerts."
                  />
                  <div className="space-y-5 border-t border-slate-100 pt-5 sm:col-span-2">
                    <Toggle
                      checked={form.autoFlagSuspicious}
                      onChange={(v) => set('autoFlagSuspicious', v)}
                      label="Automatically flag suspicious codes"
                      description="Adds the code to Suspicious Activity as soon as it crosses the threshold."
                    />
                    <Toggle
                      checked={form.notifyManufacturers}
                      onChange={(v) => set('notifyManufacturers', v)}
                      label="Notify manufacturers"
                      description="Manufacturers see alerts for their own products."
                    />
                    <Toggle checked={form.emailAlerts} onChange={(v) => set('emailAlerts', v)} label="Email alerts to admins" description="Daily summary of high-risk codes (requires backend)." />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="SMS configuration" description="What customers send and where." />
                <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                  <Input label="Shortcode" value={form.smsShortcode} onChange={(e) => set('smsShortcode', e.target.value)} error={errors.smsShortcode} />
                  <Input
                    label="Verify keyword"
                    value={form.verifyKeyword}
                    onChange={(e) => set('verifyKeyword', e.target.value.toUpperCase())}
                    error={errors.verifyKeyword}
                  />
                  <Input
                    label="Report keyword"
                    value={form.reportKeyword}
                    onChange={(e) => set('reportKeyword', e.target.value.toUpperCase())}
                    error={errors.reportKeyword}
                  />
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-3">
                    Customers send{' '}
                    <span className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-900 ring-1 ring-slate-200">{form.verifyKeyword} 839274615</span> or{' '}
                    <span className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-900 ring-1 ring-slate-200">{form.reportKeyword} 839274615 reason</span> to{' '}
                    <strong>{form.smsShortcode}</strong>.
                  </div>
                  <Select
                    label="Keep verification logs for"
                    value={String(form.dataRetentionDays)}
                    onChange={(e) => set('dataRetentionDays', Number(e.target.value))}
                    options={[
                      { value: '90', label: '90 days' },
                      { value: '180', label: '6 months' },
                      { value: '365', label: '1 year' },
                      { value: '730', label: '2 years' },
                    ]}
                  />
                </div>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" icon={Save} loading={saving}>
                  Save settings
                </Button>
              </div>
            </>
          )}
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Integrations" description="Connection status" />
            <ul className="space-y-3 p-5 sm:p-6">
              {USE_MOCK_API ? (
                <>
                  <Integration icon={RadioTower} name="SMS gateway" detail="Africa’s Talking (not connected)" status="Simulated" />
                  <Integration icon={Server} name="Backend" detail="In-browser mock API" status="Mock" />
                  <Integration icon={Database} name="Database" detail="Demo data in memory" status="Mock data" />
                </>
              ) : (
                <>
                  <Integration icon={RadioTower} name="SMS gateway" detail="Africa’s Talking function built & tested · awaiting account activation" status="Pending" />
                  <Integration icon={Server} name="Backend" detail="Supabase Edge Functions" status="Live" active />
                  <Integration icon={Database} name="Database" detail="Supabase PostgreSQL" status="Live" active />
                </>
              )}
              <Integration icon={MessageSquareText} name="SMS simulator" detail="Public page: /sms" status="Active" active />
            </ul>
          </Card>

          {USE_MOCK_API && (
          <Card className="p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert className="size-4 text-rose-500" /> Demo data
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              Changes made during a demo (new batches, simulated SMS, status updates) live in memory. Reset to start a fresh presentation.
            </p>
            <Button variant="secondary" icon={RefreshCw} className="mt-4 w-full" onClick={() => setResetOpen(true)}>
              Reset demo data
            </Button>
          </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => window.location.reload()}
        title="Reset demo data?"
        message="The page will reload and all demo changes will be lost. You will stay signed in."
        confirmLabel="Reset"
      />
    </>
  );
}

function Integration({ icon: Icon, name, detail, status, active }: { icon: LucideIcon; name: string; detail: string; status: string; active?: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
      <Badge tone={active ? 'green' : 'amber'}>{status}</Badge>
    </li>
  );
}

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BadgeCheck, Building2, KeyRound, Mail, MessageSquareText, Phone, Save } from 'lucide-react';
import { Avatar, Button, Card, CardHeader, ErrorState, Input, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useManufacturerId } from '../../hooks/useCurrentManufacturer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';
import * as authService from '../../services/authService';
import { USE_MOCK_API } from '../../services/config';
import type { Manufacturer } from '../../types';
import { formatDate } from '../../utils/format';

type Editable = Pick<Manufacturer, 'name' | 'contactPerson' | 'email' | 'phone' | 'county' | 'address' | 'industry'>;

export function ProfilePage() {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  const toast = useToast();
  const mId = useManufacturerId();
  const { data, loading, error, reload, setData } = useAsync(() => api.getManufacturer(mId), [mId]);
  const settings = useAsync(() => api.getSettings(), []);
  const [form, setForm] = useState<Editable | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Editable, string>>>({});
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState<string>();

  useEffect(() => {
    if (data) setForm({ name: data.name, contactPerson: data.contactPerson, email: data.email, phone: data.phone, county: data.county, address: data.address, industry: data.industry });
  }, [data]);

  const set = (k: keyof Editable, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Company name is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!/^\+?[\d\s]{9,16}$/.test(form.phone)) next.phone = 'Enter a valid phone number.';
    if (!form.contactPerson.trim()) next.contactPerson = 'Contact person is required.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await api.updateManufacturer(mId, form);
      setData(updated);
      toast.success('Profile saved', 'Your company details were updated.');
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw.current || pw.next.length < 8) return setPwError('Enter your current password and a new one of at least 8 characters.');
    if (pw.next !== pw.confirm) return setPwError('New passwords do not match.');
    setPwError(undefined);
    try {
      await authService.changePassword(pw.next);
      setPw({ current: '', next: '', confirm: '' });
      if (USE_MOCK_API) toast.info('Password change simulated', 'Connect Supabase to change real passwords.');
      else toast.success('Password updated', 'Use your new password next time you sign in.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not change password.');
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
      <PageHeader title="Profile" description="Your company information and account security." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-brand-600 to-ink-900" />
            <div className="-mt-8 px-6 pb-6">
              {loading || !data ? (
                <Skeleton className="size-16 rounded-2xl" />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-md ring-4 ring-white">
                  <Building2 className="size-7" />
                </span>
              )}
              <h2 className="mt-3 flex items-center gap-1.5 text-lg font-semibold text-slate-900">
                {data?.name ?? 'Loading…'}
                {data?.status === 'active' && <BadgeCheck className="size-5 text-brand-600" />}
              </h2>
              <p className="text-sm text-slate-500">{data?.industry}</p>
              {data && (
                <dl className="mt-5 space-y-3 text-sm">
                  <Row label="Status" value={<StatusBadge status={data.status} />} />
                  <Row label="Registration no." value={<span className="font-mono text-xs">{data.registrationNo}</span>} />
                  <Row label="Member since" value={formatDate(data.joinedAt)} />
                </dl>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              {user && <Avatar name={user.name} size="lg" />}
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{user?.name}</p>
                <p className="truncate text-sm text-slate-500">{user?.title}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-slate-400" /> {user?.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-slate-400" /> {user?.phone}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquareText className="size-4 text-brand-600" /> Customer SMS instructions
            </p>
            <p className="mt-2 text-sm text-slate-500">Print this on your packaging next to the code:</p>
            <div className="mt-3 rounded-xl bg-ink-950 p-4 text-center font-mono text-sm text-white">
              SMS <span className="text-brand-300">{settings.data?.verifyKeyword ?? 'VERIFY'} &lt;code&gt;</span> to{' '}
              <span className="text-brand-300">{settings.data?.smsShortcode ?? '22384'}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Company details" description="Shown to customers in the SMS reply and to the admin team." />
            {!form ? (
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <form onSubmit={save} noValidate className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <Input label="Company name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} required />
                <Input label="Industry" value={form.industry} onChange={(e) => set('industry', e.target.value)} />
                <Input label="Contact person" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} error={errors.contactPerson} required />
                <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} error={errors.email} required />
                <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} required />
                <Input label="County" value={form.county} onChange={(e) => set('county', e.target.value)} />
                <Input label="Physical address" value={form.address} onChange={(e) => set('address', e.target.value)} wrapperClassName="sm:col-span-2" />
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" icon={Save} loading={saving}>
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card>
            <CardHeader title="Change password" description="Use at least 8 characters." />
            <form onSubmit={changePassword} noValidate className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <Input label="Current password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Input label="New password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              <Input label="Confirm new password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              {pwError && <p className="text-sm font-medium text-rose-600 sm:col-span-3">{pwError}</p>}
              <div className="flex justify-end sm:col-span-3">
                <Button type="submit" variant="secondary" icon={KeyRound}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

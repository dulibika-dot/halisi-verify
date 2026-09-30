import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, Phone, User } from 'lucide-react';
import { Button, Card, Input, Logo } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import * as api from '../../services/api';

const empty = {
  name: '',
  registrationNo: '',
  industry: '',
  county: '',
  address: '',
  phone: '',
  contactName: '',
  email: '',
  password: '',
  confirm: '',
  website: '', // honeypot — real people never see this field
};
type Form = typeof empty;

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 2) e.name = 'Enter your company name.';
  if (f.registrationNo.trim().length < 3) e.registrationNo = 'Enter your company registration number.';
  if (!/^\+?[\d\s]{9,16}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +254 712 345 678.';
  if (!f.contactName.trim()) e.contactName = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (f.password.length < 8) e.password = 'Use at least 8 characters.';
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
  return e;
}

/** Public page: a manufacturer registers its company. It stays "pending" until the admin approves it. */
export function RegisterPage() {
  useDocumentTitle('Register your company');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Form, v: string) => {
    const next = { ...form, [k]: v };
    setForm(next);
    if (submitted) setErrors(validate(next));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await api.registerManufacturer({
        company: {
          name: form.name,
          registrationNo: form.registrationNo,
          industry: form.industry,
          county: form.county,
          address: form.address,
          phone: form.phone,
        },
        login: { name: form.contactName, email: form.email, password: form.password },
        website: form.website,
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-grid px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" /> Sign in
          </Link>
        </div>

        {done ? (
          <Card className="animate-scale-in p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Registration received</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              <strong className="text-slate-700">{form.name}</strong> is now <strong className="text-amber-700">pending approval</strong>. You can
              sign in with <strong className="text-slate-700">{form.email.trim().toLowerCase()}</strong> straight away, but creating product batches and
              verification codes unlocks once the administrator has checked and approved your company.
            </p>
            <Link to="/login" state={{ email: form.email.trim().toLowerCase() }}>
              <Button className="mt-6" size="lg">
                Go to sign in
              </Button>
            </Link>
          </Card>
        ) : (
          <Card className="animate-slide-up p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Register your company</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Create a manufacturer account to issue SMS verification codes for your products. New accounts are reviewed and approved by the
              administrator.
            </p>

            {formError && (
              <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={submit} noValidate className="mt-6 space-y-7">
              <section>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Building2 className="size-4 text-brand-600" /> Company details
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Company name" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} wrapperClassName="sm:col-span-2" />
                  <Input
                    label="Registration number"
                    required
                    value={form.registrationNo}
                    onChange={(e) => set('registrationNo', e.target.value)}
                    error={errors.registrationNo}
                    placeholder="e.g. PVT-2026-…"
                    hint="From your certificate of incorporation."
                  />
                  <Input label="Industry" value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Edible oils" />
                  <Input label="Company phone" required icon={Phone} value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} placeholder="+254 7…" />
                  <Input label="County" value={form.county} onChange={(e) => set('county', e.target.value)} placeholder="e.g. Nairobi" />
                  <Input label="Physical address" value={form.address} onChange={(e) => set('address', e.target.value)} wrapperClassName="sm:col-span-2" />
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <KeyRound className="size-4 text-brand-600" /> Your login
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Your full name" required icon={User} value={form.contactName} onChange={(e) => set('contactName', e.target.value)} error={errors.contactName} />
                  <Input
                    label="Email"
                    required
                    type="email"
                    icon={Mail}
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    error={errors.email}
                    placeholder="you@company.co.ke"
                  />
                  <Input
                    label="Password"
                    required
                    type={showPw ? 'text' : 'password'}
                    icon={Lock}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    error={errors.password}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    }
                  />
                  <Input
                    label="Confirm password"
                    required
                    type={showPw ? 'text' : 'password'}
                    icon={Lock}
                    autoComplete="new-password"
                    value={form.confirm}
                    onChange={(e) => set('confirm', e.target.value)}
                    error={errors.confirm}
                  />
                </div>
              </section>

              {/* Hidden from people, visible to spam bots */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />

              <Button type="submit" size="lg" className="w-full" loading={saving} icon={Building2}>
                {saving ? 'Registering…' : 'Register company'}
              </Button>
              <p className="text-center text-sm text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
                  Sign in
                </Link>
              </p>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

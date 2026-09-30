import { useEffect, useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Sparkles, UserPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';
import type { ManufacturerWithStats, NewLoginInput, NewManufacturerInput } from '../../types';
import { copyToClipboard } from '../../utils/export';
import { Button, Input, Modal, Select } from '../ui';

/** Readable random temporary password, e.g. "Halisi-7kq2-M9wx" */
function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join('');
  return `Halisi-${s.slice(0, 4)}-${s.slice(4)}`;
}

const emptyLogin = (): NewLoginInput => ({ name: '', email: '', password: generatePassword() });

function validateLogin(l: NewLoginInput) {
  const e: Partial<Record<keyof NewLoginInput, string>> = {};
  if (!l.name.trim()) e.name = 'Who will use this login?';
  if (!/^\S+@\S+\.\S+$/.test(l.email.trim())) e.email = 'Enter a valid email address.';
  if (l.password.length < 8) e.password = 'At least 8 characters.';
  return e;
}

function LoginFields({
  value,
  onChange,
  errors,
}: {
  value: NewLoginInput;
  onChange: (v: NewLoginInput) => void;
  errors: Partial<Record<keyof NewLoginInput, string>>;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" required value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} error={errors.name} placeholder="e.g. Grace Wanjiku" />
      <Input label="Login email" required type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} error={errors.email} placeholder="name@company.co.ke" />
      <Input
        label="Temporary password"
        required
        type={show ? 'text' : 'password'}
        value={value.password}
        onChange={(e) => onChange({ ...value, password: e.target.value })}
        error={errors.password}
        hint="Share it with the manufacturer; they can change it on their Profile page."
        wrapperClassName="sm:col-span-2"
        trailing={
          <div className="flex">
            <button type="button" onClick={() => setShow((s) => !s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            <button type="button" onClick={() => onChange({ ...value, password: generatePassword() })} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Generate a new password" aria-label="Generate a new password">
              <Sparkles className="size-4" />
            </button>
          </div>
        }
      />
    </div>
  );
}

/** Shown once after saving so the admin can hand the login to the manufacturer */
function LoginCreated({ company, login, onClose }: { company: string; login: NewLoginInput; onClose: () => void }) {
  const toast = useToast();
  const text = `Halisi Verify login for ${company}\nEmail: ${login.email.trim().toLowerCase()}\nTemporary password: ${login.password}\nPlease change your password after signing in (Profile page).`;
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600" /> Login ready
        </span>
      }
      description={`${company} can now sign in on the normal login page.`}
      footer={
        <>
          <Button
            variant="secondary"
            icon={Copy}
            onClick={async () => ((await copyToClipboard(text)) ? toast.success('Login details copied') : toast.error('Copy failed'))}
          >
            Copy login details
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium text-slate-900">{login.email.trim().toLowerCase()}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Temporary password</dt>
          <dd className="font-mono font-semibold text-slate-900">{login.password}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">This password is shown only now. Send it privately and ask them to change it after signing in.</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

const emptyCompany = (): NewManufacturerInput => ({
  name: '',
  registrationNo: '',
  industry: '',
  county: '',
  address: '',
  phone: '',
  email: '',
  contactPerson: '',
  status: 'active',
});

export function AddManufacturerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [company, setCompany] = useState(emptyCompany);
  const [login, setLogin] = useState(emptyLogin);
  const [errors, setErrors] = useState<{ name?: string; login: Partial<Record<keyof NewLoginInput, string>> }>({ login: {} });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ company: string; login: NewLoginInput } | null>(null);

  useEffect(() => {
    if (open) {
      setCompany(emptyCompany());
      setLogin(emptyLogin());
      setErrors({ login: {} });
    }
  }, [open]);

  const set = (k: keyof NewManufacturerInput, v: string) => setCompany((c) => ({ ...c, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = { name: company.name.trim().length < 2 ? 'Enter the company name.' : undefined, login: validateLogin(login) };
    setErrors(next);
    if (next.name || Object.keys(next.login).length) return;
    setSaving(true);
    try {
      await api.createManufacturer(
        { ...company, contactPerson: company.contactPerson || login.name, email: company.email || login.email },
        login,
      );
      toast.success('Manufacturer added', `${company.name} is registered and has a login.`);
      onCreated();
      onClose();
      setDone({ company: company.name, login });
    } catch (err) {
      toast.error('Could not add manufacturer', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={saving ? () => {} : onClose}
        size="lg"
        title="Add manufacturer"
        description="Register a company and create the login its staff will use on the normal sign-in page."
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="add-manufacturer-form" icon={UserPlus} loading={saving}>
              Add manufacturer
            </Button>
          </>
        }
      >
        <form id="add-manufacturer-form" onSubmit={submit} noValidate className="space-y-6">
          <section>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Building2 className="size-4 text-brand-600" /> Company details
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Company name" required value={company.name} onChange={(e) => set('name', e.target.value)} error={errors.name} wrapperClassName="sm:col-span-2" />
              <Input label="Registration no." value={company.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} placeholder="PVT-2026-…" />
              <Input label="Industry" value={company.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Edible oils" />
              <Input label="County" value={company.county} onChange={(e) => set('county', e.target.value)} placeholder="e.g. Nairobi" />
              <Input label="Phone" value={company.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254 7…" />
              <Input label="Address" value={company.address} onChange={(e) => set('address', e.target.value)} wrapperClassName="sm:col-span-2" />
              <Select
                label="Status"
                value={company.status}
                onChange={(e) => set('status', e.target.value)}
                options={[
                  { value: 'active', label: 'Active — can create batches now' },
                  { value: 'pending', label: 'Pending — approve later' },
                ]}
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </section>
          <section className="border-t border-slate-100 pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="size-4 text-brand-600" /> Login account
            </p>
            <LoginFields value={login} onChange={setLogin} errors={errors.login} />
          </section>
        </form>
      </Modal>
      {done && <LoginCreated company={done.company} login={done.login} onClose={() => setDone(null)} />}
    </>
  );
}

export function CreateLoginModal({
  manufacturer,
  onClose,
  onCreated,
}: {
  manufacturer: ManufacturerWithStats | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [login, setLogin] = useState(emptyLogin);
  const [errors, setErrors] = useState<Partial<Record<keyof NewLoginInput, string>>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ company: string; login: NewLoginInput } | null>(null);

  useEffect(() => {
    if (manufacturer) {
      setLogin({ ...emptyLogin(), name: manufacturer.contactPerson, email: manufacturer.email });
      setErrors({});
    }
  }, [manufacturer]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!manufacturer) return;
    const next = validateLogin(login);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await api.createManufacturerLogin(manufacturer.id, login);
      toast.success('Login created', `${manufacturer.name} can now sign in.`);
      onCreated();
      setDone({ company: manufacturer.name, login });
      onClose();
    } catch (err) {
      toast.error('Could not create login', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={!!manufacturer}
        onClose={saving ? () => {} : onClose}
        title="Create login"
        description={manufacturer ? `Sign-in account for ${manufacturer.name}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="create-login-form" icon={KeyRound} loading={saving}>
              Create login
            </Button>
          </>
        }
      >
        <form id="create-login-form" onSubmit={submit} noValidate>
          <LoginFields value={login} onChange={setLogin} errors={errors} />
        </form>
      </Modal>
      {done && <LoginCreated company={done.company} login={done.login} onClose={() => setDone(null)} />}
    </>
  );
}

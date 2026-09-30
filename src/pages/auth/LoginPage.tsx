import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, MessageSquareText, Radar, ShieldCheck } from 'lucide-react';
import { Button, Input, Logo, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { requestPasswordReset } from '../../services/authService';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-filled when arriving from the "Registration received" screen
  const [identifier, setIdentifier] = useState(() => (location.state as { email?: string } | null)?.email ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/manufacturer'} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = 'Enter your email or phone number.';
    if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const u = await login(identifier, password, remember);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`, u.role === 'admin' ? 'Signed in.' : 'Your manufacturer dashboard is ready.');
      const from = (location.state as { from?: string } | null)?.from;
      const home = u.role === 'admin' ? '/admin' : '/manufacturer';
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <Logo light className="relative" />

        <div className="relative my-auto max-w-lg py-12">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200">
            <ShieldCheck className="size-3.5" /> SMS-based product authentication
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-[44px]">
            Every genuine product, <span className="text-brand-300">verifiable by SMS.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Manufacturers register batches and unique codes. Customers text a code from any phone. Counterfeits are flagged the moment a code is copied.
          </p>

          {/* Mock SMS conversation */}
          <div className="mt-10 max-w-sm space-y-3">
            <div className="ml-auto w-fit animate-slide-up rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 text-sm font-medium shadow-lg shadow-brand-900/40">
              VERIFY 839274615
            </div>
            <div
              className="w-fit animate-slide-up rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm leading-snug text-slate-200 backdrop-blur"
              style={{ animationDelay: '250ms' }}
            >
              <span className="font-semibold text-emerald-300">GENUINE ✓</span> XYZ Cooking Oil 1L, Batch B2026-001, by XYZ Ltd. Thank you for verifying.
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          {[
            { icon: MessageSquareText, title: 'Any phone', text: 'No app or internet needed' },
            { icon: ShieldCheck, title: 'Unique codes', text: 'One code per unit' },
            { icon: Radar, title: 'Live tracking', text: 'Spot cloned codes fast' },
          ].map((f) => (
            <div key={f.title}>
              <f.icon className="size-5 text-brand-300" />
              <p className="mt-2 text-sm font-semibold">{f.title}</p>
              <p className="text-xs text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* ---------- Form ---------- */}
      <main className="flex items-center justify-center bg-white px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px] animate-slide-up">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Access your manufacturer portal.</p>

          {formError && (
            <div role="alert" className="mt-6 flex animate-scale-in items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email or phone"
              icon={Mail}
              autoComplete="username"
              placeholder="you@company.co.ke"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={errors.identifier}
            />
            <Input
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded border-slate-300 accent-brand-600"
                />
                Remember me
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                Forgot password?
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading} iconRight={ArrowRight}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New manufacturer?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
              Register your company
            </Link>
          </p>
          <Link
            to="/sms"
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border-t border-slate-100 px-3 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <MessageSquareText className="size-4" /> Customer? Verify a product by SMS
          </Link>
          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} Halisi Verify</p>
        </div>
      </main>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}

function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return setError('Enter your email or phone number.');
    setLoading(true);
    await requestPasswordReset(value);
    setLoading(false);
    toast.success('Reset link sent', 'If the account exists, reset instructions were sent (simulated).');
    setValue('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Reset your password"
      description="We'll send a reset link to your email or an SMS code to your phone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="forgot-form" loading={loading}>
            Send reset link
          </Button>
        </>
      }
    >
      <form id="forgot-form" onSubmit={submit} noValidate>
        <Input
          label="Email or phone"
          icon={Mail}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          error={error}
          autoFocus
        />
      </form>
    </Modal>
  );
}

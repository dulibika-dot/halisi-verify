import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Ban,
  CheckCheck,
  Database,
  FileWarning,
  HelpCircle,
  MessageSquareText,
  Phone,
  RadioTower,
  SendHorizontal,
  Server,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { DEMO_CODES } from '../../data/generated';
import { LOCATION_NAMES } from '../../data/locations';
import { useAsync } from '../../hooks/useAsync';
import * as api from '../../services/api';
import { USE_MOCK_API } from '../../services/config';
import { simulateIncomingSms, type SmsReply } from '../../services/smsService';
import { cn } from '../../utils/cn';
import { formatCode, formatDate, formatTime } from '../../utils/format';
import { Card, CardHeader, DemoPill, FilterSelect, Input } from '../ui';

interface ChatMessage {
  id: number;
  from: 'customer' | 'system';
  text: string;
  time: string;
}

// Demo-only shortcuts so the presenter doesn't need to remember codes
const SAMPLES = [
  { label: 'Genuine code', message: `VERIFY ${DEMO_CODES.genuine}`, dot: 'bg-emerald-500' },
  { label: 'Suspicious code', message: `VERIFY ${DEMO_CODES.suspicious}`, dot: 'bg-amber-500' },
  { label: 'Invalid code', message: `VERIFY ${DEMO_CODES.invalid}`, dot: 'bg-rose-500' },
  { label: 'Deactivated code', message: `VERIFY ${DEMO_CODES.deactivated}`, dot: 'bg-slate-400' },
  { label: 'Report a fake', message: `REPORT ${DEMO_CODES.suspicious} packaging looks different`, dot: 'bg-brand-500' },
];

const PHONE_KEY = 'halisi.customerPhone';

/** Accepts 0712345678, 712345678, +254712345678, 254 712 345 678 … → "0712 345 678" (or null if not a Kenyan mobile) */
function normalizeKenyanPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('254')) d = '0' + d.slice(3);
  else if (d.length === 9 && /^[71]/.test(d)) d = '0' + d;
  if (!/^0[71]\d{8}$/.test(d)) return null;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

function loadSavedPhone(): string {
  try {
    return localStorage.getItem(PHONE_KEY) ?? '';
  } catch {
    return '';
  }
}

const PIPELINE: Array<{ icon: LucideIcon; title: string; sub: string }> = [
  { icon: Smartphone, title: 'Customer SMS', sub: 'Any phone' },
  { icon: RadioTower, title: 'SMS gateway', sub: USE_MOCK_API ? 'Later: Africa’s Talking' : 'Africa’s Talking (ready)' },
  { icon: Server, title: 'Backend', sub: USE_MOCK_API ? 'Later: Supabase function' : 'Supabase Edge Function' },
  { icon: Database, title: 'Database', sub: USE_MOCK_API ? 'Later: Supabase' : 'Supabase PostgreSQL' },
  { icon: MessageSquareText, title: 'SMS reply', sub: 'Sent to customer' },
];

const PIPELINE_NOTE = USE_MOCK_API
  ? 'The highlighted path shows each step. In this offline demo the middle steps are simulated in the browser.'
  : 'This simulator sends your message straight to the live verification function and database — the same function a real SMS reaches through the gateway, so the reply is identical.';

let msgId = 1;
const maskPhone = (p: string) => `${p.slice(0, 4)} *** ${p.slice(-3)}`;

export function SmsSimulator() {
  const { data: settings } = useAsync(() => api.getSettings(), []);
  const shortcode = settings?.smsShortcode ?? '22384';
  const keyword = settings?.verifyKeyword ?? 'VERIFY';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [phone, setPhone] = useState(loadSavedPhone);
  const [phoneError, setPhoneError] = useState<string>();
  const phoneRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState('Nairobi');
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState<SmsReply | null>(null);
  const [step, setStep] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    // The customer must enter their own phone number first
    const number = normalizeKenyanPhone(phone);
    if (!number) {
      setPhoneError(phone.trim() ? 'Enter a valid Kenyan mobile number, e.g. 0712 345 678.' : 'Enter your phone number first.');
      phoneRef.current?.focus();
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPhoneError(undefined);
    setPhone(number);
    try {
      localStorage.setItem(PHONE_KEY, number);
    } catch {
      /* private mode — fine */
    }

    setInput('');
    setSending(true);
    setMessages((m) => [...m, { id: msgId++, from: 'customer', text: message, time: new Date().toISOString() }]);

    // Animate the message travelling through the (future) system
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, PIPELINE.length - 1)), 200);
    try {
      const result = await simulateIncomingSms(message, maskPhone(number), location);
      const replyText = result.kind === 'verification' ? result.data.replyText : result.kind === 'report' ? result.data.replyText : result.replyText;
      setReply(result);
      setMessages((m) => [...m, { id: msgId++, from: 'system', text: replyText, time: new Date().toISOString() }]);
    } catch (e) {
      setReply(null);
      const reason = e instanceof Error ? e.message : 'Unknown error';
      setMessages((m) => [
        ...m,
        { id: msgId++, from: 'system', text: `⚠ Message not delivered — the verification service could not be reached. (${reason})`, time: new Date().toISOString() },
      ]);
    } finally {
      clearInterval(timer);
      setStep(PIPELINE.length);
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      {/* ---------- Phone ---------- */}
      <div className="mx-auto w-full max-w-[380px]">
        <div className="rounded-[2.6rem] bg-ink-950 p-2.5 shadow-2xl shadow-slate-900/30 ring-1 ring-slate-800">
          <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[2.1rem] bg-slate-100">
            <div className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white/90 px-5 pt-11 pb-3 backdrop-blur">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white">
                <ShieldCheck className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">{shortcode}</p>
                <p className="text-xs text-slate-500">Halisi Verify · SMS</p>
              </div>
            </div>

            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="mx-auto mt-8 max-w-[240px] text-center text-xs text-slate-500">
                  <MessageSquareText className="mx-auto mb-2 size-8 text-slate-300" />
                  Send <span className="font-semibold text-slate-700">{keyword} &lt;code&gt;</span> to {shortcode} to check a product, or tap a sample on the right.
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex animate-slide-up', m.from === 'customer' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug shadow-sm',
                      m.from === 'customer' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-slate-800',
                    )}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.text}</p>
                    <p className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', m.from === 'customer' ? 'text-brand-100' : 'text-slate-400')}>
                      {formatTime(m.time)}
                      {m.from === 'customer' && <CheckCheck className="size-3" />}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`${keyword} 839274615`}
                aria-label="SMS message"
                className="h-10 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
                aria-label="Send SMS"
              >
                <SendHorizontal className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ---------- Result + controls ---------- */}
      <div className="space-y-6">
        <ResultPanel reply={reply} sending={sending} />

        <Card>
          <CardHeader title="Your details" description="Enter your own phone number, then type a message on the phone or tap a sample." action={USE_MOCK_API ? <DemoPill /> : undefined} />
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                ref={phoneRef}
                label="Your phone number"
                icon={Phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(undefined);
                }}
                onBlur={() => {
                  const n = normalizeKenyanPhone(phone);
                  if (n) setPhone(n);
                }}
                error={phoneError}
                hint="Saved privately as 0712 *** 678."
              />
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Your town</p>
                <FilterSelect label="Your town" value={location} onChange={setLocation} options={LOCATION_NAMES.map((l) => ({ value: l, label: l }))} />
              </div>
            </div>
            <p className="pt-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Try a sample</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  onClick={() => void send(s.message)}
                  disabled={sending}
                  className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:opacity-50"
                >
                  <span className={cn('size-2 rounded-full', s.dot)} />
                  <span>
                    <span className="block font-semibold text-slate-800">{s.label}</span>
                    <span className="block font-mono text-[11px] text-slate-500">{s.message.length > 26 ? `${s.message.slice(0, 25)}…` : s.message}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Tip: send the genuine code a few times — after {settings?.suspiciousThreshold ?? 3} checks it turns{' '}
              <span className="font-semibold text-amber-700">Suspicious</span>, exactly how a copied code on fake packaging is caught.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="How the SMS travels" description={PIPELINE_NOTE} />
          <ol className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-5 sm:p-6">
            {PIPELINE.map((p, i) => {
              const active = step >= i;
              return (
                <li
                  key={p.title}
                  className={cn(
                    'relative rounded-xl border p-3 text-center transition-all duration-300',
                    active ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white',
                    i === PIPELINE.length - 1 && 'col-span-2 sm:col-span-1',
                  )}
                >
                  <p.icon className={cn('mx-auto size-5 transition', active ? 'text-brand-600' : 'text-slate-400')} />
                  <p className="mt-2 text-xs font-semibold text-slate-800">{p.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{p.sub}</p>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Big result card ---------------- */

const RESULT_STYLES: Record<string, { icon: LucideIcon; title: string; subtitle: string; className: string; iconClass: string }> = {
  verified: {
    icon: ShieldCheck,
    title: 'VERIFIED',
    subtitle: 'Genuine product',
    className: 'from-emerald-500 to-emerald-700',
    iconClass: 'text-emerald-600',
  },
  suspicious: {
    icon: TriangleAlert,
    title: 'SUSPICIOUS',
    subtitle: 'Possible counterfeit — code checked too many times',
    className: 'from-amber-400 to-amber-600',
    iconClass: 'text-amber-600',
  },
  invalid: {
    icon: XCircle,
    title: 'INVALID',
    subtitle: 'Code not registered — likely fake',
    className: 'from-rose-500 to-rose-700',
    iconClass: 'text-rose-600',
  },
  deactivated: {
    icon: Ban,
    title: 'DEACTIVATED',
    subtitle: 'Code withdrawn (recall or blocked)',
    className: 'from-slate-500 to-slate-700',
    iconClass: 'text-slate-600',
  },
};

function ResultPanel({ reply, sending }: { reply: SmsReply | null; sending: boolean }) {
  if (sending) {
    return (
      <Card className="flex h-[248px] flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <span className="relative flex size-12 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-200 opacity-60" />
          <ShieldCheck className="relative size-7 text-brand-600" />
        </span>
        Checking code against the registry…
      </Card>
    );
  }

  if (!reply) {
    return (
      <Card className="flex h-[248px] flex-col items-center justify-center bg-grid px-6 text-center">
        <MessageSquareText className="size-9 text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-800">Waiting for an SMS</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Type a message on the phone or pick a sample. The verification result will appear here.</p>
      </Card>
    );
  }

  if (reply.kind === 'report') {
    return (
      <Card className="animate-scale-in overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-5 text-white">
          <FileWarning className="size-9" />
          <div>
            <p className="text-xl font-bold tracking-wide">REPORT RECEIVED</p>
            <p className="text-sm text-brand-100">Reference {reply.data.reference} — now visible in Counterfeit Reports</p>
          </div>
        </div>
        <p className="px-6 py-5 text-sm text-slate-600">{reply.data.replyText}</p>
      </Card>
    );
  }

  if (reply.kind === 'help') {
    return (
      <Card className="flex animate-scale-in items-start gap-4 p-6">
        <HelpCircle className="size-8 shrink-0 text-slate-400" />
        <div>
          <p className="font-semibold text-slate-900">Message not recognised</p>
          <p className="mt-1 text-sm text-slate-500">{reply.replyText}</p>
        </div>
      </Card>
    );
  }

  const d = reply.data;
  const s = RESULT_STYLES[d.result]!;
  return (
    <Card key={d.timestamp} className="animate-scale-in overflow-hidden">
      <div className={cn('relative flex items-center gap-4 overflow-hidden bg-gradient-to-r px-6 py-5 text-white', s.className)}>
        <div className="absolute -right-6 -bottom-10 opacity-15">
          <s.icon className="size-40" />
        </div>
        <span className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-lg">
          <s.icon className={cn('size-8', s.iconClass)} />
        </span>
        <div className="relative">
          <p className="text-2xl font-bold tracking-wider">{s.title}</p>
          <p className="text-sm text-white/85">{s.subtitle}</p>
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-2">
        {d.product ? (
          <>
            <Detail label="Product" value={d.product.name} />
            <Detail label="Manufacturer" value={d.manufacturer} />
            <Detail label="Batch" value={d.batchNumber} />
            <Detail label="Expiry" value={d.expiryDate ? formatDate(d.expiryDate) : undefined} />
          </>
        ) : (
          <Detail label="Product" value="Not found in the registry" />
        )}
        <Detail label="Code" value={<span className="font-mono">{formatCode(d.code)}</span>} />
        <Detail
          label="Times checked"
          value={
            <span className={cn(d.result === 'suspicious' && 'font-semibold text-amber-700')}>
              {d.verificationCount} {d.verificationCount === 1 ? 'time' : 'times'}
            </span>
          }
        />
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 text-xs text-slate-500">
        Logged from {d.location} at {formatTime(d.timestamp)} — this check now appears in the verification logs.
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

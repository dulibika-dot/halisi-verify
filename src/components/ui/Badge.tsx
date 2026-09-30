import type { ReactNode } from 'react';
import {
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock,
  PackageX,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet' | 'teal';

const tones: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  teal: 'bg-brand-50 text-brand-700 ring-brand-600/15',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'slate', icon: Icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

/** One place that decides how every status in the system looks (colour + icon + label). */
const STATUS: Record<string, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  // verification results
  verified: { label: 'Verified', tone: 'green', icon: ShieldCheck },
  suspicious: { label: 'Suspicious', tone: 'amber', icon: TriangleAlert },
  invalid: { label: 'Invalid', tone: 'red', icon: XCircle },
  deactivated: { label: 'Deactivated', tone: 'slate', icon: Ban },
  // report workflow
  pending: { label: 'Pending', tone: 'amber', icon: Clock },
  investigating: { label: 'Investigating', tone: 'blue', icon: Search },
  confirmed: { label: 'Confirmed fake', tone: 'red', icon: ShieldAlert },
  resolved: { label: 'Resolved', tone: 'green', icon: CheckCircle2 },
  // manufacturers / batches / codes
  active: { label: 'Active', tone: 'green', icon: CheckCircle2 },
  suspended: { label: 'Suspended', tone: 'red', icon: Ban },
  recalled: { label: 'Recalled', tone: 'red', icon: PackageX },
  expired: { label: 'Expired', tone: 'slate', icon: Clock },
  discontinued: { label: 'Discontinued', tone: 'slate', icon: Ban },
  generated: { label: 'Generated', tone: 'teal', icon: CheckCircle2 },
  generating: { label: 'Generating', tone: 'blue', icon: CircleDashed },
  // suspicious-code workflow
  normal: { label: 'Normal', tone: 'slate', icon: CheckCircle2 },
  blocked: { label: 'Blocked', tone: 'red', icon: Ban },
  // risk levels
  high: { label: 'High risk', tone: 'red', icon: ShieldAlert },
  medium: { label: 'Medium risk', tone: 'amber', icon: TriangleAlert },
  low: { label: 'Low risk', tone: 'slate', icon: ShieldCheck },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'slate' as const, icon: CircleDashed };
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {s.label}
    </Badge>
  );
}

import { ShieldCheck } from 'lucide-react';
import { USE_MOCK_API } from '../../services/config';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';

export function Logo({ light, compact, className }: { light?: boolean; compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-900/30">
        <ShieldCheck className="size-5 text-white" strokeWidth={2.2} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className={cn('text-[15px] font-bold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
            Halisi<span className="text-brand-400"> Verify</span>
          </p>
          <p className={cn('text-[10px] font-medium tracking-widest uppercase', light ? 'text-slate-400' : 'text-slate-500')}>
            Anti-counterfeit
          </p>
        </div>
      )}
    </div>
  );
}

const avatarColors = ['bg-brand-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-600', 'bg-indigo-600'];

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const color = avatarColors[name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length];
  const sizes = { sm: 'size-8 text-xs', md: 'size-9 text-xs', lg: 'size-14 text-lg' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', color, sizes[size], className)}>
      {initials(name)}
    </span>
  );
}

/** Top-bar pill: "Prototype · mock data" in mock mode, "Live data" when connected to Supabase */
export function DataModePill({ className }: { className?: string }) {
  if (USE_MOCK_API) return <DemoPill className={className} label="Prototype · mock data" />;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800',
        className,
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
      Live data
    </span>
  );
}

/** Pill that reminds viewers the numbers are mock data */
export function DemoPill({ className, label = 'Demo data' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-amber-500" />
      {label}
    </span>
  );
}

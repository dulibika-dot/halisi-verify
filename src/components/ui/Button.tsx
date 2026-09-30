import type { ButtonHTMLAttributes } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700 focus-visible:ring-brand-500/40',
  secondary:
    'bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400/30',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400/30',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500/40',
  dark: 'bg-ink-900 text-white shadow-sm hover:bg-ink-800 focus-visible:ring-slate-500/40',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 focus-visible:ring-4 focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className={cn(iconSize, 'animate-spin')} /> : Icon && <Icon className={iconSize} />}
      {children}
      {IconRight && !loading && <IconRight className={iconSize} />}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'danger';
}

/** Small square icon button used for table row actions */
export function IconButton({ icon: Icon, label, tone = 'default', className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition focus-visible:ring-4 focus-visible:ring-slate-300/40 focus-visible:outline-none disabled:opacity-40',
        tone === 'danger' ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-900',
        className,
      )}
      {...props}
    >
      <Icon className="size-4" />
    </button>
  );
}

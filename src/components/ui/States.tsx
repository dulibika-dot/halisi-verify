import type { ReactNode } from 'react';
import { CloudOff, Inbox, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/50 blur-xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
          <Icon className="size-6" />
        </div>
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <CloudOff className="size-6" />
      </div>
      <p className="text-sm font-semibold text-slate-900">Couldn't load this data</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCw} className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

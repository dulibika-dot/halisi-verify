import { useId, type InputHTMLAttributes, type Ref, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

const fieldBase =
  'w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500';
const fieldState = (error?: string) =>
  error
    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/15'
    : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/15';

interface FieldWrapperProps {
  id: string;
  label?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldWrapper({ id, label, error, hint, required, children, className }: FieldWrapperProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
  label?: string;
  error?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  wrapperClassName?: string;
}

export function Input({ label, error, hint, icon: Icon, trailing, wrapperClassName, className, id, required, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(fieldBase, fieldState(error), 'h-11 px-3.5', Icon && 'pl-10', !!trailing && 'pr-11', className)}
          {...props}
        />
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  wrapperClassName?: string;
}

export function Select({ label, error, hint, options, placeholder, wrapperClassName, className, id, required, ...props }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldWrapper id={selectId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          className={cn(fieldBase, fieldState(error), 'h-11 appearance-none pr-10 pl-3.5', className)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" />
      </div>
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function Textarea({ label, error, hint, wrapperClassName, className, id, required, ...props }: TextareaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <FieldWrapper id={areaId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <textarea id={areaId} aria-invalid={!!error} className={cn(fieldBase, fieldState(error), 'min-h-24 px-3.5 py-2.5', className)} {...props} />
    </FieldWrapper>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition focus-visible:ring-4 focus-visible:ring-brand-500/25 focus-visible:outline-none',
          checked ? 'bg-brand-600' : 'bg-slate-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}

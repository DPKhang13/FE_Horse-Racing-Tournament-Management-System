import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trophy,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type Tone = 'emerald' | 'gold' | 'red' | 'slate' | 'blue' | 'violet';

const toneClasses: Record<Tone, { badge: string; icon: string; dot: string }> = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    icon: 'bg-emerald-50 text-emerald-600',
    dot: 'bg-emerald-500',
  },
  gold: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    icon: 'bg-amber-50 text-amber-600',
    dot: 'bg-amber-500',
  },
  red: {
    badge: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    icon: 'bg-rose-50 text-rose-600',
    dot: 'bg-rose-500',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    icon: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
  blue: {
    badge: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    icon: 'bg-sky-50 text-sky-600',
    dot: 'bg-sky-500',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    icon: 'bg-violet-50 text-violet-600',
    dot: 'bg-violet-500',
  },
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'subtle';

export const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  loading,
  className,
  disabled,
  ...props
}: {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'border border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700',
    secondary: 'border border-line-strong bg-white text-ink hover:bg-slate-50',
    ghost: 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-ink',
    danger: 'border border-rose-600 bg-rose-600 text-white hover:bg-rose-700',
    gold: 'border border-amber-500 bg-amber-500 text-white hover:bg-amber-600',
    subtle: 'border border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200',
  };
  const sizes = {
    sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
    md: 'h-10 gap-2 rounded-md px-4 text-sm',
    lg: 'h-11 gap-2 rounded-md px-5 text-sm',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : LeadingIcon ? <LeadingIcon className="h-4 w-4" /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon className="h-4 w-4" /> : null}
    </button>
  );
};

export const IconButton = ({
  icon: Icon,
  label,
  className,
  ...props
}: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
      className,
    )}
    {...props}
  >
    <Icon className="h-[18px] w-[18px]" />
  </button>
);

export const Card = ({
  children,
  className,
  hover,
}: { children: ReactNode; className?: string; hover?: boolean }) => (
  <div
    className={cn(
      'rounded-lg border border-line bg-white',
      hover && 'transition-shadow hover:shadow-md hover:shadow-slate-200/60',
      className,
    )}
  >
    {children}
  </div>
);

export const Badge = ({
  children,
  tone = 'slate',
  dot,
  className,
}: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
      toneClasses[tone].badge,
      className,
    )}
  >
    {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', toneClasses[tone].dot)} /> : null}
    {children}
  </span>
);

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  tone = 'slate',
  detail,
  className,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  detail?: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none text-ink tabular-nums">{value}</p>
        {detail ? <div className="mt-2 text-xs text-slate-500">{detail}</div> : null}
      </div>
      {Icon ? (
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', toneClasses[tone].icon)}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-lg border border-line bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-md hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return <Card className={cn('p-4', className)}>{content}</Card>;
};

export const Field = ({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <label className={cn('block', className)}>
    {label ? (
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
        {label}{required ? <span className="text-rose-500">*</span> : null}
      </span>
    ) : null}
    {children}
    {hint && !error ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    {error ? (
      <span className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600">
        <AlertCircle className="h-3.5 w-3.5" />{error}
      </span>
    ) : null}
  </label>
);

const inputClassName = 'w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400';

export const TextInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(inputClassName, 'h-10', className)} {...props} />
);

export const TextArea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(inputClassName, 'min-h-24 resize-y py-2.5', className)} {...props} />
);

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-[2px]" role="presentation" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-modal-title"
        className={cn('animate-pop mx-auto overflow-hidden rounded-lg border border-line bg-white shadow-2xl shadow-slate-950/20', sizes[size])}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="shared-modal-title" className="text-base font-bold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="p-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
};

export const EmptyState = ({
  title,
  detail,
  action,
}: { title: string; detail?: string; action?: ReactNode }) => (
  <div className="rounded-lg border border-dashed border-line-strong bg-slate-50 px-5 py-10 text-center">
    <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
    <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
    {detail ? <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{detail}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const AppLogo = ({
  dark = false,
  compact = false,
}: { dark?: boolean; compact?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/25">
      <Trophy className="h-[18px] w-[18px]" />
    </span>
    {!compact ? (
      <span className="leading-none">
        <span className={cn('block text-base font-extrabold', dark ? 'text-white' : 'text-ink')}>HTMS</span>
        <span className={cn('mt-1 block text-[10px] font-semibold uppercase', dark ? 'text-slate-400' : 'text-slate-500')}>
          Pro Manager
        </span>
      </span>
    ) : null}
  </span>
);

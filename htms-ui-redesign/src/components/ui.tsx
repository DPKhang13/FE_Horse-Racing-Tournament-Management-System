import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import type { Status } from "@/lib/types";
import { ROLE_META, STATUS_META, type Tone } from "@/lib/data";

/* ------------------------------------------------------------------ */
/*  Icon registry                                                      */
/* ------------------------------------------------------------------ */
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ArrowUpDown,
  Award, Ban, BarChart3, Bell, Calendar, CalendarClock, CalendarDays,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CircleAlert, ClipboardList, ClipboardPlus, Clock, Coins,
  Cookie, Copy, CreditCard, Crown, Download, Eye, Filter, Flag, Gauge,
  Hash, Home, Inbox, Info, Layers, LayoutDashboard, ListOrdered, Loader2,
  LogOut, Mail, MapPin, Medal, Menu, MoreHorizontal, Phone, Play, Plus,
  QrCode, Radio, RefreshCw, Save, Search, Send, Settings, Shield, SlidersHorizontal,
  Star, Stamp, StopCircle, Target, Timer, Trash2, TrendingDown, TrendingUp,
  Trophy, UserCheck, UserCircle, UserPlus, UserRound, Users, UsersRound,
  Wallet, X, XCircle, Image, LogIn, Sparkles, type LucideProps,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ArrowUpDown,
  Award, Ban, BarChart3, Bell, Calendar, CalendarClock, CalendarDays,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CircleAlert, ClipboardList, ClipboardPlus, Clock, Coins,
  Cookie, Copy, CreditCard, Crown, Download, Eye, Filter, Flag, Gauge,
  Hash, Home, Inbox, Info, Layers, LayoutDashboard, ListOrdered, Loader2,
  LogOut, Mail, MapPin, Medal, Menu, MoreHorizontal, Phone, Play, Plus,
  QrCode, Radio, RefreshCw, Save, Search, Send, Settings, Shield, SlidersHorizontal,
  Star, Stamp, StopCircle, Target, Timer, Trash2, TrendingDown, TrendingUp,
  Trophy, UserCheck, UserCircle, UserPlus, UserRound, Users, UsersRound,
  Wallet, X, XCircle, Image, LogIn, Sparkles,
};

export function Icon({
  name,
  className,
  size = 18,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name] ?? CircleAlert;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} />;
}

/* ------------------------------------------------------------------ */
/*  Tone palette                                                       */
/* ------------------------------------------------------------------ */
export const TONE: Record<Tone, { text: string; bg: string; dot: string; ring: string; solid: string }> = {
  emerald: { text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500", ring: "ring-emerald-600/20", solid: "bg-emerald-600" },
  gold: { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", ring: "ring-amber-600/20", solid: "bg-amber-500" },
  red: { text: "text-rose-700", bg: "bg-rose-50", dot: "bg-rose-500", ring: "ring-rose-600/20", solid: "bg-rose-600" },
  slate: { text: "text-slate-600", bg: "bg-slate-100", dot: "bg-slate-400", ring: "ring-slate-500/20", solid: "bg-slate-600" },
  blue: { text: "text-sky-700", bg: "bg-sky-50", dot: "bg-sky-500", ring: "ring-sky-600/20", solid: "bg-sky-600" },
  violet: { text: "text-violet-700", bg: "bg-violet-50", dot: "bg-violet-500", ring: "ring-violet-600/20", solid: "bg-violet-600" },
};

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "subtle";
export function Button({
  children, variant = "secondary", size = "md", icon, iconRight, className, loading, ...rest
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<BtnVariant, string> = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20",
    gold: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20",
    secondary: "bg-white text-ink border border-line-strong hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-lg",
    lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variants[variant], sizes[size], className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" size={size === "sm" ? 15 : 17} /> : icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 15 : 17} />}
    </button>
  );
}

export function IconButton({
  name, label, onClick, tone = "slate", size = "md", active, className,
}: {
  name: string; label: string; onClick?: () => void;
  tone?: "slate" | "emerald" | "red" | "gold" | "blue"; size?: "sm" | "md"; active?: boolean; className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    emerald: "text-emerald-600 hover:bg-emerald-50",
    red: "text-rose-600 hover:bg-rose-50",
    gold: "text-amber-600 hover:bg-amber-50",
    blue: "text-sky-600 hover:bg-sky-50",
  };
  const sz = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      title={label} aria-label={label} onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        tones[tone], sz,
        active && "bg-slate-100 text-slate-800 ring-1 ring-line-strong", className
      )}
    >
      <Icon name={name} size={17} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Card + Section                                                     */
/* ------------------------------------------------------------------ */
export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border border-line bg-white",
      hover && "transition-shadow hover:shadow-md hover:shadow-slate-200/60",
      className
    )}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub, action, icon }: { title: string; sub?: string; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Icon name={icon} size={17} />
          </span>
        )}
        <div>
          <h3 className="text-[15px] font-semibold leading-tight text-ink">{title}</h3>
          {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge / StatusChip / RoleBadge                                     */
/* ------------------------------------------------------------------ */
export function Badge({ children, tone = "slate", dot, className }: { children: ReactNode; tone?: Tone; dot?: boolean; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset", t.text, t.bg, t.ring, className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot, tone === "emerald" && "live-dot")} />}
      {children}
    </span>
  );
}

export function StatusChip({ status, className }: { status: Status | string; className?: string }) {
  const meta = STATUS_META[status] ?? { tone: "slate" as Tone, label: status };
  return <Badge tone={meta.tone} dot className={className}>{meta.label}</Badge>;
}

export function RoleBadge({ role, className }: { role: keyof typeof ROLE_META; className?: string }) {
  const m = ROLE_META[role];
  return (
    <Badge tone={m.tone} className={className}>
      <Icon name={m.icon} size={12} />
      {m.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar                                                             */
/* ------------------------------------------------------------------ */
export function Avatar({ name, src, size = 36, tone = "slate", className }: { name: string; src?: string; size?: number; tone?: Tone; className?: string }) {
  const inits = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const tones: Record<Tone, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    gold: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    slate: "bg-slate-200 text-slate-600",
    blue: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size }} className={cn("rounded-full object-cover ring-2 ring-white", className)} />;
  }
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }} className={cn("inline-grid place-items-center rounded-full font-bold", tones[tone], className)}>
      {inits}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  MetricCard                                                         */
/* ------------------------------------------------------------------ */
export function MetricCard({
  label, value, delta, deltaTone, icon, tone = "slate", sub, className,
}: {
  label: string; value: ReactNode; delta?: string; deltaTone?: "up" | "down" | "flat";
  icon?: string; tone?: Tone; sub?: string; className?: string;
}) {
  const t = TONE[tone];
  const deltaCls = deltaTone === "up" ? "text-emerald-600" : deltaTone === "down" ? "text-rose-600" : "text-slate-500";
  const deltaIcon = deltaTone === "up" ? "TrendingUp" : deltaTone === "down" ? "TrendingDown" : "Activity";
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-ink tnum">{value}</p>
          {sub && <p className="mt-1.5 text-[12px] text-slate-400">{sub}</p>}
          {delta && (
            <p className={cn("mt-2 inline-flex items-center gap-1 text-[12px] font-semibold", deltaCls)}>
              <Icon name={deltaIcon} size={13} /> {delta}
            </p>
          )}
        </div>
        {icon && (
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", t.bg, t.text)}>
            <Icon name={icon} size={20} />
          </span>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Form fields                                                        */
/* ------------------------------------------------------------------ */
export function Field({ label, hint, error, required, children, className }: { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-slate-700">
          {label}{required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-slate-400">{hint}</span>}
      {error && <span className="mt-1 flex items-center gap-1 text-[12px] font-medium text-rose-600"><CircleAlert size={13} />{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-400";

export function TextInput({ icon, className, ...rest }: { icon?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      {icon && <Icon name={icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input className={cn(inputBase, "h-10", icon && "pl-9", className)} {...rest} />
    </div>
  );
}

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "py-2.5 min-h-[88px] resize-y", className)} {...rest} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", checked ? "bg-emerald-600" : "bg-slate-300")}
      aria-pressed={checked}
    >
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SearchInput                                                        */
/* ------------------------------------------------------------------ */
export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="Search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, "h-10 pl-9 pr-8")}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Select (custom dropdown)                                           */
/* ------------------------------------------------------------------ */
export type Option = { value: string; label: string; tone?: Tone };
function useClickOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOut]);
  return ref;
}

export function Select({
  value, onChange, options, placeholder = "Select…", icon, className, trigger = "field",
}: {
  value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string;
  icon?: string; className?: string; trigger?: "field" | "bare";
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const selected = options.find((o) => o.value === value);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className={cn(
          trigger === "field"
            ? cn(inputBase, "flex h-10 items-center justify-between gap-2 pr-2 text-left", icon && "pl-9")
            : "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        )}
      >
        {trigger === "field" && icon && <Icon name={icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        <span className={cn("truncate", !selected && "text-slate-400")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 max-h-64 w-full min-w-[12rem] animate-pop overflow-auto rounded-xl border border-line bg-white p-1 shadow-xl shadow-slate-300/40">
          {options.map((o) => (
            <button
              key={o.value} type="button" onClick={() => { onChange(o.value); close(); }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                o.value === value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center gap-2">
                {o.tone && <span className={cn("h-1.5 w-1.5 rounded-full", TONE[o.tone].dot)} />}
                {o.label}
              </span>
              {o.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs / Segmented                                                   */
/* ------------------------------------------------------------------ */
export function Tabs({ tabs, value, onChange, className, size = "md" }: { tabs: { value: string; label: string; icon?: string; badge?: number }[]; value: string; onChange: (v: string) => void; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-line bg-slate-100/70 p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.value} onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all",
            size === "sm" ? "px-2.5 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm",
            value === t.value ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.badge != null && <span className={cn("ml-0.5 rounded-full px-1.5 text-[11px] font-bold tnum", value === t.value ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal & Drawer                                                     */
/* ------------------------------------------------------------------ */
export function Modal({ open, onClose, title, sub, icon, children, footer, size = "md", tone = "slate" }: {
  open: boolean; onClose: () => void; title?: ReactNode; sub?: ReactNode; icon?: string;
  children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl"; tone?: Tone;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  const t = TONE[tone];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cn("relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-pop sm:rounded-2xl", sizes[size])}>
        {(title || icon) && (
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              {icon && <span className={cn("grid h-9 w-9 place-items-center rounded-xl", t.bg, t.text)}><Icon name={icon} size={18} /></span>}
              <div>
                <h3 className="text-[15px] font-bold leading-tight text-ink">{title}</h3>
                {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
              </div>
            </div>
            <IconButton name="X" label="Close" onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, sub, icon, children, footer, width = "md", tone = "slate" }: {
  open: boolean; onClose: () => void; title?: ReactNode; sub?: ReactNode; icon?: string;
  children: ReactNode; footer?: ReactNode; width?: "md" | "lg"; tone?: Tone;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const t = TONE[tone];
  const w = width === "lg" ? "sm:max-w-2xl" : "sm:max-w-md";
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className={cn("absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl animate-drawer", w)}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            {icon && <span className={cn("grid h-9 w-9 place-items-center rounded-xl", t.bg, t.text)}><Icon name={icon} size={18} /></span>}
            <div>
              <h3 className="text-[15px] font-bold leading-tight text-ink">{title}</h3>
              {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
            </div>
          </div>
          <IconButton name="X" label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmationDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", tone = "danger", icon = "AlertTriangle", detail }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode;
  confirmLabel?: string; tone?: "danger" | "primary" | "gold"; icon?: string; detail?: ReactNode;
}) {
  const variant = tone === "danger" ? "danger" : tone === "gold" ? "gold" : "primary";
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={icon} tone={tone === "danger" ? "red" : tone === "gold" ? "gold" : "emerald"} title={title}>
      <div className="space-y-3">
        <p className="text-[13px] leading-relaxed text-slate-600">{message}</p>
        {detail}
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} icon="Check" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  States                                                             */
/* ------------------------------------------------------------------ */
export function EmptyState({ icon = "Inbox", title, sub, action, className }: { icon?: string; title: string; sub?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name={icon} size={26} /></span>
      <h4 className="mt-4 text-sm font-semibold text-ink">{title}</h4>
      {sub && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="shimmer h-9 w-9 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3 w-1/3 rounded bg-slate-100" />
            <div className="shimmer h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ onRetry, message = "Something went wrong loading this data.", className }: { onRetry?: () => void; message?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><Icon name="CircleAlert" size={26} /></span>
      <h4 className="mt-4 text-sm font-semibold text-ink">Couldn’t load data</h4>
      <p className="mt-1 max-w-sm text-[13px] text-slate-500">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" icon="RefreshCw" className="mt-4" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-emerald-600", className)} />;
}

/* ------------------------------------------------------------------ */
/*  ProgressBar                                                        */
/* ------------------------------------------------------------------ */
export function ProgressBar({ value, tone = "emerald", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-150 bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", TONE[tone].solid)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DataTable                                                          */
/* ------------------------------------------------------------------ */
export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  render?: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, mobileCards, empty, loading, error, onRetry,
  pageSize, initialSort, className, dense,
}: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string;
  onRowClick?: (row: T) => void; mobileCards?: (row: T, index: number) => ReactNode;
  empty?: ReactNode; loading?: boolean; error?: boolean; onRetry?: () => void;
  pageSize?: number; initialSort?: { key: string; dir: "asc" | "desc" };
  className?: string; dense?: boolean;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const arr = [...rows].sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, columns]);

  const psize = pageSize ?? 0;
  const pageCount = psize ? Math.max(1, Math.ceil(sorted.length / psize)) : 1;
  const cur = Math.min(page, pageCount);
  const pageRows = psize ? sorted.slice((cur - 1) * psize, cur * psize) : sorted;

  useEffect(() => { setPage(1); }, [rows.length, sort?.key, sort?.dir]);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((s) => s?.key === col.key ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: "asc" });
  };

  const alignCls = (a?: string) => a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className={cn("overflow-hidden", className)}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50/80">
              {columns.map((c) => (
                <th
                  key={c.key} style={{ width: c.width }}
                  className={cn("px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500", alignCls(c.align))}
                >
                  {c.sortValue ? (
                    <button onClick={() => toggleSort(c)} className={cn("inline-flex items-center gap-1 hover:text-slate-700", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      <ArrowUpDown size={12} className={cn(sort?.key === c.key ? "text-emerald-600" : "text-slate-300")} />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-line last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50/70"
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 text-slate-700", dense ? "py-2" : "py-3", alignCls(c.align), c.className)}>
                    {c.render ? c.render(row, i) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      {mobileCards && (
        <div className="space-y-2.5 md:hidden">
          {pageRows.map((row, i) => (
            <button key={rowKey(row)} onClick={() => onRowClick?.(row)} className="block w-full text-left">
              {mobileCards(row, i)}
            </button>
          ))}
        </div>
      )}

      {/* body states */}
      {loading && <LoadingState />}
      {error && <ErrorState onRetry={onRetry} />}
      {!loading && !error && rows.length === 0 && (empty ?? <EmptyState icon="Inbox" title="No records found" sub="Try adjusting your filters or search." />)}

      {/* pagination */}
      {psize > 0 && sorted.length > psize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[13px] text-slate-500">
            Showing <span className="font-semibold text-ink tnum">{(cur - 1) * psize + 1}</span>–<span className="font-semibold text-ink tnum">{Math.min(cur * psize, sorted.length)}</span> of <span className="font-semibold text-ink tnum">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <IconButton name="ChevronLeft" label="Previous" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} />
            <span className="px-2 text-[13px] font-semibold text-slate-600 tnum">{cur} / {pageCount}</span>
            <IconButton name="ChevronRight" label="Next" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2.5", className)}>{children}</div>;
}

export function Stat({ label, value, tone = "slate", className }: { label: string; value: ReactNode; tone?: Tone; className?: string }) {
  const t = TONE[tone];
  return (
    <div className={cn("rounded-lg border border-line bg-white px-3 py-2", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tnum", t.text)}>{value}</p>
    </div>
  );
}

export function KeyValue({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[13px] text-slate-500">{k}</span>
      <span className={cn("text-[13px] font-semibold text-ink text-right", mono && "mono tnum")}>{v}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast system                                                       */
/* ------------------------------------------------------------------ */
type Toast = { id: number; tone: Tone; title: string; desc?: string };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const tn = TONE[t.tone];
          const ic = t.tone === "red" ? "XCircle" : t.tone === "emerald" ? "CheckCircle2" : t.tone === "gold" ? "Award" : "Info";
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-lg shadow-slate-300/50 animate-slide">
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", tn.bg, tn.text)}><Icon name={ic} size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">{t.title}</p>
                {t.desc && <p className="text-[12px] text-slate-500">{t.desc}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

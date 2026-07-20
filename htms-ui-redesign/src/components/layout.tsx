import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { NAV, PAGE_TITLES } from "@/lib/nav";
import { CURRENT, ROLE_META } from "@/lib/data";
import type { Role } from "@/lib/types";
import { Avatar, Badge, Icon, IconButton, TONE } from "./ui";
import type { Tone } from "@/lib/data";

/* ------------------------------- Logo ------------------------------- */
export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
          <path d="M19 4.5c-.4 0-.8.1-1.1.3-.6-1-1.7-1.6-2.9-1.6-1 0-1.9.4-2.5 1.1-.3-.1-.6-.2-1-.2-.8 0-1.5.4-2 1L8 7.2c-.5.6-.7 1.4-.5 2.2l-3.3 3.6c-.5.6-.5 1.5 0 2l1.4 1.4c.4.4 1.1.5 1.6.1l1-.7.6 3.4c.1.5.5.8 1 .8h2.1c.6 0 1.1-.5 1-1.1l-.5-3.1c1.3-.2 2.4-1 3-2.2.2 0 .4.1.6.1 1.4 0 2.5-1.1 2.5-2.5V7c0-1.4-1.1-2.5-2.5-2.5z" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="text-[15px] font-extrabold tracking-tight text-white">HTMS</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Racing Console</p>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Sidebar nav ---------------------------- */
function SidebarNav({
  role, page, onNavigate,
}: { role: Role; page: string; onNavigate: (p: string) => void }) {
  const groups = NAV[role];
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const active = page === item.id || (item.id === "dashboard" && page === "");
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                    active ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  )}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" />}
                  <Icon name={item.icon} size={18} className={active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge != null && (
                    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tnum", active ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-200")}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ role }: { role: Role }) {
  const u = CURRENT[role];
  return (
    <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3.5">
      <Avatar name={u.name} size={36} tone={ROLE_META[role].tone as Tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">{u.name}</p>
        <p className="truncate text-[11px] text-slate-400">{ROLE_META[role].label}</p>
      </div>
      <span className={cn("h-2 w-2 rounded-full bg-emerald-400 live-dot")} title="Online" />
    </div>
  );
}

/* ----------------------------- Topbar ------------------------------- */
function useOutside<T extends HTMLElement>(cb: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [cb]);
  return ref;
}

function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  const m = ROLE_META[role];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        title="Preview role"
      >
        <Icon name={m.icon} size={15} className={TONE[m.tone as Tone].text} />
        <span className="hidden sm:inline">{m.label}</span>
        <Icon name="ChevronDown" size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 animate-pop rounded-xl border border-line bg-white p-1.5 shadow-xl shadow-slate-300/50">
          <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Preview as role</p>
          {(Object.keys(ROLE_META) as Role[]).map((r) => {
            const rm = ROLE_META[r];
            return (
              <button
                key={r} onClick={() => { onChange(r); setOpen(false); }}
                className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors", role === r ? "bg-slate-100" : "hover:bg-slate-50")}
              >
                <span className={cn("grid h-8 w-8 place-items-center rounded-lg", TONE[rm.tone as Tone].bg, TONE[rm.tone as Tone].text)}><Icon name={rm.icon} size={16} /></span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{rm.label}</span>
                  <span className="block text-[12px] text-slate-500">{rm.blurb}</span>
                </span>
                {role === r && <Icon name="Check" size={16} className="text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ role, onNavigate, onExit }: { role: Role; onNavigate: (p: string) => void; onExit: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  const u = CURRENT[role];
  const items = [
    { label: "My Profile", icon: "UserCircle", page: "profile" },
    { label: "Notifications", icon: "Bell", page: "notifications" },
  ];
  if (role === "spectator" || role === "owner" || role === "jockey") items.push({ label: "Wallet", icon: "Wallet", page: "wallet" });
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-0.5 pr-1 hover:bg-slate-100">
        <Avatar name={u.name} size={34} tone={ROLE_META[role].tone as Tone} />
        <Icon name="ChevronDown" size={15} className="hidden text-slate-400 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 animate-pop overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-slate-300/50">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={u.name} size={40} tone={ROLE_META[role].tone as Tone} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{u.name}</p>
              <p className="truncate text-[12px] text-slate-500">{u.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            {items.map((it) => (
              <button key={it.page} onClick={() => { onNavigate(it.page); setOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                <Icon name={it.icon} size={16} className="text-slate-400" /> {it.label}
              </button>
            ))}
            <div className="my-1.5 h-px bg-line" />
            <button onClick={onExit} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50">
              <Icon name="LogOut" size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsBell({ onNavigate, count = 3 }: { onNavigate: (p: string) => void; count?: number }) {
  return (
    <button onClick={() => onNavigate("notifications")} className="relative grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700" title="Notifications">
      <Icon name="Bell" size={18} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{count}</span>}
    </button>
  );
}

/* ----------------------------- App Shell ---------------------------- */
export function AppShell({
  role, page, onNavigate, onSwitchRole, onExit, children,
}: {
  role: Role; page: string; onNavigate: (p: string) => void;
  onSwitchRole: (r: Role) => void; onExit: () => void; children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const meta = PAGE_TITLES[page] ?? { title: "Dashboard", sub: "" };
  const flat = NAV[role].flatMap((g) => g.items);
  const bottomItems = flat.slice(0, 4);
  const hasMore = flat.length > 4;

  useEffect(() => { setDrawer(false); }, [page, role]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-panel lg:flex">
        <div className="flex h-16 items-center px-5">
          <button onClick={onExit}><Logo /></button>
        </div>
        <SidebarNav role={role} page={page} onNavigate={onNavigate} />
        <UserBlock role={role} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col bg-panel animate-drawer">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <IconButton name="X" label="Close" onClick={() => setDrawer(false)} className="text-slate-400 hover:bg-white/10" />
            </div>
            <SidebarNav role={role} page={page} onNavigate={onNavigate} />
            <UserBlock role={role} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong text-slate-600 lg:hidden" aria-label="Open menu">
            <Icon name="Menu" size={18} />
          </button>
          <div className="min-w-0 flex-1 items-center">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-bold text-ink">HTMS</span>
              <Icon name="ChevronRight" size={14} className="text-slate-300" />
              <Badge tone={ROLE_META[role].tone as Tone}>{ROLE_META[role].label}</Badge>
              <Icon name="ChevronRight" size={14} className="hidden text-slate-300 sm:block" />
              <span className="hidden truncate font-medium text-slate-500 sm:block">{meta.title}</span>
            </div>
          </div>

          <div className="hidden items-center md:flex">
            <div className="relative">
              <Icon name="Search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search races, horses…" className="h-9 w-56 rounded-lg border border-line-strong bg-slate-50 pl-9 pr-3 text-[13px] text-ink placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
          </div>
          <NotificationsBell onNavigate={onNavigate} />
          <RoleSwitcher role={role} onChange={onSwitchRole} />
          <ProfileMenu role={role} onNavigate={onNavigate} onExit={onExit} />
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-line bg-white/95 backdrop-blur lg:hidden">
        {bottomItems.map((item) => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={cn("relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold", active ? "text-emerald-600" : "text-slate-400")}>
              {active && <span className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-emerald-500" />}
              <Icon name={item.icon} size={20} />
              <span className="max-w-full truncate px-0.5">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        {hasMore && (
          <button onClick={() => setDrawer(true)} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold text-slate-400">
            <Icon name="Menu" size={20} />
            More
          </button>
        )}
      </nav>
    </div>
  );
}

/* --------------------------- Page Header ---------------------------- */
export function PageHeader({
  title, sub, actions, icon, tone = "emerald", children,
}: { title: string; sub?: string; actions?: ReactNode; icon?: string; tone?: Tone; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", TONE[tone].bg, TONE[tone].text)}>
              <Icon name={icon} size={22} />
            </span>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
            {sub && <p className="text-[13px] text-slate-500">{sub}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}



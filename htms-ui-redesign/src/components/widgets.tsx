import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Badge, Card, Icon, TONE } from "./ui";
import type { Tone } from "@/lib/data";
import { fmtPoints, fmtVND, fmtVNDcompact, fmtDate, fmtTime } from "@/lib/format";
import type { RaceResultRow } from "@/lib/types";

/* ----------------------------- Horse glyph ----------------------------- */
const COAT_RING: Record<string, string> = {
  black: "ring-slate-900/70",
  bay: "ring-amber-800/60",
  chestnut: "ring-amber-700/60",
  grey: "ring-slate-400/70",
};

export function HorseAvatar({ src, color = "bay", size = 40, className }: { src?: string; color?: string; size?: number; className?: string }) {
  return (
    <span className={cn("inline-block overflow-hidden rounded-full ring-2", COAT_RING[color] ?? COAT_RING.bay, className)} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center bg-slate-200 text-slate-500"><Icon name="Cookie" size={size * 0.5} /></span>}
    </span>
  );
}

/* -------------------------------- Podium -------------------------------- */
export function Podium({ rows, compact }: { rows: RaceResultRow[]; compact?: boolean }) {
  const top = [rows[1], rows[0], rows[2]].filter(Boolean) as RaceResultRow[];
  const config = [
    { h: compact ? "h-20" : "h-28", medal: "Medal", tone: "slate" as Tone, ring: "ring-slate-300", glow: "from-slate-100", label: "2nd", pt: "70 pts" },
    { h: compact ? "h-28" : "h-36", medal: "Crown", tone: "gold" as Tone, ring: "ring-amber-300", glow: "from-amber-50", label: "Champion", pt: "100 pts" },
    { h: compact ? "h-16" : "h-24", medal: "Award", tone: "gold" as Tone, ring: "ring-amber-200", glow: "from-orange-50", label: "3rd", pt: "45 pts" },
  ];
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {top.map((r, i) => {
        const c = config[i];
        const isFirst = i === 1;
        return (
          <div key={r.horse} className="flex flex-col items-center text-center">
            <div className={cn("relative", isFirst ? "mb-2" : "mb-1.5")}>
              {isFirst && <Icon name="Crown" size={20} className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-500" />}
              <span className={cn("grid h-12 w-12 place-items-center rounded-xl ring-2", isFirst ? "h-14 w-14" : "h-11 w-11", c.ring, TONE[c.tone].bg, TONE[c.tone].text)}>
                <Icon name={isFirst ? "Trophy" : c.medal} size={isFirst ? 24 : 18} />
              </span>
            </div>
            <p className={cn("truncate font-bold text-ink", isFirst ? "text-sm" : "text-[13px]")}>{r.horse}</p>
            <p className="truncate text-[11px] text-slate-500">{r.jockey}</p>
            <div className={cn("mt-2 flex w-full flex-col items-center justify-start rounded-t-lg border-x border-t border-line bg-gradient-to-b pt-2 text-white", c.h, c.glow)}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold", isFirst ? "bg-amber-500" : i === 0 ? "bg-slate-400" : "bg-amber-700")}>{i === 1 ? 1 : i === 0 ? 2 : 3}</span>
              <span className={cn("mt-1 text-[10px] font-semibold", isFirst ? "text-amber-700" : "text-slate-500")}>{c.pt}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Wallet balance ----------------------------- */
export function WalletBalanceCard({
  balance, pending, onTopUp, small,
}: { balance: number; pending?: number; onTopUp?: () => void; small?: boolean }) {
  return (
    <Card className={cn("relative overflow-hidden border-emerald-200/70 bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white", small && "p-4")}>
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-emerald-50/90">
            <Icon name="Wallet" size={14} /> Racing Wallet
          </span>
          <Icon name="Coins" size={18} className="text-emerald-50/70" />
        </div>
        <p className={cn("mt-3 font-bold tracking-tight tnum", small ? "text-3xl" : "text-4xl")}>{fmtPoints(balance)}</p>
        {pending != null && (
          <p className="mt-1 text-[12px] text-emerald-50/80">
            <span className="inline-flex items-center gap-1"><Icon name="Timer" size={12} /> {fmtPoints(pending)} at stake</span>
          </p>
        )}
        {onTopUp && (
          <button onClick={onTopUp} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-emerald-700 transition-transform hover:scale-[1.02]">
            <Icon name="Plus" size={16} /> Top up
          </button>
        )}
      </div>
    </Card>
  );
}

/* --------------------------- Prediction card ---------------------------- */
export function PredictionCard({
  race, horse, rate, stake, potential, status, onAction, actionLabel = "Predict", compact, disabled,
}: {
  race: string; horse: ReactNode; rate: number; stake?: number; potential?: number;
  status?: string; onAction?: () => void; actionLabel?: string; compact?: boolean; disabled?: boolean;
}) {
  return (
    <Card hover className={cn("flex flex-col p-4", compact && "p-3")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold uppercase tracking-wide text-slate-400">{race}</p>
          <div className="mt-1.5">{horse}</div>
        </div>
        <div className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-right ring-1 ring-amber-600/20">
          <p className="text-[10px] font-semibold uppercase text-amber-700/70">Rate</p>
          <p className="text-lg font-bold leading-none text-amber-700 tnum">{rate.toFixed(2)}×</p>
        </div>
      </div>
      {(stake != null || potential != null) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stake != null && <div className="rounded-lg bg-slate-50 px-2.5 py-1.5"><p className="text-[10px] font-medium uppercase text-slate-400">Your stake</p><p className="text-sm font-bold text-ink tnum">{fmtPoints(stake)}</p></div>}
          {potential != null && <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5"><p className="text-[10px] font-medium uppercase text-emerald-600/70">Potential</p><p className="text-sm font-bold text-emerald-700 tnum">{fmtPoints(potential)}</p></div>}
        </div>
      )}
      {status && <div className="mt-3"><Badge tone={status === "won" ? "emerald" : status === "lost" ? "red" : status === "open" ? "blue" : "slate"} dot>{status === "won" ? "Won" : status === "lost" ? "Lost" : status === "open" ? "Open" : status}</Badge></div>}
      {onAction && (
        <button onClick={onAction} disabled={disabled} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-[13px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
          <Icon name="Target" size={15} /> {actionLabel}
        </button>
      )}
    </Card>
  );
}

/* ----------------------------- Schedule card ---------------------------- */
export function ScheduleCard({
  date, label, gates, races, status, onClick, active,
}: { date: string; label: string; gates: string; races: number; status: string; onClick?: () => void; active?: boolean }) {
  const d = new Date(date);
  return (
    <button onClick={onClick} className={cn("w-full rounded-xl border bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-sm", active ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-line")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{d.toLocaleDateString("en-GB", { weekday: "short" })}</p>
          <p className="text-2xl font-bold leading-none text-ink tnum">{d.getDate()}</p>
          <p className="text-[12px] text-slate-500">{d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
        </div>
        <Badge tone={status === "ongoing" ? "emerald" : status === "completed" ? "slate" : "blue"} dot>{status === "ongoing" ? "Live" : status === "completed" ? "Done" : "Scheduled"}</Badge>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-500">
          <span className="inline-flex items-center gap-1"><Icon name="Flag" size={12} /> {races} races</span>
          <span className="inline-flex items-center gap-1"><Icon name="Clock" size={12} /> {gates}</span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------- Race card ------------------------------ */
export function RaceCard({
  name, number, time, tournament, track, distance, status, onClick, extra,
}: {
  name: string; number: number; time: string; tournament?: string; track: string; distance: number;
  status: string; onClick?: () => void; extra?: ReactNode;
}) {
  const tone: Tone = status === "ongoing" ? "emerald" : status === "completed" ? "slate" : status === "cancelled" ? "red" : "blue";
  return (
    <button onClick={onClick} className="group block w-full rounded-xl border border-line bg-white p-4 text-left transition-all hover:border-emerald-300 hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-[13px] font-bold text-white">R{number}</span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
            <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Icon name="Clock" size={12} /> {fmtTime(time)} {tournament && <>· <span className="truncate">{tournament}</span></>}
            </p>
          </div>
        </div>
        <Badge tone={tone} dot>{status === "ongoing" ? "Live" : status === "completed" ? "Finished" : status === "cancelled" ? "Cancelled" : "Scheduled"}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-2.5 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-1"><Icon name="Gauge" size={12} /> {distance} m</span>
        <span className="inline-flex items-center gap-1"><Icon name="Layers" size={12} /> {track}</span>
        {extra}
      </div>
    </button>
  );
}

/* ------------------------------- Timeline ------------------------------- */
export function TimelineItem({
  dot = "blue", title, meta, body, right, last,
}: { dot?: Tone; title: ReactNode; meta?: ReactNode; body?: ReactNode; right?: ReactNode; last?: boolean }) {
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-line" />}
      <span className={cn("relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white", TONE[dot].solid)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          {right}
        </div>
        {meta && <p className="text-[12px] text-slate-500">{meta}</p>}
        {body && <div className="mt-1.5 text-[13px] text-slate-600">{body}</div>}
      </div>
    </div>
  );
}

/* ------------------------------ Sparkline ------------------------------- */
export function Sparkline({ data, tone = "emerald", className }: { data: number[]; tone?: Tone; className?: string }) {
  const w = 100, h = 30;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={TONE[tone].text} />
    </svg>
  );
}

/* --------------------------- Prize breakdown --------------------------- */
export function PrizeBreakdown({ rows }: { rows: RaceResultRow[] }) {
  return (
    <div className="space-y-1">
      {rows.filter((r) => r.prize > 0).map((r) => (
        <div key={r.pos} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
          <span className="flex items-center gap-2">
            <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold", r.pos === 1 ? "bg-amber-100 text-amber-700" : r.pos === 2 ? "bg-slate-200 text-slate-600" : r.pos === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>{r.pos}</span>
            <span className="text-[13px] font-medium text-ink">{r.horse}</span>
          </span>
          <span className="text-[13px] font-bold text-amber-700 tnum">{fmtVNDcompact(r.prize)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Helpers ------------------------------- */
export function MoneyText({ value, tone = "ink" }: { value: number; tone?: "ink" | "gold" | "emerald" }) {
  const cls = tone === "gold" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-ink";
  return <span className={cn("font-bold tnum", cls)}>{fmtVND(value)}</span>;
}

export function DateRangeFilter({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className="h-10 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] text-ink focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
      <Icon name="ArrowRight" size={14} className="text-slate-400" />
      <input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className="h-10 rounded-lg border border-line-strong bg-white px-2.5 text-[13px] text-ink focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
    </div>
  );
}

export { fmtDate };

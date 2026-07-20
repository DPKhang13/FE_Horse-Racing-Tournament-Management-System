import { cn } from "@/utils/cn";
import { Avatar, Badge, Button, Card, Icon, MetricCard, SectionTitle, StatusChip, TONE } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HorseAvatar, PredictionCard, RaceCard, Sparkline, WalletBalanceCard } from "@/components/widgets";
import {
  invitations, OWNER, predictions, races, registrations, results, tournaments, WALLET, IMG, jockeys,
} from "@/lib/data";
import { fmtDate, fmtPoints, fmtTime, fmtVNDcompact, relativeTime } from "@/lib/format";
import type { ReactNode } from "react";

/* ============================= Admin ============================= */
export function AdminDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const live = races.filter((r) => r.status === "ongoing");
  const upcoming = races.filter((r) => r.status === "scheduled").slice(0, 4);
  const recent = tournaments.slice(0, 5);
  const actions = [
    { icon: "Trophy", tone: "gold", title: "Create tournament", desc: "Set up a new event", page: "tournaments" },
    { icon: "Flag", tone: "blue", title: "Manage races", desc: "Configure race cards", page: "races" },
    { icon: "ClipboardList", tone: "emerald", title: "Review registrations", desc: "4 awaiting approval", page: "registrations" },
  ];
  const feed = [
    { icon: "CheckCircle2", tone: "emerald", text: "Emerald Dasher approved for Emerald Mile", time: "12m ago" },
    { icon: "Radio", tone: "red", text: "Race 1 — Phu Tho Maiden Plate is now LIVE", time: "1h ago" },
    { icon: "UserPlus", tone: "blue", text: "Vo Quoc Hung accepted ride on Midnight Thunder", time: "3h ago" },
    { icon: "Coins", tone: "gold", text: "Bet market opened for Orchard Sprint Stakes", time: "5h ago" },
    { icon: "Trophy", tone: "violet", text: "Opening Cup results published", time: "1d ago" },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Operations Overview" sub="Saigon Grand Prix 2026 · Day 3 of 8" icon="LayoutDashboard"
        actions={<><Button variant="secondary" icon="Download" size="sm">Export</Button><Button variant="primary" icon="Plus" size="sm" onClick={() => onNavigate("tournaments")}>New tournament</Button></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Tournaments" value={tournaments.length} icon="Trophy" tone="violet" delta="+1 this week" deltaTone="up" />
        <MetricCard label="Upcoming" value={tournaments.filter((t) => t.status === "scheduled").length} icon="CalendarDays" tone="blue" />
        <MetricCard label="Ongoing" value={tournaments.filter((t) => t.status === "ongoing").length} icon="Radio" tone="emerald" delta="Live now" deltaTone="up" />
        <MetricCard label="Races today" value={races.filter((r) => r.tournamentId === "t1").length} icon="Flag" tone="gold" />
        <MetricCard label="Participants" value="168" sub="of 200 capacity" icon="UsersRound" tone="slate" delta="84% fill" deltaTone="flat" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Quick actions */}
          <div>
            <SectionTitle title="Quick actions" icon="Activity" />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {actions.map((a) => (
                <button key={a.title} onClick={() => onNavigate(a.page)} className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-left transition-all hover:border-emerald-300 hover:shadow-sm">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", TONE[a.tone as keyof typeof TONE].bg, TONE[a.tone as keyof typeof TONE].text)}><Icon name={a.icon} size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">{a.title}</p>
                    <p className="truncate text-[12px] text-slate-500">{a.desc}</p>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent tournaments */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionTitle title="Recent tournaments" icon="Trophy" />
              <Button variant="ghost" size="sm" iconRight="ArrowRight" onClick={() => onNavigate("tournaments")}>View all</Button>
            </div>
            <div className="divide-y divide-line">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <img src={t.cover} alt="" className="h-10 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{t.name}</p>
                    <p className="truncate text-[12px] text-slate-500">{t.venue} · {fmtDate(t.startDate)}</p>
                  </div>
                  <div className="hidden text-right sm:block"><p className="text-[12px] font-bold text-amber-700 tnum">{fmtVNDcompact(t.prizePool)}</p><p className="text-[11px] text-slate-400">{t.races} races</p></div>
                  <StatusChip status={t.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Live now */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between bg-emerald-50 px-4 py-2.5">
              <span className="inline-flex items-center gap-2 text-[13px] font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500 live-dot" /> Live now</span>
              <span className="text-[12px] font-medium text-emerald-600">{live.length} race(s)</span>
            </div>
            {live.length === 0
              ? <p className="px-4 py-6 text-center text-[13px] text-slate-500">No live races at the moment.</p>
              : live.map((r) => (
                <div key={r.id} className="flex items-center gap-3 border-t border-line px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">R{r.number}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{r.name}</p><p className="text-[12px] text-slate-500">{r.enteredHorses}/{r.maxHorses} runners · {r.distance}m</p></div>
                  <Button variant="subtle" size="sm" onClick={() => onNavigate("race-control")}>Control</Button>
                </div>
              ))}
            <div className="border-t border-line px-4 py-2.5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Up next</p>
              <div className="space-y-1.5">
                {upcoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[12px]">
                    <span className="font-semibold text-slate-500 tnum">{fmtTime(r.scheduledAt)}</span>
                    <span className="truncate text-ink">R{r.number} · {r.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="p-4">
            <SectionTitle title="Activity" icon="Activity" />
            <div className="mt-3 space-y-3">
              {feed.map((f, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg", TONE[f.tone as keyof typeof TONE].bg, TONE[f.tone as keyof typeof TONE].text)}><Icon name={f.icon} size={14} /></span>
                  <div><p className="text-[13px] leading-snug text-ink">{f.text}</p><p className="text-[11px] text-slate-400">{f.time}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================= Owner ============================= */
export function OwnerDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const pendInv = invitations.filter((i) => i.status === "pending");
  const confInv = invitations.filter((i) => i.status === "confirmed");
  const appReg = registrations.filter((r) => r.status === "approved");
  return (
    <div className="space-y-5">
      <PageHeader title="Stable Overview" sub="Red Dragon Stables · Season 2026" icon="Home"
        actions={<><Button variant="secondary" icon="Cookie" size="sm" onClick={() => onNavigate("horses")}>My horses</Button><Button variant="primary" icon="ClipboardPlus" size="sm" onClick={() => onNavigate("entry")}>Enter a race</Button></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Horses" value={OWNER.horses.length} icon="Cookie" tone="emerald" delta={`${OWNER.horses.filter((h) => h.status === "active").length} active`} deltaTone="flat" />
        <MetricCard label="Approved entries" value={appReg.length} icon="CheckCircle2" tone="blue" delta="+2 this week" deltaTone="up" />
        <MetricCard label="Pending invites" value={pendInv.length} icon="UserPlus" tone="gold" delta="Action needed" deltaTone="up" />
        <MetricCard label="Confirmed rides" value={confInv.length} icon="UserCheck" tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stable profile */}
        <Card className="overflow-hidden">
          <div className="relative h-24"><img src={IMG.hBlack} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" /></div>
          <div className="-mt-8 px-4 pb-4">
            <Avatar name="Red Dragon Stables" size={56} tone="emerald" className="ring-4 ring-white" />
            <p className="mt-2 text-[15px] font-bold text-ink">Red Dragon Stables</p>
            <p className="text-[12px] text-slate-500">Owner · Nguyen Van An · License OWN-VN-2201</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 py-2"><p className="text-sm font-bold text-ink tnum">{OWNER.horses.reduce((a, h) => a + h.wins, 0)}</p><p className="text-[10px] uppercase text-slate-400">Wins</p></div>
              <div className="rounded-lg bg-slate-50 py-2"><p className="text-sm font-bold text-ink tnum">{OWNER.horses.reduce((a, h) => a + h.points, 0)}</p><p className="text-[10px] uppercase text-slate-400">Points</p></div>
              <div className="rounded-lg bg-slate-50 py-2"><p className="text-sm font-bold text-emerald-600 tnum">68%</p><p className="text-[10px] uppercase text-slate-400">Active</p></div>
            </div>
          </div>
        </Card>

        {/* Horses mini */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionTitle title="My horses" icon="Cookie" />
            <Button variant="ghost" size="sm" iconRight="ArrowRight" onClick={() => onNavigate("horses")}>Manage</Button>
          </div>
          <div className="divide-y divide-line">
            {OWNER.horses.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                <HorseAvatar src={h.avatar} color={h.color} size={36} />
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{h.name}</p><p className="text-[12px] text-slate-500">{h.breed} · {h.rankGroup}</p></div>
                <div className="hidden text-right sm:block"><p className="text-[13px] font-bold text-ink tnum">{h.points}</p><p className="text-[11px] text-slate-400">pts</p></div>
                <StatusChip status={h.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionTitle title="Recent registrations" icon="ClipboardList" />
            <Button variant="ghost" size="sm" onClick={() => onNavigate("entry")}>New entry</Button>
          </div>
          <div className="divide-y divide-line">
            {registrations.filter((r) => r.owner === "Red Dragon Stables").slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon name="ClipboardList" size={15} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{r.horse} → {r.race}</p><p className="text-[12px] text-slate-500">{relativeTime(r.submitted)}</p></div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionTitle title="Jockey invitations" icon="UserPlus" />
            <Button variant="ghost" size="sm" iconRight="ArrowRight" onClick={() => onNavigate("invitations")}>All</Button>
          </div>
          <div className="divide-y divide-line">
            {invitations.filter((i) => i.owner === "Red Dragon Stables").slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={i.jockey} size={32} tone="blue" />
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{i.jockey} → {i.horse}</p><p className="text-[12px] text-slate-500">{i.race} · {relativeTime(i.sentAt)}</p></div>
                <StatusChip status={i.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================= Jockey ============================= */
export function JockeyDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const pending = invitations.filter((i) => i.status === "pending");
  const upcoming = races.filter((r) => r.status === "scheduled").slice(0, 3);
  return (
    <div className="space-y-5">
      <PageHeader title="Rider Dashboard" sub="Vo Quoc Hung · JC-VN-1042" icon="UserRound"
        actions={<Button variant="primary" icon="CalendarClock" size="sm" onClick={() => onNavigate("race-schedule")}>My schedule</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Pending invites" value={pending.length} icon="Inbox" tone="gold" delta="Action needed" deltaTone="up" />
        <MetricCard label="Confirmed rides" value={invitations.filter((i) => i.status === "confirmed").length + 1} icon="UserCheck" tone="emerald" />
        <MetricCard label="Career wins" value={142} icon="Trophy" tone="violet" delta="+3 this month" deltaTone="up" />
        <MetricCard label="Ranking points" value="2,680" icon="BarChart3" tone="blue" sub="Rank #1" delta="Top of board" deltaTone="up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-line px-4 py-3"><SectionTitle title="Ride invitations" icon="Inbox" /></div>
          {pending.length === 0
            ? <p className="px-4 py-8 text-center text-[13px] text-slate-500">No pending invitations. You're all caught up.</p>
            : <div className="divide-y divide-line">
              {pending.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <HorseAvatar size={40} color="bay" src={jockeys[0].avatar} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">Ride {i.horse}</p><p className="text-[12px] text-slate-500">{i.race} · {i.owner}</p></div>
                  <Button variant="secondary" size="sm" icon="X" className="text-rose-600">Decline</Button>
                  <Button variant="primary" size="sm" icon="Check" onClick={() => onNavigate("invitations")}>Accept</Button>
                </div>
              ))}
            </div>}
        </Card>
        <Card className="p-4">
          <SectionTitle title="Form" icon="Activity" sub="Last 10 rides" />
          <div className="mt-3"><Sparkline data={[3, 1, 5, 1, 2, 1, 4, 2, 1, 3]} tone="emerald" /></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-lg font-bold text-ink tnum">58%</p><p className="text-[11px] text-slate-400">Win rate</p></div>
            <div><p className="text-lg font-bold text-emerald-600 tnum">92</p><p className="text-[11px] text-slate-400">Rating</p></div>
            <div><p className="text-lg font-bold text-ink tnum">410</p><p className="text-[11px] text-slate-400">Starts</p></div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle title="Upcoming rides" icon="CalendarClock" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((r) => <RaceCard key={r.id} name={r.name} number={r.number} time={r.scheduledAt} track={r.trackType} distance={r.distance} status={r.status} onClick={() => onNavigate("race-schedule")} />)}
        </div>
      </Card>
    </div>
  );
}

/* ============================ Spectator ============================ */
export function SpectatorDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const featured = races.find((r) => r.status === "ongoing") ?? races[1];
  const opps = predictions.filter((p) => p.status === "open");
  const live = results[0];
  return (
    <div className="space-y-5">
      <PageHeader title="Spectator Hub" sub="Live racing & prediction markets" icon="Eye"
        actions={<Button variant="primary" icon="Target" size="sm" onClick={() => onNavigate("predictions")}>Open predictions</Button>} />

      {/* Featured live + wallet */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="relative h-44"><img src={IMG.raceGate} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-slate-900/20" />
            <div className="absolute left-4 top-4"><Badge tone="emerald" dot>Live now</Badge></div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div><p className="text-[12px] font-semibold uppercase text-emerald-300">Race {featured.number} · {featured.tournament}</p><p className="text-2xl font-bold text-white">{featured.name}</p><p className="text-[13px] text-slate-300">{featured.enteredHorses} runners · {featured.distance}m {featured.trackType}</p></div>
              <Button variant="primary" size="sm" icon="Radio" onClick={() => onNavigate("predictions")}>Watch & predict</Button>
            </div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-line">
            {[{ k: "Open races", v: opps.length }, { k: "Your stakes", v: fmtPoints(WALLET.pending) }, { k: "Balance", v: fmtPoints(WALLET.balance) }, { k: "Win rate", v: `${WALLET.winRate}%` }].map((s) => (
              <div key={s.k} className="px-3 py-3 text-center"><p className="text-[11px] uppercase text-slate-400">{s.k}</p><p className="text-[14px] font-bold text-ink tnum">{s.v}</p></div>
            ))}
          </div>
        </Card>
        <WalletBalanceCard balance={WALLET.balance} pending={WALLET.pending} onTopUp={() => onNavigate("wallet")} />
      </div>

      {/* Prediction opportunities */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle title="Open prediction windows" icon="Target" sub="Compare rates & stake" />
          <Button variant="ghost" size="sm" iconRight="ArrowRight" onClick={() => onNavigate("predictions")}>All markets</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opps.map((p) => {
            const horse = OWNER.horses.find((h) => h.id === p.horseId) ?? { name: p.horse, avatar: IMG.hBrown, color: "bay" } as any;
            return (
              <PredictionCard key={p.id} race={p.race} rate={p.rate} status="open"
                horse={<div className="flex items-center gap-2"><HorseAvatar src={horse.avatar} color={horse.color} size={32} /><div><p className="text-[13px] font-semibold text-ink">{p.horse}</p><p className="text-[11px] text-slate-500">To win</p></div></div>}
                onAction={() => onNavigate("predictions")} actionLabel="Predict" />
            );
          })}
        </div>
      </div>

      {/* Recent result + schedule */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><SectionTitle title="Latest result" icon="Trophy" /><Button variant="ghost" size="sm" iconRight="ArrowRight" onClick={() => onNavigate("results")}>All results</Button></div>
          <div className="p-4">
            <p className="text-[13px] font-semibold text-ink">{live.race}</p>
            <p className="text-[12px] text-slate-500">{live.tournament} · {fmtDate(live.date)}</p>
            <div className="mt-3 space-y-2">
              {live.rows.slice(0, 3).map((r) => (
                <div key={r.pos} className="flex items-center gap-3">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold", r.pos === 1 ? "bg-amber-100 text-amber-700" : r.pos === 2 ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-700")}>{r.pos}</span>
                  <span className="flex-1 text-[13px] font-medium text-ink">{r.horse}</span>
                  <span className="text-[12px] text-slate-500">{r.jockey}</span>
                  <span className="mono text-[12px] font-semibold text-ink">{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle title="Coming up" icon="CalendarClock" />
          <div className="mt-3 space-y-2.5">
            {races.filter((r) => r.status === "scheduled").slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-white"><p className="text-[10px] leading-none">{fmtTime(r.scheduledAt).split(":")[0]}</p><p className="text-[11px] font-bold leading-none">:{fmtTime(r.scheduledAt).split(":")[1]}</p></div>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">R{r.number} · {r.name}</p><p className="text-[12px] text-slate-500">{r.distance}m {r.trackType}</p></div>
                <Badge tone="blue">{fmtPoints(500)} min</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* shared helper export */
export function StatPill({ children }: { children: ReactNode }) {
  return <Badge tone="slate">{children}</Badge>;
}

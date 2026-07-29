import { useState } from "react";
import { cn } from "@/utils/cn";
import {
  Avatar, Badge, Button, Card, ConfirmationDialog, DataTable, EmptyState, Field, Icon, IconButton,
  MetricCard, Modal, SearchInput, Select, StatusChip, TextInput, useToast,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HorseAvatar, RaceCard } from "@/components/widgets";
import { IMG, OWNER, horses, invitations, jockeys, races, registrations, tournaments } from "@/lib/data";
import type { Horse, Role } from "@/lib/types";
import { fmtTime, relativeTime } from "@/lib/format";

/* ========================= OWNER: MY HORSES ========================= */
export function OwnerHorses() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [editing, setEditing] = useState<Horse | null>(null);
  const [creating, setCreating] = useState(false);
  const mine = OWNER.horses;
  const list = mine.filter((h) => (group === "all" || h.rankGroup === group) && h.name.toLowerCase().includes(q.toLowerCase()));
  const topPoints = Math.max(...mine.map((h) => h.points), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="My Horses" sub={`${OWNER.stable} · stable roster`} icon="Cookie"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setCreating(true)}>Register horse</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={mine.length} icon="Cookie" tone="violet" />
        <MetricCard label="Active" value={mine.filter((h) => h.status === "active").length} icon="CheckCircle2" tone="emerald" />
        <MetricCard label="Total wins" value={mine.reduce((a, h) => a + h.wins, 0)} icon="Trophy" tone="gold" />
        <MetricCard label="Top points" value={topPoints} icon="Star" tone="blue" />
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput value={q} onChange={setQ} placeholder="Search my horses…" className="min-w-[200px] flex-1" />
        <Select value={group} onChange={setGroup} options={[{ value: "all", label: "All groups" }, { value: "Group A", label: "Group A" }, { value: "Group B", label: "Group B" }, { value: "Group C", label: "Group C" }]} icon="Filter" trigger="bare" />
      </div>

      {list.length === 0 ? <EmptyState icon="Cookie" title="No horses yet" sub="Register your first horse to start entering races." action={<Button variant="primary" icon="Plus" onClick={() => setCreating(true)}>Register horse</Button>} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((h) => (
            <Card key={h.id} hover className="overflow-hidden">
              <div className="relative h-32"><img src={h.avatar} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" /><div className="absolute right-2 top-2"><StatusChip status={h.status} /></div><div className="absolute bottom-2 left-3"><p className="text-[15px] font-bold text-white">{h.name}</p><p className="text-[12px] text-white/80">{h.breed} · {h.age}y</p></div></div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-[15px] font-bold text-ink tnum">{h.points}</p><p className="text-[10px] uppercase text-slate-400">Points</p></div>
                  <div><p className="text-[15px] font-bold text-ink tnum">{h.wins}</p><p className="text-[10px] uppercase text-slate-400">Wins</p></div>
                  <div><p className="text-[15px] font-bold text-ink tnum">{h.weight}</p><p className="text-[10px] uppercase text-slate-400">kg</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone="slate">{h.rankGroup}</Badge>
                  <div className="flex gap-1">
                    <IconButton name="Eye" label="View" size="sm" onClick={() => setEditing(h)} />
                    <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(h)} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <HorseForm open={creating || !!editing} horse={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} onSave={() => { push({ tone: "emerald", title: "Horse saved" }); setCreating(false); setEditing(null); }} />
    </div>
  );
}

function HorseForm({ open, onClose, onSave, horse }: { open: boolean; onClose: () => void; onSave: () => void; horse?: Horse }) {
  return (
    <Modal open={open} onClose={onClose} title={horse?.id ? "Edit horse" : "Register horse"} icon="Cookie" tone="emerald" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Horse name" required><TextInput defaultValue={horse?.name} placeholder="Emerald Dasher" /></Field>
        <Field label="Breed"><TextInput defaultValue={horse?.breed} placeholder="Thoroughbred" /></Field>
        <Field label="Age (years)"><TextInput defaultValue={horse ? String(horse.age) : ""} /></Field>
        <Field label="Weight (kg)"><TextInput defaultValue={horse ? String(horse.weight) : ""} /></Field>
        <Field label="Rank group"><Select value={horse?.rankGroup ?? "Group B"} onChange={() => {}} options={[{ value: "Group A", label: "Group A" }, { value: "Group B", label: "Group B" }, { value: "Group C", label: "Group C" }]} /></Field>
        <Field label="Status"><Select value={horse?.status ?? "active"} onChange={() => {}} options={[{ value: "active", label: "Active", tone: "emerald" }, { value: "inactive", label: "Inactive", tone: "slate" }]} /></Field>
        <Field label="Avatar URL" className="sm:col-span-2"><TextInput icon="Image" defaultValue={horse?.avatar} placeholder="https://…" /></Field>
      </div>
    </Modal>
  );
}

/* ====================== OWNER: RACE ENTRY ====================== */
export function RaceEntry() {
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const [tId, setTId] = useState("t1");
  const [raceId, setRaceId] = useState("");
  const [horseId, setHorseId] = useState("");
  const steps = ["Tournament", "Race", "Horse", "Review"];
  const openT = tournaments.filter((t) => t.status === "ongoing" || t.status === "scheduled");
  const raceList = races.filter((r) => r.tournamentId === tId && r.status === "scheduled");
  const myQueue = registrations.filter((r) => r.owner === OWNER.stable);

  const stepLabels = [tournaments.find((t) => t.id === tId)?.name ?? "—", races.find((r) => r.id === raceId)?.name ?? "—", horses.find((h) => h.id === horseId)?.name ?? "—"];

  const next = () => {
    if (step === 1 && !raceId) { push({ tone: "red", title: "Select a race" }); return; }
    if (step === 2 && !horseId) { push({ tone: "red", title: "Select a horse" }); return; }
    setStep((s) => Math.min(3, s + 1));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Race Entry Registration" sub="Enter your horses into open races" icon="ClipboardPlus" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          {/* stepper */}
          <div className="mb-6 flex items-center">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold", i < step ? "bg-emerald-600 text-white" : i === step ? "bg-ink text-white ring-4 ring-ink/10" : "bg-slate-200 text-slate-400")}>{i < step ? <Icon name="Check" size={16} /> : i + 1}</span>
                  <span className={cn("mt-1.5 text-[11px] font-semibold", i <= step ? "text-ink" : "text-slate-400")}>{s}</span>
                </div>
                {i < steps.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded-full", i < step ? "bg-emerald-500" : "bg-slate-200")} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-slate-500">Choose a tournament with open registration</p>
              {openT.map((t) => (
                <button key={t.id} onClick={() => { setTId(t.id); setRaceId(""); }} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", tId === t.id ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15" : "border-line hover:border-emerald-300")}>
                  <img src={t.cover} alt="" className="h-10 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{t.name}</p><p className="text-[12px] text-slate-500">{t.venue} · {t.races} races</p></div>
                  <StatusChip status={t.status} />
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-slate-500">Select a race in {tournaments.find((t) => t.id === tId)?.name}</p>
              {raceList.length === 0 ? <EmptyState icon="Flag" title="No open races" sub="No scheduled races in this tournament." /> : raceList.map((r) => (
                <button key={r.id} onClick={() => setRaceId(r.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", raceId === r.id ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15" : "border-line hover:border-emerald-300")}>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">R{r.number}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{r.name}</p><p className="text-[12px] text-slate-500">{r.rankGroup} · {r.distance}m · {fmtTime(r.scheduledAt)}</p></div>
                  <span className="text-[12px] text-slate-500 tnum">{r.enteredHorses}/{r.maxHorses}</span>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-slate-500">Pick a horse from your stable</p>
              {OWNER.horses.map((h) => (
                <button key={h.id} onClick={() => setHorseId(h.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", horseId === h.id ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15" : "border-line hover:border-emerald-300")}>
                  <HorseAvatar src={h.avatar} color={h.color} size={40} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{h.name}</p><p className="text-[12px] text-slate-500">{h.rankGroup} · {h.points} pts · {h.wins} wins</p></div>
                  <StatusChip status={h.status} />
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="ClipboardList" size={28} /></span>
              <h3 className="mt-4 text-[16px] font-bold text-ink">Ready to submit entry</h3>
              <div className="mx-auto mt-4 max-w-sm space-y-1 text-left">
                {stepLabels.map((l, i) => <div key={i} className="flex justify-between rounded-lg border border-line px-3 py-2"><span className="text-[12px] text-slate-500">{steps[i]}</span><span className="text-[13px] font-semibold text-ink">{l}</span></div>)}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" icon="ArrowLeft" onClick={() => (step === 0 ? null : setStep((s) => s - 1))}>{step === 0 ? "" : "Back"}</Button>
            {step < 3 ? <Button variant="primary" iconRight="ArrowRight" onClick={next}>Continue</Button>
              : <Button variant="primary" icon="Send" onClick={() => { push({ tone: "emerald", title: "Entry submitted", desc: "Awaiting approval" }); setStep(0); setRaceId(""); setHorseId(""); }}>Submit entry</Button>}
          </div>
        </Card>

        {/* Queue */}
        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-3 flex items-center gap-2"><Icon name="ClipboardList" size={16} className="text-slate-500" /><span className="text-[14px] font-semibold text-ink">Registration queue</span></div>
          <div className="divide-y divide-line">
            {myQueue.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-ink">{r.horse}</p><StatusChip status={r.status} /></div>
                <p className="text-[12px] text-slate-500">{r.race}</p>
                <p className="text-[11px] text-slate-400">Submitted {relativeTime(r.submitted)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===================== INVITATIONS (owner + jockey) ===================== */
export function Invitations({ role }: { role: Role }) {
  const { push } = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [cancel, setCancel] = useState<typeof invitations[0] | null>(null);
  const isOwner = role === "owner";
  const data = isOwner ? invitations.filter((i) => i.owner === OWNER.stable) : invitations.filter((i) => i.jockeyId === "j1");

  const cols: Column<typeof invitations[0]>[] = [
    { key: "horse", header: isOwner ? "Ride" : "Invitation", sortValue: (i) => i.horse, render: (i) => (
      <div className="flex items-center gap-3"><HorseAvatar size={36} color="bay" src={isOwner ? horses.find((h) => h.id === i.horseId)?.avatar : IMG.hBlack} />
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{i.horse}</p><p className="truncate text-[12px] text-slate-500">{i.race}</p></div></div>
    ) },
    ...(isOwner ? [{ key: "jockey", header: "Jockey", render: (i: typeof invitations[0]) => <div className="flex items-center gap-2"><Avatar name={i.jockey} size={28} tone="blue" /><span className="text-[13px] text-ink">{i.jockey}</span></div> }] : [{ key: "owner", header: "From stable", render: (i: typeof invitations[0]) => <span className="text-[13px] text-ink">{i.owner}</span> }]),
    { key: "sent", header: "Sent", render: (i) => <span className="text-[13px] text-slate-500">{relativeTime(i.sentAt)}</span> },
    { key: "status", header: "Status", render: (i) => <StatusChip status={i.status} /> },
    { key: "actions", header: "", align: "right", render: (i) => (
      <div className="flex items-center justify-end gap-0.5">
        {isOwner ? (
          i.status === "accepted" ? <Button variant="primary" size="sm" icon="Check" onClick={() => push({ tone: "emerald", title: "Ride confirmed" })}>Confirm</Button>
            : i.status === "pending" ? <IconButton name="X" label="Cancel invite" tone="red" size="sm" onClick={() => setCancel(i)} />
            : <IconButton name="Check" label="Confirmed" size="sm" />
        ) : (
          i.status === "pending" ? <>
            <Button variant="secondary" size="sm" icon="X" className="text-rose-600" onClick={() => push({ tone: "red", title: "Invitation declined" })}>Decline</Button>
            <Button variant="primary" size="sm" icon="Check" onClick={() => push({ tone: "emerald", title: "Ride accepted" })}>Accept</Button>
          </> : <IconButton name={i.status === "confirmed" ? "Check" : "Clock"} label={i.status} size="sm" />
        )}
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={isOwner ? "Jockey Invitations" : "Ride Invitations"} sub={isOwner ? "Assign jockeys to your confirmed entries" : "Accept or decline ride offers"} icon="UserPlus"
        actions={isOwner ? <Button variant="primary" icon="UserPlus" size="sm" onClick={() => setNewOpen(true)}>Invite jockey</Button> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Invitations" value={data.length} icon="UserPlus" tone="violet" />
        <MetricCard label="Pending" value={data.filter((i) => i.status === "pending").length} icon="Clock" tone="gold" />
        <MetricCard label="Accepted" value={data.filter((i) => i.status === "accepted").length} icon="CheckCircle2" tone="blue" />
        <MetricCard label="Confirmed" value={data.filter((i) => i.status === "confirmed").length} icon="UserCheck" tone="emerald" />
      </div>
      <Card>
        <DataTable columns={cols} rows={data} rowKey={(i) => i.id} pageSize={8}
          empty={<EmptyState icon="Inbox" title="No invitations" sub={isOwner ? "Invite a jockey to one of your confirmed entries." : "You have no pending ride offers."} />}
          mobileCards={(i) => <Card className="w-full p-3"><div className="flex items-center gap-3"><HorseAvatar size={36} color="bay" src={IMG.hBlack} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{i.horse}</p><p className="truncate text-[12px] text-slate-500">{i.race}</p></div><StatusChip status={i.status} /></div></Card>} />
      </Card>

      {/* Invite jockey modal (owner) */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Invite a jockey" icon="UserPlus" size="md"
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button><Button variant="primary" icon="Send" onClick={() => { push({ tone: "emerald", title: "Invitation sent" }); setNewOpen(false); }}>Send invite</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Horse"><Select value={OWNER.horses[0]?.id} onChange={() => {}} options={OWNER.horses.map((h) => ({ value: h.id, label: h.name }))} /></Field>
            <Field label="Race"><Select value="" onChange={() => {}} options={[{ value: "", label: "Select a confirmed race" }, ...races.filter((r) => r.status === "scheduled").map((r) => ({ value: r.id, label: r.name }))]} /></Field>
          </div>
          <Field label="Jockey">
            <div className="space-y-1.5">
              {jockeys.map((j) => (
                <button key={j.id} className="flex w-full items-center gap-3 rounded-lg border border-line p-2.5 text-left hover:border-emerald-300">
                  <img src={j.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <div className="flex-1"><p className="text-[13px] font-semibold text-ink">{j.name}</p><p className="text-[12px] text-slate-500">{j.org} · {j.wins} wins · rating {j.rating}</p></div>
                  <Badge tone="blue">{j.points} pts</Badge>
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmationDialog open={!!cancel} onClose={() => setCancel(null)} onConfirm={() => push({ tone: "red", title: "Invitation cancelled" })} title="Cancel invitation?" icon="Ban" message={`Cancel the ride offer to ${cancel?.jockey} for ${cancel?.horse}?`} confirmLabel="Cancel invite" />
    </div>
  );
}

/* ===================== RACE SCHEDULE (shared) ===================== */
export function RaceSchedule({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [status, setStatus] = useState("all");
  const [tF, setTF] = useState("all");
  const list = races.filter((r) => (status === "all" || r.status === status) && (tF === "all" || r.tournamentId === tF));
  return (
    <div className="space-y-5">
      <PageHeader title="Race Schedule" sub="Upcoming & live programme" icon="CalendarClock" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Scheduled" value={races.filter((r) => r.status === "scheduled").length} icon="Clock" tone="blue" />
        <MetricCard label="Live" value={races.filter((r) => r.status === "ongoing").length} icon="Radio" tone="emerald" />
        <MetricCard label="Finished" value={races.filter((r) => r.status === "completed").length} icon="CheckCircle2" tone="slate" />
        <MetricCard label="This week" value={list.length} icon="CalendarDays" tone="violet" />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={tF} onChange={setTF} options={[{ value: "all", label: "All tournaments" }, ...tournaments.map((t) => ({ value: t.id, label: t.name }))]} icon="Trophy" trigger="bare" />
        <Select value={status} onChange={setStatus} options={[{ value: "all", label: "All status" }, { value: "scheduled", label: "Scheduled", tone: "blue" }, { value: "ongoing", label: "Live", tone: "emerald" }, { value: "completed", label: "Finished", tone: "slate" }]} icon="Filter" trigger="bare" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => <RaceCard key={r.id} name={r.name} number={r.number} time={r.scheduledAt} tournament={r.tournament} track={r.trackType} distance={r.distance} status={r.status} extra={<span className="inline-flex items-center gap-1"><Icon name="UsersRound" size={12} /> {r.enteredHorses} runners</span>} onClick={() => onNavigate("results")} />)}
      </div>
    </div>
  );
}

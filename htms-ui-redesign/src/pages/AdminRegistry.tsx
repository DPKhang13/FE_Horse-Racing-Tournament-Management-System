import { useState } from "react";
import { cn } from "@/utils/cn";
import {
  Badge, Button, Card, ConfirmationDialog, DataTable, EmptyState, Field, Icon, IconButton,
  MetricCard, Modal, SearchInput, Select, StatusChip, Tabs, TextArea, TextInput, useToast,
} from "@/components/ui";
import type { Column, Option } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HorseAvatar } from "@/components/widgets";
import { betOptions, horses, jockeys, races, registrations, tournaments } from "@/lib/data";
import type { BetOption, Horse, Race, Registration } from "@/lib/types";
import { fmtDate, fmtPoints, fmtTime, fmtVNDcompact, relativeTime } from "@/lib/format";

/* ========================== RACE MANAGEMENT ========================== */
export function Races() {
  const { push } = useToast();
  const [tId, setTId] = useState("t1");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Race | null>(null);
  const [creating, setCreating] = useState(false);
  const [assign, setAssign] = useState<Race | null>(null);
  const [cancel, setCancel] = useState<Race | null>(null);
  const [picked, setPicked] = useState<string[]>(["j1", "j2"]);

  const list = races.filter((r) => r.tournamentId === tId && (status === "all" || r.status === status) && r.name.toLowerCase().includes(q.toLowerCase()));
  const tOpts: Option[] = tournaments.map((t) => ({ value: t.id, label: t.name }));
  const statusOpts: Option[] = [{ value: "all", label: "All status" }, { value: "scheduled", label: "Scheduled", tone: "blue" }, { value: "ongoing", label: "Live", tone: "emerald" }, { value: "completed", label: "Completed", tone: "slate" }, { value: "cancelled", label: "Cancelled", tone: "red" }];

  const columns: Column<Race>[] = [
    { key: "name", header: "Race", sortValue: (r) => r.number, render: (r) => (
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">R{r.number}</span><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{r.name}</p><p className="text-[12px] text-slate-500">{r.rankGroup} · {r.distance}m · {r.laps} lap · {r.trackType}</p></div></div>
    ) },
    { key: "time", header: "Scheduled", render: (r) => <div><p className="text-[13px] text-ink tnum">{fmtTime(r.scheduledAt)}</p><p className="text-[12px] text-slate-500">Close {fmtTime(r.predictionClose)}</p></div> },
    { key: "horses", header: "Horses", align: "center", render: (r) => <span className="text-[13px] font-semibold text-ink tnum">{r.enteredHorses}<span className="text-slate-400">/{r.maxHorses}</span></span> },
    { key: "refs", header: "Referees", align: "center", render: (r) => <span className={cn("text-[13px] font-semibold tnum", r.assignedReferees < r.maxReferees ? "text-amber-600" : "text-ink")}>{r.assignedReferees}<span className="text-slate-400">/{r.maxReferees}</span></span> },
    { key: "prize", header: "Prize", align: "right", render: (r) => <span className="text-[13px] font-bold text-amber-700 tnum">{fmtVNDcompact(r.prize)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusChip status={r.status} /> },
    { key: "actions", header: "", align: "right", render: (r) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="UsersRound" label="Assign referees" size="sm" onClick={() => { setAssign(r); setPicked(Array.from({ length: r.assignedReferees }).map((_, i) => `j${i + 1}`)); }} />
        <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(r)} />
        {r.status === "scheduled" && <IconButton name="Play" label="Start race" tone="emerald" size="sm" onClick={() => push({ tone: "emerald", title: "Race started", desc: `${r.name} is now live` })} />}
        {r.status === "ongoing" && <IconButton name="CheckCircle2" label="Complete" tone="emerald" size="sm" onClick={() => push({ tone: "emerald", title: "Race completed" })} />}
        {r.status !== "completed" && r.status !== "cancelled" && <IconButton name="Ban" label="Cancel" tone="red" size="sm" onClick={() => setCancel(r)} />}
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Race Management" sub="Configure & operate race cards" icon="Flag"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setCreating(true)}>New race</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Races" value={races.length} icon="Flag" tone="violet" />
        <MetricCard label="Scheduled" value={races.filter((r) => r.status === "scheduled").length} icon="Clock" tone="blue" />
        <MetricCard label="Live" value={races.filter((r) => r.status === "ongoing").length} icon="Radio" tone="emerald" />
        <MetricCard label="Completed" value={races.filter((r) => r.status === "completed").length} icon="CheckCircle2" tone="slate" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <Select value={tId} onChange={setTId} options={tOpts} icon="Trophy" className="min-w-[220px]" />
          <SearchInput value={q} onChange={setQ} placeholder="Search races…" className="min-w-[180px] flex-1" />
          <Select value={status} onChange={setStatus} options={statusOpts} icon="Filter" trigger="bare" />
        </div>
        <DataTable columns={columns} rows={list} rowKey={(r) => r.id} pageSize={7}
          mobileCards={(r) => <Card className="w-full p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">R{r.number}</span><div><p className="text-[13px] font-semibold text-ink">{r.name}</p><p className="text-[12px] text-slate-500">{fmtTime(r.scheduledAt)} · {r.distance}m</p></div></div><StatusChip status={r.status} /></div><div className="mt-2 flex items-center justify-between text-[12px] text-slate-500"><span className="tnum">{r.enteredHorses}/{r.maxHorses} horses</span><span className="tnum">{r.assignedReferees}/{r.maxReferees} refs</span><span className="font-bold text-amber-700 tnum">{fmtVNDcompact(r.prize)}</span></div></Card>} />
      </Card>

      {/* Point rules */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><Icon name="Award" size={17} /></span><div><p className="text-[14px] font-semibold text-ink">Point rules</p><p className="text-[12px] text-slate-500">Ranking points awarded per finishing position</p></div></div>
          <Button variant="secondary" size="sm" icon="Pencil">Edit rules</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          {[{ p: "1st", v: 100, c: "bg-amber-100 text-amber-700" }, { p: "2nd", v: 70, c: "bg-slate-200 text-slate-700" }, { p: "3rd", v: 45, c: "bg-orange-100 text-orange-700" }, { p: "4th", v: 25, c: "bg-slate-100 text-slate-600" }, { p: "5th", v: 10, c: "bg-slate-100 text-slate-500" }, { p: "6th+", v: 0, c: "bg-slate-100 text-slate-400" }].map((x) => (
            <div key={x.p} className={cn("rounded-lg p-3 text-center", x.c)}><p className="text-[11px] font-semibold uppercase">{x.p}</p><p className="text-lg font-bold tnum">{x.v}</p></div>
          ))}
        </div>
      </Card>

      <RaceForm open={creating || !!editing} race={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} onSave={() => { push({ tone: "emerald", title: "Race saved" }); setCreating(false); setEditing(null); }} />
      {/* Referee assignment */}
      <Modal open={!!assign} onClose={() => setAssign(null)} title="Assign referees" sub={assign?.name} icon="UsersRound" size="md"
        footer={<><Button variant="secondary" onClick={() => setAssign(null)}>Cancel</Button><Button variant="primary" icon="Check" onClick={() => { push({ tone: "emerald", title: "Referees assigned", desc: `${picked.length} referee(s)` }); setAssign(null); }}>Assign {picked.length > 0 ? `(${picked.length})` : ""}</Button></>}>
        <p className="mb-2 text-[13px] text-slate-500">Select up to {assign?.maxReferees} referees for this race.</p>
        <div className="space-y-1.5">
          {jockeys.slice(0, 4).map((j) => {
            const on = picked.includes(j.id);
            return (
              <button key={j.id} onClick={() => setPicked((p) => p.includes(j.id) ? p.filter((x) => x !== j.id) : p.length < (assign?.maxReferees ?? 3) ? [...p, j.id] : p)} className={cn("flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors", on ? "border-emerald-500 bg-emerald-50/50" : "border-line hover:border-emerald-300")}>
                <span className={cn("grid h-5 w-5 place-items-center rounded-md border", on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300")}>{on && <Icon name="Check" size={13} />}</span>
                <img src={j.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                <div className="flex-1"><p className="text-[13px] font-semibold text-ink">{j.name}</p><p className="text-[12px] text-slate-500">{j.license} · rating {j.rating}</p></div>
                <Badge tone="slate">Referee</Badge>
              </button>
            );
          })}
        </div>
      </Modal>
      <ConfirmationDialog open={!!cancel} onClose={() => setCancel(null)} onConfirm={() => push({ tone: "red", title: "Race cancelled", desc: cancel?.name })} title="Cancel race?" icon="Ban" message={`Cancelling "${cancel?.name}" will void all entries and refund prediction stakes. This cannot be undone.`} confirmLabel="Cancel race" />
    </div>
  );
}

function RaceForm({ open, onClose, onSave, race }: { open: boolean; onClose: () => void; onSave: () => void; race?: Race }) {
  const [track, setTrack] = useState<Race["trackType"]>(race?.trackType ?? "Turf");
  return (
    <Modal open={open} onClose={onClose} title={race ? "Edit race" : "Create race"} sub="Race configuration & scheduling" icon="Flag" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>{race ? "Save changes" : "Create race"}</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Race name" required><TextInput defaultValue={race?.name} placeholder="Orchard Sprint Stakes" /></Field>
          <Field label="Race number" required><TextInput defaultValue={race ? String(race.number) : ""} placeholder="2" /></Field>
          <Field label="Rank group"><Select value={race?.rankGroup ?? "Group B"} onChange={() => {}} options={[{ value: "Group A", label: "Group A" }, { value: "Group B", label: "Group B" }, { value: "Group C", label: "Group C" }]} /></Field>
          <Field label="Track type"><Select value={track} onChange={(v) => setTrack(v as Race["trackType"])} options={[{ value: "Turf", label: "Turf" }, { value: "Dirt", label: "Dirt" }, { value: "Synthetic", label: "Synthetic" }]} /></Field>
          <Field label="Scheduled time" required><TextInput type="datetime-local" /></Field>
          <Field label="Prediction close" hint="Auto = start − 15 min"><TextInput type="datetime-local" /></Field>
          <Field label="Distance (m)"><TextInput defaultValue={race ? String(race.distance) : "1600"} /></Field>
          <Field label="Lap count"><TextInput defaultValue={race ? String(race.laps) : "1"} /></Field>
          <Field label="Max horses"><TextInput defaultValue={race ? String(race.maxHorses) : "14"} /></Field>
          <Field label="Max referees"><TextInput defaultValue={race ? String(race.maxReferees) : "3"} /></Field>
          <Field label="Prize pool (₫)"><TextInput icon="Coins" defaultValue={race ? String(race.prize) : ""} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ========================= HORSE MANAGEMENT ========================= */
export function HorsesAdmin() {
  const { push } = useToast();
  const [tab, setTab] = useState("horses");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [viewing, setViewing] = useState<Horse | null>(null);
  const [editing, setEditing] = useState<Horse | null>(null);
  const [req, setReq] = useState<Horse | null>(null);
  const [reqAction, setReqAction] = useState<"approve" | "reject">("approve");

  const filtered = horses.filter((h) => (status === "all" || h.status === status) && (h.name + h.breed + h.ownerStable).toLowerCase().includes(q.toLowerCase()));
  const statusOpts: Option[] = [{ value: "all", label: "All status" }, { value: "active", label: "Active", tone: "emerald" }, { value: "pending", label: "Pending", tone: "gold" }, { value: "inactive", label: "Inactive", tone: "slate" }];
  const topPoints = Math.max(...horses.map((h) => h.points));

  const columns: Column<Horse>[] = [
    { key: "name", header: "Horse", sortValue: (h) => h.name, render: (h) => (
      <div className="flex items-center gap-3"><HorseAvatar src={h.avatar} color={h.color} size={36} /><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{h.name}</p><p className="text-[12px] text-slate-500">{h.breed} · {h.age}y · {h.weight}kg</p></div></div>
    ) },
    { key: "owner", header: "Owner / Stable", render: (h) => <div><p className="text-[13px] text-ink">{h.ownerStable}</p><p className="text-[12px] text-slate-500">{h.owner}</p></div> },
    { key: "group", header: "Group", render: (h) => <Badge tone="slate">{h.rankGroup}</Badge> },
    { key: "points", header: "Points", align: "right", sortValue: (h) => h.points, render: (h) => <span className="text-[13px] font-bold text-ink tnum">{h.points}</span> },
    { key: "wins", header: "W / S", align: "center", render: (h) => <span className="text-[13px] text-slate-600 tnum">{h.wins}/{h.starts}</span> },
    { key: "status", header: "Status", render: (h) => <StatusChip status={h.status} /> },
    { key: "actions", header: "", align: "right", render: (h) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="Eye" label="View" size="sm" onClick={() => setViewing(h)} />
        <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(h)} />
        {h.status === "pending" && <>
          <IconButton name="CheckCircle2" label="Approve" tone="emerald" size="sm" onClick={() => { setReq(h); setReqAction("approve"); }} />
          <IconButton name="XCircle" label="Reject" tone="red" size="sm" onClick={() => { setReq(h); setReqAction("reject"); }} />
        </>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Horse Management" sub="Registry, requests & ranking" icon="Cookie"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setEditing({} as Horse)}>Register horse</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Total" value={horses.length} icon="Cookie" tone="violet" />
        <MetricCard label="Pending" value={horses.filter((h) => h.status === "pending").length} icon="Clock" tone="gold" />
        <MetricCard label="Active" value={horses.filter((h) => h.status === "active").length} icon="CheckCircle2" tone="emerald" />
        <MetricCard label="Total wins" value={horses.reduce((a, h) => a + h.wins, 0)} icon="Trophy" tone="blue" />
        <MetricCard label="Top points" value={topPoints} icon="Star" tone="gold" />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "horses", label: "Horses", icon: "Cookie" }, { value: "requests", label: "Requests", icon: "ClipboardList", badge: horses.filter((h) => h.status === "pending").length }, { value: "ranking", label: "Ranking", icon: "BarChart3" }]} />

      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search horses…" className="min-w-[200px] flex-1" />
          <Select value={status} onChange={setStatus} options={statusOpts} icon="Filter" trigger="bare" />
        </div>
        {tab === "ranking" ? (
          <div className="divide-y divide-line">
            {[...horses].sort((a, b) => b.points - a.points).map((h, i) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold", i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{i + 1}</span>
                <HorseAvatar src={h.avatar} color={h.color} size={32} />
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{h.name}</p><p className="text-[12px] text-slate-500">{h.ownerStable}</p></div>
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold-accent bg-amber-500" style={{ width: `${(h.points / topPoints) * 100}%` }} /></div>
                <span className="w-14 text-right text-[13px] font-bold text-ink tnum">{h.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <DataTable columns={columns} rows={tab === "requests" ? filtered.filter((h) => h.status === "pending") : filtered} rowKey={(h) => h.id} pageSize={8} onRowClick={(h) => setViewing(h)}
            empty={<EmptyState icon="Cookie" title="No horses found" sub="Adjust filters or register a new horse." />}
            mobileCards={(h) => <Card className="w-full p-3"><div className="flex items-center gap-3"><HorseAvatar src={h.avatar} color={h.color} size={36} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{h.name}</p><p className="text-[12px] text-slate-500">{h.ownerStable}</p></div><StatusChip status={h.status} /></div><div className="mt-2 flex items-center justify-between text-[12px]"><span className="text-slate-500">{h.rankGroup} · {h.wins}W</span><span className="font-bold text-ink tnum">{h.points} pts</span></div></Card>} />
        )}
      </Card>

      {/* Detail */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} sub={viewing ? `${viewing.breed} · ${viewing.rankGroup}` : ""} icon="Cookie" tone="emerald" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <HorseAvatar src={viewing.avatar} color={viewing.color} size={72} />
              <div className="flex-1"><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-ink">{viewing.name}</h3><StatusChip status={viewing.status} /></div><p className="text-[13px] text-slate-500">{viewing.owner} · {viewing.ownerStable}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[{ k: "Age", v: `${viewing.age} yrs` }, { k: "Weight", v: `${viewing.weight} kg` }, { k: "Wins", v: `${viewing.wins}/${viewing.starts}` }, { k: "Points", v: viewing.points }].map((s) => (
                <div key={s.k} className="rounded-lg border border-line bg-slate-50 p-3 text-center"><p className="text-[11px] uppercase text-slate-400">{s.k}</p><p className="text-lg font-bold text-ink tnum">{s.v}</p></div>
              ))}
            </div>
            <div className="rounded-lg border border-line p-3"><p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">Recent form</p><div className="flex gap-1.5">{[1, 3, 1, 2, 4, 1, 2].map((p, i) => <span key={i} className={cn("grid h-7 w-7 place-items-center rounded-md text-[12px] font-bold", p === 1 ? "bg-emerald-100 text-emerald-700" : p <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{p}</span>)}</div></div>
          </div>
        )}
      </Modal>
      <ConfirmationDialog open={!!req} onClose={() => setReq(null)} onConfirm={() => push({ tone: reqAction === "approve" ? "emerald" : "red", title: `Request ${reqAction}d`, desc: req?.name })} title={`${reqAction === "approve" ? "Approve" : "Reject"} horse request?`} tone={reqAction === "approve" ? "primary" : "danger"} icon={reqAction === "approve" ? "CheckCircle2" : "XCircle"} message={`${reqAction === "approve" ? "Approve" : "Reject"} the registration request for "${req?.name}" from ${req?.ownerStable}.`} confirmLabel={reqAction === "approve" ? "Approve" : "Reject"} />
      <HorseForm open={!!editing} horse={editing ?? undefined} onClose={() => setEditing(null)} onSave={() => { push({ tone: "emerald", title: "Horse saved" }); setEditing(null); }} />
    </div>
  );
}

function HorseForm({ open, onClose, onSave, horse }: { open: boolean; onClose: () => void; onSave: () => void; horse?: Horse }) {
  return (
    <Modal open={open} onClose={onClose} title={horse?.name ? "Edit horse" : "Register horse"} icon="Cookie" tone="emerald" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>Save horse</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Horse name" required><TextInput defaultValue={horse?.name} placeholder="Midnight Thunder" /></Field>
          <Field label="Breed"><TextInput defaultValue={horse?.breed} placeholder="Thoroughbred" /></Field>
          <Field label="Age (years)"><TextInput defaultValue={horse ? String(horse.age) : ""} /></Field>
          <Field label="Weight (kg)"><TextInput defaultValue={horse ? String(horse.weight) : ""} /></Field>
          <Field label="Coat color"><Select value={horse?.color ?? "bay"} onChange={() => {}} options={[{ value: "bay", label: "Bay" }, { value: "chestnut", label: "Chestnut" }, { value: "black", label: "Black" }, { value: "grey", label: "Grey" }]} /></Field>
          <Field label="Rank group"><Select value={horse?.rankGroup ?? "Group B"} onChange={() => {}} options={[{ value: "Group A", label: "Group A" }, { value: "Group B", label: "Group B" }, { value: "Group C", label: "Group C" }]} /></Field>
          <Field label="Owner / Stable"><TextInput icon="Home" defaultValue={horse?.ownerStable} placeholder="Red Dragon Stables" /></Field>
          <Field label="Avatar URL"><TextInput icon="Image" placeholder="https://…" /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ===================== REGISTRATION MANAGEMENT ===================== */
export function Registrations() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [tF, setTF] = useState("all");
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [review, setReview] = useState<Registration | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");

  const filtered = registrations.filter((r) => (status === "all" || r.status === status) && (tF === "all" || r.tournament.includes(tF)) && (r.horse + r.race + r.owner).toLowerCase().includes(q.toLowerCase()));
  const statusOpts: Option[] = [{ value: "all", label: "All status" }, { value: "pending", label: "Pending", tone: "gold" }, { value: "approved", label: "Approved", tone: "emerald" }, { value: "rejected", label: "Rejected", tone: "red" }];
  const tOpts: Option[] = [{ value: "all", label: "All tournaments" }, ...tournaments.map((t) => ({ value: t.name, label: t.name }))];

  const columns: Column<Registration>[] = [
    { key: "horse", header: "Entry", sortValue: (r) => r.horse, render: (r) => <div><p className="text-[13px] font-semibold text-ink">{r.horse}</p><p className="text-[12px] text-slate-500">{r.owner}</p></div> },
    { key: "race", header: "Race", render: (r) => <div><p className="text-[13px] text-ink">{r.race}</p><p className="text-[12px] text-slate-500">{r.tournament}</p></div> },
    { key: "submitted", header: "Submitted", sortValue: (r) => r.submitted, render: (r) => <span className="text-[13px] text-slate-500">{relativeTime(r.submitted)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusChip status={r.status} /> },
    { key: "actions", header: "", align: "right", render: (r) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="Eye" label="View" size="sm" onClick={() => setViewing(r)} />
        {r.status === "pending" && <>
          <IconButton name="CheckCircle2" label="Approve" tone="emerald" size="sm" onClick={() => { setReview(r); setReviewAction("approve"); setNote(""); }} />
          <IconButton name="XCircle" label="Reject" tone="red" size="sm" onClick={() => { setReview(r); setReviewAction("reject"); setNote(""); }} />
        </>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Race Registration" sub="Approve & manage entry requests" icon="ClipboardList" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={registrations.length} icon="ClipboardList" tone="violet" />
        <MetricCard label="Pending" value={registrations.filter((r) => r.status === "pending").length} icon="Clock" tone="gold" />
        <MetricCard label="Approved" value={registrations.filter((r) => r.status === "approved").length} icon="CheckCircle2" tone="emerald" />
        <MetricCard label="Rejected" value={registrations.filter((r) => r.status === "rejected").length} icon="XCircle" tone="red" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search horse, race, owner…" className="min-w-[200px] flex-1" />
          <Select value={status} onChange={setStatus} options={statusOpts} icon="Filter" trigger="bare" />
          <Select value={tF} onChange={setTF} options={tOpts} icon="Trophy" trigger="bare" />
        </div>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} pageSize={8} onRowClick={(r) => setViewing(r)}
          mobileCards={(r) => <Card className="w-full p-3"><div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold text-ink">{r.horse}</p><p className="text-[12px] text-slate-500">{r.race}</p></div><StatusChip status={r.status} /></div><p className="mt-1 text-[12px] text-slate-500">{r.owner} · {relativeTime(r.submitted)}</p></Card>} />
      </Card>

      {/* detail */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Registration detail" icon="ClipboardList" size="md">
        {viewing && (
          <div className="space-y-1">
            <div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon name="Cookie" size={18} /></span><div><p className="text-[14px] font-bold text-ink">{viewing.horse}</p><p className="text-[12px] text-slate-500">{viewing.owner}</p></div><div className="ml-auto"><StatusChip status={viewing.status} /></div></div>
            {[
              ["Race", viewing.race], ["Tournament", viewing.tournament], ["Submitted", fmtDate(viewing.submitted)],
            ].map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-2"><span className="text-[13px] text-slate-500">{k}</span><span className="text-[13px] font-semibold text-ink">{v}</span></div>)}
            {viewing.note && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-[12px] font-semibold text-amber-700">Review note</p><p className="text-[13px] text-amber-800">{viewing.note}</p></div>}
          </div>
        )}
      </Modal>

      {/* approve/reject */}
      <Modal open={!!review} onClose={() => setReview(null)} title={`${reviewAction === "approve" ? "Approve" : "Reject"} entry`} sub={review?.horse} icon={reviewAction === "approve" ? "CheckCircle2" : "XCircle"} tone={reviewAction === "approve" ? "emerald" : "red"} size="sm"
        footer={<><Button variant="secondary" onClick={() => setReview(null)}>Cancel</Button><Button variant={reviewAction === "approve" ? "primary" : "danger"} icon={reviewAction === "approve" ? "Check" : "X"} onClick={() => { push({ tone: reviewAction === "approve" ? "emerald" : "red", title: `Entry ${reviewAction}d` }); setReview(null); }}>{reviewAction === "approve" ? "Approve entry" : "Reject entry"}</Button></>}>
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">{reviewAction === "approve" ? "Approve" : "Reject"} the entry of <b>{review?.horse}</b> into <b>{review?.race}</b>?</p>
          <Field label={reviewAction === "approve" ? "Note (optional)" : "Reason *"}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={reviewAction === "approve" ? "Add any conditions…" : "Explain why this entry is rejected…"} /></Field>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= BET MANAGEMENT ========================= */
export function Bets() {
  const { push } = useToast();
  const [raceF, setRaceF] = useState("all");
  const [editing, setEditing] = useState<BetOption | null>(null);
  const [rate, setRate] = useState("");
  const [gen, setGen] = useState(false);
  const raceOpts: Option[] = [{ value: "all", label: "All races" }, ...Array.from(new Set(betOptions.map((b) => b.race))).map((r) => ({ value: r, label: r }))];
  const list = betOptions.filter((b) => raceF === "all" || b.race === raceF);
  const totalStaked = betOptions.reduce((a, b) => a + b.totalStaked, 0);
  const avgRate = (betOptions.reduce((a, b) => a + b.rate, 0) / betOptions.length).toFixed(2);

  const columns: Column<BetOption>[] = [
    { key: "horse", header: "Selection", sortValue: (b) => b.horse, render: (b) => <div><p className="text-[13px] font-semibold text-ink">{b.horse}</p><p className="text-[12px] text-slate-500">{b.race}</p></div> },
    { key: "rate", header: "Rate", align: "right", sortValue: (b) => b.rate, render: (b) => <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[13px] font-bold text-amber-700 tnum">{b.rate.toFixed(2)}×</span> },
    { key: "prob", header: "Implied", align: "right", render: (b) => <span className="text-[13px] text-slate-600 tnum">{((1 / b.rate) * 100).toFixed(0)}%</span> },
    { key: "staked", header: "Staked", align: "right", sortValue: (b) => b.totalStaked, render: (b) => <span className="text-[13px] font-semibold text-ink tnum">{fmtPoints(b.totalStaked)}</span> },
    { key: "tickets", header: "Tickets", align: "right", render: (b) => <span className="text-[13px] text-slate-600 tnum">{b.tickets}</span> },
    { key: "status", header: "Status", render: (b) => <StatusChip status={b.status} /> },
    { key: "actions", header: "", align: "right", render: (b) => <IconButton name="Pencil" label="Edit rate" size="sm" onClick={() => { setEditing(b); setRate(b.rate.toFixed(2)); }} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Bet Management" sub="Prediction markets & odds" icon="Coins"
        actions={<Button variant="primary" icon="Sparkles" size="sm" onClick={() => setGen(true)}>Generate bets</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Bet options" value={betOptions.length} icon="Target" tone="violet" />
        <MetricCard label="Races covered" value={new Set(betOptions.map((b) => b.raceId)).size} icon="Flag" tone="blue" />
        <MetricCard label="Total staked" value={fmtPoints(totalStaked)} icon="Coins" tone="gold" />
        <MetricCard label="Avg rate" value={`${avgRate}×`} icon="TrendingUp" tone="emerald" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <Select value={raceF} onChange={setRaceF} options={raceOpts} icon="Flag" className="min-w-[240px]" />
          <Button variant="ghost" size="sm" icon="Download">Export</Button>
        </div>
        <DataTable columns={columns} rows={list} rowKey={(b) => b.id} pageSize={8}
          mobileCards={(b) => <Card className="w-full p-3"><div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold text-ink">{b.horse}</p><p className="text-[12px] text-slate-500">{b.race}</p></div><span className="rounded-md bg-amber-50 px-2 py-0.5 text-[13px] font-bold text-amber-700 tnum">{b.rate.toFixed(2)}×</span></div><div className="mt-2 flex items-center justify-between text-[12px] text-slate-500"><span className="tnum">{fmtPoints(b.totalStaked)} staked</span><span className="tnum">{b.tickets} tickets</span></div></Card>} />
      </Card>

      {/* edit rate */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit rate" sub={editing?.horse} icon="Coins" tone="gold" size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" icon="Save" onClick={() => { push({ tone: "emerald", title: "Rate updated", desc: `${rate}×` }); setEditing(null); }}>Save rate</Button></>}>
        <div className="space-y-3">
          <Field label="New rate" hint="Lower rate = stronger favourite"><TextInput value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          {rate && <div className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600">Implied probability: <span className="font-bold text-ink tnum">{((1 / parseFloat(rate || "1")) * 100).toFixed(0)}%</span></div>}
        </div>
      </Modal>

      {/* generate bets */}
      <Modal open={gen} onClose={() => setGen(false)} title="Generate bet options" sub="Auto-create win markets for a race" icon="Sparkles" tone="violet" size="md"
        footer={<><Button variant="secondary" onClick={() => setGen(false)}>Cancel</Button><Button variant="primary" icon="Sparkles" onClick={() => { push({ tone: "emerald", title: "Bets generated" }); setGen(false); }}>Generate</Button></>}>
        <div className="space-y-4">
          <Field label="Race"><Select value="r2" onChange={() => {}} options={races.map((r) => ({ value: r.id, label: `R${r.number} · ${r.name}` }))} /></Field>
          <Field label="Market type"><Select value="win" onChange={() => {}} options={[{ value: "win", label: "Win" }, { value: "place", label: "Place (top 3)" }]} /></Field>
          <div className="rounded-lg border border-line bg-slate-50 p-3 text-[13px] text-slate-600">Rates are seeded from each horse's ranking points and recent form, then adjustable per selection.</div>
        </div>
      </Modal>
    </div>
  );
}

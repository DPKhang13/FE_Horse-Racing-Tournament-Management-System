import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import {
  Avatar, Badge, Button, Card, ConfirmationDialog, DataTable, EmptyState,
  Field, Icon, IconButton, MetricCard, Modal, SearchInput, Select, StatusChip, TextInput, Toolbar, useToast,
} from "@/components/ui";
import type { Column, Option } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { ScheduleCard } from "@/components/widgets";
import { races, schedules, tournaments, users, ROLE_META } from "@/lib/data";
import type { Role, Tournament, User } from "@/lib/types";
import type { Tone } from "@/lib/data";
import { fmtDate, fmtTime, fmtVNDcompact, relativeTime } from "@/lib/format";

/* ============================ USERS ============================ */
export function Users() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<User | null>(null);
  const [action, setAction] = useState<null | "deactivate" | "activate" | "reset">(null);

  const filtered = useMemo(() => users.filter((u) => {
    const okQ = (u.name + u.email + (u.org ?? "")).toLowerCase().includes(q.toLowerCase());
    return okQ && (role === "all" || u.role === role) && (status === "all" || u.status === status);
  }), [q, role, status]);

  const roleOptions: Option[] = [{ value: "all", label: "All roles" }, ...(Object.keys(ROLE_META) as Role[]).map((r) => ({ value: r, label: ROLE_META[r].label, tone: ROLE_META[r].tone }))];
  const statusOptions: Option[] = [{ value: "all", label: "All status" }, { value: "active", label: "Active", tone: "emerald" }, { value: "pending", label: "Pending", tone: "gold" }, { value: "inactive", label: "Inactive", tone: "slate" }];

  const columns: Column<User>[] = [
    { key: "name", header: "User", sortValue: (u) => u.name, render: (u) => (
      <div className="flex items-center gap-3">
        <Avatar name={u.name} size={36} tone={ROLE_META[u.role].tone as Tone} />
        <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{u.name}</p><p className="truncate text-[12px] text-slate-500">{u.email}</p></div>
      </div>
    ) },
    { key: "role", header: "Role", render: (u) => <Badge tone={ROLE_META[u.role].tone as Tone}><Icon name={ROLE_META[u.role].icon} size={11} />{ROLE_META[u.role].label}</Badge> },
    { key: "org", header: "Organization", render: (u) => <span className="text-[13px] text-slate-600">{u.org ?? u.license ?? "—"}</span> },
    { key: "joined", header: "Joined", sortValue: (u) => u.joined, render: (u) => <span className="text-[13px] text-slate-600 tnum">{fmtDate(u.joined)}</span> },
    { key: "active", header: "Last active", render: (u) => <span className="text-[13px] text-slate-500">{relativeTime(u.lastActive)}</span> },
    { key: "status", header: "Status", render: (u) => <StatusChip status={u.status} /> },
    { key: "actions", header: "", align: "right", render: (u) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(u)} />
        <IconButton name="Shield" label="Reset password" size="sm" onClick={() => { setTarget(u); setAction("reset"); }} />
        {u.status === "active"
          ? <IconButton name="Ban" label="Deactivate" tone="red" size="sm" onClick={() => { setTarget(u); setAction("deactivate"); }} />
          : <IconButton name="CheckCircle2" label="Activate" tone="emerald" size="sm" onClick={() => { setTarget(u); setAction("activate"); }} />}
      </div>
    ) },
  ];

  const confirmLabel = action === "reset" ? "Send reset link" : action === "deactivate" ? "Deactivate" : "Activate";
  return (
    <div className="space-y-5">
      <PageHeader title="User Management" sub="Accounts, roles & access control" icon="Users"
        actions={<Button variant="primary" icon="UserPlus" size="sm" onClick={() => setCreating(true)}>Create user</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total users" value={users.length} icon="Users" tone="violet" />
        <MetricCard label="Owners" value={users.filter((u) => u.role === "owner").length} icon="Home" tone="emerald" />
        <MetricCard label="Jockeys" value={users.filter((u) => u.role === "jockey").length} icon="UserRound" tone="blue" />
        <MetricCard label="Pending" value={users.filter((u) => u.status === "pending").length} icon="Clock" tone="gold" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, org…" className="min-w-[200px] flex-1" />
          <Select value={role} onChange={setRole} options={roleOptions} icon="Users" trigger="bare" />
          <Select value={status} onChange={setStatus} options={statusOptions} icon="Filter" trigger="bare" />
          <Button variant="ghost" size="sm" icon="Download">Export</Button>
        </div>
        <DataTable
          columns={columns} rows={filtered} rowKey={(u) => u.id} pageSize={8} onRowClick={(u) => setEditing(u)}
          mobileCards={(u) => (
            <Card className="w-full p-3">
              <div className="flex items-center gap-3"><Avatar name={u.name} size={36} tone={ROLE_META[u.role].tone as Tone} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{u.name}</p><p className="truncate text-[12px] text-slate-500">{u.email}</p></div><StatusChip status={u.status} /></div>
              <div className="mt-2 flex items-center justify-between"><Badge tone={ROLE_META[u.role].tone as Tone}>{ROLE_META[u.role].label}</Badge><span className="text-[12px] text-slate-500">Joined {fmtDate(u.joined)}</span></div>
            </Card>
          )}
        />
      </Card>
      <UserForm open={creating} onClose={() => setCreating(false)} onSave={() => { push({ tone: "emerald", title: "User created" }); setCreating(false); }} />
      <UserForm open={!!editing} user={editing ?? undefined} onClose={() => setEditing(null)} onSave={() => { push({ tone: "emerald", title: "User updated" }); setEditing(null); }} />
      <ConfirmationDialog
        open={!!action} onClose={() => setAction(null)}
        onConfirm={() => { push({ tone: action === "deactivate" ? "red" : "emerald", title: `${confirmLabel} · ${target?.name ?? ""}` }); }}
        title={`${confirmLabel}?`} tone={action === "deactivate" ? "danger" : "primary"}
        icon={action === "reset" ? "Shield" : action === "deactivate" ? "Ban" : "CheckCircle2"}
        message={action === "reset" ? `A password reset link will be emailed to ${target?.email}.` : `This will ${action} the account for ${target?.name}. They ${action === "deactivate" ? "will lose access immediately" : "will be able to sign in again"}.`}
        confirmLabel={confirmLabel}
      />
    </div>
  );
}

function UserForm({ open, onClose, onSave, user }: { open: boolean; onClose: () => void; onSave: () => void; user?: User }) {
  const [r, setR] = useState<Role>(user?.role ?? "owner");
  const roleOpts: Option[] = (Object.keys(ROLE_META) as Role[]).map((x) => ({ value: x, label: ROLE_META[x].label, tone: ROLE_META[x].tone }));
  return (
    <Modal open={open} onClose={onClose} title={user ? "Edit user" : "Create user"} sub="Fields adapt to the selected role" icon="UserPlus" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>{user ? "Save changes" : "Create user"}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required><TextInput defaultValue={user?.name} placeholder="Nguyen Van An" /></Field>
          <Field label="Email" required><TextInput icon="Mail" type="email" defaultValue={user?.email} placeholder="name@stable.vn" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" required><Select value={r} onChange={(v) => setR(v as Role)} options={roleOpts} /></Field>
          <Field label="Status"><Select value={user?.status ?? "active"} onChange={() => {}} options={[{ value: "active", label: "Active", tone: "emerald" }, { value: "pending", label: "Pending", tone: "gold" }, { value: "inactive", label: "Inactive", tone: "slate" }]} /></Field>
        </div>
        {(r === "owner" || r === "jockey" || r === "referee") && (
          <Field label="License number" hint="Issued by the racing authority"><TextInput icon="Stamp" defaultValue={user?.license} placeholder={r === "owner" ? "OWN-VN-2201" : r === "jockey" ? "JC-VN-1042" : "REF-VN-0188"} /></Field>
        )}
        {r === "owner" && <Field label="Stable / organization"><TextInput icon="Home" defaultValue={user?.org} placeholder="Red Dragon Stables" /></Field>}
        {r === "jockey" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Base weight (kg)"><TextInput icon="Gauge" placeholder="54" /></Field><Field label="Career wins"><TextInput placeholder="0" /></Field></div>}
      </div>
    </Modal>
  );
}

/* ========================= TOURNAMENTS ========================= */
export function Tournaments() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [creating, setCreating] = useState(false);
  const [cancelT, setCancelT] = useState<Tournament | null>(null);

  const filtered = tournaments.filter((t) => (status === "all" || t.status === status) && (t.name + t.code + t.venue).toLowerCase().includes(q.toLowerCase()));
  const statusOpts: Option[] = [{ value: "all", label: "All status" }, { value: "ongoing", label: "Ongoing", tone: "emerald" }, { value: "scheduled", label: "Scheduled", tone: "blue" }, { value: "completed", label: "Completed", tone: "slate" }, { value: "draft", label: "Draft", tone: "slate" }];

  const columns: Column<Tournament>[] = [
    { key: "name", header: "Tournament", sortValue: (t) => t.name, render: (t) => (
      <div className="flex items-center gap-3"><img src={t.cover} alt="" className="h-9 w-12 rounded-lg object-cover" /><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{t.name}</p><p className="truncate text-[12px] text-slate-500">{t.code} · {t.tier}</p></div></div>
    ) },
    { key: "venue", header: "Venue", render: (t) => <div><p className="text-[13px] text-ink">{t.venue}</p><p className="text-[12px] text-slate-500">{t.city}</p></div> },
    { key: "dates", header: "Dates", render: (t) => <span className="text-[13px] text-slate-600 tnum">{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</span> },
    { key: "prize", header: "Prize pool", align: "right", sortValue: (t) => t.prizePool, render: (t) => <span className="text-[13px] font-bold text-amber-700 tnum">{t.prizePool ? fmtVNDcompact(t.prizePool) : "—"}</span> },
    { key: "fill", header: "Runners", render: (t) => <div className="w-28"><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span className="tnum">{t.participants}</span><span className="tnum">{t.capacity}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(t.participants / t.capacity) * 100}%` }} /></div></div> },
    { key: "status", header: "Status", render: (t) => <StatusChip status={t.status} /> },
    { key: "actions", header: "", align: "right", render: (t) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="CalendarDays" label="Schedule" size="sm" onClick={() => push({ tone: "blue", title: "Opening schedule" })} />
        <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(t)} />
        {t.status !== "cancelled" && t.status !== "completed" && <IconButton name="Ban" label="Cancel" tone="red" size="sm" onClick={() => setCancelT(t)} />}
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Tournament Management" sub="Create & govern racing events" icon="Trophy"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setCreating(true)}>New tournament</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={tournaments.length} icon="Trophy" tone="violet" />
        <MetricCard label="Upcoming" value={tournaments.filter((t) => t.status === "scheduled").length} icon="CalendarDays" tone="blue" />
        <MetricCard label="Ongoing" value={tournaments.filter((t) => t.status === "ongoing").length} icon="Radio" tone="emerald" />
        <MetricCard label="Participants" value={tournaments.reduce((a, t) => a + t.participants, 0)} icon="UsersRound" tone="gold" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search tournaments…" className="min-w-[200px] flex-1" />
          <Select value={status} onChange={setStatus} options={statusOpts} icon="Filter" trigger="bare" />
          <Button variant="ghost" size="sm" icon="Calendar">Date range</Button>
        </div>
        <DataTable columns={columns} rows={filtered} rowKey={(t) => t.id} pageSize={6} onRowClick={(t) => setEditing(t)}
          mobileCards={(t) => <Card className="w-full p-3"><div className="flex items-center gap-3"><img src={t.cover} className="h-10 w-12 rounded-lg object-cover" alt="" /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{t.name}</p><p className="text-[12px] text-slate-500">{t.venue}</p></div><StatusChip status={t.status} /></div><div className="mt-2 flex items-center justify-between text-[12px]"><span className="text-amber-700 font-bold tnum">{t.prizePool ? fmtVNDcompact(t.prizePool) : "—"}</span><span className="text-slate-500 tnum">{t.participants}/{t.capacity} runners</span></div></Card>} />
      </Card>
      <TournamentForm open={creating} onClose={() => setCreating(false)} onSave={() => { push({ tone: "emerald", title: "Tournament created" }); setCreating(false); }} />
      <TournamentForm open={!!editing} tournament={editing ?? undefined} onClose={() => setEditing(null)} onSave={() => { push({ tone: "emerald", title: "Tournament updated" }); setEditing(null); }} />
      <ConfirmationDialog open={!!cancelT} onClose={() => setCancelT(null)} onConfirm={() => push({ tone: "red", title: "Tournament cancelled", desc: cancelT?.name })} title="Cancel tournament?" tone="danger" icon="Ban" message={`Cancelling "${cancelT?.name}" will void all scheduled races and refund entries. This cannot be undone.`} confirmLabel="Cancel tournament" />
    </div>
  );
}

function TournamentForm({ open, onClose, onSave, tournament }: { open: boolean; onClose: () => void; onSave: () => void; tournament?: Tournament }) {
  const [tier, setTier] = useState<Tournament["tier"]>(tournament?.tier ?? "Classic");
  return (
    <Modal open={open} onClose={onClose} title={tournament ? "Edit tournament" : "Create tournament"} sub="Configure event details & prize structure" icon="Trophy" size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>{tournament ? "Save changes" : "Create tournament"}</Button></>}>
      <div className="space-y-6">
        <section>
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">General</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tournament name" required className="sm:col-span-2"><TextInput defaultValue={tournament?.name} placeholder="Saigon Grand Prix 2026" /></Field>
            <Field label="Short code" required><TextInput defaultValue={tournament?.code} placeholder="SGP-2026" /></Field>
            <Field label="Tier"><Select value={tier} onChange={(v) => setTier(v as Tournament["tier"])} options={[{ value: "Premier", label: "Premier", tone: "gold" }, { value: "Classic", label: "Classic", tone: "blue" }, { value: "Open", label: "Open", tone: "slate" }]} /></Field>
            <Field label="Venue"><TextInput icon="MapPin" defaultValue={tournament?.venue} placeholder="Phu Tho Turf Club" /></Field>
            <Field label="City"><TextInput defaultValue={tournament?.city} placeholder="Ho Chi Minh City" /></Field>
            <Field label="Start date"><TextInput type="date" /></Field>
            <Field label="End date"><TextInput type="date" /></Field>
            <Field label="Runner capacity"><TextInput icon="UsersRound" defaultValue={tournament ? String(tournament.capacity) : ""} placeholder="200" /></Field>
          </div>
        </section>
        <section>
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-slate-400">Prize setup</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total prize pool (₫)"><TextInput icon="Coins" defaultValue={tournament ? String(tournament.prizePool) : ""} placeholder="2,400,000,000" /></Field>
            <Field label="Winner share"><TextInput defaultValue="46%" /></Field>
            <Field label="Payout depth"><Select value="6" onChange={() => {}} options={[{ value: "3", label: "Top 3" }, { value: "6", label: "Top 6" }]} /></Field>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[{ p: "1st", v: "46%" }, { p: "2nd", v: "23%" }, { p: "3rd", v: "11%" }, { p: "4th", v: "5%" }, { p: "5th", v: "3%" }, { p: "6th", v: "2%" }].map((x) => (
              <div key={x.p} className="rounded-lg border border-line bg-slate-50 p-2 text-center"><p className="text-[11px] text-slate-400">{x.p}</p><p className="text-[13px] font-bold text-amber-700 tnum">{x.v}</p></div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}

/* ===================== TOURNAMENT SCHEDULE (view) ===================== */
export function TournamentSchedule() {
  const [day, setDay] = useState(schedules[1].id);
  const dayRaces = races.filter((r) => r.scheduleId === day);
  const t = tournaments[0];
  const current = schedules.find((s) => s.id === day)!;
  return (
    <div className="space-y-5">
      <PageHeader title="Tournament Schedule" sub={`${t.name} · race-day programme`} icon="CalendarDays"
        actions={<><Button variant="secondary" icon="Download" size="sm">Export PDF</Button><Button variant="primary" icon="CalendarDays" size="sm">Add race day</Button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Race days" value={schedules.length} icon="CalendarDays" tone="violet" />
        <MetricCard label="Scheduled" value={races.filter((r) => r.status === "scheduled").length} icon="Clock" tone="blue" />
        <MetricCard label="Ongoing" value={races.filter((r) => r.status === "ongoing").length} icon="Radio" tone="emerald" />
        <MetricCard label="Finished" value={races.filter((r) => r.status === "completed").length} icon="CheckCircle2" tone="slate" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {schedules.map((s) => <ScheduleCard key={s.id} date={s.date} label={s.label} gates={s.gates} races={s.races} status={s.status} active={s.id === day} onClick={() => setDay(s.id)} />)}
      </div>
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-[15px] font-semibold text-ink">{current.label}</p><p className="text-[13px] text-slate-500">{fmtDate(current.date)} · First gate {current.gates}</p></div>
          <Badge tone="blue">{dayRaces.length} races</Badge>
        </div>
        {dayRaces.length === 0 ? <EmptyState icon="Flag" title="No races scheduled" sub="Add races to this race day." /> : (
          <div className="relative space-y-2.5 border-l-2 border-line pl-4">
            {dayRaces.map((r) => (
              <div key={r.id} className="relative">
                <span className={cn("absolute -left-[1.42rem] top-3 h-3 w-3 rounded-full ring-4 ring-canvas", r.status === "ongoing" ? "bg-emerald-500" : r.status === "completed" ? "bg-slate-400" : "bg-sky-500")} />
                <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">R{r.number}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{r.name}</p><p className="text-[12px] text-slate-500">{r.rankGroup} · {r.distance}m · {r.trackType}</p></div>
                  <div className="hidden text-right sm:block"><p className="text-[13px] font-semibold text-ink tnum">{fmtTime(r.scheduledAt)}</p><p className="text-[11px] text-slate-400">{r.enteredHorses}/{r.maxHorses} runners</p></div>
                  <StatusChip status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ======================= SCHEDULE MANAGEMENT ======================= */
export function ScheduleAdmin() {
  const { push } = useToast();
  const [tId, setTId] = useState("t1");
  const [editing, setEditing] = useState<typeof schedules[0] | null>(null);
  const [creating, setCreating] = useState(false);
  const [delS, setDelS] = useState<typeof schedules[0] | null>(null);
  const list = schedules.filter((s) => s.tournamentId === tId);
  const tOpts: Option[] = tournaments.map((t) => ({ value: t.id, label: t.name }));

  const columns: Column<typeof schedules[0]>[] = [
    { key: "date", header: "Race day", sortValue: (s) => s.date, render: (s) => <div><p className="text-[13px] font-semibold text-ink tnum">{fmtDate(s.date)}</p><p className="text-[12px] text-slate-500">{s.label}</p></div> },
    { key: "gates", header: "First gate", render: (s) => <span className="text-[13px] text-slate-600 tnum">{s.gates}</span> },
    { key: "races", header: "Races", align: "center", render: (s) => <Badge tone="slate">{s.races} races</Badge> },
    { key: "status", header: "Status", render: (s) => <StatusChip status={s.status} /> },
    { key: "actions", header: "", align: "right", render: (s) => (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(s)} />
        <IconButton name="Trash2" label="Delete" tone="red" size="sm" onClick={() => setDelS(s)} />
      </div>
    ) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Schedule Management" sub="Build & sequence race days" icon="CalendarDays"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setCreating(true)}>Add race day</Button>} />
      <Toolbar>
        <span className="text-[13px] font-medium text-slate-500">Tournament</span>
        <Select value={tId} onChange={setTId} options={tOpts} className="min-w-[260px]" />
      </Toolbar>
      <Card>
        <DataTable columns={columns} rows={list} rowKey={(s) => s.id} pageSize={8}
          empty={<EmptyState icon="CalendarDays" title="No race days yet" sub="Create the first race day for this tournament." action={<Button variant="primary" size="sm" icon="Plus" onClick={() => setCreating(true)}>Add race day</Button>} />}
          mobileCards={(s) => <Card className="w-full p-3"><div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold text-ink tnum">{fmtDate(s.date)}</p><p className="text-[12px] text-slate-500">{s.label} · {s.gates}</p></div><StatusChip status={s.status} /></div><div className="mt-2"><Badge tone="slate">{s.races} races</Badge></div></Card>} />
      </Card>
      <ScheduleForm open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={() => { push({ tone: "emerald", title: "Race day saved" }); setCreating(false); setEditing(null); }} day={editing ?? undefined} />
      <ConfirmationDialog open={!!delS} onClose={() => setDelS(null)} onConfirm={() => push({ tone: "red", title: "Race day deleted" })} title="Delete race day?" icon="Trash2" message={`This will remove "${delS?.label}" (${fmtDate(delS?.date ?? "")}) and unlink its races. Races themselves won't be deleted.`} confirmLabel="Delete" />
    </div>
  );
}

function ScheduleForm({ open, onClose, onSave, day }: { open: boolean; onClose: () => void; onSave: () => void; day?: typeof schedules[0] }) {
  return (
    <Modal open={open} onClose={onClose} title={day ? "Edit race day" : "Add race day"} icon="CalendarDays" size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" required><TextInput type="date" defaultValue={day?.date} /></Field>
          <Field label="First gate time"><TextInput type="time" defaultValue={day?.gates} /></Field>
        </div>
        <Field label="Label" hint="e.g. Opening Day, Grand Final Day"><TextInput defaultValue={day?.label} placeholder="Opening Day" /></Field>
        <Field label="Number of races on this day"><TextInput defaultValue={day ? String(day.races) : "6"} placeholder="6" /></Field>
        <Field label="Status"><Select value={day?.status ?? "scheduled"} onChange={() => {}} options={[{ value: "scheduled", label: "Scheduled", tone: "blue" }, { value: "ongoing", label: "Ongoing", tone: "emerald" }, { value: "completed", label: "Completed", tone: "slate" }]} /></Field>
      </div>
    </Modal>
  );
}

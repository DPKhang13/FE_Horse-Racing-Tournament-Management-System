import { useState } from "react";
import { cn } from "@/utils/cn";
import {
  Avatar, Badge, Button, Card, ConfirmationDialog, DataTable, EmptyState, Field, Icon, IconButton,
  MetricCard, Modal, SearchInput, Select, StatusChip, Tabs, TextArea, TextInput, Toggle, TONE, useToast,
} from "@/components/ui";
import type { Column } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HorseAvatar, Podium, PrizeBreakdown, PredictionCard, WalletBalanceCard } from "@/components/widgets";
import {
  CURRENT, OWNER, WALLET, betOptions, horses, jockeys, notifications, predictions, races, results, walletTxs, ROLE_META,
} from "@/lib/data";
import type { Notification, Prediction, Result, Role } from "@/lib/types";
import type { Tone } from "@/lib/data";
import { fmtDate, fmtPoints, fmtTime, fmtVND, fmtVNDcompact, relativeTime } from "@/lib/format";

/* ============================== RESULTS ============================== */
export function Results({ role, onOpen }: { role: Role; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState(role === "owner" ? "all" : "all");
  const list = results.filter((r) => {
    const okQ = (r.race + r.tournament).toLowerCase().includes(q.toLowerCase());
    const okMode = mode === "all" || r.rows.some((row) => OWNER.horses.some((h) => h.name === row.horse));
    return okQ && okMode;
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Results" sub="Official race results" icon="ListOrdered" />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {role === "owner" && <Tabs value={mode} onChange={setMode} size="sm" tabs={[{ value: "all", label: "All results" }, { value: "mine", label: "My horses" }]} />}
        <SearchInput value={q} onChange={setQ} placeholder="Search races…" className="ml-auto min-w-[200px] max-w-xs flex-1" />
      </div>
      {list.length === 0 ? <EmptyState icon="Trophy" title="No results" sub="Results will appear here once races are completed." /> : (
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id} hover className="cursor-pointer p-4" >
              <div onClick={() => onOpen(r.id)} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-white"><Icon name="Trophy" size={18} /></span>
                  <div><p className="text-[14px] font-bold text-ink">{r.race}</p><p className="text-[12px] text-slate-500">{r.tournament} · {fmtDate(r.date)}</p></div>
                </div>
                <Badge tone="blue">{r.distance}m {r.trackType}</Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {r.rows.slice(0, 3).map((row) => (
                  <div key={row.pos} className={cn("flex items-center gap-2 rounded-lg border p-2", row.pos === 1 ? "border-amber-200 bg-amber-50/50" : "border-line")}>
                    <span className={cn("grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold", row.pos === 1 ? "bg-amber-100 text-amber-700" : row.pos === 2 ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-700")}>{row.pos}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{row.horse}</p><p className="truncate text-[11px] text-slate-500">{row.jockey}</p></div>
                    <span className="mono text-[12px] font-semibold text-slate-500">{row.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================== RESULT DETAIL =========================== */
export function ResultDetail({ id }: { id?: string }) {
  const r: Result = results.find((x) => x.id === id) ?? results[0];
  const [sel, setSel] = useState(r.id);
  const current = results.find((x) => x.id === sel) ?? r;
  const totalPrize = current.rows.reduce((a, x) => a + x.prize, 0);
  return (
    <div className="space-y-5">
      <PageHeader title="Race Result" sub={`${current.tournament} · ${fmtDate(current.date)}`} icon="Trophy"
        actions={<Select value={sel} onChange={setSel} options={results.map((x) => ({ value: x.id, label: x.race }))} className="min-w-[220px]" />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Distance" value={`${current.distance}m`} icon="Gauge" tone="blue" />
        <MetricCard label="Track" value={current.trackType} icon="Layers" tone="slate" />
        <MetricCard label="Runners" value={current.rows.length} icon="UsersRound" tone="violet" />
        <MetricCard label="Prize pool" value={fmtVNDcompact(totalPrize)} icon="Coins" tone="gold" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2"><Icon name="Crown" size={18} className="text-amber-500" /><span className="text-[15px] font-bold text-ink">Podium</span></div>
        <Podium rows={current.rows} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-line px-4 py-3"><span className="text-[14px] font-semibold text-ink">Full result</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 text-left">Pos</th><th className="px-4 py-2.5 text-left">Horse</th><th className="px-4 py-2.5 text-left">Jockey</th><th className="px-4 py-2.5 text-center">Gate</th><th className="px-4 py-2.5 text-right">Time</th><th className="px-4 py-2.5 text-right">Margin</th><th className="px-4 py-2.5 text-right">Points</th><th className="px-4 py-2.5 text-right">Prize</th>
              </tr></thead>
              <tbody>
                {current.rows.map((row) => (
                  <tr key={row.pos} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5"><span className={cn("grid h-6 w-6 place-items-center rounded-md text-[11px] font-bold", row.pos === 1 ? "bg-amber-100 text-amber-700" : row.pos === 2 ? "bg-slate-200 text-slate-600" : row.pos === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>{row.pos}</span></td>
                    <td className="px-4 py-2.5 font-semibold text-ink">{row.horse}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.jockey}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500 tnum">{row.gate}</td>
                    <td className="px-4 py-2.5 text-right mono font-semibold text-ink">{row.time}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{row.margin}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-ink tnum">{row.points}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-amber-700 tnum">{row.prize ? fmtVNDcompact(row.prize) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><Icon name="Coins" size={16} className="text-amber-600" /><span className="text-[14px] font-semibold text-ink">Prize & points breakdown</span></div>
          <PrizeBreakdown rows={current.rows} />
          <div className="mt-3 space-y-1 border-t border-line pt-3">
            <div className="flex justify-between text-[13px]"><span className="text-slate-500">Total prize</span><span className="font-bold text-amber-700 tnum">{fmtVND(totalPrize)}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-slate-500">Points awarded</span><span className="font-semibold text-ink tnum">{current.rows.reduce((a, x) => a + x.points, 0)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================== RANKINGS ============================== */
export function Rankings() {
  const [cat, setCat] = useState<"horses" | "jockeys">("horses");
  const data = cat === "horses" ? [...horses].sort((a, b) => b.points - a.points) : [...jockeys].sort((a, b) => b.points - a.points);
  const top = data[0];
  return (
    <div className="space-y-5">
      <PageHeader title="Rankings" sub="Season leaderboards" icon="BarChart3"
        actions={<Tabs value={cat} onChange={(v) => setCat(v as "horses" | "jockeys")} size="sm" tabs={[{ value: "horses", label: "Horses", icon: "Cookie" }, { value: "jockeys", label: "Jockeys", icon: "UserRound" }]} />} />

      {/* Top highlight */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-400"><Icon name="Crown" size={32} /></span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-400">Current leader · {cat === "horses" ? "Horse" : "Jockey"}</p>
            <p className="text-2xl font-bold">{top.name}</p>
            <p className="text-[13px] text-slate-300">{cat === "horses" ? (top as typeof horses[0]).ownerStable : (top as typeof jockeys[0]).org}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center"><p className="text-3xl font-bold text-amber-400 tnum">{top.points}</p><p className="text-[11px] uppercase text-slate-400">Points</p></div>
            <div className="text-center"><p className="text-3xl font-bold tnum">{(top as any).wins}</p><p className="text-[11px] uppercase text-slate-400">Wins</p></div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <DataTable
          columns={[
            { key: "rank", header: "#", render: (_: any, i: number) => <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "text-slate-400")}>{i + 1}</span> },
            { key: "name", header: cat === "horses" ? "Horse" : "Jockey", render: (x: any) => (
              <div className="flex items-center gap-3">
                {cat === "horses" ? <HorseAvatar src={x.avatar} color={x.color} size={34} /> : <img src={x.avatar} className="h-9 w-9 rounded-full object-cover" alt="" />}
                <div><p className="text-[13px] font-semibold text-ink">{x.name}</p><p className="text-[12px] text-slate-500">{cat === "horses" ? `${x.breed} · ${x.rankGroup}` : x.org}</p></div>
              </div>
            ) },
            { key: "wins", header: "Wins", align: "right", sortValue: (x: any) => x.wins, render: (x: any) => <span className="text-[13px] font-semibold text-ink tnum">{x.wins}</span> },
            { key: "starts", header: cat === "horses" ? "Starts" : "Rides", align: "right", render: (x: any) => <span className="text-[13px] text-slate-600 tnum">{x.starts}</span> },
            { key: "points", header: "Points", align: "right", sortValue: (x: any) => x.points, render: (x: any) => <div className="flex items-center justify-end gap-2"><div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(x.points / top.points) * 100}%` }} /></div><span className="text-[13px] font-bold text-ink tnum">{x.points}</span></div> },
          ]}
          rows={data} rowKey={(x: any) => x.id} pageSize={10}
          mobileCards={(x: any, i: number) => (
            <Card className="w-full p-3">
              <div className="flex items-center gap-3">
                <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-[12px] font-bold", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>{i + 1}</span>
                {cat === "horses" ? <HorseAvatar src={x.avatar} color={x.color} size={34} /> : <img src={x.avatar} className="h-9 w-9 rounded-full object-cover" alt="" />}
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{x.name}</p><p className="truncate text-[12px] text-slate-500">{cat === "horses" ? `${x.wins}W · ${x.rankGroup}` : x.org}</p></div>
                <span className="text-[14px] font-bold text-ink tnum">{x.points}</span>
              </div>
            </Card>
          )}
        />
      </Card>
    </div>
  );
}

/* ============================ NOTIFICATIONS ============================ */
export function NotificationsPage() {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Notification[]>(notifications);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [creating, setCreating] = useState(false);
  const [del, setDel] = useState<Notification | null>(null);
  const filtered = list.filter((n) => (n.title + n.body).toLowerCase().includes(q.toLowerCase()));
  const typeIcon: Record<string, string> = { race: "Radio", wallet: "Wallet", system: "Info", registration: "ClipboardList", result: "Trophy" };
  const typeTone: Record<string, Tone> = { race: "red", wallet: "gold", system: "blue", registration: "emerald", result: "violet" };

  const toggleRead = (id: string) => setList((l) => l.map((n) => n.id === id ? { ...n, status: n.status === "unread" ? "read" : "unread" } : n));
  const remove = (id: string) => setList((l) => l.filter((n) => n.id !== id));

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" sub="Operations inbox" icon="Bell"
        actions={<Button variant="primary" icon="Plus" size="sm" onClick={() => setCreating(true)}>New notification</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total" value={list.length} icon="Bell" tone="violet" />
        <MetricCard label="Unread" value={list.filter((n) => n.status === "unread").length} icon="CircleAlert" tone="gold" />
        <MetricCard label="Race alerts" value={list.filter((n) => n.type === "race").length} icon="Radio" tone="red" />
        <MetricCard label="Wallet" value={list.filter((n) => n.type === "wallet").length} icon="Wallet" tone="gold" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search notifications…" className="min-w-[200px] flex-1" />
          <Button variant="ghost" size="sm" icon="CheckCheck" onClick={() => { setList((l) => l.map((n) => ({ ...n, status: "read" }))); push({ tone: "emerald", title: "All marked read" }); }}>Mark all read</Button>
        </div>
        <div className="divide-y divide-line">
          {filtered.length === 0 ? <EmptyState icon="Bell" title="No notifications" /> : filtered.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3", n.status === "unread" && "bg-amber-50/40")}>
              <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg", TONE[typeTone[n.type]].bg, TONE[typeTone[n.type]].text)}><Icon name={typeIcon[n.type]} size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="text-[13px] font-semibold text-ink">{n.title}</p>{n.status === "unread" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}</div>
                <p className="text-[12px] leading-snug text-slate-500">{n.body}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400"><span>{relativeTime(n.createdAt)}</span>·<Badge tone="slate">{n.audience}</Badge></div>
              </div>
              <div className="flex items-center gap-0.5">
                <IconButton name={n.status === "unread" ? "CircleAlert" : "Check"} label="Toggle read" size="sm" onClick={() => toggleRead(n.id)} />
                <IconButton name="Pencil" label="Edit" size="sm" onClick={() => setEditing(n)} />
                <IconButton name="Trash2" label="Delete" tone="red" size="sm" onClick={() => setDel(n)} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <NotificationForm open={creating || !!editing} n={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} onSave={() => { push({ tone: "emerald", title: "Notification saved" }); setCreating(false); setEditing(null); }} onDelete={editing ? () => { remove(editing.id); setEditing(null); push({ tone: "red", title: "Deleted" }); } : undefined} />
      <ConfirmationDialog open={!!del} onClose={() => setDel(null)} onConfirm={() => { if (del) remove(del.id); push({ tone: "red", title: "Notification deleted" }); }} title="Delete notification?" icon="Trash2" message="This notification will be permanently removed." confirmLabel="Delete" />
    </div>
  );
}

function NotificationForm({ open, onClose, onSave, n, onDelete }: { open: boolean; onClose: () => void; onSave: () => void; n?: Notification; onDelete?: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={n ? "Edit notification" : "New notification"} icon="Bell" size="md"
      footer={<><div className="mr-auto">{onDelete && <Button variant="ghost" icon="Trash2" className="text-rose-600" onClick={onDelete}>Delete</Button>}</div><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" icon="Save" onClick={onSave}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><TextInput defaultValue={n?.title} placeholder="Race 1 is now LIVE" /></Field>
        <Field label="Message"><TextArea defaultValue={n?.body} placeholder="Details of the announcement…" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type"><Select value={n?.type ?? "race"} onChange={() => {}} options={[{ value: "race", label: "Race", tone: "red" }, { value: "wallet", label: "Wallet", tone: "gold" }, { value: "registration", label: "Registration", tone: "emerald" }, { value: "system", label: "System", tone: "blue" }, { value: "result", label: "Result", tone: "violet" }]} /></Field>
          <Field label="Audience"><Select value={n?.audience ?? "All roles"} onChange={() => {}} options={["All roles", "Horse Owners", "Jockeys", "Race Referees", "Spectators"].map((a) => ({ value: a, label: a }))} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ================================ WALLET ================================ */
export function Wallet() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState("vnpay-qr");
  const [payState, setPayState] = useState<"form" | "processing" | "result">("form");
  const [result, setResult] = useState<"success" | "failed" | "pending">("success");

  const startPay = (res: "success" | "failed" | "pending") => { setPayState("processing"); setResult(res); setTimeout(() => setPayState("result"), 1400); };

  const txCols: Column<typeof walletTxs[0]>[] = [
    { key: "ref", header: "Transaction", sortValue: (t) => t.ref, render: (t) => (
      <div className="flex items-center gap-3"><span className={cn("grid h-9 w-9 place-items-center rounded-lg", t.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}><Icon name={t.type === "topup" ? "Plus" : t.type === "payout" ? "Coins" : t.type === "refund" ? "RefreshCw" : "Target"} size={16} /></span><div><p className="text-[13px] font-semibold text-ink">{t.method}</p><p className="mono text-[11px] text-slate-400">{t.ref}</p></div></div>
    ) },
    { key: "date", header: "Date", render: (t) => <span className="text-[13px] text-slate-500">{fmtDate(t.date)} · {fmtTime(t.date)}</span> },
    { key: "amount", header: "Amount", align: "right", sortValue: (t) => t.amount, render: (t) => <span className={cn("text-[13px] font-bold tnum", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>{t.amount > 0 ? "+" : ""}{fmtPoints(t.amount)}</span> },
    { key: "status", header: "Status", render: (t) => <StatusChip status={t.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Wallet" sub="Points & payments" icon="Wallet" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><WalletBalanceCard balance={WALLET.balance} pending={WALLET.pending} onTopUp={() => { setPayState("form"); setOpen(true); }} /></div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Lifetime staked" value={fmtPoints(WALLET.lifetimeStaked)} icon="Target" tone="blue" />
          <MetricCard label="Lifetime won" value={fmtPoints(WALLET.lifetimeWon)} icon="Trophy" tone="gold" />
          <MetricCard label="Win rate" value={`${WALLET.winRate}%`} icon="TrendingUp" tone="emerald" />
          <MetricCard label="Net P/L" value={`+${fmtPoints(WALLET.lifetimeWon - 18080)}`} icon="Activity" tone="violet" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-[14px] font-semibold text-ink">Payment history</span><Button variant="ghost" size="sm" icon="Download">Export</Button></div>
        <DataTable columns={txCols} rows={walletTxs} rowKey={(t) => t.id} pageSize={8}
          mobileCards={(t) => <Card className="w-full p-3"><div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold text-ink">{t.method}</p><p className="text-[11px] text-slate-400">{fmtDate(t.date)} · {t.ref}</p></div><span className={cn("text-[13px] font-bold tnum", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>{t.amount > 0 ? "+" : ""}{fmtPoints(t.amount)}</span></div><div className="mt-2"><StatusChip status={t.status} /></div></Card>} />
      </Card>

      {/* Top up / pay flow */}
      <Modal open={open} onClose={() => setOpen(false)} title={payState === "result" ? "Payment result" : "Top up wallet"} icon={payState === "result" ? (result === "success" ? "CheckCircle2" : result === "failed" ? "XCircle" : "Clock") : "CreditCard"} tone={payState === "result" ? (result === "success" ? "emerald" : result === "failed" ? "red" : "gold") : "emerald"} size="sm">
        {payState === "form" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-3 text-center"><p className="text-[11px] uppercase text-emerald-600">Current balance</p><p className="text-2xl font-bold text-emerald-700 tnum">{fmtPoints(WALLET.balance)}</p></div>
            <Field label="Amount (points)" hint="1 point = 1,000 ₫"><TextInput value={amount} onChange={(e) => setAmount(e.target.value)} type="number" /></Field>
            <div className="flex gap-2">{[500, 1000, 2000, 5000].map((a) => <button key={a} onClick={() => setAmount(String(a))} className="flex-1 rounded-lg border border-line py-1.5 text-[13px] font-semibold text-slate-600 hover:border-emerald-400">{a}</button>)}</div>
            <Field label="Payment method"><Select value={method} onChange={setMethod} options={[{ value: "vnpay-qr", label: "VNPay QR" }, { value: "vnpay-atm", label: "VNPay ATM" }, { value: "vnpay-card", label: "VNPay Credit Card" }]} /></Field>
            <Button variant="primary" className="w-full" icon="CreditCard" onClick={() => startPay("success")}>Pay {Number(amount) * 1000 > 0 ? fmtVND(Number(amount) * 1000) : ""}</Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => startPay("failed")}>Simulate fail</Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => startPay("pending")}>Simulate pending</Button>
            </div>
          </div>
        )}
        {payState === "processing" && (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="Loader2" size={28} className="animate-spin" /></span>
            <p className="mt-4 text-[14px] font-semibold text-ink">Processing payment…</p>
            <p className="text-[12px] text-slate-500">Do not close this window.</p>
          </div>
        )}
        {payState === "result" && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", result === "success" ? "bg-emerald-50 text-emerald-600" : result === "failed" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600")}><Icon name={result === "success" ? "CheckCircle2" : result === "failed" ? "XCircle" : "Clock"} size={30} /></span>
            <p className="mt-4 text-[15px] font-bold text-ink">{result === "success" ? "Payment successful" : result === "failed" ? "Payment failed" : "Payment pending"}</p>
            <p className="mt-1 text-[13px] text-slate-500">{result === "success" ? `${fmtPoints(Number(amount))} added to your wallet.` : result === "failed" ? "Your card was declined. No points were charged." : "Awaiting confirmation from your bank."}</p>
            <div className="mt-5 flex w-full gap-2">
              {result === "success" ? <Button variant="primary" className="flex-1" onClick={() => { setOpen(false); push({ tone: "emerald", title: "Top up successful", desc: fmtPoints(Number(amount)) }); }}>Done</Button>
                : <Button variant="secondary" className="flex-1" onClick={() => setPayState("form")}>Try again</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================= PREDICTIONS ============================= */
export function Predictions() {
  const { push } = useToast();
  const [raceF, setRaceF] = useState("all");
  const [open, setOpen] = useState<Prediction | null>(null);
  const [stake, setStake] = useState("500");
  const races2 = Array.from(new Set(betOptions.map((b) => b.raceId)));
  const list = betOptions.filter((b) => raceF === "all" || b.raceId === raceF);
  const myStakes = predictions.filter((p) => p.status === "open");

  return (
    <div className="space-y-5">
      <PageHeader title="Predictions" sub="Open markets & your stakes" icon="Target"
        actions={<Select value={raceF} onChange={setRaceF} options={[{ value: "all", label: "All races" }, ...races2.map((rid) => ({ value: rid, label: races.find((r) => r.id === rid)?.name ?? rid }))]} icon="Flag" trigger="bare" />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><span className="text-[13px] font-bold uppercase tracking-wide text-slate-400">Open prediction windows</span><Badge tone="emerald" dot>{list.length} markets</Badge></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((b) => {
              const horse = horses.find((h) => h.id === b.horseId);
              const race = races.find((r) => r.id === b.raceId);
              return (
                <PredictionCard key={b.id} race={`${race?.name ?? ""}`} rate={b.rate} status="open"
                  horse={<div className="flex items-center gap-2">{horse && <HorseAvatar src={horse.avatar} color={horse.color} size={34} />}<div><p className="text-[14px] font-semibold text-ink">{b.horse}</p><p className="text-[11px] text-slate-500">{b.totalStaked ? `${fmtPoints(b.totalStaked)} staked` : "New market"}</p></div></div>}
                  onAction={() => { setOpen({ ...b, stake: 0, potential: 0, placedAt: "", status: "open" } as any); setStake("500"); }} actionLabel="Predict" />
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <WalletBalanceCard balance={WALLET.balance} pending={WALLET.pending} small />
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2"><Icon name="Activity" size={16} className="text-emerald-600" /><span className="text-[14px] font-semibold text-ink">Your active stakes</span></div>
            <div className="space-y-2">
              {myStakes.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-line p-2.5">
                  <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-ink">{p.horse}</p><p className="text-[11px] text-slate-500">{p.race} · {p.rate.toFixed(1)}×</p></div>
                  <div className="text-right"><p className="text-[13px] font-bold text-ink tnum">{fmtPoints(p.stake)}</p><p className="text-[11px] text-emerald-600 tnum">→ {fmtPoints(p.potential)}</p></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-2 flex items-center gap-2"><Icon name="Info" size={15} className="text-emerald-600" /><span className="text-[13px] font-semibold text-emerald-800">How predictions work</span></div>
            <ul className="space-y-1 text-[12px] text-emerald-700/90">
              <li>• Pick a horse to win. The rate sets your multiplier.</li>
              <li>• Potential = stake × rate. Higher odds = bigger risk.</li>
              <li>• Predictions close 15 min before the race starts.</li>
              <li>• Winnings auto-settle to your wallet.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* New prediction modal */}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Place prediction" sub={open?.horse ? `${open.horse} to win` : ""} icon="Target" tone="emerald" size="sm"
        footer={<><Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" icon="Check" onClick={() => { push({ tone: "emerald", title: "Prediction placed", desc: `Stake ${fmtPoints(Number(stake))}` }); setOpen(null); }}>Confirm {fmtPoints(Number(stake))}</Button></>}>
        {open && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-line p-3"><span className="text-[13px] text-slate-500">Rate</span><span className="rounded-md bg-amber-50 px-2 py-0.5 text-[14px] font-bold text-amber-700 tnum">{(open as any).rate.toFixed(2)}×</span></div>
            <Field label="Stake (points)" hint={`Available: ${fmtPoints(WALLET.balance)}`}><TextInput value={stake} onChange={(e) => setStake(e.target.value)} type="number" /></Field>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">Stake</p><p className="text-[13px] font-bold text-ink tnum">{fmtPoints(Number(stake) || 0)}</p></div>
              <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-slate-400">Rate</p><p className="text-[13px] font-bold text-amber-700 tnum">{(open as any).rate.toFixed(2)}×</p></div>
              <div className="rounded-lg bg-emerald-50 p-2"><p className="text-[10px] uppercase text-emerald-600/70">Potential</p><p className="text-[13px] font-bold text-emerald-700 tnum">{fmtPoints(Math.round(Number(stake) * (open as any).rate))}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================= TRACKING ============================= */
export function Tracking() {
  const settled = predictions.filter((p) => p.status === "won" || p.status === "lost");
  const won = predictions.filter((p) => p.status === "won").reduce((a, p) => a + p.potential, 0);
  const lost = predictions.filter((p) => p.status === "lost").reduce((a, p) => a + p.stake, 0);
  const months = [{ m: "Oct", v: 60 }, { m: "Nov", v: 75 }, { m: "Dec", v: 45 }, { m: "Jan", v: 90 }, { m: "Feb", v: 65 }, { m: "Mar", v: 82 }];
  return (
    <div className="space-y-5">
      <PageHeader title="Prediction Tracking" sub="Settlements & performance" icon="Activity" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Net earnings" value={`+${fmtPoints(won - lost)}`} icon="TrendingUp" tone="emerald" delta="+12% MoM" deltaTone="up" />
        <MetricCard label="Total won" value={fmtPoints(won)} icon="Trophy" tone="gold" />
        <MetricCard label="Total lost" value={fmtPoints(lost)} icon="TrendingDown" tone="red" />
        <MetricCard label="Win rate" value={`${WALLET.winRate}%`} icon="Target" tone="blue" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><Icon name="BarChart3" size={16} className="text-slate-500" /><span className="text-[14px] font-semibold text-ink">Monthly performance</span></div>
          <div className="flex h-44 items-end gap-3">
            {months.map((x) => (
              <div key={x.m} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end"><div className={cn("w-full rounded-t-md", x.v >= 70 ? "bg-emerald-500" : "bg-slate-300")} style={{ height: `${x.v}%` }} /></div>
                <span className="text-[11px] font-medium text-slate-500">{x.m}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><Icon name="Activity" size={16} className="text-emerald-600" /><span className="text-[14px] font-semibold text-ink">Prediction health</span></div>
          <div className="space-y-3">
            {[{ l: "Win rate", v: 58, tone: "emerald" as Tone }, { l: "ROI", v: 42, tone: "gold" as Tone }, { l: "Consistency", v: 74, tone: "blue" as Tone }].map((s) => (
              <div key={s.l}><div className="mb-1 flex justify-between text-[12px]"><span className="text-slate-500">{s.l}</span><span className="font-bold text-ink tnum">{s.v}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", TONE[s.tone].solid)} style={{ width: `${s.v}%` }} /></div></div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3"><span className="text-[14px] font-semibold text-ink">Recent settlements</span></div>
        <div className="divide-y divide-line">
          {settled.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn("grid h-9 w-9 place-items-center rounded-lg", p.status === "won" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}><Icon name={p.status === "won" ? "TrendingUp" : "TrendingDown"} size={16} /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{p.horse} · {p.race}</p><p className="text-[12px] text-slate-500">Stake {fmtPoints(p.stake)} @ {p.rate.toFixed(1)}× · {relativeTime(p.placedAt)}</p></div>
              <span className={cn("text-[13px] font-bold tnum", p.status === "won" ? "text-emerald-600" : "text-rose-600")}>{p.status === "won" ? "+" : "−"}{fmtPoints(p.status === "won" ? p.potential : p.stake)}</span>
              <StatusChip status={p.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================== PROFILE ============================== */
export function Profile({ role }: { role: Role }) {
  const u = CURRENT[role];
  const [notif, setNotif] = useState({ race: true, wallet: true, marketing: false });
  const rm = ROLE_META[role];
  return (
    <div className="space-y-5">
      <PageHeader title="Profile" sub="Account & settings" icon="UserCircle" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 text-center">
          <Avatar name={u.name} size={84} tone={rm.tone as Tone} className="mx-auto" />
          <h3 className="mt-3 text-[16px] font-bold text-ink">{u.name}</h3>
          <p className="text-[13px] text-slate-500">{u.email}</p>
          <div className="mt-2 flex justify-center"><Badge tone={rm.tone as Tone}><Icon name={rm.icon} size={12} />{rm.label}</Badge></div>
          <div className="mt-4 space-y-1 border-t border-line pt-3 text-left">
            {[["License", u.license ?? "—"], ["Organization", u.org ?? "—"], ["Joined", fmtDate(u.joined)], ["Status", u.status === "active" ? "Active" : "Pending"]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5"><span className="text-[12px] text-slate-500">{k}</span><span className="text-[13px] font-semibold text-ink">{v}</span></div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4 w-full" icon="Pencil">Edit profile</Button>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {(role === "spectator" || role === "owner" || role === "jockey") && (
            <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="Wallet" size={24} /></span>
                <div><p className="text-[12px] uppercase text-slate-400">Wallet balance</p><p className="text-2xl font-bold text-ink tnum">{fmtPoints(WALLET.balance)}</p></div>
              </div>
              <Button variant="primary" icon="Plus">Top up</Button>
            </Card>
          )}
          <Card className="p-5">
            <p className="mb-4 text-[14px] font-semibold text-ink">Contact information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><TextInput defaultValue={u.name} icon="UserRound" /></Field>
              <Field label="Email"><TextInput defaultValue={u.email} icon="Mail" /></Field>
              <Field label="Phone"><TextInput icon="Phone" placeholder="+84 90 000 0000" /></Field>
              <Field label="City"><TextInput icon="MapPin" placeholder="Ho Chi Minh City" /></Field>
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-4 text-[14px] font-semibold text-ink">Notification preferences</p>
            <div className="divide-y divide-line">
              {[{ k: "race", t: "Race alerts", d: "Live races, starts & results" }, { k: "wallet", t: "Wallet & payouts", d: "Top-ups, stakes & settlements" }, { k: "marketing", t: "Promotions", d: "Tournaments & special offers" }].map((s) => (
                <div key={s.k} className="flex items-center justify-between py-3">
                  <div><p className="text-[13px] font-semibold text-ink">{s.t}</p><p className="text-[12px] text-slate-500">{s.d}</p></div>
                  <Toggle checked={(notif as any)[s.k]} onChange={(v) => setNotif((n) => ({ ...n, [s.k]: v }))} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-[14px] font-semibold text-ink">Recent activity</p>
            <div className="space-y-3">
              {[{ i: "LogIn", t: "Signed in from Ho Chi Minh City", time: "2m ago", tone: "blue" as Tone }, { i: "Trophy", t: "Prediction won on Opening Cup", time: "2h ago", tone: "gold" as Tone }, { i: "UserRound", t: "Profile updated", time: "1d ago", tone: "slate" as Tone }].map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={cn("grid h-8 w-8 place-items-center rounded-lg", TONE[a.tone].bg, TONE[a.tone].text)}><Icon name={a.i} size={15} /></span>
                  <div className="flex-1"><p className="text-[13px] text-ink">{a.t}</p><p className="text-[11px] text-slate-400">{a.time}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

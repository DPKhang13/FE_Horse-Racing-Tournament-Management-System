import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { Badge, Button, Card, ConfirmationDialog, Field, Icon, IconButton, KeyValue, Select, TextArea, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { HorseAvatar } from "@/components/widgets";
import type { Option } from "@/components/ui";
import { horses, jockeys, races } from "@/lib/data";
import { fmtTime } from "@/lib/format";

export function RaceControl() {
  const { push } = useToast();
  const [raceId, setRaceId] = useState(races.find((r) => r.status === "ongoing")?.id ?? races[0].id);
  const race = races.find((r) => r.id === raceId)!;
  const [report, setReport] = useState("");
  const [reports, setReports] = useState([
    { id: 1, ref: "Tran Khanh Linh", time: "13:58", status: "submitted", text: "Clean start from gate 4. No interference reported through the first turn." },
    { id: 2, ref: "Hoang Duc Manh", time: "13:59", status: "draft", text: "Reviewing photo finish between gates 2 and 7." },
  ]);
  const [cancel, setCancel] = useState(false);
  const [publish, setPublish] = useState(false);

  // Build a stable starter list for the selected race
  const starters = useMemo(() => {
    const n = Math.max(4, Math.min(race.enteredHorses || 6, 8));
    return Array.from({ length: n }).map((_, i) => {
      const h = horses[i % horses.length];
      const j = jockeys[i % jockeys.length];
      return { gate: i + 1, horse: h, jockey: j, finish: i + 1 };
    });
  }, [race]);
  const [order, setOrder] = useState<number[]>(starters.map((_, i) => i + 1));

  const raceOpts: Option[] = races.map((r) => ({ value: r.id, label: `R${r.number} · ${r.name}` }));
  const idx = races.findIndex((r) => r.id === raceId);
  const live = race.status === "ongoing";

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Race Control" sub="Live operations terminal" icon="Radio"
        actions={<>
          <Button variant="secondary" size="sm" icon="ChevronLeft" onClick={() => setRaceId(races[Math.max(0, idx - 1)].id)}>Prev</Button>
          <Select value={raceId} onChange={setRaceId} options={raceOpts} className="min-w-[230px]" />
          <Button variant="secondary" size="sm" iconRight="ChevronRight" onClick={() => setRaceId(races[Math.min(races.length - 1, idx + 1)].id)}>Next</Button>
        </>} />

      {/* Race snapshot */}
      <Card className={cn("overflow-hidden", live && "ring-1 ring-emerald-300")}>
        <div className={cn("flex flex-wrap items-center gap-4 px-4 py-3.5 text-white", live ? "bg-gradient-to-r from-emerald-700 to-emerald-600" : "bg-slate-900")}>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 font-bold">R{race.number}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[16px] font-bold">{race.name}</h3>
              {live ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold"><span className="h-1.5 w-1.5 rounded-full bg-white live-dot" /> LIVE</span> : <Badge tone={race.status === "completed" ? "slate" : "blue"} dot>{race.status === "completed" ? "Finished" : "Scheduled"}</Badge>}
            </div>
            <p className="text-[12px] text-white/75">{race.tournament} · {race.rankGroup} · gates {fmtTime(race.scheduledAt)}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-white/85">
            <span className="inline-flex items-center gap-1"><Icon name="Gauge" size={13} /> {race.distance}m</span>
            <span className="inline-flex items-center gap-1"><Icon name="Layers" size={13} /> {race.trackType}</span>
            <span className="inline-flex items-center gap-1"><Icon name="Flag" size={13} /> {race.enteredHorses}/{race.maxHorses} runners</span>
            <span className="inline-flex items-center gap-1"><Icon name="UsersRound" size={13} /> {race.assignedReferees}/{race.maxReferees} refs</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Starters / draft results */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2"><Icon name="Flag" size={16} className="text-slate-500" /><span className="text-[14px] font-semibold text-ink">Draft finishing order</span></div>
              <Badge tone="gold">Draft · not official</Badge>
            </div>
            <div className="divide-y divide-line">
              {starters.map((s, i) => {
                const pos = order.indexOf(i + 1) + 1;
                return (
                  <div key={s.gate} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex flex-col">
                      <IconButton name="ChevronUp" label="Move up" size="sm" onClick={() => move(i, -1)} className="h-5 w-5" />
                      <IconButton name="ChevronDown" label="Move down" size="sm" onClick={() => move(i, 1)} className="h-5 w-5" />
                    </div>
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-[12px] font-bold", pos === 1 ? "bg-amber-100 text-amber-700" : pos === 2 ? "bg-slate-200 text-slate-600" : pos === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500")}>{pos}</span>
                    <span className="w-8 text-center text-[12px] font-bold text-slate-400">G{s.gate}</span>
                    <HorseAvatar src={s.horse.avatar} color={s.horse.color} size={32} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{s.horse.name}</p><p className="truncate text-[12px] text-slate-500">{s.jockey.name}</p></div>
                    <span className="hidden rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">{s.horse.rankGroup}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line bg-slate-50/60 px-4 py-2.5">
              <p className="text-[12px] text-slate-500">Reorder with the arrows, then submit your report.</p>
              <Button variant="secondary" size="sm" icon="Save" onClick={() => push({ tone: "emerald", title: "Draft saved" })}>Save draft</Button>
            </div>
          </Card>

          {/* Submit report */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2"><Icon name="ClipboardList" size={16} className="text-slate-500" /><span className="text-[14px] font-semibold text-ink">Submit referee report</span></div>
            <Field label="Observations & incidents">
              <TextArea value={report} onChange={(e) => setReport(e.target.value)} placeholder="Describe the start, any interference, stewarding notes, photo-finish calls…" />
            </Field>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" icon="Save">Save draft</Button>
              <Button variant="primary" size="sm" icon="Send" onClick={() => { if (!report) { push({ tone: "red", title: "Empty report" }); return; } setReports((r) => [{ id: Date.now(), ref: "You", time: fmtTime(new Date().toISOString()), status: "submitted", text: report }, ...r]); setReport(""); push({ tone: "emerald", title: "Report submitted" }); }}>Submit report</Button>
            </div>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Controls */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2"><Icon name="SlidersHorizontal" size={16} className="text-slate-500" /><span className="text-[14px] font-semibold text-ink">Race controls</span></div>
            <div className="space-y-2">
              {race.status === "scheduled" && <Button variant="primary" className="w-full" icon="Play" onClick={() => push({ tone: "emerald", title: "Race started" })}>Start race</Button>}
              {race.status === "ongoing" && <Button variant="primary" className="w-full" icon="CheckCircle2" onClick={() => push({ tone: "emerald", title: "Race marked complete" })}>Mark complete</Button>}
              <Button variant="gold" className="w-full" icon="Stamp" disabled={race.status !== "ongoing" && race.status !== "completed"} onClick={() => setPublish(true)}>Publish official result</Button>
              <Button variant="secondary" className="w-full" icon="Ban" onClick={() => setCancel(true)}>Cancel race</Button>
            </div>
            <div className="mt-3 space-y-0.5 border-t border-line pt-3">
              <KeyValue k="Prediction close" v={fmtTime(race.predictionClose)} mono />
              <KeyValue k="Max referees" v={`${race.maxReferees}`} mono />
              <KeyValue k="Prize pool" v={`${race.prize.toLocaleString()} ₫`} mono />
            </div>
          </Card>

          {/* Point rules */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2"><Icon name="Award" size={16} className="text-amber-600" /><span className="text-[14px] font-semibold text-ink">Point rules</span></div>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ p: "1st", v: 100 }, { p: "2nd", v: 70 }, { p: "3rd", v: 45 }, { p: "4th", v: 25 }, { p: "5th", v: 10 }, { p: "6th", v: 0 }].map((x) => (
                <div key={x.p} className="rounded-lg bg-slate-50 p-2 text-center"><p className="text-[10px] text-slate-400">{x.p}</p><p className="text-[13px] font-bold text-ink tnum">{x.v}</p></div>
              ))}
            </div>
          </Card>

          {/* Reports */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3"><span className="text-[14px] font-semibold text-ink">Referee reports</span></div>
            <div className="max-h-80 divide-y divide-line overflow-y-auto">
              {reports.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink"><Icon name="UserRound" size={14} className="text-slate-400" />{r.ref}</span>
                    <Badge tone={r.status === "submitted" ? "emerald" : "gold"} dot>{r.status === "submitted" ? "Submitted" : "Draft"}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500">{r.time}</p>
                  <p className="mt-1 text-[13px] leading-snug text-slate-600">{r.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmationDialog open={cancel} onClose={() => setCancel(false)} onConfirm={() => push({ tone: "red", title: "Race cancelled" })} title="Cancel this race?" icon="Ban" message={`Cancelling "${race.name}" will void all entries and refund prediction stakes. This cannot be undone.`} confirmLabel="Cancel race" />
      <ConfirmationDialog open={publish} onClose={() => setPublish(false)} onConfirm={() => push({ tone: "emerald", title: "Result published", desc: "Official standings are now live." })} title="Publish official result?" tone="primary" icon="Stamp" message="Once published, the finishing order becomes official. Predictions will be settled and ranking points applied." confirmLabel="Publish result" />
    </div>
  );
}

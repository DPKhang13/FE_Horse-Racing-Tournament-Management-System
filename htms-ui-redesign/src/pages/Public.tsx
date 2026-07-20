import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Badge, Button, Card, Field, Icon, TextInput, useToast } from "@/components/ui";
import { Logo } from "@/components/layout";
import { GLOBAL_STATS, IMG, ONBOARD_ROLES, horses, jockeys, tournaments } from "@/lib/data";
import { fmtVNDcompact } from "@/lib/format";
import type { Role } from "@/lib/types";

/* ============================ Landing nav ============================ */
function LandingNav({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-all", solid ? "border-b border-line bg-white/90 backdrop-blur-md" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={onLogin} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 shadow-sm shadow-emerald-600/30">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M19 4.5c-.4 0-.8.1-1.1.3-.6-1-1.7-1.6-2.9-1.6-1 0-1.9.4-2.5 1.1-.3-.1-.6-.2-1-.2-.8 0-1.5.4-2 1L8 7.2c-.5.6-.7 1.4-.5 2.2l-3.3 3.6c-.5.6-.5 1.5 0 2l1.4 1.4c.4.4 1.1.5 1.6.1l1-.7.6 3.4c.1.5.5.8 1 .8h2.1c.6 0 1.1-.5 1-1.1l-.5-3.1c1.3-.2 2.4-1 3-2.2.2 0 .4.1.6.1 1.4 0 2.5-1.1 2.5-2.5V7c0-1.4-1.1-2.5-2.5-2.5z" /></svg>
          </span>
          <span className={cn("text-[16px] font-extrabold tracking-tight", solid ? "text-ink" : "text-white")}>HTMS</span>
        </button>
        <nav className={cn("hidden items-center gap-7 text-[13.5px] font-medium md:flex", solid ? "text-slate-600" : "text-white/90")}>
          <a href="#tournaments" className="hover:text-emerald-500">Tournaments</a>
          <a href="#jockeys" className="hover:text-emerald-500">Jockeys</a>
          <a href="#horses" className="hover:text-emerald-500">Horses</a>
          <a href="#stats" className="hover:text-emerald-500">Platform</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant={solid ? "secondary" : "ghost"} size="sm" className={cn(!solid && "text-white hover:bg-white/15")} onClick={onLogin}>Log in</Button>
          <Button variant="primary" size="sm" iconRight="ArrowRight" onClick={onSignup}>Join the Race</Button>
        </div>
      </div>
    </header>
  );
}

/* ============================== Landing ============================== */
export function Landing({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const featured = tournaments.slice(0, 3);
  const topJockeys = [...jockeys].sort((a, b) => b.points - a.points).slice(0, 4);
  const topHorses = [...horses].sort((a, b) => b.points - a.points).slice(0, 4);
  return (
    <div className="min-h-screen bg-canvas">
      <LandingNav onLogin={onLogin} onSignup={onSignup} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.heroRace} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot" /> Live season · Saigon Grand Prix 2026
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Run the operation behind every <span className="text-emerald-400">great race</span>.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-200 sm:text-lg">
              HTMS is the operations console for horse racing tournaments — register horses, assign jockeys, officiate races, publish results and run prediction markets from one professional terminal.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" iconRight="ArrowRight" onClick={onSignup}>Join the Race</Button>
              <Button variant="secondary" size="lg" icon="LogIn" onClick={onLogin} className="bg-white/10 text-white border-white/25 hover:bg-white/20">Log in to console</Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: `${GLOBAL_STATS.tournaments}`, l: "Active tournaments" },
                { k: `${GLOBAL_STATS.horses}`, l: "Registered horses" },
                { k: fmtVNDcompact(GLOBAL_STATS.prizePaid), l: "Prize awarded" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-bold text-white tnum sm:text-3xl">{s.k}</p>
                  <p className="text-[12px] text-slate-300">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section id="stats" className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line px-4 sm:grid-cols-4 sm:px-6">
          {[
            { icon: "Trophy", l: "Tournaments", v: GLOBAL_STATS.tournaments },
            { icon: "Flag", l: "Active races", v: GLOBAL_STATS.activeRaces },
            { icon: "Cookie", l: "Horses", v: GLOBAL_STATS.horses },
            { icon: "UsersRound", l: "Jockeys", v: GLOBAL_STATS.jockeys },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-3 px-2 py-5 sm:px-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name={s.icon} size={20} /></span>
              <div>
                <p className="text-xl font-bold text-ink tnum">{s.v}</p>
                <p className="text-[12px] text-slate-500">{s.l}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured tournaments */}
      <section id="tournaments" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-emerald-600">On the calendar</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Featured tournaments</h2>
          </div>
          <Button variant="ghost" iconRight="ArrowRight" onClick={onSignup} className="hidden sm:inline-flex">View all</Button>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {featured.map((t) => (
            <Card key={t.id} hover className="group overflow-hidden p-0">
              <div className="relative h-44 overflow-hidden">
                <img src={t.cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <Badge tone={t.tier === "Premier" ? "gold" : t.tier === "Classic" ? "blue" : "slate"}>{t.tier}</Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{t.code}</p>
                  <p className="text-lg font-bold leading-tight text-white">{t.name}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-[12px] text-slate-500"><Icon name="MapPin" size={13} /> {t.venue}, {t.city}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 py-2"><p className="text-[10px] uppercase text-slate-400">Prize pool</p><p className="text-[13px] font-bold text-amber-700 tnum">{fmtVNDcompact(t.prizePool)}</p></div>
                  <div className="rounded-lg bg-slate-50 py-2"><p className="text-[10px] uppercase text-slate-400">Races</p><p className="text-[13px] font-bold text-ink tnum">{t.races}</p></div>
                  <div className="rounded-lg bg-slate-50 py-2"><p className="text-[10px] uppercase text-slate-400">Runners</p><p className="text-[13px] font-bold text-ink tnum">{t.participants}</p></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Top jockeys & horses */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-2">
        <div id="jockeys">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-emerald-600">In the saddle</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Top jockeys</h2>
          <div className="mt-5 space-y-2.5">
            {topJockeys.map((j, i) => (
              <Card key={j.id} className="flex items-center gap-3 p-3">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold", i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{i + 1}</span>
                <img src={j.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{j.name}</p>
                  <p className="truncate text-[12px] text-slate-500">{j.org} · {j.wins} wins</p>
                </div>
                <div className="text-right"><p className="text-sm font-bold text-ink tnum">{j.points}</p><p className="text-[11px] text-slate-400">pts</p></div>
              </Card>
            ))}
          </div>
        </div>
        <div id="horses">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-emerald-600">In the paddock</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Top horses</h2>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {topHorses.map((h, i) => (
              <Card key={h.id} hover className="overflow-hidden p-0">
                <div className="relative h-28"><img src={h.avatar} alt="" className="h-full w-full object-cover" /><span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-white/90 text-[11px] font-bold text-ink">{i + 1}</span></div>
                <div className="p-3">
                  <p className="truncate text-[14px] font-semibold text-ink">{h.name}</p>
                  <p className="text-[12px] text-slate-500">{h.ownerStable}</p>
                  <p className="mt-1 text-[12px] font-bold text-ink tnum">{h.points} pts</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <img src={IMG.raceAction} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <Icon name="Trophy" size={32} className="text-amber-400" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to take the reins?</h2>
          <p className="mt-3 max-w-xl text-[15px] text-slate-300">Whether you run a stable, ride professionally, officiate races or play the markets — there's a seat for you in the HTMS terminal.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" iconRight="ArrowRight" onClick={onSignup}>Create your account</Button>
            <Button variant="secondary" size="lg" icon="Eye" onClick={onLogin} className="bg-white/10 text-white border-white/25 hover:bg-white/20">Explore as spectator</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-[13px] text-slate-500">© 2026 HTMS — Horse Racing Tournament Management System</p>
          <div className="flex gap-5 text-[13px] text-slate-500"><a href="#" className="hover:text-ink">Terms</a><a href="#" className="hover:text-ink">Privacy</a><a href="#" className="hover:text-ink">Support</a></div>
        </div>
      </footer>
    </div>
  );
}

/* ============================ Auth shell ============================ */
function AuthShell({ children, image, badge }: { children: ReactNode; image: string; badge?: string }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-950/60" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />
          <div>
            <Badge tone="emerald" dot>{badge ?? "Live operations"}</Badge>
            <h2 className="mt-4 max-w-md text-3xl font-bold leading-tight text-white">The professional terminal for horse racing operations.</h2>
            <p className="mt-3 max-w-md text-[15px] text-slate-300">Manage tournaments, horses, jockeys, races, predictions and payouts — all in one place.</p>
          </div>
          <p className="text-[12px] text-slate-400">© 2026 HTMS</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-canvas px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function AuthHeader({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-ink">
      <Icon name="ArrowLeft" size={15} /> Back to home
    </button>
  );
}

/* =============================== Login =============================== */
export function Login({ onLogin, onSignup, onBack }: { onLogin: () => void; onSignup: () => void; onBack: () => void }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("an.nguyen@reddragon.vn");
  const [pwd, setPwd] = useState("••••••••");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); push({ tone: "emerald", title: "Welcome back", desc: "Signed in successfully." }); onLogin(); }, 900);
  };
  return (
    <AuthShell image={IMG.raceGate} badge="Operator sign-in">
      <AuthHeader onBack={onBack} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Log in to HTMS</h1>
      <p className="mt-1 text-[14px] text-slate-500">Access your racing console.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="Email address"><TextInput icon="Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stable.vn" /></Field>
        <Field label="Password" hint="Forgot password?"><TextInput icon="Shield" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
        <Button variant="primary" type="submit" className="w-full" size="lg" loading={loading} iconRight={!loading ? "ArrowRight" : undefined}>Sign in</Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-[12px] text-slate-400"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
      <Button variant="secondary" className="w-full" size="lg" icon="Eye" onClick={() => { onLogin(); }}>Continue as Spectator</Button>
      <p className="mt-6 text-center text-[13px] text-slate-500">New to HTMS? <button onClick={onSignup} className="font-semibold text-emerald-600 hover:underline">Create an account</button></p>
    </AuthShell>
  );
}

/* =============================== Signup ============================== */
export function Signup({ onOtp, onBack }: { onOtp: (email: string) => void; onBack: () => void }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { push({ tone: "red", title: "Email required", desc: "Enter a valid email to continue." }); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); push({ tone: "emerald", title: "Account created", desc: "Check your inbox for the verification code." }); onOtp(email); }, 1000);
  };
  return (
    <AuthShell image={IMG.jockeysNeck} badge="Join the season">
      <AuthHeader onBack={onBack} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-[14px] text-slate-500">Start managing your racing operations.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="Full name"><TextInput icon="UserRound" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyen Van An" /></Field>
        <Field label="Email address"><TextInput icon="Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@stable.vn" /></Field>
        <Field label="Password" hint="At least 8 characters"><TextInput icon="Shield" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" /></Field>
        <Button variant="primary" type="submit" className="w-full" size="lg" loading={loading} iconRight={!loading ? "ArrowRight" : undefined}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-slate-500">Already have an account? <button onClick={onBack} className="font-semibold text-emerald-600 hover:underline">Log in</button></p>
    </AuthShell>
  );
}

/* ========================== OTP verification ======================== */
export function OtpVerify({ email, onVerified, onBack }: { email: string; onVerified: () => void; onBack: () => void }) {
  const { push } = useToast();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [secs, setSecs] = useState(38);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const set = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setStatus("idle");
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const verify = () => {
    const code = digits.join("");
    if (code.length < 6) { setStatus("error"); push({ tone: "red", title: "Incomplete code", desc: "Enter all 6 digits." }); return; }
    setStatus("loading");
    setTimeout(() => {
      if (code === "000000") { setStatus("error"); push({ tone: "red", title: "Invalid code", desc: "Try 123456 for the demo." }); }
      else { setStatus("idle"); push({ tone: "emerald", title: "Email verified", desc: "Your account is ready." }); onVerified(); }
    }, 900);
  };

  return (
    <AuthShell image={IMG.startGates} badge="Secure verification">
      <AuthHeader onBack={onBack} />
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="Mail" size={22} /></span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Verify your email</h1>
      <p className="mt-1 text-[14px] text-slate-500">We sent a 6-digit code to <span className="font-semibold text-ink">{email || "your inbox"}</span>.</p>
      <div className={cn("mt-6 flex justify-between gap-2", status === "error" && "animate-pop")}>
        {digits.map((d, i) => (
          <input
            key={i} ref={(el) => { refs.current[i] = el; }} value={d}
            inputMode="numeric" maxLength={1}
            onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
            className={cn("h-14 w-full rounded-xl border bg-white text-center text-xl font-bold text-ink transition-colors focus:outline-none focus:ring-2", status === "error" ? "border-rose-400 ring-rose-500/20" : "border-line-strong focus:border-emerald-500 focus:ring-emerald-500/20")}
          />
        ))}
      </div>
      {status === "error" && <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-rose-600"><Icon name="CircleAlert" size={13} /> The code is incorrect or incomplete. Use <b>123456</b>.</p>}
      <Button variant="primary" className="mt-5 w-full" size="lg" loading={status === "loading"} icon="CheckCheck" onClick={verify}>Verify & continue</Button>
      <div className="mt-5 flex items-center justify-between text-[13px]">
        <span className="text-slate-500">Didn't get it?</span>
        {secs > 0
          ? <span className="font-medium text-slate-400">Resend in 0:{secs.toString().padStart(2, "0")}</span>
          : <button onClick={() => { setSecs(38); push({ tone: "gold", title: "Code resent" }); }} className="font-semibold text-emerald-600 hover:underline">Resend code</button>}
      </div>
    </AuthShell>
  );
}

/* ============================= Onboarding =========================== */
export function Onboarding({ defaultRole, onComplete, onBack }: { defaultRole?: Role; onComplete: (r: Role) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | undefined>(defaultRole);
  const { push } = useToast();
  const steps = ["Role", "Profile", "Credentials", "Review"];

  const next = () => {
    if (step === 0 && !role) { push({ tone: "red", title: "Select a role" }); return; }
    setStep((s) => Math.min(3, s + 1));
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Logo />
        <button onClick={onBack} className="text-[13px] font-medium text-slate-500 hover:text-ink">Save & exit</button>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Stepper */}
        <div className="mb-8 flex items-center">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span className={cn("grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold transition-colors", i < step ? "bg-emerald-600 text-white" : i === step ? "bg-ink text-white ring-4 ring-ink/10" : "bg-slate-200 text-slate-400")}>
                  {i < step ? <Icon name="Check" size={16} /> : i + 1}
                </span>
                <span className={cn("mt-1.5 text-[11px] font-semibold", i <= step ? "text-ink" : "text-slate-400")}>{s}</span>
              </div>
              {i < steps.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded-full", i < step ? "bg-emerald-500" : "bg-slate-200")} />}
            </div>
          ))}
        </div>

        <Card className="p-6">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-ink">Choose your role</h2>
              <p className="text-[13px] text-slate-500">This shapes your dashboard, permissions and tools.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {ONBOARD_ROLES.map((r) => (
                  <button key={r.role} onClick={() => setRole(r.role)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all", role === r.role ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/15" : "border-line hover:border-emerald-300")}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-emerald-600 ring-1 ring-line"><Icon name={r.icon} size={20} /></span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{r.title}</p>
                      <p className="text-[12px] text-slate-500">{r.desc}</p>
                    </div>
                    {role === r.role && <Icon name="CheckCircle2" size={18} className="ml-auto text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-ink">Your profile</h2>
              <p className="text-[13px] text-slate-500">How you'll appear across the platform.</p>
              <div className="mt-5 space-y-4">
                <Field label="Display name" required><TextInput placeholder="e.g. Red Dragon Stables / Vo Quoc Hung" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone"><TextInput icon="Phone" placeholder="+84 90 000 0000" /></Field>
                  <Field label="City"><TextInput icon="MapPin" placeholder="Ho Chi Minh City" /></Field>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-ink">Credentials & organization</h2>
              <p className="text-[13px] text-slate-500">Official identifiers used for verification.</p>
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="License number" hint="From the racing authority" required><TextInput icon="Stamp" placeholder="OWN-VN-2201" /></Field>
                  <Field label={role === "owner" ? "Stable / organization" : "Organization"}><TextInput icon="Home" placeholder="Red Dragon Stables" /></Field>
                </div>
                <Field label="Notes for verification (optional)"><textarea className="min-h-[80px] w-full resize-y rounded-lg border border-line-strong bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="Add any supporting references…" />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="CheckCircle2" size={30} /></span>
              <h2 className="mt-4 text-lg font-bold text-ink">You're all set</h2>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">Your {role ? ONBOARD_ROLES.find((r) => r.role === role)?.title : ""} workspace is ready. Jump into the console to get started.</p>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <Button variant="ghost" onClick={() => (step === 0 ? onBack() : setStep((s) => s - 1))} icon="ArrowLeft">{step === 0 ? "Cancel" : "Back"}</Button>
            {step < 3
              ? <Button variant="primary" onClick={next} iconRight="ArrowRight">{step === 2 ? "Review" : "Continue"}</Button>
              : <Button variant="primary" icon="LayoutDashboard" onClick={() => role && onComplete(role)}>Enter console</Button>}
          </div>
        </Card>
      </div>
    </div>
  );
}

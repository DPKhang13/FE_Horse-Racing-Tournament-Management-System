import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";
import { NAV } from "@/lib/nav";
import { results } from "@/lib/data";
import { ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/layout";

import { Landing, Login, Signup, OtpVerify, Onboarding } from "@/pages/Public";
import { AdminDashboard, OwnerDashboard, JockeyDashboard, SpectatorDashboard } from "@/pages/Dashboards";
import { Users, Tournaments, TournamentSchedule, ScheduleAdmin } from "@/pages/Admin";
import { Races, HorsesAdmin, Registrations, Bets } from "@/pages/AdminRegistry";
import { RaceControl } from "@/pages/RaceControl";
import { OwnerHorses, RaceEntry, Invitations, RaceSchedule } from "@/pages/Owner";
import {
  Results, ResultDetail, Rankings, NotificationsPage, Wallet, Predictions, Tracking, Profile,
} from "@/pages/Shared";

type View = "landing" | "login" | "signup" | "otp" | "onboarding" | "app";

const defaultPage: Record<Role, string> = {
  admin: "dashboard",
  owner: "dashboard",
  jockey: "dashboard",
  referee: "race-control",
  spectator: "dashboard",
};

function ConsoleView({
  role, page, setRole, setPage, onExit,
}: {
  role: Role; page: string; setRole: (r: Role) => void; setPage: (p: string) => void; onExit: () => void;
}) {
  const [resultId, setResultId] = useState(results[0].id);
  const navigate = (p: string) => setPage(p);
  const openResult = (id: string) => { setResultId(id); setPage("result-detail"); window.scrollTo({ top: 0 }); };
  const switchRole = (r: Role) => { setRole(r); setPage(defaultPage[r]); };

  const render = () => {
    switch (page) {
      /* dashboards */
      case "dashboard":
        if (role === "admin") return <AdminDashboard onNavigate={navigate} />;
        if (role === "owner") return <OwnerDashboard onNavigate={navigate} />;
        if (role === "jockey") return <JockeyDashboard onNavigate={navigate} />;
        return <SpectatorDashboard onNavigate={navigate} />;
      /* admin */
      case "users": return <Users />;
      case "tournaments": return <Tournaments />;
      case "schedule": return <TournamentSchedule />;
      case "schedules-admin": return <ScheduleAdmin />;
      case "races": return <Races />;
      case "race-control": return <RaceControl />;
      case "horses-admin": return <HorsesAdmin />;
      case "registrations": return <Registrations />;
      case "bets": return <Bets />;
      /* owner */
      case "horses": return <OwnerHorses />;
      case "entry": return <RaceEntry />;
      case "invitations": return <Invitations role={role} />;
      /* shared */
      case "race-schedule": return <RaceSchedule onNavigate={navigate} />;
      case "results": return <Results role={role} onOpen={openResult} />;
      case "result-detail": return <ResultDetail id={resultId} />;
      case "rankings": return <Rankings />;
      case "notifications": return <NotificationsPage />;
      case "wallet": return <Wallet />;
      case "predictions": return <Predictions />;
      case "tracking": return <Tracking />;
      case "profile": return <Profile role={role} />;
      default: return role === "admin" ? <AdminDashboard onNavigate={navigate} /> : <SpectatorDashboard onNavigate={navigate} />;
    }
  };

  return (
    <AppShell role={role} page={page} onNavigate={navigate} onSwitchRole={switchRole} onExit={onExit}>
      {render()}
    </AppShell>
  );
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [role, setRole] = useState<Role>("admin");
  const [page, setPage] = useState<string>("dashboard");
  const [otpEmail, setOtpEmail] = useState("");

  // Ensure the current page is valid for the role (fall back to first nav item)
  useEffect(() => {
    const valid = NAV[role].flatMap((g) => g.items).some((i) => i.id === page) || ["dashboard", "result-detail", "race-control"].includes(page);
    if (!valid) setPage(defaultPage[role]);
  }, [role, page]);

  const goLanding = () => setView("landing");

  if (view === "landing")
    return (
      <ToastProvider>
        <Landing onLogin={() => setView("login")} onSignup={() => setView("signup")} />
      </ToastProvider>
    );

  if (view === "login")
    return (
      <ToastProvider>
        <Login onLogin={() => { setView("app"); setPage(defaultPage[role]); }} onSignup={() => setView("signup")} onBack={goLanding} />
      </ToastProvider>
    );

  if (view === "signup")
    return (
      <ToastProvider>
        <Signup onOtp={(email) => { setOtpEmail(email); setView("otp"); }} onBack={() => setView("login")} />
      </ToastProvider>
    );

  if (view === "otp")
    return (
      <ToastProvider>
        <OtpVerify email={otpEmail} onVerified={() => setView("onboarding")} onBack={() => setView("signup")} />
      </ToastProvider>
    );

  if (view === "onboarding")
    return (
      <ToastProvider>
        <Onboarding onComplete={(r) => { setRole(r); setPage(defaultPage[r]); setView("app"); }} onBack={goLanding} />
      </ToastProvider>
    );

  return (
    <ToastProvider>
      <ConsoleView role={role} page={page} setRole={setRole} setPage={setPage} onExit={goLanding} />
    </ToastProvider>
  );
}

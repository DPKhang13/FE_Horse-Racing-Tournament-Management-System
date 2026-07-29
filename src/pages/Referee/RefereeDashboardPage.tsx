import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Flag, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { raceOperationsService, type RefereeAssignedRaceItem } from '../../services/raceOperationsService';
import { formatRefereeRoleLabel } from '../../utils/permissions';

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';
const formatStatusLabel = (status?: string) => {
  if (!status?.trim()) return '-';
  return status.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const statusClassName = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'completed') return 'border-secondary/30 bg-secondary/10 text-secondary';
  if (normalized === 'in_progress') return 'border-primary/30 bg-primary/10 text-primary';
  if (normalized === 'ready' || normalized === 'open_for_betting' || normalized === 'betting_open') return 'border-tertiary/30 bg-tertiary/10 text-tertiary';
  if (normalized === 'cancelled') return 'border-error/30 bg-error-container/20 text-error';
  return 'border-outline-variant bg-surface-container text-on-surface-variant';
};

const byScheduledAt = (a: RefereeAssignedRaceItem, b: RefereeAssignedRaceItem) =>
  new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime();

const isUpcomingRaceStatus = (status?: string) =>
  ['scheduled', 'upcoming', 'registration_open', 'registration_closed', 'ready', 'open_for_betting', 'betting_open']
    .includes(normalizeStatus(status));

const RefereeDashboardPage = () => {
  const navigate = useNavigate();
  const profile = authService.getStoredUserProfile();
  const [races, setRaces] = useState<RefereeAssignedRaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRaces = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setRaces(await raceOperationsService.getAssignedRaces());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load assigned races.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRaces(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const groups = useMemo(() => {
    const upcoming = races
      .filter((race) => isUpcomingRaceStatus(race.status))
      .sort(byScheduledAt);
    const active = races.filter((race) => normalizeStatus(race.status) === 'in_progress').sort(byScheduledAt);
    const managed = races
      .filter((race) => ['completed', 'cancelled'].includes(normalizeStatus(race.status)))
      .sort((a, b) => byScheduledAt(b, a));
    return { upcoming, active, managed };
  }, [races]);

  const nextDuty = groups.active[0] ?? groups.upcoming[0];
  const openRaceControl = (raceId?: number) => {
    navigate(raceId ? `/race-control?raceId=${raceId}` : '/race-control');
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="glass-panel rounded-2xl p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-secondary">
                <ShieldCheck className="h-4 w-4" /> Referee operations
              </div>
              <h1 className="font-display text-headline-lg font-extrabold text-primary">
                Welcome, {profile?.fullName ?? profile?.username ?? 'Referee'}
              </h1>
              <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                Track your upcoming duties, active races and race history from one operational dashboard.
              </p>
              <p className="mt-3 text-label-sm font-semibold text-outline">
                License {profile?.refereeProfile?.licenseNumber ?? '-'}
              </p>
            </div>
            <button type="button" onClick={() => void loadRaces()} disabled={isLoading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm font-bold text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh dashboard
            </button>
          </div>
        </section>

        {errorMessage && <div className="mt-4 rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">{errorMessage}</div>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Flag className="h-5 w-5" />} label="Assigned races" value={races.length} />
          <MetricCard icon={<CalendarClock className="h-5 w-5" />} label="Upcoming" value={groups.upcoming.length} />
          <MetricCard icon={<Clock3 className="h-5 w-5" />} label="In progress" value={groups.active.length} />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Managed" value={groups.managed.length} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <article className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-secondary">Duty queue</p>
                <h2 className="font-display mt-1 text-title-large font-bold text-primary">Upcoming races</h2>
              </div>
              <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm font-bold text-on-surface-variant">{groups.upcoming.length}</span>
            </div>
            <RaceList races={groups.upcoming} isLoading={isLoading} emptyText="No upcoming race assignments." onOpen={openRaceControl} />
          </article>

          <article className="glass-panel rounded-xl p-6">
            <p className="text-label-sm font-bold uppercase tracking-wider text-secondary">Next action</p>
            <h2 className="font-display mt-1 text-title-large font-bold text-primary">Race control</h2>
            {nextDuty ? (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary-container/10 p-5">
                <StatusBadge status={nextDuty.status} />
                <h3 className="mt-4 text-body-lg font-bold text-primary">{nextDuty.raceName}</h3>
                <p className="mt-2 text-body-sm text-on-surface-variant">{formatDateTime(nextDuty.scheduledAt)}</p>
                <p className="mt-1 text-label-sm font-semibold text-outline">{formatRefereeRoleLabel(nextDuty.refereeRole)}</p>
                <button type="button" onClick={() => openRaceControl(nextDuty.raceId)}
                  className="mt-5 w-full cursor-pointer rounded-md bg-secondary px-4 py-3 text-body-sm font-bold text-on-secondary transition-opacity hover:bg-opacity-90">
                  Open race control
                </button>
              </div>
            ) : (
              <p className="mt-5 text-body-sm text-on-surface-variant">No active or upcoming duty is available.</p>
            )}
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">In-progress races</h2>
            </div>
            <RaceList races={groups.active} isLoading={isLoading} emptyText="No race is currently in progress." onOpen={openRaceControl} />
          </article>
          <article className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <History className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">Managed history</h2>
            </div>
            <RaceList races={groups.managed} isLoading={isLoading} emptyText="No completed race history yet." onOpen={openRaceControl} />
          </article>
        </section>
      </div>
    </div>
  );
};

const RaceList = ({ races, isLoading, emptyText, onOpen }: { races: RefereeAssignedRaceItem[]; isLoading: boolean; emptyText: string; onOpen: (raceId: number) => void }) => {
  if (isLoading) return <p className="py-8 text-center text-body-sm text-on-surface-variant">Loading races...</p>;
  if (races.length === 0) return <p className="py-8 text-center text-body-sm text-on-surface-variant">{emptyText}</p>;
  return <div className="grid gap-3">{races.map((race) => (
    <button key={race.assignmentId ?? race.raceId} type="button" onClick={() => onOpen(race.raceId)}
      className="grid cursor-pointer gap-3 rounded-lg border border-outline-variant bg-white p-4 text-left transition-colors hover:border-primary sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={race.status} /><span className="text-[11px] font-semibold text-outline">Race #{race.raceId}</span></div>
        <p className="mt-2 break-words text-body-sm font-bold text-primary">{race.raceName}</p>
        <p className="mt-1 text-label-sm text-on-surface-variant">{formatDateTime(race.scheduledAt)} | {formatRefereeRoleLabel(race.refereeRole)}</p>
      </div>
      <span className="text-label-sm font-bold text-secondary">View control</span>
    </button>
  ))}</div>;
};

const StatusBadge = ({ status }: { status?: string }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClassName(status)}`}>{formatStatusLabel(status)}</span>
);

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
  <article className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between text-on-surface-variant"><span className="text-label-sm font-bold uppercase tracking-wider">{label}</span><span className="text-secondary">{icon}</span></div>
    <p className="font-display mt-4 text-3xl font-extrabold text-primary">{String(value).padStart(2, '0')}</p>
  </article>
);

export default RefereeDashboardPage;

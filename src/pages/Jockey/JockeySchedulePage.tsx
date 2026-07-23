import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Flag, MapPin, Search, ShieldCheck, Trophy } from 'lucide-react';
import { getEffectiveInvitationStatus } from '../../components/invitations/invitationUtils';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { getApiErrorMessage } from '../../services/apiClient';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';

type ScheduleView = 'upcoming' | 'past' | 'all';

const formatDate = (value?: string) => {
  if (!value) {
    return 'Date TBA';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date TBA';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (value?: string) => {
  if (!value) {
    return { month: 'TBA', day: '--' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { month: 'TBA', day: '--' };
  }

  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString('en-US', { day: '2-digit' }),
  };
};

const formatTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isScheduledAssignment = (assignment: JockeyAssignmentItem) =>
  ['accepted', 'confirmed'].includes(getEffectiveInvitationStatus(assignment));

const isFutureAssignment = (assignment: JockeyAssignmentItem) => {
  const scheduledTime = new Date(assignment.scheduledAt ?? '').getTime();
  return Number.isFinite(scheduledTime) && scheduledTime >= Date.now();
};

const isThisWeek = (assignment: JockeyAssignmentItem) => {
  const scheduledTime = new Date(assignment.scheduledAt ?? '').getTime();
  if (!Number.isFinite(scheduledTime)) {
    return false;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return scheduledTime >= startOfToday && scheduledTime < startOfToday + (7 * 24 * 60 * 60 * 1000);
};

const statusClassName = (assignment: JockeyAssignmentItem) => {
  const status = getEffectiveInvitationStatus(assignment);
  return status === 'confirmed'
    ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-300'
    : 'border-sky-300/40 bg-sky-400/10 text-sky-300';
};

const JockeySchedulePage = () => {
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ScheduleView>('upcoming');

  useToastNotifications([
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  useEffect(() => {
    let isActive = true;

    jockeyAssignmentService.getMine()
      .then((assignmentList) => {
        if (isActive) {
          setAssignments(assignmentList);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load your jockey schedule.'));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const scheduledAssignments = useMemo(
    () => assignments.filter(isScheduledAssignment),
    [assignments],
  );

  const upcomingCount = scheduledAssignments.filter(isFutureAssignment).length;
  const confirmedCount = scheduledAssignments.filter(
    (assignment) => getEffectiveInvitationStatus(assignment) === 'confirmed',
  ).length;
  const thisWeekCount = scheduledAssignments.filter(isThisWeek).length;

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scheduledAssignments
      .filter((assignment) => {
        if (view === 'upcoming' && !isFutureAssignment(assignment)) {
          return false;
        }

        if (view === 'past' && isFutureAssignment(assignment)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          assignment.raceName,
          assignment.tournamentName,
          assignment.horseName,
          assignment.ownerFullName,
          assignment.ownerStableName,
          assignment.gateNumber,
        ].filter((value) => value != null).join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.scheduledAt ?? 0).getTime();
        const rightTime = new Date(right.scheduledAt ?? 0).getTime();
        return view === 'past' ? rightTime - leftTime : leftTime - rightTime;
      });
  }, [scheduledAssignments, search, view]);

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, JockeyAssignmentItem[]>();

    filteredAssignments.forEach((assignment) => {
      const dateLabel = formatDate(assignment.scheduledAt);
      const currentGroup = groups.get(dateLabel) ?? [];
      currentGroup.push(assignment);
      groups.set(dateLabel, currentGroup);
    });

    return Array.from(groups.entries());
  }, [filteredAssignments]);

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <header className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Jockey Schedule</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">My race calendar</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                View accepted and confirmed race assignments. Pending invitations remain on the Invitations page.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <ScheduleMetric icon={<CalendarDays className="h-4 w-4" />} label="Scheduled" value={scheduledAssignments.length} />
              <ScheduleMetric icon={<Clock3 className="h-4 w-4" />} label="Upcoming" value={upcomingCount} />
              <ScheduleMetric icon={<ShieldCheck className="h-4 w-4" />} label="This week" value={thisWeekCount} />
            </div>
          </div>
        </header>

        <section className="glass-panel rounded-xl p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Flag className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Assigned races</h2>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                {confirmedCount} confirmed assignment{confirmedCount === 1 ? '' : 's'} in your current schedule.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
              <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-low p-1" aria-label="Schedule view">
                {(['upcoming', 'past', 'all'] as ScheduleView[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={`cursor-pointer rounded-md px-4 py-2 text-xs font-bold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      view === option
                        ? 'bg-secondary text-on-secondary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <label className="relative block w-full md:w-80">
                <span className="sr-only">Search assigned races</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search race, horse, or owner"
                  className="w-full rounded-md border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </label>
            </div>
          </div>

          {isLoading ? (
            <ScheduleEmptyState
              icon={<Clock3 className="h-5 w-5" />}
              title="Loading your schedule"
              description="Fetching accepted and confirmed race assignments."
            />
          ) : groupedAssignments.length === 0 ? (
            <ScheduleEmptyState
              icon={<Trophy className="h-5 w-5" />}
              title="No scheduled races found"
              description="Try another view or search. Accepted and confirmed assignments will appear here."
            />
          ) : (
            <div className="space-y-8">
              {groupedAssignments.map(([dateLabel, dateAssignments]) => (
                <section key={dateLabel} aria-labelledby={`schedule-${dateLabel.replace(/\W+/g, '-').toLowerCase()}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-secondary" />
                    <h3
                      id={`schedule-${dateLabel.replace(/\W+/g, '-').toLowerCase()}`}
                      className="text-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant"
                    >
                      {dateLabel}
                    </h3>
                    <span className="h-px flex-1 bg-outline-variant" />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {dateAssignments.map((assignment) => (
                      <ScheduleCard
                        key={assignment.assignmentId ?? assignment.id ?? `${assignment.raceId}-${assignment.horseId}`}
                        assignment={assignment}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ScheduleMetric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display text-2xl font-extrabold text-on-surface">{String(value).padStart(2, '0')}</p>
  </div>
);

const ScheduleCard = ({ assignment }: { assignment: JockeyAssignmentItem }) => {
  const shortDate = formatShortDate(assignment.scheduledAt);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-secondary">{shortDate.month}</span>
          <span className="font-display mt-1 text-xl font-extrabold text-primary">{shortDate.day}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                Race {assignment.raceNumber ?? assignment.raceId ?? '-'}
              </p>
              <h4 className="mt-1 break-words text-body-lg font-bold text-primary">
                {assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`}
              </h4>
            </div>
            <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${statusClassName(assignment)}`}>
              {getEffectiveInvitationStatus(assignment)}
            </span>
          </div>
          <p className="mt-1 break-words text-body-sm text-on-surface-variant">
            {assignment.tournamentName ?? 'Tournament information unavailable'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ScheduleDetail icon={<Clock3 className="h-4 w-4" />} label="Start time" value={formatTime(assignment.scheduledAt)} />
        <ScheduleDetail icon={<MapPin className="h-4 w-4" />} label="Gate" value={assignment.gateNumber != null ? `Gate ${assignment.gateNumber}` : '-'} />
        <ScheduleDetail icon={<Trophy className="h-4 w-4" />} label="Horse" value={assignment.horseName ?? '-'} />
        <ScheduleDetail icon={<CheckCircle2 className="h-4 w-4" />} label="Horse owner" value={assignment.ownerStableName ?? assignment.ownerFullName ?? '-'} />
      </div>
    </article>
  );
};

const ScheduleDetail = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-container-low p-3">
    <span className="text-secondary">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{label}</p>
      <p className="truncate text-body-sm font-bold text-on-surface">{value}</p>
    </div>
  </div>
);

const ScheduleEmptyState = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 px-4 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">{icon}</div>
    <h3 className="mt-4 text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

export default JockeySchedulePage;

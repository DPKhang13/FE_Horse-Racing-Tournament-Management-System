import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Flag, Medal, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { getEffectiveInvitationStatus } from '../../components/invitations/invitationUtils';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import type { UserProfile } from '../../types/user';

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isConfirmedAssignment = (assignment: JockeyAssignmentItem) =>
  ['accepted', 'confirmed'].includes(getEffectiveInvitationStatus(assignment));

const getStatusClassName = (assignment: JockeyAssignmentItem) => {
  const status = getEffectiveInvitationStatus(assignment);

  if (status === 'confirmed') {
    return 'border-emerald-300/40 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'accepted') {
    return 'border-sky-300/40 bg-sky-400/10 text-sky-300';
  }

  if (status === 'pending') {
    return 'border-amber-300/40 bg-amber-400/10 text-amber-300';
  }

  return 'border-outline-variant bg-surface-container-high text-on-surface-variant';
};

const JockeyDashboardPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      authService.getCurrentUser(),
      jockeyAssignmentService.getMine(),
    ])
      .then(([currentProfile, assignmentList]) => {
        if (!isActive) {
          return;
        }

        setProfile(currentProfile);
        setAssignments(assignmentList);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load jockey dashboard.'));
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

  const [currentTime] = useState(() => Date.now());
  const pendingCount = assignments.filter((assignment) => getEffectiveInvitationStatus(assignment) === 'pending').length;
  const acceptedCount = assignments.filter((assignment) => getEffectiveInvitationStatus(assignment) === 'accepted').length;
  const confirmedCount = assignments.filter((assignment) => getEffectiveInvitationStatus(assignment) === 'confirmed').length;

  const upcomingAssignments = useMemo(
    () => assignments
      .filter(isConfirmedAssignment)
      .filter((assignment) => {
        const scheduledTime = new Date(assignment.scheduledAt ?? '').getTime();
        return Number.isFinite(scheduledTime) && scheduledTime >= currentTime;
      })
      .sort((left, right) => new Date(left.scheduledAt ?? 0).getTime() - new Date(right.scheduledAt ?? 0).getTime()),
    [assignments, currentTime],
  );

  const nextRace = upcomingAssignments[0];
  const recentAssignments = useMemo(
    () => [...assignments]
      .sort((left, right) => new Date(right.invitedAt ?? right.scheduledAt ?? 0).getTime() - new Date(left.invitedAt ?? left.scheduledAt ?? 0).getTime())
      .slice(0, 5),
    [assignments],
  );

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Jockey Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">
                Welcome, {profile?.fullName ?? 'Jockey'}
              </h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                A read-only overview of your profile, invitations, and assigned races.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pending" value={pendingCount} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Accepted" value={acceptedCount} />
              <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Confirmed" value={confirmedCount} />
              <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={upcomingAssignments.length} />
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-panel rounded-xl p-6">
            <SectionHeading
              icon={<UserRound className="h-5 w-5" />}
              title="Jockey profile"
              description="Current account and racing information."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileItem label="Full name" value={profile?.fullName ?? '-'} />
              <ProfileItem label="License" value={profile?.jockeyProfile?.licenseNumber ?? '-'} />
              <ProfileItem label="Ranking points" value={String(profile?.jockeyProfile?.rankingPoints ?? 0)} />
              <ProfileItem label="Total wins" value={String(profile?.jockeyProfile?.totalWins ?? 0)} />
              <ProfileItem label="Experience" value={`${profile?.jockeyProfile?.experienceYears ?? 0} years`} />
              <ProfileItem label="Profile status" value={profile?.jockeyProfile?.status ?? profile?.status ?? '-'} />
            </div>
          </section>

          <section className="glass-panel rounded-xl p-6">
            <SectionHeading
              icon={<Flag className="h-5 w-5" />}
              title="Next assigned race"
              description="The nearest accepted or confirmed race on your schedule."
            />

            {isLoading ? (
              <EmptyState title="Loading race information" description="Fetching your next assigned race." />
            ) : !nextRace ? (
              <EmptyState title="No upcoming assigned race" description="Accepted and confirmed assignments will appear here." />
            ) : (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      Race {nextRace.raceNumber ?? nextRace.raceId ?? '-'}
                    </p>
                    <h3 className="mt-2 break-words text-headline-sm font-bold text-primary">
                      {nextRace.raceName ?? `Race ${nextRace.raceId ?? '-'}`}
                    </h3>
                    <p className="mt-1 break-words text-body-sm text-on-surface-variant">
                      {nextRace.tournamentName ?? 'Tournament information unavailable'}
                    </p>
                  </div>
                  <StatusBadge assignment={nextRace} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <ProfileItem label="Scheduled" value={formatDateTime(nextRace.scheduledAt)} />
                  <ProfileItem label="Horse" value={nextRace.horseName ?? '-'} />
                  <ProfileItem label="Gate" value={nextRace.gateNumber != null ? `#${nextRace.gateNumber}` : '-'} />
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-panel rounded-xl p-6">
            <SectionHeading
              icon={<CalendarDays className="h-5 w-5" />}
              title="Upcoming assignments"
              description="Your next accepted and confirmed race assignments."
            />

            {isLoading ? (
              <EmptyState title="Loading assignments" description="Fetching your upcoming race schedule." />
            ) : upcomingAssignments.length === 0 ? (
              <EmptyState title="No upcoming assignments" description="Your confirmed races will be listed here." />
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.slice(0, 5).map((assignment) => (
                  <AssignmentRow
                    key={assignment.assignmentId ?? assignment.id ?? `${assignment.raceId}-${assignment.horseId}`}
                    assignment={assignment}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-xl p-6">
            <SectionHeading
              icon={<Trophy className="h-5 w-5" />}
              title="Recent activity"
              description="Latest invitations and assignment changes."
            />

            {isLoading ? (
              <EmptyState title="Loading activity" description="Fetching your recent invitation history." />
            ) : recentAssignments.length === 0 ? (
              <EmptyState title="No activity yet" description="Invitations sent to your account will appear here." />
            ) : (
              <div className="space-y-3">
                {recentAssignments.map((assignment) => (
                  <div
                    key={assignment.assignmentId ?? assignment.id ?? `${assignment.raceId}-${assignment.horseId}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-bold text-primary">
                        {assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`}
                      </p>
                      <p className="mt-1 truncate text-xs text-on-surface-variant">
                        {assignment.horseName ?? 'Horse unavailable'} · {formatDateTime(assignment.invitedAt)}
                      </p>
                    </div>
                    <StatusBadge assignment={assignment} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Dashboard data refreshed from your Jockey profile and assignment records.
        </p>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display text-2xl font-extrabold text-on-surface">{String(value).padStart(2, '0')}</p>
  </div>
);

const SectionHeading = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className="mb-5 flex items-start gap-3">
    <span className="mt-0.5 text-secondary">{icon}</span>
    <div>
      <h2 className="font-display text-title-large font-bold text-primary">{title}</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>
    </div>
  </div>
);

const ProfileItem = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 break-words text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const StatusBadge = ({ assignment }: { assignment: JockeyAssignmentItem }) => (
  <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${getStatusClassName(assignment)}`}>
    {getEffectiveInvitationStatus(assignment) || 'unknown'}
  </span>
);

const AssignmentRow = ({ assignment }: { assignment: JockeyAssignmentItem }) => (
  <article className="grid min-w-0 gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-secondary">
      <Medal className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <h3 className="truncate text-body-md font-bold text-primary">
        {assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`}
      </h3>
      <p className="mt-1 truncate text-body-sm text-on-surface-variant">
        {assignment.horseName ?? 'Horse unavailable'} · Gate {assignment.gateNumber ?? '-'}
      </p>
      <p className="mt-1 text-xs font-semibold text-secondary">{formatDateTime(assignment.scheduledAt)}</p>
    </div>
    <StatusBadge assignment={assignment} />
  </article>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 px-4 py-10 text-center">
    <h3 className="text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

export default JockeyDashboardPage;

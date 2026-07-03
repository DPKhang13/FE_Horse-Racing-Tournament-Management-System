import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock3, Send, ShieldCheck, Trophy, Users } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { raceRegistrationService, type RaceRegistrationItem } from '../../services/raceRegistrationService';
import type { Horse } from '../../types/horse';
import type { UserProfile } from '../../types/user';

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeStatus = (value?: string) => value?.trim().toLowerCase() ?? '';

const statusClassName = (value?: string) => {
  const status = normalizeStatus(value);

  if (['approved', 'confirmed', 'accepted', 'active'].includes(status)) {
    return 'bg-secondary/15 text-secondary';
  }

  if (['rejected', 'cancelled', 'inactive'].includes(status)) {
    return 'bg-error/15 text-error';
  }

  return 'bg-surface-container-high text-on-surface-variant';
};

const OwnerDashboardPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [horses, setHorses] = useState<Horse[]>([]);
  const [registrations, setRegistrations] = useState<RaceRegistrationItem[]>([]);
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const currentProfile = profile ?? await authService.getCurrentUser();
        setProfile(currentProfile);

        const [horseList, registrationList, assignmentList] = await Promise.all([
          HorseService.getOwnerHorses(currentProfile),
          raceRegistrationService.getMine(),
          jockeyAssignmentService.getSent(),
        ]);

        setHorses(horseList);
        setRegistrations(registrationList);
        setAssignments(assignmentList);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, 'Unable to load owner dashboard.'));
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const activeHorseCount = horses.filter((horse) => normalizeStatus(horse.status) === 'active').length;
  const approvedRegistrationCount = registrations.filter((registration) => normalizeStatus(registration.status) === 'approved').length;
  const pendingInvitationCount = assignments.filter((assignment) => normalizeStatus(assignment.status) === 'pending').length;
  const confirmedInvitationCount = assignments.filter((assignment) => normalizeStatus(assignment.status) === 'confirmed').length;

  const latestRegistrations = useMemo(
    () => [...registrations].sort((a, b) => new Date(b.registeredAt ?? 0).getTime() - new Date(a.registeredAt ?? 0).getTime()).slice(0, 5),
    [registrations],
  );

  const latestInvitations = useMemo(
    () => [...assignments].sort((a, b) => new Date(b.invitedAt ?? 0).getTime() - new Date(a.invitedAt ?? 0).getTime()).slice(0, 5),
    [assignments],
  );

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Horse Owner Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Stable overview</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Follow your horses, race registrations, and jockey invitations from one read-only board.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-4">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Horses" value={String(horses.length).padStart(2, '0')} />
              <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Approved regs" value={String(approvedRegistrationCount).padStart(2, '0')} />
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pending invites" value={String(pendingInvitationCount).padStart(2, '0')} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Confirmed" value={String(confirmedInvitationCount).padStart(2, '0')} />
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Users className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="font-display text-title-large font-bold text-primary">Stable profile</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Current account information and stable status.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard label="Owner" value={profile?.fullName ?? '-'} />
              <InfoCard label="Stable" value={profile?.ownerProfile?.stableName ?? '-'} />
              <InfoCard label="Email" value={profile?.email ?? '-'} />
              <InfoCard label="Phone" value={profile?.phone ?? '-'} />
              <InfoCard label="License" value={profile?.ownerProfile?.licenseNumber ?? '-'} />
              <InfoCard label="Active horses" value={String(activeHorseCount)} />
            </div>
          </section>

          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="font-display text-title-large font-bold text-primary">Horse list</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Your current horses and their racing groups.</p>
              </div>
            </div>

            {isLoading ? (
              <EmptyState title="Loading horses" description="Fetching your horse list." />
            ) : horses.length === 0 ? (
              <EmptyState title="No horses yet" description="Horse records will appear here once they are available." />
            ) : (
              <div className="space-y-3">
                {horses.slice(0, 5).map((horse) => (
                  <div key={horse.horseId} className="flex items-center gap-4 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
                    <img src={horse.avatarUrl} alt={horse.name} className="h-14 w-14 rounded-md border border-outline-variant object-cover" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-body-md font-bold text-primary">{horse.name}</h3>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        {horse.breed} • Group {horse.rankGroup} • {horse.totalWins} wins
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClassName(horse.status)}`}>
                      {horse.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="font-display text-title-large font-bold text-primary">Recent registrations</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Latest race registrations from your stable.</p>
              </div>
            </div>

            <DataTable
              isLoading={isLoading}
              emptyText="No registrations found."
              headers={['Tournament', 'Race', 'Horse', 'Status']}
              rows={latestRegistrations.map((registration) => [
                registration.tournamentName ?? `Tournament ${registration.tournamentId ?? '-'}`,
                registration.raceName ?? `Race ${registration.raceId ?? '-'}`,
                registration.horseName ?? `Horse ${registration.horseId ?? '-'}`,
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClassName(registration.status)}`}>
                  {registration.status ?? '-'}
                </span>,
              ])}
              footer={latestRegistrations.length > 0 ? `Last update ${formatDateTime(latestRegistrations[0]?.registeredAt)}` : undefined}
            />
          </section>

          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Send className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="font-display text-title-large font-bold text-primary">Recent invitations</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">Latest invitations sent to jockeys.</p>
              </div>
            </div>

            <DataTable
              isLoading={isLoading}
              emptyText="No invitations found."
              headers={['Race', 'Horse', 'Jockey', 'Status']}
              rows={latestInvitations.map((assignment) => [
                assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`,
                assignment.horseName ?? `Horse ${assignment.horseId ?? '-'}`,
                assignment.jockeyFullName ?? `Jockey ${assignment.jockeyId ?? '-'}`,
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusClassName(assignment.status)}`}>
                  {assignment.status ?? '-'}
                </span>,
              ])}
              footer={latestInvitations.length > 0 ? `Last invitation ${formatDateTime(latestInvitations[0]?.invitedAt)}` : undefined}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 text-body-md font-semibold text-primary">{value}</p>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-4 py-10 text-center">
    <h3 className="text-body-lg font-bold text-primary">{title}</h3>
    <p className="mt-2 text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const DataTable = ({
  headers,
  rows,
  isLoading,
  emptyText,
  footer,
}: {
  headers: string[];
  rows: ReactNode[][];
  isLoading: boolean;
  emptyText: string;
  footer?: string;
}) => (
  <div className="overflow-hidden rounded-lg border border-outline-variant">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant bg-white">
          {isLoading ? (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">{emptyText}</td></tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-4 text-body-sm text-on-surface-variant">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    {footer && <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">{footer}</div>}
  </div>
);

export default OwnerDashboardPage;

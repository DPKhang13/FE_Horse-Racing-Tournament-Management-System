import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock3, ClipboardList, Search, Send, UserCheck, Users, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { jockeyService, type JockeyItem } from '../../services/jockeyService';
import { raceRegistrationService, type RaceRegistrationItem } from '../../services/raceRegistrationService';
import { scheduleService } from '../../services/scheduleService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import type { UserProfile } from '../../types/user';

const normalizeStatus = (value?: string) => value?.trim().toLowerCase() ?? '';

const isActiveAssignmentStatus = (value?: string) => ['pending', 'accepted', 'confirmed'].includes(normalizeStatus(value));

const isPendingInvitationExpired = (assignment: JockeyAssignmentItem) => {
  if (normalizeStatus(assignment.status) !== 'pending' || !assignment.responseDeadline) {
    return false;
  }

  const deadlineTime = new Date(assignment.responseDeadline).getTime();

  return Number.isFinite(deadlineTime) && deadlineTime <= Date.now();
};

const getEffectiveAssignmentStatus = (assignment: JockeyAssignmentItem) =>
  isPendingInvitationExpired(assignment) ? 'expired' : normalizeStatus(assignment.status);

const hasAssignedJockey = (registration: RaceRegistrationItem) =>
  Boolean(registration.jockeyId || registration.jockeyFullName);

const isOwnerConfirmed = (registration: RaceRegistrationItem) =>
  normalizeStatus(registration.ownerConfirmationStatus) === 'confirmed';

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

const JockeyAssignmentsPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [jockeys, setJockeys] = useState<JockeyItem[]>([]);
  const [registrations, setRegistrations] = useState<RaceRegistrationItem[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<RaceRegistrationItem | null>(null);
  const [isJockeyPickerOpen, setIsJockeyPickerOpen] = useState(false);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [invitationSearch, setInvitationSearch] = useState('');
  const [viewingAssignment, setViewingAssignment] = useState<JockeyAssignmentItem | null>(null);

  const isOwner = profile?.roleType === 'horse_owner';
  const isJockey = profile?.roleType === 'jockey';

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadAssignments = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentProfile = profile ?? await authService.getCurrentUser();
      setProfile(currentProfile);
      const allRaces = await scheduleService.getRaceSchedule();
      const raceMap = new Map<number, string>();
      for (const r of allRaces) {
        if (r.tournamentName && r.raceId) {
          raceMap.set(r.raceId, r.tournamentName);
        }
      }

      if (currentProfile.roleType === 'horse_owner') {
        const [sent, availableJockeys, registrationList] = await Promise.all([
          jockeyAssignmentService.getSent(),
          jockeyService.getJockeys('available'),
          raceRegistrationService.getMine(),
        ]);
        setAssignments(sent.map((a) => ({ ...a, tournamentName: a.raceId ? raceMap.get(a.raceId) ?? a.tournamentName : a.tournamentName })));
        setJockeys(availableJockeys);
        setRegistrations(registrationList);
      } else {
        const mine = await jockeyAssignmentService.getMine();
        setAssignments(mine.map((a) => ({ ...a, tournamentName: a.raceId ? raceMap.get(a.raceId) ?? a.tournamentName : a.tournamentName })));
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load jockey assignments.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const pendingAssignments = assignments.filter((item) => getEffectiveAssignmentStatus(item) === 'pending').length;
  const acceptedAssignments = assignments.filter((item) => getEffectiveAssignmentStatus(item) === 'accepted').length;
  const confirmedAssignments = assignments.filter((item) => getEffectiveAssignmentStatus(item) === 'confirmed').length;

  const invitableRegistrations = useMemo(
    () =>
      registrations.filter((registration) => {
        const registrationId = registration.regId ?? registration.id;
        const status = normalizeStatus(registration.status);
        const hasActiveInvitation = assignments.some((assignment) =>
          (assignment.regId ?? assignment.registrationId) === registrationId &&
          isActiveAssignmentStatus(getEffectiveAssignmentStatus(assignment)),
        );

        if (status !== 'pending') {
          return false;
        }

        if (hasAssignedJockey(registration) || isOwnerConfirmed(registration)) {
          return false;
        }

        return !hasActiveInvitation;
      }),
    [assignments, registrations],
  );

  const availableJockeys = useMemo(() => {
    if (!selectedRegistration) {
      return jockeys;
    }

    const registrationId = selectedRegistration.regId ?? selectedRegistration.id;
    return jockeys.filter((jockey) => {
      const hasActiveInvitation = assignments.some((assignment) =>
        (assignment.regId ?? assignment.registrationId) === registrationId &&
        assignment.jockeyId === jockey.jockeyId &&
        isActiveAssignmentStatus(getEffectiveAssignmentStatus(assignment)),
      );

      return !hasActiveInvitation;
    });
  }, [assignments, jockeys, selectedRegistration]);

  const filteredAssignments = useMemo(() => {
    const query = invitationSearch.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((item) => {
      const haystack = [
        item.horseName,
        item.raceName,
        item.ownerStableName,
        item.ownerFullName,
        item.jockeyFullName,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [assignments, invitationSearch]);

  const handleRegistrationSelect = (registration: RaceRegistrationItem) => {
    setSelectedRegistration(registration);
    setIsJockeyPickerOpen(true);
  };

  const handleCreate = async (jockey: JockeyItem) => {
    if (!selectedRegistration || !jockey.jockeyId) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.create({
        registrationId: selectedRegistration.regId ?? selectedRegistration.id ?? 0,
        raceId: selectedRegistration.raceId ?? 0,
        jockeyId: jockey.jockeyId,
      });
      setMessage('Jockey invitation created.');
      setIsJockeyPickerOpen(false);
      setSelectedRegistration(null);
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create jockey invitation.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (id: number | string, status: string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.respond(id, status);
      setMessage(`Invitation ${status}.`);
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not respond to invitation.'));
    }
  };

  const handleConfirm = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.confirm(id);

      setMessage('Horse and jockey assignment confirmed.');
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not confirm assignment.'));
    }
  };

  const handleDelete = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.delete(id);
      setMessage('Invitation cancelled.');
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not cancel invitation.'));
    }
  };

  const renderAssignmentActions = (
    item: JockeyAssignmentItem,
    id: number | string,
    status: string,
  ) => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setViewingAssignment(item)}
        className="cursor-pointer rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary"
      >
        Details
      </button>
      {isJockey && status === 'pending' && (
        <>
          <button type="button" onClick={() => void handleRespond(id, 'accepted')} className="cursor-pointer rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary transition-opacity hover:bg-opacity-90">Accept</button>
          <button type="button" onClick={() => void handleRespond(id, 'rejected')} className="cursor-pointer rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error transition-colors hover:border-error">Reject</button>
        </>
      )}
      {isOwner && status === 'accepted' && (
        <button type="button" onClick={() => void handleConfirm(id)} className="cursor-pointer rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary transition-opacity hover:bg-opacity-90">Confirm</button>
      )}
      {isOwner && status === 'pending' && (
        <button type="button" onClick={() => void handleDelete(id)} className="cursor-pointer rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary">Cancel</button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Jockey Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Invitation workspace</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                {isOwner
                  ? 'Invite a jockey while the registration is pending, then confirm after the jockey accepts.'
                  : 'Review your invitations and respond from one focused queue.'}
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-4 xl:min-w-[640px]">
              <MetricCard icon={<UserCheck className="h-4 w-4" />} label="Invitations" value={String(assignments.length).padStart(2, '0')} />
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pending" value={String(pendingAssignments).padStart(2, '0')} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Accepted" value={String(acceptedAssignments).padStart(2, '0')} />
              <MetricCard icon={<Users className="h-4 w-4" />} label="Confirmed" value={String(confirmedAssignments).padStart(2, '0')} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setIsInvitationsOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-outline-variant bg-white px-4 py-2 text-body-sm font-bold text-primary shadow-sm transition-colors hover:border-primary"
          >
            <ClipboardList className="h-4 w-4" />
            Invitations
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-extrabold text-on-surface-variant">
              {assignments.length}
            </span>
          </button>
        </div>

        {isOwner ? (
          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex items-center gap-3">
              <Send className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="font-display text-title-large font-bold text-primary">Pending registrations ready for invitation</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Select a pending registration without a jockey, then invite an available jockey.
                </p>
              </div>
            </div>

            {isLoading ? (
              <EmptyState
                title="Loading registrations"
                description="Fetching pending registrations and available jockeys."
                icon={<Search className="h-5 w-5" />}
              />
            ) : invitableRegistrations.length === 0 ? (
              <EmptyState
                title="No pending registration is waiting for a jockey"
                description="Send a race registration first, or finish the current invitation flow from the Invitations queue."
                icon={<Send className="h-5 w-5" />}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {invitableRegistrations.map((registration) => {
                  const registrationId = registration.regId ?? registration.id ?? 0;

                  return (
                    <button
                      key={registrationId}
                      type="button"
                      onClick={() => handleRegistrationSelect(registration)}
                      className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low px-5 py-5 text-left transition-colors hover:border-primary hover:bg-white"
                    >
                      <div>
                        <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-secondary">
                          REG-{String(registrationId).padStart(3, '0')}
                        </p>
                        <h3 className="mt-2 text-title-large font-bold text-primary">
                          {registration.horseName ?? `Horse ${registration.horseId ?? '-'}`}
                        </h3>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoPill label="Tournament" value={registration.tournamentName ?? `Tournament ${registration.tournamentId ?? '-'}`} />
                        <InfoPill label="Race" value={registration.raceName ?? `Race ${registration.raceId ?? '-'}`} />
                        <InfoPill label="Race no." value={String(registration.raceNumber ?? '-')} />
                        <InfoPill label="Scheduled" value={formatDateTime(registration.scheduledAt)} />
                      </div>

                      <p className="text-body-sm font-semibold text-on-surface-variant">
                        Status {registration.status ?? '-'} / Stable {registration.ownerStableName ?? registration.ownerFullName ?? '-'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="glass-panel rounded-xl p-6">
            <EmptyState
              title="Invitation-focused view"
              description="Use the Invitations button to review and respond to jockey invitations."
              icon={<UserCheck className="h-5 w-5" />}
            />
          </section>
        )}
      </div>

      {isJockeyPickerOpen && selectedRegistration && (
        <Modal
          title={`Choose jockey for ${selectedRegistration.horseName ?? `Horse ${selectedRegistration.horseId ?? '-'}`}`}
          subtitle={selectedRegistration.raceName ?? `Race ${selectedRegistration.raceId ?? '-'}`}
          onClose={() => {
            setIsJockeyPickerOpen(false);
            setSelectedRegistration(null);
          }}
        >
          <div className="space-y-4 p-6">
            <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2">
              <InfoPill label="Tournament" value={selectedRegistration.tournamentName ?? `Tournament ${selectedRegistration.tournamentId ?? '-'}`} />
              <InfoPill label="Race" value={selectedRegistration.raceName ?? `Race ${selectedRegistration.raceId ?? '-'}`} />
              <InfoPill label="Horse" value={selectedRegistration.horseName ?? `Horse ${selectedRegistration.horseId ?? '-'}`} />
              <InfoPill label="Scheduled" value={formatDateTime(selectedRegistration.scheduledAt)} />
            </div>

            {(() => {
              const jockeyIdsAlreadyInvited = new Set(
                assignments
                  .filter((a) => isActiveAssignmentStatus(getEffectiveAssignmentStatus(a)))
                  .map((a) => a.jockeyId)
                  .filter(Boolean),
              );
              const trulyAvailable = availableJockeys.filter((j) => !jockeyIdsAlreadyInvited.has(j.jockeyId));
              return trulyAvailable.length === 0 ? (
                <EmptyState
                  title="No available jockey"
                  description="All jockeys either already have active invitations or are currently unavailable."
                  icon={<Users className="h-5 w-5" />}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {trulyAvailable.map((jockey) => (
                  <div key={jockey.jockeyId} className="rounded-lg border border-outline-variant bg-white p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={jockey.avatarUrl || 'https://picsum.photos/48/48?random=jockey'}
                        alt={jockey.fullName ?? 'Jockey'}
                        className="h-12 w-12 rounded-full border border-outline-variant object-cover"
                      />
                      <h3 className="text-body-lg font-bold text-primary">
                        {jockey.fullName ?? jockey.username ?? `Jockey ${jockey.jockeyId ?? '-'}`}
                      </h3>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <InfoPill label="Points" value={String(jockey.rankingPoints ?? 0)} />
                      <InfoPill label="Wins" value={String(jockey.totalWins ?? 0)} />
                      <InfoPill label="Experience" value={`${jockey.experienceYears ?? 0} years`} />
                      <InfoPill label="Status" value={jockey.status ?? '-'} />
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting || !jockey.jockeyId}
                      onClick={() => void handleCreate(jockey)}
                      className="mt-4 w-full rounded-md bg-secondary px-4 py-3 text-body-sm font-bold text-on-secondary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Sending...' : 'Send invitation'}
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
          </div>
        </Modal>
      )}

      {isInvitationsOpen && (
        <Modal title={isJockey ? 'My invitations' : 'Invitations'} subtitle="Assignment queue" onClose={() => setIsInvitationsOpen(false)}>
          <div className="space-y-4 p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={invitationSearch}
                onChange={(event) => setInvitationSearch(event.target.value)}
                placeholder="Search by horse, race, jockey, owner, status..."
                className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {isLoading ? (
                <div className="rounded-lg border border-outline-variant px-4 py-8 text-center text-body-sm text-on-surface-variant lg:col-span-2">Loading invitations...</div>
              ) : filteredAssignments.map((item) => {
                const id = item.assignmentId ?? item.id ?? '';
                const status = getEffectiveAssignmentStatus(item);
                return (
                  <article key={id} className="min-w-0 rounded-lg border border-outline-variant bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-body-sm font-bold text-primary">{item.raceName ?? `Race ${item.raceId ?? '-'}`}</p>
                        <p className="mt-1 break-words text-label-sm text-outline">{item.tournamentName ?? '-'}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {status || item.status || '-'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 rounded-md bg-surface-container-low p-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Horse</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          {item.horseAvatarUrl && <img src={item.horseAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded border border-outline-variant object-cover" />}
                          <span className="break-words text-body-sm text-on-surface-variant">{item.horseName ?? `Horse ${item.horseId ?? '-'}`}</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Jockey</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          {item.jockeyAvatarUrl && <img src={item.jockeyAvatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full border border-outline-variant object-cover" />}
                          <span className="break-words text-body-sm text-on-surface-variant">{item.jockeyFullName ?? `Jockey ${item.jockeyId ?? '-'}`}</span>
                        </div>
                      </div>
                    </div>

                    {item.responseDeadline && <p className="mt-3 text-[11px] text-outline">Deadline {formatDateTime(item.responseDeadline)}</p>}
                    <div className="mt-4 border-t border-outline-variant pt-3">{renderAssignmentActions(item, id, status)}</div>
                  </article>
                );
              })}
              {!isLoading && filteredAssignments.length === 0 && (
                <div className="rounded-lg border border-outline-variant px-4 py-8 text-center text-body-sm text-on-surface-variant lg:col-span-2">No invitations found.</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {viewingAssignment && (
        <Modal
          title={viewingAssignment.raceName ?? `Race ${viewingAssignment.raceId ?? '-'}`}
          subtitle={viewingAssignment.tournamentName ?? '-'}
          onClose={() => setViewingAssignment(null)}
        >
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <InfoPill label="Tournament" value={viewingAssignment.tournamentName ?? '-'} />
              <InfoPill label="Race" value={viewingAssignment.raceName ?? '-'} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                {viewingAssignment.horseAvatarUrl && (
                  <img src={viewingAssignment.horseAvatarUrl} alt="" className="h-16 w-16 rounded border border-outline-variant object-cover" />
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Horse</p>
                  <p className="text-body-lg font-bold text-primary">{viewingAssignment.horseName ?? '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                {viewingAssignment.jockeyAvatarUrl && (
                  <img src={viewingAssignment.jockeyAvatarUrl} alt="" className="h-16 w-16 rounded-full border border-outline-variant object-cover" />
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">Jockey</p>
                  <p className="text-body-lg font-bold text-primary">{viewingAssignment.jockeyFullName ?? '-'}</p>
                </div>
              </div>
              <InfoPill label="Owner" value={viewingAssignment.ownerFullName ?? '-'} />
              <InfoPill label="Stable" value={viewingAssignment.ownerStableName ?? '-'} />
              <InfoPill label="Status" value={getEffectiveAssignmentStatus(viewingAssignment) || viewingAssignment.status || '-'} />
              <InfoPill label="Gate Number" value={viewingAssignment.gateNumber != null ? String(viewingAssignment.gateNumber) : '-'} />
              <InfoPill label="Race Number" value={String(viewingAssignment.raceNumber ?? '-')} />
              <InfoPill label="Scheduled At" value={formatDateTime(viewingAssignment.scheduledAt)} />
              <InfoPill label="Invited At" value={formatDateTime(viewingAssignment.invitedAt)} />
              <InfoPill label="Respond By" value={formatDateTime(viewingAssignment.responseDeadline)} />
              {viewingAssignment.respondedAt && (
                <InfoPill label="Responded At" value={formatDateTime(viewingAssignment.respondedAt)} />
              )}
              {viewingAssignment.cancelledAt && (
                <InfoPill label="Cancelled At" value={formatDateTime(viewingAssignment.cancelledAt)} />
              )}
              {viewingAssignment.expiredAt && (
                <InfoPill label="Expired At" value={formatDateTime(viewingAssignment.expiredAt)} />
              )}
            </div>
          </div>
        </Modal>
      )}
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

const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-white px-3 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const EmptyState = ({ title, description, icon }: { title: string; description: string; icon: ReactNode }) => (
  <div className="px-4 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">
      {icon}
    </div>
    <h3 className="mt-4 text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 px-4 py-8">
    <div className="mx-auto max-w-5xl rounded-lg border border-outline-variant bg-white shadow-xl">
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
        <div>
          <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default JockeyAssignmentsPage;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Eye, Search, Send, UserCheck, Users } from 'lucide-react';
import { InvitationCard, InvitationDetailModal, InvitationEmptyState, InvitationMetric, InvitationModal } from '../../components/invitations/InvitationComponents';
import {
  getAssignmentId,
  getEffectiveInvitationStatus,
  isActiveInvitationStatus,
  normalizeInvitationStatus,
} from '../../components/invitations/invitationUtils';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { getApiErrorMessage } from '../../services/apiClient';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import { jockeyService, type JockeyItem } from '../../services/jockeyService';
import { raceRegistrationService, type RaceRegistrationItem } from '../../services/raceRegistrationService';

const hasAssignedJockey = (registration: RaceRegistrationItem) =>
  Boolean(registration.jockeyId || registration.jockeyFullName);

const isOwnerConfirmed = (registration: RaceRegistrationItem) =>
  normalizeInvitationStatus(registration.ownerConfirmationStatus) === 'confirmed';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const ACTIVE_ASSIGNMENT_STATUSES = new Set(['pending', 'accepted', 'confirmed']);
const TERMINAL_RACE_STATUSES = new Set(['completed', 'cancelled']);

const getScheduleTime = (value?: string) => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getScheduleDateKey = (value?: string) => {
  const time = getScheduleTime(value);
  if (time == null) {
    return '';
  }

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(time));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
};

const formatScheduleDate = (value?: string) => {
  const time = getScheduleTime(value);
  if (time == null) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(time));
};

const formatScheduleTime = (value?: string) => {
  const time = getScheduleTime(value);
  if (time == null) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
};

const formatScheduleDateTime = (value?: string) => {
  const time = getScheduleTime(value);
  if (time == null) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
};

const isActiveScheduleAssignment = (assignment: JockeyAssignmentItem, now: number) => {
  const raceStatus = (assignment.raceStatus ?? '').trim().toLowerCase();
  if (TERMINAL_RACE_STATUSES.has(raceStatus)) {
    return false;
  }

  const status = normalizeInvitationStatus(assignment.status);
  if (!ACTIVE_ASSIGNMENT_STATUSES.has(status)) {
    return false;
  }

  if (status !== 'pending' || !assignment.responseDeadline) {
    return true;
  }

  const deadlineTime = getScheduleTime(assignment.responseDeadline);
  return deadlineTime == null || deadlineTime > now;
};
const fetchOwnerInvitationData = async () => {
  const [sentInvitations, availableJockeys, myRegistrations, scheduleAssignments] = await Promise.all([
    jockeyAssignmentService.getSent(),
    jockeyService.getJockeys('available'),
    raceRegistrationService.getMine(),
    jockeyAssignmentService.getAll(),
  ]);

  return { sentInvitations, availableJockeys, myRegistrations, scheduleAssignments };
};


const OwnerInvitationsPage = () => {
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [jockeys, setJockeys] = useState<JockeyItem[]>([]);
  const [registrations, setRegistrations] = useState<RaceRegistrationItem[]>([]);
  const [selectedRegistration, setSelectedRegistration] = useState<RaceRegistrationItem | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<JockeyAssignmentItem | null>(null);
  const [selectedJockey, setSelectedJockey] = useState<JockeyItem | null>(null);
  const [statusReferenceTime] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAssignmentId, setBusyAssignmentId] = useState<number | string | null>(null);
  const [invitationSearch, setInvitationSearch] = useState('');
  const [jockeySearch, setJockeySearch] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadOwnerInvitations = useCallback(async () => {
    try {
      const { sentInvitations, availableJockeys, myRegistrations, scheduleAssignments: allScheduleAssignments } = await fetchOwnerInvitationData();

      setAssignments(sentInvitations);
      setScheduleAssignments(allScheduleAssignments);
      setJockeys(availableJockeys);
      setRegistrations(myRegistrations);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load your sent invitations.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void fetchOwnerInvitationData()
      .then(({ sentInvitations, availableJockeys, myRegistrations, scheduleAssignments: allScheduleAssignments }) => {
        if (!isActive) {
          return;
        }

        setAssignments(sentInvitations);
        setScheduleAssignments(allScheduleAssignments);
        setJockeys(availableJockeys);
        setRegistrations(myRegistrations);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load your sent invitations.'));
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

  const pendingCount = assignments.filter((item) => getEffectiveInvitationStatus(item) === 'pending').length;
  const acceptedCount = assignments.filter((item) => getEffectiveInvitationStatus(item) === 'accepted').length;
  const confirmedCount = assignments.filter((item) => getEffectiveInvitationStatus(item) === 'confirmed').length;

  const invitableRegistrations = useMemo(
    () => registrations.filter((registration) => {
      const registrationId = registration.regId ?? registration.id;
      if (registrationId == null || normalizeInvitationStatus(registration.status) !== 'pending') {
        return false;
      }

      const hasActiveInvitation = assignments.some((assignment) =>
        (assignment.regId ?? assignment.registrationId) === registrationId
        && isActiveInvitationStatus(getEffectiveInvitationStatus(assignment)),
      );

      return !hasAssignedJockey(registration) && !isOwnerConfirmed(registration) && !hasActiveInvitation;
    }),
    [assignments, registrations],
  );

  const filteredAssignments = useMemo(() => {
    const query = invitationSearch.trim().toLowerCase();
    if (!query) {
      return assignments;
    }

    return assignments.filter((item) => [
      item.horseName,
      item.raceName,
      item.tournamentName,
      item.jockeyFullName,
      item.status,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [assignments, invitationSearch]);

  const filteredJockeys = useMemo(() => {
    const query = jockeySearch.trim().toLowerCase();
    if (!query) {
      return jockeys;
    }

    return jockeys.filter((jockey) => [
      jockey.fullName,
      jockey.username,
      jockey.licenseNumber,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [jockeySearch, jockeys]);

  const busyAssignmentsByJockey = useMemo(() => {
    const assignmentsByJockey = new Map<number, JockeyAssignmentItem[]>();

    scheduleAssignments
      .filter((assignment) =>
        assignment.jockeyId != null
        && getScheduleTime(assignment.scheduledAt) != null
        && isActiveScheduleAssignment(assignment, statusReferenceTime),
      )
      .sort((first, second) =>
        (getScheduleTime(first.scheduledAt) ?? Number.MAX_SAFE_INTEGER)
        - (getScheduleTime(second.scheduledAt) ?? Number.MAX_SAFE_INTEGER),
      )
      .forEach((assignment) => {
        if (assignment.jockeyId == null) {
          return;
        }

        const jockeyAssignments = assignmentsByJockey.get(assignment.jockeyId) ?? [];
        jockeyAssignments.push(assignment);
        assignmentsByJockey.set(assignment.jockeyId, jockeyAssignments);
      });

    return assignmentsByJockey;
  }, [scheduleAssignments, statusReferenceTime]);

  const selectedScheduleTime = getScheduleTime(selectedRegistration?.scheduledAt);
  const selectedScheduleDateKey = getScheduleDateKey(selectedRegistration?.scheduledAt);

  const getJockeyScheduleState = (jockey: JockeyItem) => {
    const busyAssignments = jockey.jockeyId == null
      ? []
      : busyAssignmentsByJockey.get(jockey.jockeyId) ?? [];
    const sameDayAssignments = selectedScheduleDateKey
      ? busyAssignments.filter((assignment) => getScheduleDateKey(assignment.scheduledAt) === selectedScheduleDateKey)
      : [];
    const hasExactConflict = selectedScheduleTime != null
      && busyAssignments.some((assignment) => getScheduleTime(assignment.scheduledAt) === selectedScheduleTime);
    const busyDates = Array.from(new Set(busyAssignments.map((assignment) => formatScheduleDate(assignment.scheduledAt))));

    return { busyAssignments, sameDayAssignments, hasExactConflict, busyDates };
  };
  const selectedJockeyScheduleState = selectedJockey ? getJockeyScheduleState(selectedJockey) : null;


  const handleCreateInvitation = async (jockey: JockeyItem) => {
    const registrationId = selectedRegistration?.regId ?? selectedRegistration?.id;
    if (registrationId == null || selectedRegistration?.raceId == null || jockey.jockeyId == null) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.create({
        registrationId,
        raceId: selectedRegistration.raceId,
        jockeyId: jockey.jockeyId,
        gateNumber: selectedRegistration.gateNumber,
      });
      setMessage(`Invitation sent to ${jockey.fullName ?? 'the jockey'}.`);
      setSelectedRegistration(null);
      setJockeySearch('');
      await loadOwnerInvitations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create jockey invitation.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAssignmentAction = async (
    assignmentId: number | string,
    action: () => Promise<JockeyAssignmentItem>,
    successMessage: string,
  ) => {
    setBusyAssignmentId(assignmentId);
    setMessage('');
    setErrorMessage('');

    try {
      await action();
      setMessage(successMessage);
      await loadOwnerInvitations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not update the invitation.'));
    } finally {
      setBusyAssignmentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <header className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Horse Owner</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Sent jockey invitations</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Invite an available jockey for a pending registration, then confirm the assignment after acceptance.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[640px]">
              <InvitationMetric icon={<UserCheck className="h-4 w-4" />} label="Sent" value={assignments.length} />
              <InvitationMetric icon={<Clock3 className="h-4 w-4" />} label="Pending" value={pendingCount} />
              <InvitationMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Accepted" value={acceptedCount} />
              <InvitationMetric icon={<Users className="h-4 w-4" />} label="Confirmed" value={confirmedCount} />
            </div>
          </div>
        </header>

        <section className="glass-panel mb-6 rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <Send className="mt-1 h-5 w-5 shrink-0 text-secondary" />
            <div>
              <h2 className="font-display text-title-large font-bold text-primary">Registrations ready for invitation</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">Select a registration to choose an available jockey.</p>
            </div>
          </div>

          {isLoading ? (
            <InvitationEmptyState icon={<Search className="h-5 w-5" />} title="Loading registrations" description="Fetching your pending race registrations." />
          ) : invitableRegistrations.length === 0 ? (
            <InvitationEmptyState icon={<Send className="h-5 w-5" />} title="No registration is waiting for a jockey" description="Create a pending race registration or finish an existing invitation first." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {invitableRegistrations.map((registration) => {
                const registrationId = registration.regId ?? registration.id;
                return (
                  <button
                    key={registrationId}
                    type="button"
                    onClick={() => setSelectedRegistration(registration)}
                    className="min-w-0 cursor-pointer rounded-xl border border-outline-variant bg-surface-container-low p-5 text-left transition-colors hover:border-primary hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">REG-{registrationId}</p>
                        <h3 className="mt-1 truncate text-body-lg font-bold text-primary">{registration.horseName ?? `Horse ${registration.horseId ?? '-'}`}</h3>
                      </div>
                      <span className="shrink-0 rounded-full border border-outline-variant bg-white px-2.5 py-1 text-[10px] font-bold text-on-surface-variant">Gate {registration.gateNumber ?? '-'}</span>
                    </div>
                    <p className="mt-3 break-words text-body-sm font-semibold text-on-surface">{registration.raceName ?? `Race ${registration.raceId ?? '-'}`}</p>
                    <p className="mt-1 break-words text-body-sm text-on-surface-variant">{registration.tournamentName ?? 'Tournament information unavailable'}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-label-sm font-bold text-secondary">Choose jockey <Send className="h-4 w-4" /></span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass-panel rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-title-large font-bold text-primary">Invitation history</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">Only invitations sent by your owner account are shown here.</p>
            </div>
            <label className="relative block w-full md:max-w-sm">
              <span className="sr-only">Search sent invitations</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input value={invitationSearch} onChange={(event) => setInvitationSearch(event.target.value)} placeholder="Search horse, race, or jockey" className="w-full rounded-md border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary" />
            </label>
          </div>

          {isLoading ? (
            <InvitationEmptyState icon={<Search className="h-5 w-5" />} title="Loading invitations" description="Fetching invitations sent from your account." />
          ) : filteredAssignments.length === 0 ? (
            <InvitationEmptyState icon={<UserCheck className="h-5 w-5" />} title="No sent invitations found" description="Try another search or invite a jockey from a pending registration." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredAssignments.map((assignment) => {
                const assignmentId = getAssignmentId(assignment);
                const status = getEffectiveInvitationStatus(assignment);
                const isBusy = assignmentId != null && busyAssignmentId === assignmentId;

                return (
                  <InvitationCard
                    key={assignmentId ?? `${assignment.raceId}-${assignment.jockeyId}`}
                    assignment={assignment}
                    counterpartLabel="Jockey"
                    counterpartName={assignment.jockeyFullName ?? `Jockey ${assignment.jockeyId ?? '-'}`}
                    counterpartAvatarUrl={assignment.jockeyAvatarUrl}
                    onViewDetails={() => setSelectedInvitation(assignment)}
                    actions={assignmentId != null && (status === 'pending' || status === 'accepted') ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        {status === 'accepted' && (
                          <button type="button" disabled={isBusy} onClick={() => void runAssignmentAction(assignmentId, () => jockeyAssignmentService.confirm(assignmentId), 'Horse and jockey assignment confirmed.')} className="cursor-pointer rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                            {isBusy ? 'Saving...' : 'Confirm assignment'}
                          </button>
                        )}
                        {status === 'pending' && (
                          <button type="button" disabled={isBusy} onClick={() => void runAssignmentAction(assignmentId, () => jockeyAssignmentService.delete(assignmentId), 'Invitation cancelled.')} className="cursor-pointer rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50">
                            {isBusy ? 'Cancelling...' : 'Cancel invitation'}
                          </button>
                        )}
                      </div>
                    ) : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedInvitation && (
        <InvitationDetailModal
          assignment={selectedInvitation}
          counterpartLabel="Jockey"
          counterpartName={selectedInvitation.jockeyFullName ?? `Jockey ${selectedInvitation.jockeyId ?? '-'}`}
          onClose={() => setSelectedInvitation(null)}
        />
      )}

      {selectedRegistration && (
        <InvitationModal title={selectedRegistration.horseName ?? 'Choose a jockey'} subtitle={selectedRegistration.raceName ?? `Race ${selectedRegistration.raceId ?? '-'}`} onClose={() => { setSelectedRegistration(null); setJockeySearch(''); }}>
          <div className="p-5 sm:p-6">
            <label className="relative mb-5 block">
              <span className="sr-only">Search available jockeys</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input value={jockeySearch} onChange={(event) => setJockeySearch(event.target.value)} placeholder="Search by jockey name or license" className="w-full rounded-md border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary" autoFocus />
            </label>

            {filteredJockeys.length === 0 ? (
              <InvitationEmptyState icon={<Users className="h-5 w-5" />} title="No available jockey found" description="Try another search or check again later." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredJockeys.map((jockey) => {
                  const { sameDayAssignments, hasExactConflict, busyDates } = getJockeyScheduleState(jockey);

                  return (
                    <article key={jockey.jockeyId ?? jockey.username} className={`min-w-0 rounded-xl border p-4 transition-colors ${
                      hasExactConflict
                        ? 'border-error/40 bg-error/5'
                        : sameDayAssignments.length > 0
                          ? 'border-amber-300 bg-amber-50/70'
                          : 'border-outline-variant bg-surface-container-low hover:border-primary hover:bg-white'
                    }`}>
                      <div className="flex min-w-0 items-center gap-3">
                        {jockey.avatarUrl ? <img src={jockey.avatarUrl} alt={jockey.fullName ?? 'Jockey'} className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-primary">{jockey.fullName?.charAt(0) ?? 'J'}</div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-sm font-bold text-primary">{jockey.fullName ?? jockey.username ?? 'Unnamed jockey'}</p>
                          <p className="mt-1 truncate text-xs text-on-surface-variant">License {jockey.licenseNumber ?? '-'} · {jockey.experienceYears ?? 0} years</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedJockey(jockey)}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            aria-label={`View details for ${jockey.fullName ?? 'jockey'}`}
                            title="View jockey details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSubmitting || jockey.jockeyId == null || hasExactConflict}
                            onClick={() => void handleCreateInvitation(jockey)}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-secondary text-on-secondary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={hasExactConflict ? `${jockey.fullName ?? 'Jockey'} is busy at this race time` : `Invite ${jockey.fullName ?? 'jockey'}`}
                            title={hasExactConflict ? 'Jockey is busy at this race time' : 'Send invitation'}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className={`mt-3 flex min-w-0 items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs ${
                        hasExactConflict
                          ? 'font-semibold text-error'
                          : sameDayAssignments.length > 0
                            ? 'font-semibold text-primary'
                            : 'text-on-surface-variant'
                      }`}>
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">
                          {hasExactConflict
                            ? `Busy at ${formatScheduleDateTime(selectedRegistration?.scheduledAt)}`
                            : sameDayAssignments.length > 0
                              ? `Busy this day at ${sameDayAssignments.map((assignment) => formatScheduleTime(assignment.scheduledAt)).join(', ')}`
                              : busyDates.length > 0
                                ? `Busy dates: ${busyDates.slice(0, 2).join(', ')}${busyDates.length > 2 ? ` +${busyDates.length - 2}` : ''}`
                                : 'No active schedule conflicts'}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </InvitationModal>
      )}

      {selectedJockey && selectedJockeyScheduleState && (
        <InvitationModal
          title={selectedJockey.fullName ?? selectedJockey.username ?? 'Jockey details'}
          subtitle={`License ${selectedJockey.licenseNumber ?? '-'}`}
          onClose={() => setSelectedJockey(null)}
        >
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center">
              {selectedJockey.avatarUrl ? (
                <img src={selectedJockey.avatarUrl} alt={selectedJockey.fullName ?? 'Jockey'} className="h-20 w-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-container text-xl font-bold text-primary">
                  {selectedJockey.fullName?.charAt(0) ?? 'J'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words text-title-large font-bold text-primary">{selectedJockey.fullName ?? selectedJockey.username ?? 'Unnamed jockey'}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">{selectedJockey.experienceYears ?? 0} years of experience</p>
                <span className="mt-3 inline-flex rounded-full border border-outline-variant bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {selectedJockey.status ?? 'Status unavailable'}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <JockeyDetailItem label="Ranking points" value={selectedJockey.rankingPoints ?? 0} />
              <JockeyDetailItem label="Total wins" value={selectedJockey.totalWins ?? 0} />
              <JockeyDetailItem label="Experience" value={`${selectedJockey.experienceYears ?? 0} years`} />
            </div>

            {selectedRegistration?.scheduledAt && (
              <div className={`rounded-xl border p-4 ${
                selectedJockeyScheduleState.hasExactConflict
                  ? 'border-error/40 bg-error/5'
                  : selectedJockeyScheduleState.sameDayAssignments.length > 0
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-emerald-300 bg-emerald-50'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Selected race schedule</p>
                <p className="mt-1 text-body-sm font-bold text-on-surface">{formatScheduleDateTime(selectedRegistration.scheduledAt)}</p>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  {selectedJockeyScheduleState.hasExactConflict
                    ? 'Unavailable: this jockey already has an active assignment at the same time.'
                    : selectedJockeyScheduleState.sameDayAssignments.length > 0
                      ? `Busy on the same day at ${selectedJockeyScheduleState.sameDayAssignments.map((assignment) => formatScheduleTime(assignment.scheduledAt)).join(', ')}, but no exact time conflict.`
                      : 'No active assignment conflicts with this race schedule.'}
                </p>
              </div>
            )}

            <section>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-secondary" />
                <h3 className="text-label-md font-extrabold uppercase tracking-[0.14em] text-primary">Busy schedule</h3>
              </div>
              {selectedJockeyScheduleState.busyAssignments.length === 0 ? (
                <InvitationEmptyState icon={<CalendarDays className="h-5 w-5" />} title="No active assignments" description="This jockey has no pending, accepted, or confirmed race schedule." />
              ) : (
                <div className="space-y-3">
                  {selectedJockeyScheduleState.busyAssignments.map((assignment) => {
                    const assignmentId = getAssignmentId(assignment);
                    const isExactConflict = selectedScheduleTime != null
                      && getScheduleTime(assignment.scheduledAt) === selectedScheduleTime;

                    return (
                      <div key={assignmentId ?? `${assignment.raceId}-${assignment.scheduledAt}`} className={`rounded-lg border p-3 ${
                        isExactConflict ? 'border-error/40 bg-error/5' : 'border-outline-variant bg-white'
                      }`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-body-sm font-bold text-primary">{assignment.raceName ?? `Race ${assignment.raceId ?? '-'}`}</p>
                            <p className="mt-1 break-words text-xs text-on-surface-variant">{assignment.tournamentName ?? 'Tournament information unavailable'}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isExactConflict ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant'
                          }`}>
                            {normalizeInvitationStatus(assignment.status) || '-'}
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-on-surface">
                          <Clock3 className="h-4 w-4 shrink-0 text-secondary" />
                          {formatScheduleDateTime(assignment.scheduledAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </InvitationModal>
      )}
    </div>
  );
};

const JockeyDetailItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className="min-w-0 rounded-lg border border-outline-variant bg-white p-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline">{label}</p>
    <p className="mt-1 break-words text-body-sm font-semibold text-on-surface">{value}</p>
  </div>
);

export default OwnerInvitationsPage;

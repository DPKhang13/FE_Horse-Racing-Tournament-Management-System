import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Search, ShieldCheck, UserCheck } from 'lucide-react';
import { InvitationCard, InvitationEmptyState, InvitationMetric } from '../../components/invitations/InvitationComponents';
import { getAssignmentId, getEffectiveInvitationStatus } from '../../components/invitations/invitationUtils';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { getApiErrorMessage } from '../../services/apiClient';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
const fetchMyJockeyInvitations = () => jockeyAssignmentService.getMine();


const JockeyInvitationsPage = () => {
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAssignmentId, setBusyAssignmentId] = useState<number | string | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadMyInvitations = useCallback(async () => {
    try {
      setAssignments(await fetchMyJockeyInvitations());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load your jockey invitations.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void fetchMyJockeyInvitations()
      .then((myInvitations) => {
        if (isActive) {
          setAssignments(myInvitations);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load your jockey invitations.'));
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

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    const statusPriority: Record<string, number> = { pending: 0, accepted: 1, confirmed: 2 };

    return assignments
      .filter((item) => {
        if (!query) {
          return true;
        }

        return [
          item.horseName,
          item.raceName,
          item.tournamentName,
          item.ownerFullName,
          item.ownerStableName,
          item.status,
        ].filter(Boolean).join(' ').toLowerCase().includes(query);
      })
      .sort((left, right) => {
        const leftStatus = getEffectiveInvitationStatus(left);
        const rightStatus = getEffectiveInvitationStatus(right);
        return (statusPriority[leftStatus] ?? 9) - (statusPriority[rightStatus] ?? 9);
      });
  }, [assignments, search]);

  const handleRespond = async (assignmentId: number | string, status: 'accepted' | 'rejected') => {
    setBusyAssignmentId(assignmentId);
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.respond(assignmentId, status);
      setMessage(`Invitation ${status}.`);
      await loadMyInvitations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not respond to the invitation.'));
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
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Jockey</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">My race invitations</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Review invitations sent directly to your jockey account and accept or reject pending requests.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[640px]">
              <InvitationMetric icon={<UserCheck className="h-4 w-4" />} label="Invitations" value={assignments.length} />
              <InvitationMetric icon={<Clock3 className="h-4 w-4" />} label="Pending" value={pendingCount} />
              <InvitationMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Accepted" value={acceptedCount} />
              <InvitationMetric icon={<ShieldCheck className="h-4 w-4" />} label="Confirmed" value={confirmedCount} />
            </div>
          </div>
        </header>

        <section className="glass-panel rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-title-large font-bold text-primary">Invitation queue</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">Pending invitations are shown first. This page only uses Jockey-authorized endpoints.</p>
            </div>
            <label className="relative block w-full md:max-w-sm">
              <span className="sr-only">Search my invitations</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search horse, race, or owner" className="w-full rounded-md border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary" />
            </label>
          </div>

          {isLoading ? (
            <InvitationEmptyState icon={<Search className="h-5 w-5" />} title="Loading invitations" description="Fetching invitations assigned to your jockey account." />
          ) : filteredAssignments.length === 0 ? (
            <InvitationEmptyState icon={<UserCheck className="h-5 w-5" />} title="No invitations found" description="There are no invitations for this account or no item matches your search." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredAssignments.map((assignment) => {
                const assignmentId = getAssignmentId(assignment);
                const status = getEffectiveInvitationStatus(assignment);
                const isBusy = assignmentId != null && busyAssignmentId === assignmentId;

                return (
                  <InvitationCard
                    key={assignmentId ?? `${assignment.raceId}-${assignment.horseId}`}
                    assignment={assignment}
                    counterpartLabel="Horse owner"
                    counterpartName={assignment.ownerStableName ?? assignment.ownerFullName ?? 'Horse owner'}
                    actions={assignmentId != null && status === 'pending' ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" disabled={isBusy} onClick={() => void handleRespond(assignmentId, 'rejected')} className="cursor-pointer rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error transition-colors hover:border-error disabled:cursor-not-allowed disabled:opacity-50">
                          Reject
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => void handleRespond(assignmentId, 'accepted')} className="cursor-pointer rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                          {isBusy ? 'Saving...' : 'Accept invitation'}
                        </button>
                      </div>
                    ) : undefined}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default JockeyInvitationsPage;

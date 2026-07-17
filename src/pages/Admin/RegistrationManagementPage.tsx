import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { registrationService } from '../../services/registrationService';
import type { RegistrationResponse } from '../../types/registration';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};
type ActionType = 'approve' | 'reject';
type RegistrationAction = {
  type: ActionType;
  registration: RegistrationResponse;
};
type SortMode = 'registered_desc' | 'tournament_asc' | 'race_asc';
type SelectOption = {
  value: string;
  label: string;
};

const fallbackHorseImage = 'https://picsum.photos/320/320?random=race-registration';
const allFilterValue = 'All';

const normalizeStatus = (value?: string | null) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

const formatStatusLabel = (value?: string | null) => {
  const status = value?.trim();

  if (!status) {
    return '-';
  }

  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRegistrationKey = (registration: RegistrationResponse) => registration.regId ?? registration.id ?? '';

const getRegistrationCode = (registration: RegistrationResponse) => {
  const id = getRegistrationKey(registration);
  return id ? `REG-${String(id).padStart(4, '0')}` : 'REG-';
};

const getStatusClassName = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  if (normalized === 'approved' || normalized === 'confirmed') {
    return 'border-secondary/30 bg-secondary/10 text-secondary';
  }

  if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'canceled') {
    return 'border-error/30 bg-error-container/20 text-error';
  }

  if (normalized.includes('pending') || normalized.includes('waiting') || normalized.includes('submitted')) {
    return 'border-primary/30 bg-primary/10 text-primary';
  }

  return 'border-outline-variant bg-surface-container-highest text-on-surface-variant';
};

const isTerminalRegistrationStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return ['approved', 'rejected', 'cancelled', 'canceled', 'deleted'].includes(normalized);
};

const hasAssignedJockey = (registration: RegistrationResponse) =>
  Boolean(registration.jockeyId || registration.jockeyFullName);

const isOwnerConfirmed = (registration: RegistrationResponse) =>
  normalizeStatus(registration.ownerConfirmationStatus) === 'confirmed';

const canApproveRegistration = (registration: RegistrationResponse) =>
  normalizeStatus(registration.status) === 'pending' &&
  hasAssignedJockey(registration) &&
  isOwnerConfirmed(registration);

const getApprovalBlockReason = (registration: RegistrationResponse) => {
  if (canApproveRegistration(registration)) {
    return '';
  }

  if (normalizeStatus(registration.status) !== 'pending') {
    return 'Only pending registrations can be approved.';
  }

  if (!hasAssignedJockey(registration)) {
    return 'Waiting for a jockey to be assigned.';
  }

  return 'Waiting for owner confirmation after jockey acceptance.';
};

const getHorseImage = (registration: RegistrationResponse) => registration.horseAvatarUrl || fallbackHorseImage;

const compareText = (first?: string | null, second?: string | null) =>
  String(first ?? '').localeCompare(String(second ?? ''), 'en', { numeric: true, sensitivity: 'base' });

const compareRegistrationDateDesc = (first: RegistrationResponse, second: RegistrationResponse) =>
  new Date(second.registeredAt ?? 0).getTime() - new Date(first.registeredAt ?? 0).getTime();

const RegistrationManagementPage = () => {
  const [registrations, setRegistrations] = useState<RegistrationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(allFilterValue);
  const [ownerConfirmationFilter, setOwnerConfirmationFilter] = useState(allFilterValue);
  const [tournamentFilter, setTournamentFilter] = useState(allFilterValue);
  const [raceFilter, setRaceFilter] = useState(allFilterValue);
  const [sortMode, setSortMode] = useState<SortMode>('registered_desc');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationResponse | null>(null);
  const [activeAction, setActiveAction] = useState<RegistrationAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');

  const loadRegistrations = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setNotice(null);

    try {
      setRegistrations(await registrationService.getPendingApprovalRegistrations());
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load race registrations.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRegistrations();
  }, []);

  const statusOptions = useMemo(() => {
    const values = registrations
      .map((registration) => registration.status)
      .filter((status): status is string => Boolean(status));
    return Array.from(new Set(values));
  }, [registrations]);

  const ownerConfirmationOptions = useMemo(() => {
    const values = registrations
      .map((registration) => registration.ownerConfirmationStatus)
      .filter((status): status is string => Boolean(status));
    return Array.from(new Set(values));
  }, [registrations]);

  const tournamentOptions = useMemo<SelectOption[]>(() => {
    const options = new Map<string, string>();

    registrations.forEach((registration) => {
      const value = String(registration.tournamentId || '');

      if (value) {
        options.set(value, registration.tournamentName || `Tournament ${value}`);
      }
    });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => compareText(first.label, second.label));
  }, [registrations]);

  const raceOptions = useMemo<SelectOption[]>(() => {
    const options = new Map<string, string>();
    const sourceRegistrations = tournamentFilter === allFilterValue
      ? registrations
      : registrations.filter((registration) => String(registration.tournamentId) === tournamentFilter);

    sourceRegistrations.forEach((registration) => {
      const value = String(registration.raceId || '');

      if (value) {
        const raceLabel = registration.raceName || `Race ${value}`;
        const tournamentLabel = registration.tournamentName || `Tournament ${registration.tournamentId || '-'}`;
        options.set(value, tournamentFilter === allFilterValue ? `${raceLabel} / ${tournamentLabel}` : raceLabel);
      }
    });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => compareText(first.label, second.label));
  }, [registrations, tournamentFilter]);

  useEffect(() => {
    if (raceFilter !== allFilterValue && !raceOptions.some((option) => option.value === raceFilter)) {
      setRaceFilter(allFilterValue);
    }
  }, [raceFilter, raceOptions]);

  const filteredRegistrations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return registrations
      .filter((registration) => {
        const searchableValues = [
          getRegistrationCode(registration),
          registration.tournamentName,
          registration.raceName,
          registration.raceNumber,
          registration.horseName,
          registration.ownerFullName,
          registration.ownerStableName,
          registration.jockeyFullName,
          registration.status,
          registration.ownerConfirmationStatus,
        ];
        const matchesSearch = !query || searchableValues
          .filter((value) => value !== null && value !== undefined)
          .some((value) => String(value).toLowerCase().includes(query));
        const matchesStatus = statusFilter === allFilterValue || registration.status === statusFilter;
        const matchesOwnerConfirmation =
          ownerConfirmationFilter === allFilterValue ||
          registration.ownerConfirmationStatus === ownerConfirmationFilter;
        const matchesTournament = tournamentFilter === allFilterValue || String(registration.tournamentId) === tournamentFilter;
        const matchesRace = raceFilter === allFilterValue || String(registration.raceId) === raceFilter;

        return matchesSearch && matchesStatus && matchesOwnerConfirmation && matchesTournament && matchesRace;
      })
      .sort((first, second) => {
        if (sortMode === 'tournament_asc') {
          return (
            compareText(first.tournamentName, second.tournamentName) ||
            Number(first.raceNumber ?? first.raceId ?? 0) - Number(second.raceNumber ?? second.raceId ?? 0) ||
            compareRegistrationDateDesc(first, second)
          );
        }

        if (sortMode === 'race_asc') {
          return (
            Number(first.raceNumber ?? first.raceId ?? 0) - Number(second.raceNumber ?? second.raceId ?? 0) ||
            compareText(first.raceName, second.raceName) ||
            compareText(first.tournamentName, second.tournamentName) ||
            compareRegistrationDateDesc(first, second)
          );
        }

        return compareRegistrationDateDesc(first, second);
      });
  }, [ownerConfirmationFilter, raceFilter, registrations, searchTerm, sortMode, statusFilter, tournamentFilter]);

  const stats = useMemo(() => {
    const approved = registrations.filter((registration) => normalizeStatus(registration.status) === 'approved').length;
    const rejected = registrations.filter((registration) => normalizeStatus(registration.status) === 'rejected').length;
    const pending = registrations.filter((registration) => !isTerminalRegistrationStatus(registration.status)).length;

    return {
      total: registrations.length,
      pending,
      approved,
      rejected,
    };
  }, [registrations]);

  const openDetailModal = async (registration: RegistrationResponse) => {
    setSelectedRegistration(registration);
    setIsDetailLoading(true);
    setNotice(null);

    const registrationId = getRegistrationKey(registration);

    if (!registrationId) {
      setIsDetailLoading(false);
      return;
    }

    try {
      setSelectedRegistration(await registrationService.getRegistrationById(registrationId));
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load registration details.') });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openActionModal = (type: ActionType, registration: RegistrationResponse) => {
    setActiveAction({ type, registration });
    setActionNote('');
    setActionReason('');
    setActionError('');
    setNotice(null);
  };

  const closeActionModal = () => {
    setActiveAction(null);
    setActionNote('');
    setActionReason('');
    setActionError('');
  };

  const handleActionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeAction) {
      return;
    }

    const registrationId = getRegistrationKey(activeAction.registration);

    if (!registrationId) {
      setActionError('Registration id is missing.');
      return;
    }

    const trimmedNote = actionNote.trim();
    const trimmedReason = actionReason.trim();

    if (activeAction.type === 'reject' && !trimmedReason) {
      setActionError('Reject reason is required.');
      return;
    }

    setIsSavingAction(true);
    setActionError('');
    setNotice(null);

    try {
      const updatedRegistration = activeAction.type === 'approve'
        ? await registrationService.approveRegistration(registrationId, { note: trimmedNote })
        : await registrationService.rejectRegistration(registrationId, { reason: trimmedReason });

      setNotice({
        tone: 'success',
        text: activeAction.type === 'approve' ? 'Registration approved successfully.' : 'Registration rejected successfully.',
      });
      closeActionModal();

      if (selectedRegistration && getRegistrationKey(selectedRegistration) === registrationId) {
        setSelectedRegistration(updatedRegistration);
      }

      await loadRegistrations(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Unable to process registration.'));
    } finally {
      setIsSavingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Admin Race Registration</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">Race Registration Management</h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Review pending race entries after jockey acceptance and owner confirmation.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[640px] xl:flex-none xl:grid-cols-4">
              <MetricCard icon={<ClipboardCheck className="h-4 w-4" />} label="Total" value={isLoading ? '...' : String(stats.total).padStart(2, '0')} />
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pending" value={isLoading ? '...' : String(stats.pending).padStart(2, '0')} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={isLoading ? '...' : String(stats.approved).padStart(2, '0')} />
              <MetricCard icon={<XCircle className="h-4 w-4" />} label="Rejected" value={isLoading ? '...' : String(stats.rejected).padStart(2, '0')} />
            </div>
          </div>
        </div>

        <div className="glass-panel mb-6 rounded-xl p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(280px,1.4fr)_repeat(5,minmax(150px,1fr))_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search registration, tournament, horse, owner..."
                className={filterInputClassName}
              />
            </div>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={selectInputClassName}>
              <option value={allFilterValue}>All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </select>

            <select value={tournamentFilter} onChange={(event) => setTournamentFilter(event.target.value)} className={selectInputClassName}>
              <option value={allFilterValue}>All tournaments</option>
              {tournamentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select value={raceFilter} onChange={(event) => setRaceFilter(event.target.value)} className={selectInputClassName}>
              <option value={allFilterValue}>All races</option>
              {raceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <select
              value={ownerConfirmationFilter}
              onChange={(event) => setOwnerConfirmationFilter(event.target.value)}
              className={selectInputClassName}
            >
              <option value={allFilterValue}>All confirmations</option>
              {ownerConfirmationOptions.map((status) => (
                <option key={status} value={status}>{formatStatusLabel(status)}</option>
              ))}
            </select>

            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className={selectInputClassName}>
              <option value="registered_desc">Latest registered</option>
              <option value="tournament_asc">Sort by tournament</option>
              <option value="race_asc">Sort by race</option>
            </select>

            <button
              type="button"
              onClick={() => void loadRegistrations()}
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-body-sm font-extrabold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {notice && <StatusBanner tone={notice.tone} text={notice.text} />}

        <RegistrationsTable
          registrations={filteredRegistrations}
          isLoading={isLoading}
          onView={openDetailModal}
          onApprove={(registration) => openActionModal('approve', registration)}
          onReject={(registration) => openActionModal('reject', registration)}
        />
      </div>

      {selectedRegistration && (
        <RegistrationDetailModal
          registration={selectedRegistration}
          isLoading={isDetailLoading}
          onClose={() => setSelectedRegistration(null)}
          onApprove={(registration) => openActionModal('approve', registration)}
          onReject={(registration) => openActionModal('reject', registration)}
        />
      )}

      {activeAction && (
        <ActionModal
          action={activeAction}
          note={actionNote}
          reason={actionReason}
          error={actionError}
          isSaving={isSavingAction}
          onNoteChange={setActionNote}
          onReasonChange={setActionReason}
          onSubmit={handleActionSubmit}
          onClose={closeActionModal}
        />
      )}
    </div>
  );
};

const filterInputClassName =
  'h-12 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm text-on-surface transition-colors focus:border-primary focus:outline-none';

const selectInputClassName =
  'h-12 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-on-surface transition-colors focus:border-primary focus:outline-none';

const formInputClassName =
  'w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm text-on-surface transition-colors focus:border-primary focus:outline-none';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
    <div className="mb-3 flex items-center justify-between text-outline">
      <span className="text-label-sm font-bold uppercase tracking-wider">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-primary">{value}</p>
  </div>
);

const RegistrationsTable = ({
  registrations,
  isLoading,
  onView,
  onApprove,
  onReject,
}: {
  registrations: RegistrationResponse[];
  isLoading: boolean;
  onView: (registration: RegistrationResponse) => void;
  onApprove: (registration: RegistrationResponse) => void;
  onReject: (registration: RegistrationResponse) => void;
}) => (
  <div className="glass-panel overflow-hidden rounded-xl">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Registration</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Race</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Horse</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Owner</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Jockey</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {!isLoading && registrations.map((registration) => {
            const canProcess = !isTerminalRegistrationStatus(registration.status);
            const canApprove = canApproveRegistration(registration);
            const approveBlockReason = getApprovalBlockReason(registration);

            return (
              <tr key={String(getRegistrationKey(registration))} className="transition-colors hover:bg-surface-container-lowest">
                <td className="px-5 py-4">
                  <p className="text-body-sm font-bold text-primary">{getRegistrationCode(registration)}</p>
                  <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{formatDateTime(registration.registeredAt)}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-body-sm font-bold text-on-surface">{registration.tournamentName ?? '-'}</p>
                  <p className="mt-1 text-label-sm font-semibold text-outline">T-{registration.tournamentId || '-'}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-body-sm font-bold text-on-surface">{registration.raceName ?? '-'}</p>
                  <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">
                    Race #{registration.raceNumber ?? registration.raceId ?? '-'} / {formatDateTime(registration.scheduledAt)}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex min-w-[210px] items-center gap-3">
                    <img
                      src={getHorseImage(registration)}
                      alt={registration.horseName ?? 'Horse'}
                      onError={(event) => {
                        event.currentTarget.src = fallbackHorseImage;
                      }}
                      className="h-12 w-12 rounded-md border border-outline-variant object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-bold text-on-surface">{registration.horseName ?? '-'}</p>
                      <p className="mt-1 text-label-sm font-semibold text-outline">H-{registration.horseId || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-body-sm font-bold text-on-surface">{registration.ownerFullName ?? '-'}</p>
                  <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{registration.ownerStableName ?? 'No stable'}</p>
                </td>
                <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{registration.jockeyFullName ?? '-'}</td>
                <td className="px-5 py-4">
                  <div className="grid gap-2">
                    <StatusBadge status={registration.status} />
                    <span className="text-label-sm font-semibold text-on-surface-variant">
                      Owner: {formatStatusLabel(registration.ownerConfirmationStatus)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton label={`View ${getRegistrationCode(registration)}`} onClick={() => onView(registration)}>
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Approve ${getRegistrationCode(registration)}`}
                      onClick={() => onApprove(registration)}
                      disabled={!canApprove}
                      success
                      title={canApprove ? `Approve ${getRegistrationCode(registration)}` : approveBlockReason}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Reject ${getRegistrationCode(registration)}`}
                      onClick={() => onReject(registration)}
                      disabled={!canProcess}
                      danger
                    >
                      <XCircle className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {(isLoading || registrations.length === 0) && (
      <EmptyTableState
        isLoading={isLoading}
        title={isLoading ? 'Loading registrations' : 'No registrations found'}
        description={isLoading ? 'Fetching race registration queue from the API.' : 'No registration matches the current search and filters.'}
      />
    )}
  </div>
);

const RegistrationDetailModal = ({
  registration,
  isLoading,
  onClose,
  onApprove,
  onReject,
}: {
  registration: RegistrationResponse;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (registration: RegistrationResponse) => void;
  onReject: (registration: RegistrationResponse) => void;
}) => {
  const canProcess = !isTerminalRegistrationStatus(registration.status);
  const canApprove = canApproveRegistration(registration);
  const approveBlockReason = getApprovalBlockReason(registration);

  return (
    <Modal title="Registration Details" subtitle={getRegistrationCode(registration)} onClose={onClose}>
      <div className="space-y-6 p-6">
        {isLoading && (
          <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
            Loading latest registration details...
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <img
              src={getHorseImage(registration)}
              alt={registration.horseName ?? 'Horse'}
              onError={(event) => {
                event.currentTarget.src = fallbackHorseImage;
              }}
              className="aspect-square w-full rounded-md border border-outline-variant object-cover"
            />
            <div className="mt-4">
              <h3 className="text-title-large font-bold text-primary">{registration.horseName ?? '-'}</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">{registration.tournamentName ?? '-'}</p>
              <div className="mt-4">
                <StatusBadge status={registration.status} />
              </div>
            </div>
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <DetailItem icon={<Trophy className="h-4 w-4" />} label="Tournament" value={registration.tournamentName ?? '-'} />
            <DetailItem icon={<ClipboardCheck className="h-4 w-4" />} label="Race" value={registration.raceName ?? '-'} />
            <DetailItem icon={<Clock3 className="h-4 w-4" />} label="Scheduled At" value={formatDateTime(registration.scheduledAt)} />
            <DetailItem icon={<Clock3 className="h-4 w-4" />} label="Registered At" value={formatDateTime(registration.registeredAt)} />
            <DetailItem icon={<UserRound className="h-4 w-4" />} label="Owner" value={registration.ownerFullName ?? '-'} />
            <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Stable" value={registration.ownerStableName ?? '-'} />
            <DetailItem icon={<UserRound className="h-4 w-4" />} label="Jockey" value={registration.jockeyFullName ?? '-'} />
            <DetailItem
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Owner Confirmation"
              value={formatStatusLabel(registration.ownerConfirmationStatus)}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onReject(registration)}
            disabled={!canProcess}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-error/40 px-6 py-3 text-body-sm font-bold text-error transition-colors hover:border-error disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove(registration)}
            disabled={!canApprove}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={canApprove ? 'Approve registration' : approveBlockReason}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        </div>
        {!canApprove && !isTerminalRegistrationStatus(registration.status) && (
          <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
            {approveBlockReason}
          </div>
        )}
      </div>
    </Modal>
  );
};

const ActionModal = ({
  action,
  note,
  reason,
  error,
  isSaving,
  onNoteChange,
  onReasonChange,
  onSubmit,
  onClose,
}: {
  action: RegistrationAction;
  note: string;
  reason: string;
  error: string;
  isSaving: boolean;
  onNoteChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) => {
  const isApprove = action.type === 'approve';
  const registration = action.registration;

  return (
    <Modal
      title={isApprove ? 'Approve Registration' : 'Reject Registration'}
      subtitle={getRegistrationCode(registration)}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-6 p-6">
        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <p className="text-body-sm font-bold text-primary">{registration.horseName ?? '-'}</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {registration.raceName ?? '-'} / {registration.tournamentName ?? '-'}
          </p>
        </div>

        <Field label={isApprove ? 'Approval Note' : 'Reject Reason'} error={error}>
          <textarea
            value={isApprove ? note : reason}
            onChange={(event) => {
              if (isApprove) {
                onNoteChange(event.target.value);
              } else {
                onReasonChange(event.target.value);
              }
            }}
            rows={5}
            placeholder={isApprove ? 'Add an approval note for this registration.' : 'Explain why this registration is rejected.'}
            className={formInputClassName}
          />
        </Field>

        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-body-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
              isApprove
                ? 'bg-secondary text-on-secondary hover:bg-opacity-90'
                : 'border border-error/40 text-error hover:border-error'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isSaving ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const StatusBadge = ({ status }: { status?: string | null }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(status)}`}>
    {formatStatusLabel(status)}
  </span>
);

const StatusBanner = ({ tone, text }: Notice) => (
  <div
    className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${
      tone === 'success'
        ? 'border-secondary/30 bg-secondary-container/30 text-secondary'
        : 'border-error/30 bg-error-container/20 text-error'
    }`}
  >
    {text}
  </div>
);

const EmptyTableState = ({
  isLoading,
  title,
  description,
}: {
  isLoading: boolean;
  title: string;
  description: string;
}) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      {isLoading ? <RefreshCw className="h-6 w-6 animate-spin text-outline" /> : <Search className="h-6 w-6 text-outline" />}
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const IconButton = ({
  label,
  children,
  disabled = false,
  danger = false,
  success = false,
  title,
  onClick,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  success?: boolean;
  title?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 w-9 items-center justify-center rounded-md border bg-surface-container-low text-on-surface-variant transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? 'border-error/30 hover:border-error hover:text-error'
        : success
          ? 'border-secondary/30 hover:border-secondary hover:text-secondary'
          : 'border-outline-variant hover:border-primary hover:text-primary'
    }`}
    aria-label={label}
    title={title ?? label}
  >
    {children}
  </button>
);

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = 'max-w-5xl',
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8">
    <div className={`mx-auto ${maxWidthClassName} rounded-lg border border-outline-variant bg-surface-container shadow-xl`}>
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
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const DetailItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-lowest/60 p-4">
    <div className="mb-2 flex items-center gap-2 text-outline">
      {icon}
      <p className="text-label-sm font-bold uppercase tracking-wider">{label}</p>
    </div>
    <p className="break-words text-body-sm font-semibold text-on-surface">{value}</p>
  </div>
);

export default RegistrationManagementPage;

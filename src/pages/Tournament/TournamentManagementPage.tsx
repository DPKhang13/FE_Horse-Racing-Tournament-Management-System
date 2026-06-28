import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Ban, CalendarDays, ClipboardList, Eye, Filter, Flag, Layers, ListChecks, Pencil, Plus, Search, Trash2, Trophy, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { raceCrudService, type RaceCrudItem, type RaceFormData, type RaceRoundFormData, type RaceRoundItem } from '../../services/raceCrudService';
import { tournamentService } from '../../services/tournamentService';
import type {
  MatchStatus,
  Tournament,
  TournamentMatch,
  TournamentMutationData,
  TournamentParticipant,
  TournamentStatus,
} from '../../types/tournament';

// Animation variants
const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const revealUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

type TournamentFormErrors = Partial<Record<keyof TournamentMutationData, string>>;

const tournamentStatusOptions: TournamentStatus[] = [
  'Upcoming',
  'Registration Open',
  'Registration Closed',
  'Ongoing',
  'Completed',
  'Cancelled',
];
const emptyFormData: TournamentMutationData = {
  tournamentName: '',
  tournamentType: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  registrationDeadline: '',
  maximumParticipants: 16,
  entryFee: 0,
  prize: '0',
  status: 'Upcoming',
  registrationOpenAt: '',
  registrationCloseAt: '',
  rulesNotes: '',
};

const emptyRaceFormData: RaceFormData = {
  name: '',
  raceNumber: 1,
  rankGroup: '',
  lapCount: 1,
  scheduledAt: '',
  predictionClosesAt: '',
  distanceM: 0,
  trackType: '',
  maxHorses: 8,
  maxReferees: 3,
  pointRuleNote: '',
  status: 'scheduled',
};

const emptyRoundFormData: RaceRoundFormData = {
  assignmentId: undefined,
  horseId: undefined,
  roundNumber: 1,
  position: undefined,
  lapTimeSec: 0,
  recordedAt: '',
};

const formatDate = (value: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const parsePrizePoolInput = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numericValue = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatDateTime = (value?: string) => {
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

const toDateTimeInputValue = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toInstantString = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const getStatusClassName = (status: TournamentStatus) => {
  if (status === 'Ongoing') {
    return 'bg-secondary/10 text-secondary';
  }

  if (status === 'Registration Open') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (status === 'Registration Closed') {
    return 'bg-amber-100 text-amber-700';
  }

  if (status === 'Upcoming') {
    return 'bg-primary/10 text-primary';
  }

  if (status === 'Cancelled') {
    return 'bg-error-container/30 text-error';
  }

  return 'bg-surface-container-highest text-on-surface-variant';
};

const getMatchStatusClassName = (status: MatchStatus) => {
  if (status === 'Ongoing') {
    return 'bg-secondary/10 text-secondary';
  }

  if (status === 'Scheduled') {
    return 'bg-primary/10 text-primary';
  }

  if (status === 'Cancelled') {
    return 'bg-error-container/30 text-error';
  }

  return 'bg-surface-container-highest text-on-surface-variant';
};

const validateTournamentForm = (data: TournamentMutationData) => {
  const errors: TournamentFormErrors = {};

  if (!data.tournamentName.trim()) {
    errors.tournamentName = 'Tournament name is required.';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (!data.endDate) {
    errors.endDate = 'End date is required.';
  }

  if (!data.location.trim()) {
    errors.location = 'Location is required.';
  }

  if (parsePrizePoolInput(data.prize) < 0) {
    errors.prize = 'Prize pool cannot be negative.';
  }

  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    errors.endDate = 'End date cannot be before start date.';
  }

  if (data.status === 'Registration Open' && !data.registrationCloseAt) {
    errors.registrationCloseAt = 'Registration close time is required.';
  }

  if (
    data.registrationOpenAt &&
    data.registrationCloseAt &&
    new Date(data.registrationCloseAt) <= new Date(data.registrationOpenAt)
  ) {
    errors.registrationCloseAt = 'Registration close time must be after open time.';
  }

  return errors;
};

const toFormData = (tournament: Tournament): TournamentMutationData => ({
  tournamentName: tournament.tournamentName,
  tournamentType: tournament.tournamentType,
  description: tournament.description,
  startDate: tournament.startDate,
  endDate: tournament.endDate,
  location: tournament.location,
  registrationDeadline: tournament.registrationDeadline,
  maximumParticipants: tournament.maximumParticipants,
  entryFee: tournament.entryFee,
  prize: String(parsePrizePoolInput(tournament.prize)),
  status: tournament.status,
  registrationOpenAt: toDateTimeInputValue(tournament.registrationOpenAt),
  registrationCloseAt: toDateTimeInputValue(tournament.registrationCloseAt),
  rulesNotes: tournament.rulesNotes,
});

const isTournamentWorkflowStatus = (status: TournamentStatus) =>
  status === 'Registration Open'
  || status === 'Registration Closed'
  || status === 'Ongoing'
  || status === 'Completed';

const getEditableTournamentStatuses = (selectedTournament: Tournament | null): TournamentStatus[] => {
  if (!selectedTournament) {
    return ['Upcoming'];
  }

  if (selectedTournament.status === 'Upcoming') {
    return ['Upcoming', 'Registration Open'];
  }

  if (selectedTournament.status === 'Registration Open') {
    return ['Registration Open', 'Registration Closed'];
  }

  if (selectedTournament.status === 'Registration Closed') {
    return ['Registration Closed', 'Ongoing'];
  }

  if (selectedTournament.status === 'Ongoing') {
    return ['Ongoing', 'Completed'];
  }

  return [selectedTournament.status];
};

const hasTournamentCoreChanges = (current: TournamentMutationData, original: Tournament) =>
  current.tournamentName.trim() !== original.tournamentName
  || current.location.trim() !== original.location
  || current.startDate !== original.startDate
  || current.endDate !== original.endDate
  || String(parsePrizePoolInput(current.prize)) !== String(parsePrizePoolInput(original.prize));

const TournamentManagementPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [viewingTournament, setViewingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<TournamentMutationData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<TournamentFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [globalTournamentCount, setGlobalTournamentCount] = useState<number | null>(null);
  const [showTournamentSuccess, setShowTournamentSuccess] = useState(false);
  const [lastCreatedTournament, setLastCreatedTournament] = useState<Tournament | null>(null);
  const [raceModalTournament, setRaceModalTournament] = useState<Tournament | null>(null);
  const [isRaceModalOpen, setIsRaceModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTournaments = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [data, count] = await Promise.all([
          tournamentService.getAllTournaments(false),
          tournamentService.getGlobalTournamentCount().catch(() => null),
        ]);

        if (isMounted) {
          setTournaments(data);
          setGlobalTournamentCount(count ?? data.length);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load tournaments.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTournaments();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTournaments = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return tournaments.filter((tournament) => {
      const searchableValues = [
        tournament.id,
        tournament.tournamentName,
        tournament.location,
        tournament.status,
      ];
      const matchesSearch = !query || searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All' || tournament.status === statusFilter;
      const matchesDateFrom = !dateFrom || tournament.endDate >= dateFrom;
      const matchesDateTo = !dateTo || tournament.startDate <= dateTo;

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [dateFrom, dateTo, searchTerm, statusFilter, tournaments]);

  const ongoingCount = tournaments.filter((tournament) => tournament.status === 'Ongoing').length;
  const upcomingCount = tournaments.filter((tournament) => tournament.status === 'Upcoming').length;
  const totalParticipants = tournaments.reduce((total, tournament) => total + tournament.currentParticipants, 0);
  const totalTournamentCount = globalTournamentCount ?? tournaments.length;
  const editableTournamentStatuses = getEditableTournamentStatuses(selectedTournament);

  const openCreateModal = () => {
    setSelectedTournament(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setMessage('');
    setShowTournamentSuccess(false);
    setLastCreatedTournament(null);
    setIsFormOpen(true);
  };

  const openEditModal = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setFormData(toFormData(tournament));
    setFormErrors({});
    setMessage('');
    setShowTournamentSuccess(false);
    setLastCreatedTournament(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedTournament(null);
    setFormErrors({});
    setShowTournamentSuccess(false);
    setLastCreatedTournament(null);
  };

  const handleFieldChange = <K extends keyof TournamentMutationData>(field: K, value: TournamentMutationData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (formErrors[field]) {
      setFormErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateTournamentForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      if (selectedTournament) {
        const shouldUseWorkflow = formData.status !== selectedTournament.status && isTournamentWorkflowStatus(formData.status);
        const shouldUpdateCoreFields = hasTournamentCoreChanges(formData, selectedTournament);
        const updatedTournament = shouldUpdateCoreFields || !shouldUseWorkflow
          ? await tournamentService.updateTournament(selectedTournament.tournamentId, {
            ...formData,
          })
          : selectedTournament;
        const finalTournament = shouldUseWorkflow && formData.status === 'Registration Open'
          ? await tournamentService.openRegistration(selectedTournament.tournamentId, {
            registrationOpenAt: toInstantString(formData.registrationOpenAt),
            registrationCloseAt: toInstantString(formData.registrationCloseAt) ?? '',
          })
          : shouldUseWorkflow && formData.status === 'Registration Closed'
            ? await tournamentService.closeRegistration(selectedTournament.tournamentId)
            : shouldUseWorkflow && formData.status === 'Ongoing'
              ? await tournamentService.startTournament(selectedTournament.tournamentId)
              : shouldUseWorkflow && formData.status === 'Completed'
                ? await tournamentService.completeTournament(selectedTournament.tournamentId)
            : updatedTournament;

        setTournaments((current) =>
          current.map((tournament) =>
            tournament.tournamentId === selectedTournament.tournamentId ? finalTournament : tournament,
          ),
        );
        setViewingTournament((current) =>
          current?.tournamentId === selectedTournament.tournamentId ? finalTournament : current,
        );
        setMessage(shouldUseWorkflow ? `Tournament moved to ${formData.status}.` : 'Tournament updated.');
      } else {
        const newTournament = await tournamentService.createTournament(formData);
        setTournaments((current) => [newTournament, ...current]);
        setGlobalTournamentCount((current) => (current === null ? current : current + 1));
        setLastCreatedTournament(newTournament);
        setShowTournamentSuccess(true);
        setMessage('');
        return;
      }

      closeFormModal();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save tournament.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelTournament = async (tournament: Tournament) => {
    if (tournament.status === 'Cancelled') {
      return;
    }

    const confirmed = window.confirm(`Cancel "${tournament.tournamentName}"?`);

    if (!confirmed) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      const cancelledTournament = await tournamentService.cancelTournament(tournament.tournamentId);
      setTournaments((current) =>
        current.map((item) =>
          item.tournamentId === tournament.tournamentId
            ? { ...item, status: cancelledTournament.status, updatedAt: cancelledTournament.updatedAt ?? item.updatedAt }
            : item,
        ),
      );
      setViewingTournament((current) =>
        current?.tournamentId === tournament.tournamentId
          ? { ...current, status: cancelledTournament.status, updatedAt: cancelledTournament.updatedAt ?? current.updatedAt }
          : current,
      );
      setMessage('Tournament cancelled.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to cancel tournament.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <motion.div 
          className="glass-panel mb-6 rounded-2xl p-6"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <motion.div variants={revealUp}>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Tournament Management</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">Tournament Management</h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Manage tournaments, schedules, participants, and match information
              </p>
            </motion.div>

            <motion.div 
              className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4"
              variants={revealContainer}
            >
              <motion.div variants={revealUp}>
                <MetricCard icon={<Trophy className="h-4 w-4" />} label="Total" value={String(totalTournamentCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={String(upcomingCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<ListChecks className="h-4 w-4" />} label="Ongoing" value={String(ongoingCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Users className="h-4 w-4" />} label="Participants" value={String(totalParticipants)} />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.div 
            className="glass-panel flex-1 rounded-xl p-4"
            variants={revealUp}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tournaments..."
                  className={filterInputClassName}
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={filterInputClassName}>
                  <option value="All">All statuses</option>
                  {tournamentStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <input
                type="date"
                aria-label="Date range start"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className={plainFilterInputClassName}
              />
              <input
                type="date"
                aria-label="Date range end"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className={plainFilterInputClassName}
              />
            </div>
          </motion.div>

          <motion.button
            type="button"
            onClick={openCreateModal}
            className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
            animate="visible"
            initial="hidden"
          >
            <Plus className="h-4 w-4" />
            Create Tournament
          </motion.button>
        </motion.div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <motion.div 
          className="glass-panel overflow-hidden rounded-xl"
          initial="hidden"
          animate="visible"
          variants={revealUp}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament ID</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament Name</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Start Date</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">End Date</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Location</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Prize Pool</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isLoading && filteredTournaments.map((tournament, index) => (
                  <motion.tr 
                    key={tournament.tournamentId} 
                    className="transition-colors hover:bg-surface-container-lowest"
                    variants={revealUp}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.id}</td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.tournamentName}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{formatDate(tournament.startDate)}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{formatDate(tournament.endDate)}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{tournament.location}</td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.prize || '-'}</td>
                    <td className="px-5 py-4">
                      <TournamentStatusBadge status={tournament.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton label={`View details for ${tournament.tournamentName}`} onClick={() => setViewingTournament(tournament)}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Edit ${tournament.tournamentName}`} onClick={() => openEditModal(tournament)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={tournament.status === 'Cancelled' ? `${tournament.tournamentName} is already cancelled` : `Cancel ${tournament.tournamentName}`}
                          onClick={() => void handleCancelTournament(tournament)}
                          danger
                          disabled={tournament.status === 'Cancelled'}
                        >
                          <Ban className="h-4 w-4" />
                        </IconButton>
                        <Link
                          to={`/tournaments/${tournament.tournamentId}/schedule`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                          aria-label={`View schedule for ${tournament.tournamentName}`}
                          title={`View schedule for ${tournament.tournamentName}`}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isLoading || filteredTournaments.length === 0) && (
            <EmptyTableState
              isLoading={isLoading}
              title={isLoading ? 'Loading tournaments' : 'No tournaments found'}
              description={isLoading ? 'Fetching tournament records.' : 'No tournaments match the current search and filters.'}
            />
          )}
        </motion.div>
      </div>

      {isFormOpen && (
        <Modal
          title={showTournamentSuccess ? 'Success!' : selectedTournament ? 'Edit Tournament' : 'Create Tournament'}
          subtitle={showTournamentSuccess ? '' : selectedTournament?.id ?? 'New Tournament'}
          onClose={closeFormModal}
        >
          <TournamentForm
            formData={formData}
            formErrors={formErrors}
            isSaving={isSaving}
            isEditing={Boolean(selectedTournament)}
            editableStatuses={editableTournamentStatuses}
            selectedTournament={selectedTournament}
            onChange={handleFieldChange}
            onSubmit={handleSubmit}
            onCancel={closeFormModal}
            showTournamentSuccess={showTournamentSuccess}
            lastCreatedTournament={lastCreatedTournament}
            onDone={() => {
              setShowTournamentSuccess(false);
              setLastCreatedTournament(null);
              closeFormModal();
            }}
            onCreateRace={(tournament) => {
              setShowTournamentSuccess(false);
              setLastCreatedTournament(null);
              setRaceModalTournament(tournament);
              setIsRaceModalOpen(true);
              setIsFormOpen(false);
            }}
            onUpdateRace={(tournament) => {
              setRaceModalTournament(tournament);
              setIsRaceModalOpen(true);
              setIsFormOpen(false);
            }}
          />
        </Modal>
      )}

      {isRaceModalOpen && raceModalTournament && (
        <Modal
          title={`Manage Races for ${raceModalTournament.tournamentName}`}
          subtitle={raceModalTournament.id}
          onClose={() => {
            setIsRaceModalOpen(false);
            setRaceModalTournament(null);
          }}
        >
          <RaceCrudPanel tournament={raceModalTournament} />
        </Modal>
      )}

      {viewingTournament && (
        <TournamentDetailModal
          tournament={viewingTournament}
          onClose={() => setViewingTournament(null)}
        />
      )}
    </div>
  );
};

const filterInputClassName =
  'w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none';

const plainFilterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const inputClassName =
  'w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const textareaClassName =
  'min-h-28 w-full resize-y rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const TournamentForm = ({
  formData,
  formErrors,
  isSaving,
  isEditing,
  editableStatuses,
  selectedTournament,
  onChange,
  onSubmit,
  onCancel,
  showTournamentSuccess,
  lastCreatedTournament,
  onDone,
  onCreateRace,
  onUpdateRace,
}: {
  formData: TournamentMutationData;
  formErrors: TournamentFormErrors;
  isSaving: boolean;
  isEditing: boolean;
  editableStatuses: TournamentStatus[];
  selectedTournament: Tournament | null;
  onChange: <K extends keyof TournamentMutationData>(field: K, value: TournamentMutationData[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  showTournamentSuccess?: boolean;
  lastCreatedTournament?: Tournament | null;
  onDone?: () => void;
  onCreateRace?: (tournament: Tournament) => void;
  onUpdateRace?: (tournament: Tournament) => void;
}) => {
  if (showTournamentSuccess && lastCreatedTournament) {
    return (
      <motion.div 
        className="space-y-6 p-6"
        initial="hidden"
        animate="visible"
        variants={revealContainer}
      >
        <motion.div className="text-center space-y-4" variants={revealUp}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
            <Trophy className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="text-title-large font-bold text-primary">Tournament created successfully!</h3>
          <p className="text-body-md text-on-surface-variant">
            Tournament {lastCreatedTournament.tournamentName} has been created.
          </p>
        </motion.div>
        <motion.div className="grid gap-3 pt-4" variants={revealContainer}>
          <motion.button
            type="button"
            onClick={() => onCreateRace?.(lastCreatedTournament)}
            className="gold-gradient w-full rounded-xl px-6 py-3 text-body-sm font-extrabold text-on-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            Create Race
          </motion.button>
          <motion.button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant hover:text-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            You're Done!
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-6"
      initial="hidden"
      animate="visible"
      variants={revealContainer}
    >
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <motion.div variants={revealUp}>
            <Field label="Tournament Name" error={formErrors.tournamentName}>
              <input type="text" value={formData.tournamentName} onChange={(event) => onChange('tournamentName', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Location" error={formErrors.location}>
              <input type="text" value={formData.location} onChange={(event) => onChange('location', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Start Date" error={formErrors.startDate}>
              <input type="date" value={formData.startDate} onChange={(event) => onChange('startDate', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="End Date" error={formErrors.endDate}>
              <input type="date" value={formData.endDate} onChange={(event) => onChange('endDate', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Prize Pool" error={formErrors.prize}>
              <input type="number" min="0" value={formData.prize || ''} onChange={(event) => onChange('prize', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Status">
              <select value={formData.status} onChange={(event) => onChange('status', event.target.value as TournamentStatus)} className={inputClassName}>
                {editableStatuses.map((status: TournamentStatus) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Field>
          </motion.div>
          {formData.status === 'Registration Open' && (
            <>
              <motion.div variants={revealUp}>
                <Field label="Registration Open At">
                  <input
                    type="datetime-local"
                    value={formData.registrationOpenAt ?? ''}
                    onChange={(event) => onChange('registrationOpenAt', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Registration Close At" error={formErrors.registrationCloseAt}>
                  <input
                    type="datetime-local"
                    value={formData.registrationCloseAt ?? ''}
                    onChange={(event) => onChange('registrationCloseAt', event.target.value)}
                    className={inputClassName}
                  />
                </Field>
              </motion.div>
            </>
          )}
        </div>

        <motion.div 
          className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:justify-between sm:items-center"
          variants={revealUp}
        >
          <motion.button 
            type="button" 
            onClick={onCancel} 
            className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            whileHover="hover"
            whileTap="tap"
          >
            Cancel
          </motion.button>
          <div className="flex gap-3">
            {isEditing && selectedTournament && (
              <motion.button
                type="button"
                onClick={() => onUpdateRace?.(selectedTournament)}
                className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                whileHover="hover"
                whileTap="tap"
              >
                Update Race
              </motion.button>
            )}
            <motion.button 
              type="submit" 
              disabled={isSaving} 
              className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:opacity-70"
              whileHover="hover"
              whileTap="tap"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Apply' : 'Create Tournament'}
            </motion.button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
};

const RaceCrudPanel = ({ tournament }: { tournament: Tournament }) => {
  const [races, setRaces] = useState<RaceCrudItem[]>([]);
  const [selectedRace, setSelectedRace] = useState<RaceCrudItem | null>(null);
  const [raceForm, setRaceForm] = useState<RaceFormData>(emptyRaceFormData);
  const [rounds, setRounds] = useState<RaceRoundItem[]>([]);
  const [roundForm, setRoundForm] = useState<RaceRoundFormData>(emptyRoundFormData);
  const [editingRaceId, setEditingRaceId] = useState<number | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRaceSuccess, setShowRaceSuccess] = useState(false);
  const [lastCreatedRace, setLastCreatedRace] = useState<RaceCrudItem | null>(null);

  const loadRaces = useCallback(async () => {
    setIsLoadingRaces(true);
    setErrorMessage('');

    try {
      const data = await raceCrudService.getRacesByTournament(tournament.tournamentId);
      setRaces(data);
      setSelectedRace((current) => {
        if (!current) {
          return data[0] ?? null;
        }

        return data.find((race) => race.raceId === current.raceId) ?? data[0] ?? null;
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load races.'));
    } finally {
      setIsLoadingRaces(false);
    }
  }, [tournament.tournamentId]);

  const loadRounds = useCallback(async (race: RaceCrudItem | null) => {
    if (!race) {
      setRounds([]);
      return;
    }

    setIsLoadingRounds(true);
    setErrorMessage('');

    try {
      setRounds(await raceCrudService.getRoundsByRace(race.raceId));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load laps.'));
    } finally {
      setIsLoadingRounds(false);
    }
  }, []);

  useEffect(() => {
    void loadRaces();
  }, [loadRaces]);

  useEffect(() => {
    void loadRounds(selectedRace);
  }, [selectedRace, loadRounds]);

  const resetRaceForm = () => {
    setEditingRaceId(null);
    setRaceForm({
      ...emptyRaceFormData,
      raceNumber: races.length + 1,
      scheduledAt: tournament.startDate ? `${tournament.startDate}T09:00` : '',
    });
  };

  const editRace = (race: RaceCrudItem) => {
    setEditingRaceId(race.raceId);
    setSelectedRace(race);
    setRaceForm({
      scheduleId: race.scheduleId,
      name: race.name,
      raceNumber: race.raceNumber,
      rankGroup: race.rankGroup,
      lapCount: race.lapCount,
      scheduledAt: toDateTimeInputValue(race.scheduledAt),
      predictionClosesAt: toDateTimeInputValue(race.predictionClosesAt),
      distanceM: race.distanceM,
      trackType: race.trackType,
      maxHorses: race.maxHorses,
      maxReferees: race.maxReferees,
      pointRuleNote: race.pointRuleNote ?? '',
      status: race.status,
    });
  };

  const handleRaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      const savedRace = editingRaceId
        ? await raceCrudService.updateRace(editingRaceId, tournament.tournamentId, raceForm)
        : await raceCrudService.createRace(tournament.tournamentId, raceForm);

      if (!editingRaceId) {
        setLastCreatedRace(savedRace);
        setShowRaceSuccess(true);
      } else {
        setMessage('Race updated.');
      }
      setSelectedRace(savedRace);
      resetRaceForm();
      await loadRaces();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save race.'));
    }
  };

  const deleteRace = async (race: RaceCrudItem) => {
    const confirmed = window.confirm(`Delete race "${race.name}"?`);

    if (!confirmed) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      await raceCrudService.deleteRace(race.raceId, tournament.tournamentId);
      setMessage('Race deleted.');
      if (selectedRace?.raceId === race.raceId) {
        setSelectedRace(null);
      }
      await loadRaces();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete race.'));
    }
  };

  const editRound = (round: RaceRoundItem) => {
    setEditingRoundId(round.roundId);
    setRoundForm({
      assignmentId: round.assignmentId,
      horseId: round.horseId,
      roundNumber: round.roundNumber,
      position: round.position,
      lapTimeSec: round.lapTimeSec,
      recordedAt: toDateTimeInputValue(round.recordedAt),
    });
  };

  const resetRoundForm = () => {
    setEditingRoundId(null);
    setRoundForm({
      ...emptyRoundFormData,
      roundNumber: rounds.length + 1,
      recordedAt: toDateTimeInputValue(new Date().toISOString()),
    });
  };

  const handleRoundSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRace) {
      setErrorMessage('Select a race before creating laps.');
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      await (editingRoundId
        ? raceCrudService.updateRound(editingRoundId, selectedRace.raceId, roundForm)
        : raceCrudService.createRound(selectedRace.raceId, roundForm));
      setMessage(editingRoundId ? 'Lap updated.' : 'Lap created.');
      resetRoundForm();
      await loadRounds(selectedRace);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save lap.'));
    }
  };

  const deleteRound = async (round: RaceRoundItem) => {
    if (!selectedRace) {
      return;
    }

    const confirmed = window.confirm(`Delete lap ${round.roundNumber}?`);

    if (!confirmed) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      await raceCrudService.deleteRound(round.roundId, selectedRace.raceId);
      setMessage('Lap deleted.');
      await loadRounds(selectedRace);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete lap.'));
    }
  };

  return (
    <motion.section 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={revealContainer}
    >
      {/* Header Section */}
      <motion.div 
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={revealUp}
      >
        <div>
          <p className="text-label-sm font-bold uppercase tracking-[0.2em] text-secondary mb-2">Race Management</p>
          <h2 className="font-display text-3xl font-extrabold text-primary">Races in {tournament.tournamentName}</h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            Manage race schedules, lap configurations, and track information
          </p>
        </div>
        <motion.button 
          type="button" 
          onClick={resetRaceForm} 
          className="gold-gradient inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          whileHover="hover"
          whileTap="tap"
        >
          <Plus className="h-6 w-6" />
          Create New Race
        </motion.button>
      </motion.div>

      {/* Status Messages */}
      {message && (
        <motion.div 
          className="glass-panel rounded-2xl border border-secondary/30 bg-secondary/10 px-6 py-4 flex items-center gap-3"
          variants={revealUp}
        >
          <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
            <div className="h-5 w-5 text-secondary">✓</div>
          </div>
          <p className="text-body-md font-semibold text-secondary">{message}</p>
        </motion.div>
      )}
      {errorMessage && (
        <motion.div 
          className="glass-panel rounded-2xl border border-error/30 bg-error/10 px-6 py-4 flex items-center gap-3"
          variants={revealUp}
        >
          <div className="h-10 w-10 rounded-full bg-error/20 flex items-center justify-center">
            <div className="h-5 w-5 text-error">✕</div>
          </div>
          <p className="text-body-md font-semibold text-error">{errorMessage}</p>
        </motion.div>
      )}

      {/* Race Management Section */}
      <motion.div 
        className="grid gap-8 lg:grid-cols-3"
        variants={revealContainer}
      >
        {/* Race List */}
        <motion.div 
          className="lg:col-span-2"
          variants={revealUp}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <Flag className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-primary">Race List</h3>
              <p className="text-body-sm text-on-surface-variant">Select a race to manage laps</p>
            </div>
          </div>

          {isLoadingRaces ? (
            <div className="glass-panel rounded-3xl p-12 text-center">
              <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-surface-container flex items-center justify-center">
                <div className="h-8 w-8 text-outline animate-spin">⚙</div>
              </div>
              <p className="text-body-lg font-semibold text-on-surface-variant">Loading races...</p>
            </div>
          ) : races.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border-2 border-dashed border-outline-variant">
              <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-surface-container flex items-center justify-center">
                <Flag className="h-10 w-10 text-outline" />
              </div>
              <h4 className="text-title-lg font-bold text-primary mb-3">No races yet</h4>
              <p className="text-body-md text-on-surface-variant mb-8">Create your first race to get started with lap management</p>
              <motion.button 
                type="button" 
                onClick={resetRaceForm} 
                className="gold-gradient inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary"
                whileHover="hover"
                whileTap="tap"
              >
                <Plus className="h-6 w-6" />
                Create First Race
              </motion.button>
            </div>
          ) : (
            <motion.div 
              className="grid gap-4 md:grid-cols-2"
              variants={revealContainer}
            >
              {races.map((race) => (
                <motion.div
                  key={race.raceId}
                  onClick={() => setSelectedRace(race)}
                  className={`glass-panel rounded-3xl p-6 cursor-pointer transition-all duration-300 border-2 ${
                    selectedRace?.raceId === race.raceId
                      ? 'border-primary shadow-xl shadow-primary/15 scale-[1.02]'
                      : 'border-outline-variant hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'
                  }`}
                  variants={revealUp}
                  whileHover="hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block text-label-xs font-extrabold uppercase tracking-wider text-secondary mb-1">
                        Race #{race.raceNumber}
                      </span>
                      <h4 className="font-display text-xl font-bold text-primary">{race.name}</h4>
                    </div>
                    <div className="flex gap-2">
                      <IconButton label={`Update ${race.name}`} onClick={(e) => { e.stopPropagation(); editRace(race); }}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={`Delete ${race.name}`} onClick={(e) => { e.stopPropagation(); void deleteRace(race); }} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-label-xs font-bold uppercase tracking-wider text-outline">Date & Time</p>
                      <p className="text-body-sm font-medium text-on-surface">{formatDateTime(race.scheduledAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-label-xs font-bold uppercase tracking-wider text-outline">Laps</p>
                      <p className="text-body-sm font-medium text-primary">{race.lapCount} laps</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-label-xs font-bold uppercase tracking-wider text-outline">Distance</p>
                      <p className="text-body-sm font-medium text-on-surface">{race.distanceM}m</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-label-xs font-bold uppercase tracking-wider text-outline">Status</p>
                      <p className="text-body-sm font-semibold text-secondary">{race.status}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-secondary animate-pulse"></div>
                      <span className="text-label-sm font-semibold text-on-surface-variant">Rank Group: {race.rankGroup}</span>
                    </div>
                    {selectedRace?.raceId === race.raceId && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <span className="text-label-sm font-extrabold text-primary">Selected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Race Form */}
        <motion.div 
          className="lg:col-span-1"
          variants={revealUp}
        >
          <RaceFormPanel
            form={raceForm}
            isEditing={Boolean(editingRaceId)}
            onSubmit={handleRaceSubmit}
            onReset={resetRaceForm}
            onChange={(field, value) => setRaceForm((current) => ({ ...current, [field]: value }))}
            showRaceSuccess={showRaceSuccess}
            lastCreatedRace={lastCreatedRace}
            onDone={() => {
              setShowRaceSuccess(false);
              setLastCreatedRace(null);
            }}
            onCreateLap={() => {
              // Đảm bảo race vừa tạo được chọn (dùng trước khi set về null)
              if (lastCreatedRace) {
                setSelectedRace(lastCreatedRace);
              }
              resetRoundForm();
              setShowRaceSuccess(false);
              setLastCreatedRace(null);
            }}
          />
        </motion.div>
      </motion.div>

      {/* Lap Management Section */}
      <motion.div 
        className="glass-panel rounded-3xl p-8"
        variants={revealUp}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <Layers className="h-7 w-7 text-secondary" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-primary">Lap Management</h3>
              <p className="text-body-sm text-on-surface-variant">
                {selectedRace ? `Managing laps for: ${selectedRace.name}` : 'Select a race above to manage laps'}
              </p>
            </div>
          </div>
          <motion.button 
            type="button" 
            onClick={resetRoundForm} 
            disabled={!selectedRace} 
            className="gold-gradient inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover="hover"
            whileTap="tap"
          >
            <Plus className="h-6 w-6" />
            Add New Lap
          </motion.button>
        </div>

        <motion.div 
          className="grid gap-8 lg:grid-cols-2"
          variants={revealContainer}
        >
          {/* Lap List */}
          <motion.div variants={revealUp}>
            {selectedRace ? (
              isLoadingRounds ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-8 text-center">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-surface-container flex items-center justify-center">
                    <div className="h-6 w-6 text-outline animate-spin">⚙</div>
                  </div>
                  <p className="text-body-md font-semibold text-on-surface-variant">Loading laps...</p>
                </div>
              ) : rounds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/40 p-8 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-surface-container flex items-center justify-center">
                    <Layers className="h-7 w-7 text-outline" />
                  </div>
                  <h4 className="text-title-md font-bold text-primary mb-2">No laps yet</h4>
                  <p className="text-body-sm text-on-surface-variant">Add laps to this race to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rounds.map((round) => (
                    <motion.div 
                      key={round.roundId} 
                      className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-5 flex items-center justify-between"
                      variants={revealUp}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <span className="font-display text-xl font-extrabold text-secondary">{round.roundNumber}</span>
                        </div>
                        <div>
                          <p className="text-body-sm font-bold text-primary">Lap {round.roundNumber}</p>
                          <p className="text-body-xs text-on-surface-variant">
                            {round.horseName || `Horse #${round.horseId}`} • {round.lapTimeSec}s
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <IconButton label={`Update lap ${round.roundNumber}`} onClick={() => editRound(round)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Delete lap ${round.roundNumber}`} onClick={() => void deleteRound(round)} danger>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/40 p-8 text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-surface-container flex items-center justify-center">
                  <Layers className="h-7 w-7 text-outline" />
                </div>
                <h4 className="text-title-md font-bold text-primary mb-2">Select a race</h4>
                <p className="text-body-sm text-on-surface-variant">Choose a race from the list above to manage its laps</p>
              </div>
            )}
          </motion.div>

          {/* Lap Form */}
          <motion.div variants={revealUp}>
            <LapFormPanel
              form={roundForm}
              disabled={!selectedRace}
              isEditing={Boolean(editingRoundId)}
              onSubmit={handleRoundSubmit}
              onReset={resetRoundForm}
              onChange={(field, value) => setRoundForm((current) => ({ ...current, [field]: value }))}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

const RaceFormPanel = ({
  form,
  isEditing,
  onSubmit,
  onReset,
  onChange,
  showRaceSuccess,
  lastCreatedRace,
  onDone,
  onCreateLap,
}: {
  form: RaceFormData;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onChange: <K extends keyof RaceFormData>(field: K, value: RaceFormData[K]) => void;
  showRaceSuccess?: boolean;
  lastCreatedRace?: RaceCrudItem | null;
  onDone?: () => void;
  onCreateLap?: () => void;
}) => {
  if (showRaceSuccess && lastCreatedRace) {
    return (
      <motion.div 
        className="glass-panel rounded-3xl p-8 space-y-8"
        initial="hidden"
        animate="visible"
        variants={revealContainer}
      >
        <motion.div className="text-center space-y-6" variants={revealUp}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
            <Flag className="h-10 w-10 text-secondary" />
          </div>
          <div className="space-y-3">
            <h3 className="font-display text-2xl font-extrabold text-primary">Race Created!</h3>
            <p className="text-body-lg text-on-surface-variant">
              {lastCreatedRace.name} is now ready for lap configurations
            </p>
          </div>
        </motion.div>
        <motion.div className="grid gap-4" variants={revealContainer}>
          <motion.button
            type="button"
            onClick={onCreateLap}
            className="gold-gradient w-full rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            Start Adding Laps
          </motion.button>
          <motion.button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl border-2 border-outline-variant px-8 py-4 text-label-lg font-bold text-on-surface-variant hover:text-primary hover:border-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            Finish for Now
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.form 
      onSubmit={onSubmit} 
      className="glass-panel rounded-3xl p-6"
      initial="hidden"
      animate="visible"
      variants={revealContainer}
    >
      <motion.div className="mb-6 flex items-center justify-between gap-4" variants={revealUp}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <Flag className="h-5 w-5 text-secondary" />
          </div>
          <h4 className="font-display text-xl font-extrabold text-primary">
            {isEditing ? 'Update Race' : 'Create New Race'}
          </h4>
        </div>
        <button type="button" onClick={onReset} className="text-label-sm font-extrabold text-on-surface-variant hover:text-primary transition-colors">
          Reset
        </button>
      </motion.div>

      <div className="space-y-4">
        {/* Basic Info */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Race name">
            <input value={form.name} onChange={(event) => onChange('name', event.target.value)} required className={inputClassName} placeholder="e.g., Opening Sprint" />
          </Field>
          <Field label="Race number">
            <input type="number" min="1" value={form.raceNumber || ''} onChange={(event) => onChange('raceNumber', Number(event.target.value))} required className={inputClassName} placeholder="1" />
          </Field>
        </motion.div>

        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Rank group">
            <input value={form.rankGroup} onChange={(event) => onChange('rankGroup', event.target.value)} required className={inputClassName} placeholder="Group A" />
          </Field>
          <Field label="Lap count">
            <input type="number" min="1" value={form.lapCount || ''} onChange={(event) => onChange('lapCount', Number(event.target.value))} required className={inputClassName} placeholder="5" />
          </Field>
        </motion.div>

        {/* Date & Time */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Scheduled at">
            <input type="datetime-local" value={form.scheduledAt} onChange={(event) => onChange('scheduledAt', event.target.value)} required className={inputClassName} />
          </Field>
          <Field label="Prediction closes">
            <input type="datetime-local" value={form.predictionClosesAt ?? ''} onChange={(event) => onChange('predictionClosesAt', event.target.value)} className={inputClassName} />
          </Field>
        </motion.div>

        {/* Track Info */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Distance (m)">
            <input type="number" min="0" value={form.distanceM || ''} onChange={(event) => onChange('distanceM', Number(event.target.value))} className={inputClassName} placeholder="1200" />
          </Field>
          <Field label="Track type">
            <input value={form.trackType} onChange={(event) => onChange('trackType', event.target.value)} className={inputClassName} placeholder="Dirt" />
          </Field>
        </motion.div>

        {/* Capacity */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Max horses">
            <input type="number" min="1" value={form.maxHorses || ''} onChange={(event) => onChange('maxHorses', Number(event.target.value))} className={inputClassName} placeholder="10" />
          </Field>
          <Field label="Max referees">
            <input type="number" min="1" value={form.maxReferees || ''} onChange={(event) => onChange('maxReferees', Number(event.target.value))} className={inputClassName} placeholder="3" />
          </Field>
        </motion.div>

        {/* Advanced */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Status">
            <input value={form.status} onChange={(event) => onChange('status', event.target.value)} className={inputClassName} placeholder="Scheduled" />
          </Field>
          <Field label="Schedule ID">
            <input type="number" min="1" value={form.scheduleId ?? ''} onChange={(event) => onChange('scheduleId', event.target.value ? Number(event.target.value) : undefined)} className={inputClassName} placeholder="Optional" />
          </Field>
        </motion.div>

        <motion.div variants={revealUp}>
          <Field label="Point rule note">
            <textarea value={form.pointRuleNote ?? ''} onChange={(event) => onChange('pointRuleNote', event.target.value)} className={textareaClassName} placeholder="Additional rules or notes..." />
          </Field>
        </motion.div>
      </div>

      <motion.button 
        type="submit" 
        className="mt-8 w-full gold-gradient rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        variants={revealUp}
        whileHover="hover"
        whileTap="tap"
      >
        {isEditing ? 'Update Race' : 'Create Race'}
      </motion.button>
    </motion.form>
  );
};

const LapFormPanel = ({
  form,
  disabled,
  isEditing,
  onSubmit,
  onReset,
  onChange,
}: {
  form: RaceRoundFormData;
  disabled: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onChange: <K extends keyof RaceRoundFormData>(field: K, value: RaceRoundFormData[K]) => void;
}) => (
  <motion.form 
    onSubmit={onSubmit} 
    className="glass-panel rounded-3xl p-6"
    initial="hidden"
    animate="visible"
    variants={revealContainer}
  >
    <motion.div className="mb-6 flex items-center justify-between gap-4" variants={revealUp}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
          <Layers className="h-5 w-5 text-secondary" />
        </div>
        <h4 className="font-display text-xl font-extrabold text-primary">
          {isEditing ? 'Update Lap' : 'Create Lap'}
        </h4>
      </div>
      <button type="button" onClick={onReset} disabled={disabled} className="text-label-sm font-extrabold text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50">
        Reset
      </button>
    </motion.div>
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
        <Field label="Lap number">
          <input type="number" min="1" value={form.roundNumber || ''} onChange={(event) => onChange('roundNumber', Number(event.target.value))} required className={inputClassName} placeholder="1" />
        </Field>
        <Field label="Lap time (sec)">
          <input type="number" min="0" step="0.01" value={form.lapTimeSec || ''} onChange={(event) => onChange('lapTimeSec', Number(event.target.value))} required className={inputClassName} placeholder="45.50" />
        </Field>
      </motion.div>

      <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
        <Field label="Position">
          <input type="number" min="1" value={form.position ?? ''} onChange={(event) => onChange('position', event.target.value ? Number(event.target.value) : undefined)} className={inputClassName} placeholder="1" />
        </Field>
        <Field label="Horse ID">
          <input type="number" min="1" value={form.horseId ?? ''} onChange={(event) => onChange('horseId', event.target.value ? Number(event.target.value) : undefined)} className={inputClassName} placeholder="123" />
        </Field>
      </motion.div>

      <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
        <Field label="Assignment ID">
          <input type="number" min="1" value={form.assignmentId ?? ''} onChange={(event) => onChange('assignmentId', event.target.value ? Number(event.target.value) : undefined)} className={inputClassName} placeholder="Optional" />
        </Field>
        <Field label="Recorded at">
          <input type="datetime-local" value={form.recordedAt ?? ''} onChange={(event) => onChange('recordedAt', event.target.value)} className={inputClassName} />
        </Field>
      </motion.div>
    </fieldset>

    <motion.button 
      type="submit" 
      disabled={disabled} 
      className="mt-8 w-full gold-gradient rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:cursor-not-allowed disabled:opacity-60"
      variants={revealUp}
      whileHover="hover"
      whileTap="tap"
    >
      {isEditing ? 'Update Lap' : 'Create Lap'}
    </motion.button>
  </motion.form>
);

const TournamentDetailModal = ({
  tournament,
  onClose,
}: {
  tournament: Tournament;
  onClose: () => void;
}) => (
  <Modal title={tournament.tournamentName} subtitle={tournament.id} onClose={onClose}>
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DetailItem label="Start Date" value={formatDate(tournament.startDate)} />
        <DetailItem label="End Date" value={formatDate(tournament.endDate)} />
        <DetailItem label="Location" value={tournament.location} />
        <DetailItem label="Prize Pool" value={tournament.prize || '-'} />
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-1 text-label-sm font-bold uppercase tracking-wider text-outline">Status</p>
          <TournamentStatusBadge status={tournament.status} />
        </div>
      </div>

      <DetailSection
        title="Participants List"
        icon={<Users className="h-5 w-5 text-secondary" />}
      >
        <ParticipantsTable participants={tournament.participants} />
      </DetailSection>

      <DetailSection
        title="Tournament Schedule"
        icon={<ClipboardList className="h-5 w-5 text-secondary" />}
        action={
          <Link
            to={`/tournaments/${tournament.tournamentId}/schedule`}
            className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary"
          >
            View Schedule
          </Link>
        }
      >
        <SchedulePreview matches={tournament.schedule} />
      </DetailSection>
    </div>
  </Modal>
);

const ParticipantsTable = ({ participants }: { participants: TournamentParticipant[] }) => {
  if (participants.length === 0) {
    return <InlineEmptyState text="No participants registered for this tournament." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Owner</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Jockey</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Stable</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {participants.map((participant) => (
            <tr key={participant.participantId}>
              <td className="px-4 py-3 text-body-sm font-bold text-primary">{participant.horseName}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{participant.ownerName}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{participant.jockeyName}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{participant.stableName}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{participant.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SchedulePreview = ({ matches }: { matches: TournamentMatch[] }) => {
  if (matches.length === 0) {
    return <InlineEmptyState text="No matches exist for this tournament." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Match</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Round</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Date</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Time</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Arena / Location</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Participants</th>
            <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {matches.map((match) => (
            <tr key={match.matchId}>
              <td className="px-4 py-3 text-body-sm font-bold text-primary">{match.matchName}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{match.round}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{formatDate(match.matchDate)}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{match.startTime} - {match.endTime}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{match.arenaLocation}</td>
              <td className="px-4 py-3 text-body-sm text-on-surface-variant">{match.participant1} vs {match.participant2}</td>
              <td className="px-4 py-3">
                <MatchStatusBadge status={match.matchStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const IconButton = ({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: (event: React.MouseEvent) => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors ${
      disabled ? 'cursor-not-allowed opacity-40' : danger ? 'hover:border-error hover:text-error' : 'hover:border-primary hover:text-primary'
    }`}
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-8">
    <div className="mx-auto max-w-7xl rounded-lg border border-outline-variant bg-white shadow-xl">
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-8">
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
      <div className="p-8">
        {children}
      </div>
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

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
    <p className="mb-1 text-label-sm font-bold uppercase tracking-wider text-outline">{label}</p>
    <p className="break-words text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const DetailSection = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-4">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-display text-title-large font-bold text-primary">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const TournamentStatusBadge = ({ status }: { status: TournamentStatus }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(status)}`}>
    {status}
  </span>
);

const MatchStatusBadge = ({ status }: { status: MatchStatus }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getMatchStatusClassName(status)}`}>
    {status}
  </span>
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
      {isLoading ? <Trophy className="h-6 w-6 text-outline" /> : <Search className="h-6 w-6 text-outline" />}
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const InlineEmptyState = ({ text }: { text: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
    {text}
  </div>
);

export default TournamentManagementPage;

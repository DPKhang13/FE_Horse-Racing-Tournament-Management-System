import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, ClipboardList, Eye, Filter, ListChecks, Pencil, Plus, Search, Trash2, Trophy, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import type {
  MatchStatus,
  Tournament,
  TournamentMatch,
  TournamentMutationData,
  TournamentParticipant,
  TournamentStatus,
} from '../../types/tournament';

type TournamentFormErrors = Partial<Record<keyof TournamentMutationData, string>>;

const tournamentStatusOptions: TournamentStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
const tournamentTypeOptions = ['Derby', 'Sprint', 'Endurance', 'Classic', 'Championship'];

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
  prize: '',
  status: 'Upcoming',
  rulesNotes: '',
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

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value) || value === 0) {
    return '-';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusClassName = (status: TournamentStatus) => {
  if (status === 'Ongoing') {
    return 'bg-secondary/10 text-secondary';
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

  if (!data.tournamentType.trim()) {
    errors.tournamentType = 'Tournament type is required.';
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

  if (Number(data.maximumParticipants) <= 0) {
    errors.maximumParticipants = 'Maximum participants must be greater than 0.';
  }

  if (Number(data.entryFee) < 0) {
    errors.entryFee = 'Entry fee cannot be negative.';
  }

  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    errors.endDate = 'End date cannot be before start date.';
  }

  if (
    data.registrationDeadline &&
    data.startDate &&
    new Date(data.registrationDeadline) > new Date(data.startDate)
  ) {
    errors.registrationDeadline = 'Registration deadline cannot be after start date.';
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
  prize: tournament.prize,
  status: tournament.status,
  rulesNotes: tournament.rulesNotes,
});

const TournamentManagementPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
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

  useEffect(() => {
    let isMounted = true;

    const loadTournaments = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await tournamentService.getAllTournaments();

        if (isMounted) {
          setTournaments(data);
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

  const typeOptions = useMemo(() => {
    const values = tournaments.map((tournament) => tournament.tournamentType).filter(Boolean);
    return Array.from(new Set([...tournamentTypeOptions, ...values]));
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return tournaments.filter((tournament) => {
      const searchableValues = [
        tournament.id,
        tournament.tournamentName,
        tournament.tournamentType,
        tournament.location,
        tournament.status,
      ];
      const matchesSearch = !query || searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All' || tournament.status === statusFilter;
      const matchesType = typeFilter === 'All' || tournament.tournamentType === typeFilter;
      const matchesDateFrom = !dateFrom || tournament.endDate >= dateFrom;
      const matchesDateTo = !dateTo || tournament.startDate <= dateTo;

      return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [dateFrom, dateTo, searchTerm, statusFilter, tournaments, typeFilter]);

  const ongoingCount = tournaments.filter((tournament) => tournament.status === 'Ongoing').length;
  const upcomingCount = tournaments.filter((tournament) => tournament.status === 'Upcoming').length;
  const totalParticipants = tournaments.reduce((total, tournament) => total + tournament.currentParticipants, 0);

  const openCreateModal = () => {
    setSelectedTournament(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setMessage('');
    setIsFormOpen(true);
  };

  const openEditModal = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setFormData(toFormData(tournament));
    setFormErrors({});
    setMessage('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedTournament(null);
    setFormErrors({});
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
      const payload = {
        ...formData,
        maximumParticipants: Number(formData.maximumParticipants),
        entryFee: Number(formData.entryFee),
      };

      if (selectedTournament) {
        const updatedTournament = await tournamentService.updateTournament(selectedTournament.tournamentId, payload);
        setTournaments((current) =>
          current.map((tournament) =>
            tournament.tournamentId === selectedTournament.tournamentId ? updatedTournament : tournament,
          ),
        );
        setViewingTournament((current) =>
          current?.tournamentId === selectedTournament.tournamentId ? updatedTournament : current,
        );
        setMessage('Tournament updated.');
      } else {
        const newTournament = await tournamentService.createTournament(payload);
        setTournaments((current) => [newTournament, ...current]);
        setMessage('Tournament created.');
      }

      closeFormModal();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save tournament.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tournament: Tournament) => {
    const confirmed = window.confirm(`Delete "${tournament.tournamentName}" from the tournament list?`);

    if (!confirmed) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      await tournamentService.deleteTournament(tournament.tournamentId);
      setTournaments((current) => current.filter((item) => item.tournamentId !== tournament.tournamentId));
      setViewingTournament((current) => (current?.tournamentId === tournament.tournamentId ? null : current));
      setMessage('Tournament deleted.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete tournament.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Tournament Management</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">Tournament Management</h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Manage tournaments, schedules, participants, and match information
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Total" value={String(tournaments.length).padStart(2, '0')} />
              <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={String(upcomingCount).padStart(2, '0')} />
              <MetricCard icon={<ListChecks className="h-4 w-4" />} label="Ongoing" value={String(ongoingCount).padStart(2, '0')} />
              <MetricCard icon={<Users className="h-4 w-4" />} label="Participants" value={String(totalParticipants)} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="glass-panel flex-1 rounded-xl p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_200px_180px_180px]">
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

              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={filterInputClassName}>
                  <option value="All">All tournament types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
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
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Tournament
          </button>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament ID</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament Name</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament Type</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Start Date</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">End Date</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Location</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Participants</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isLoading && filteredTournaments.map((tournament) => (
                  <tr key={tournament.tournamentId} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.id}</td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{tournament.tournamentName}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{tournament.tournamentType}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{formatDate(tournament.startDate)}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{formatDate(tournament.endDate)}</td>
                    <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{tournament.location}</td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">
                      {tournament.currentParticipants}/{tournament.maximumParticipants}
                    </td>
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
                        <IconButton label={`Delete ${tournament.tournamentName}`} onClick={() => void handleDelete(tournament)} danger>
                          <Trash2 className="h-4 w-4" />
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
                  </tr>
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
        </div>
      </div>

      {isFormOpen && (
        <Modal
          title={selectedTournament ? 'Edit Tournament' : 'Create Tournament'}
          subtitle={selectedTournament?.id ?? 'New Tournament'}
          onClose={closeFormModal}
        >
          <TournamentForm
            formData={formData}
            formErrors={formErrors}
            isSaving={isSaving}
            isEditing={Boolean(selectedTournament)}
            onChange={handleFieldChange}
            onSubmit={handleSubmit}
            onCancel={closeFormModal}
          />
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
  onChange,
  onSubmit,
  onCancel,
}: {
  formData: TournamentMutationData;
  formErrors: TournamentFormErrors;
  isSaving: boolean;
  isEditing: boolean;
  onChange: <K extends keyof TournamentMutationData>(field: K, value: TournamentMutationData[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-8 p-6">
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Tournament Name" error={formErrors.tournamentName}>
        <input type="text" value={formData.tournamentName} onChange={(event) => onChange('tournamentName', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Tournament Type" error={formErrors.tournamentType}>
        <select value={formData.tournamentType} onChange={(event) => onChange('tournamentType', event.target.value)} className={inputClassName}>
          <option value="">Select type</option>
          {tournamentTypeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </Field>
      <Field label="Start Date" error={formErrors.startDate}>
        <input type="date" value={formData.startDate} onChange={(event) => onChange('startDate', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="End Date" error={formErrors.endDate}>
        <input type="date" value={formData.endDate} onChange={(event) => onChange('endDate', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Location" error={formErrors.location}>
        <input type="text" value={formData.location} onChange={(event) => onChange('location', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Registration Deadline" error={formErrors.registrationDeadline}>
        <input type="date" value={formData.registrationDeadline} onChange={(event) => onChange('registrationDeadline', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Maximum Participants" error={formErrors.maximumParticipants}>
        <input type="number" min="1" value={formData.maximumParticipants || ''} onChange={(event) => onChange('maximumParticipants', Number(event.target.value))} className={inputClassName} />
      </Field>
      <Field label="Entry Fee" error={formErrors.entryFee}>
        <input type="number" min="0" value={formData.entryFee} onChange={(event) => onChange('entryFee', Number(event.target.value))} className={inputClassName} />
      </Field>
      <Field label="Prize">
        <input type="text" value={formData.prize} onChange={(event) => onChange('prize', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Status">
        <select value={formData.status} onChange={(event) => onChange('status', event.target.value as TournamentStatus)} className={inputClassName}>
          {tournamentStatusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Description">
          <textarea value={formData.description} onChange={(event) => onChange('description', event.target.value)} className={textareaClassName} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Rules / Notes">
          <textarea value={formData.rulesNotes} onChange={(event) => onChange('rulesNotes', event.target.value)} className={textareaClassName} />
        </Field>
      </div>
    </div>

    <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary">
        Cancel
      </button>
      <button type="submit" disabled={isSaving} className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:opacity-70">
        {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Tournament'}
      </button>
    </div>
  </form>
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
        <DetailItem label="Tournament Type" value={tournament.tournamentType} />
        <DetailItem label="Start Date" value={formatDate(tournament.startDate)} />
        <DetailItem label="End Date" value={formatDate(tournament.endDate)} />
        <DetailItem label="Location" value={tournament.location} />
        <DetailItem label="Registration Deadline" value={formatDate(tournament.registrationDeadline)} />
        <DetailItem label="Participants" value={`${tournament.currentParticipants}/${tournament.maximumParticipants}`} />
        <DetailItem label="Entry Fee" value={formatCurrency(tournament.entryFee)} />
        <DetailItem label="Prize" value={tournament.prize || '-'} />
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
          <p className="mb-1 text-label-sm font-bold uppercase tracking-wider text-outline">Status</p>
          <TournamentStatusBadge status={tournament.status} />
        </div>
      </div>

      <DetailTextBlock label="Description" value={tournament.description || '-'} />
      <DetailTextBlock label="Rules / Notes" value={tournament.rulesNotes || '-'} />

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
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors ${
      danger ? 'hover:border-error hover:text-error' : 'hover:border-primary hover:text-primary'
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

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
    <p className="mb-1 text-label-sm font-bold uppercase tracking-wider text-outline">{label}</p>
    <p className="break-words text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const DetailTextBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
    <p className="mb-2 text-label-sm font-bold uppercase tracking-wider text-outline">{label}</p>
    <p className="text-body-sm text-on-surface-variant">{value}</p>
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

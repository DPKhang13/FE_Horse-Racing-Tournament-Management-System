import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Ban, CalendarDays, ClipboardList, Eye, Filter, Flag, Medal, Pencil, Plus, RefreshCw, Save, Search, Trash2, Trophy, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { raceCrudService, type RaceCrudItem, type RaceFormData, type RaceScheduleOption } from '../../services/raceCrudService';
import { pointRuleService } from '../../services/pointRuleService';
import { tournamentService } from '../../services/tournamentService';
import { formatVndAmountInput, normalizeVndAmountInput, parseVndAmount } from '../../utils/currency';
import type { PointRuleRequest } from '../../types/pointRule';
import type {
  CreatePrizeRequest,
  MatchStatus,
  PrizeResponse,
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
type PrizeFormRow = Omit<CreatePrizeRequest, 'amount'> & {
  id?: number;
  prizeId?: number;
  amount: number | '';
};
type PrizeFormErrors = Record<number, Partial<Record<keyof CreatePrizeRequest, string>>>;
type EditablePrizeField = 'prizeName' | 'amount' | 'note';

const tournamentStatusOptions: TournamentStatus[] = [
  'Upcoming',
  'Registration Open',
  'Registration Closed',
  'Ongoing',
  'Completed',
  'Cancelled',
];
const tournamentLocationOptions = [
  { value: 'HCM', label: 'HCM (Ho Chi Minh)' },
  { value: 'Hanoi', label: 'Hanoi' },
] as const;
const raceRankGroupOptions = ['A', 'B', 'C', 'D', 'E'] as const;
const raceTrackTypeOptions = ['Turf', 'Dirt', 'Synthetic'] as const;
const raceStatusOptions = [
  { value: 'ready', label: 'Ready' },
  { value: 'open_for_betting', label: 'Open for betting' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;
const createRaceNumberOptions = (raceCount: number, currentRaceNumber: number) =>
  Array.from({ length: Math.max(1, raceCount + 1, currentRaceNumber) }, (_, index) => index + 1);
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
  rankGroup: 'A',
  lapCount: 1,
  scheduledAt: '',
  predictionClosesAt: '',
  distanceM: 1000,
  trackType: 'Turf',
  maxHorses: 8,
  maxReferees: 3,
  status: 'ready',
};
const createDefaultPointRules = (): PointRuleRequest[] =>
  [1, 2, 3].map((finishPosition) => ({
    finishPosition,
    points: 0,
    note: '',
  }));

const createNextPointRule = (rules: PointRuleRequest[]): PointRuleRequest => ({
  finishPosition: Math.max(0, ...rules.map((rule) => Number(rule.finishPosition) || 0)) + 1,
  points: 0,
  note: '',
});

const validatePointRules = (rules: PointRuleRequest[]) => {
  if (rules.length === 0) {
    return 'At least one point rule is required.';
  }

  const positions = rules.map((rule) => Number(rule.finishPosition));

  for (const [index, rule] of rules.entries()) {
    const position = positions[index];
    const points = Number(rule.points);

    if (!Number.isInteger(position) || position <= 0) {
      return `Point rule ${index + 1}: finish position must be greater than 0.`;
    }

    if (positions.filter((value) => value === position).length > 1) {
      return `Point rule ${index + 1}: finish position must be unique.`;
    }

    if (!Number.isFinite(points) || points < 0) {
      return `Point rule ${index + 1}: points must be 0 or greater.`;
    }

    if (rule.note.trim().length > 255) {
      return `Point rule ${index + 1}: note must be 255 characters or fewer.`;
    }
  }

  return '';
};



const prizePositionLabels: Record<number, string> = {
  1: 'First',
  2: 'Second',
  3: 'Third',
};

const getDefaultPrizeName = (finishPosition: number) => `${prizePositionLabels[finishPosition] ?? `Position ${finishPosition}`} Prize`;

const createDefaultPrizeRows = (): PrizeFormRow[] =>
  [1, 2, 3].map((finishPosition) => ({
    finishPosition,
    prizeName: getDefaultPrizeName(finishPosition),
    amount: 1,
    note: '',
  }));

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

const normalizeTournamentLocation = (value?: string) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';

  if (normalized === 'hcm' || normalized.includes('hochiminh') || normalized.includes('saigon')) {
    return 'HCM';
  }

  if (normalized === 'hanoi' || normalized.includes('hanoi')) {
    return 'Hanoi';
  }

  return '';
};

const normalizeRaceCrudStatus = (status?: string) => {
  const value = status?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

  if (value === 'open_for_betting' || value === 'betting_open' || (value.includes('open') && value.includes('betting'))) {
    return 'open_for_betting';
  }

  if (value.includes('progress') || value.includes('ongoing') || value.includes('running') || value === 'live') {
    return 'in_progress';
  }

  if (value.includes('complete') || value.includes('finish')) {
    return 'completed';
  }

  if (value.includes('cancel')) {
    return 'cancelled';
  }

  return 'ready';
};

const isValidDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateTimeInputTimestamp = (value?: string) => {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);

  if (!match || !isValidDateInput(match[1])) {
    return null;
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4] ?? 0);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  const timestamp = new Date(match[0]).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
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

const validateTournamentForm = (data: TournamentMutationData, originalTournament: Tournament | null) => {
  const errors: TournamentFormErrors = {};
  const startDateIsValid = isValidDateInput(data.startDate);
  const endDateIsValid = isValidDateInput(data.endDate);

  if (!data.tournamentName.trim()) {
    errors.tournamentName = 'Tournament name is required.';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required.';
  } else if (!startDateIsValid) {
    errors.startDate = 'Start date must be a valid date.';
  } else if (
    data.startDate < getLocalDateInputValue()
    && (!originalTournament || data.startDate !== originalTournament.startDate)
  ) {
    errors.startDate = 'Start date cannot be in the past.';
  }

  if (!data.endDate) {
    errors.endDate = 'End date is required.';
  } else if (!endDateIsValid) {
    errors.endDate = 'End date must be a valid date.';
  }

  if (!tournamentLocationOptions.some((option) => option.value === data.location)) {
    errors.location = 'Select HCM or Hanoi.';
  }

  if (parseVndAmount(data.prize) < 0) {
    errors.prize = 'Prize pool cannot be negative.';
  }

  if (startDateIsValid && endDateIsValid && data.endDate < data.startDate) {
    errors.endDate = 'End date cannot be before start date.';
  }

  if (data.status === 'Registration Open') {
    const registrationOpenTimestamp = getDateTimeInputTimestamp(data.registrationOpenAt);
    const registrationCloseTimestamp = getDateTimeInputTimestamp(data.registrationCloseAt);

    if (!data.registrationOpenAt) {
      errors.registrationOpenAt = 'Registration open time is required.';
    } else if (registrationOpenTimestamp === null) {
      errors.registrationOpenAt = 'Registration open time must be valid.';
    }

    if (!data.registrationCloseAt) {
      errors.registrationCloseAt = 'Registration close time is required.';
    } else if (registrationCloseTimestamp === null) {
      errors.registrationCloseAt = 'Registration close time must be valid.';
    }

    if (
      registrationOpenTimestamp !== null
      && registrationCloseTimestamp !== null
      && registrationCloseTimestamp <= registrationOpenTimestamp
    ) {
      errors.registrationCloseAt = 'Registration close time must be after open time.';
    }
  }

  return errors;
};

const toFormData = (tournament: Tournament): TournamentMutationData => ({
  tournamentName: tournament.tournamentName,
  tournamentType: tournament.tournamentType,
  description: tournament.description,
  startDate: tournament.startDate,
  endDate: tournament.endDate,
  location: normalizeTournamentLocation(tournament.location),
  registrationDeadline: tournament.registrationDeadline,
  maximumParticipants: tournament.maximumParticipants,
  entryFee: tournament.entryFee,
  prize: String(parseVndAmount(tournament.prize)),
  status: tournament.status,
  registrationOpenAt: toDateTimeInputValue(tournament.registrationOpenAt),
  registrationCloseAt: toDateTimeInputValue(tournament.registrationCloseAt),
  rulesNotes: tournament.rulesNotes,
});

const toPrizeFormRow = (prize: PrizeResponse): PrizeFormRow => ({
  id: prize.id,
  prizeId: prize.prizeId,
  finishPosition: prize.finishPosition,
  prizeName: prize.prizeName || getDefaultPrizeName(prize.finishPosition),
  amount: Number.isFinite(Number(prize.amount)) ? Number(prize.amount) : 0,
  note: prize.note ?? '',
});

const mergePrizeRows = (prizes: PrizeResponse[]) => {
  const defaultRows = createDefaultPrizeRows();

  return defaultRows.map((defaultRow) => {
    const existingPrize = prizes.find((prize) => Number(prize.finishPosition) === defaultRow.finishPosition);
    return existingPrize ? toPrizeFormRow(existingPrize) : defaultRow;
  });
};

const getPrizeIdentifier = (prize: Pick<PrizeFormRow, 'id' | 'prizeId'>) => prize.prizeId ?? prize.id;

const toPrizeRequest = (prize: PrizeFormRow): CreatePrizeRequest => ({
  finishPosition: Number(prize.finishPosition),
  prizeName: prize.prizeName.trim(),
  amount: Number(prize.amount),
  note: prize.note.trim(),
});

const hasPrizeChanged = (current: PrizeFormRow, original: PrizeFormRow) => {
  const currentPayload = toPrizeRequest(current);
  const originalPayload = toPrizeRequest(original);

  return currentPayload.finishPosition !== originalPayload.finishPosition
    || currentPayload.prizeName !== originalPayload.prizeName
    || currentPayload.amount !== originalPayload.amount
    || currentPayload.note !== originalPayload.note;
};

const validatePrizeRows = (rows: PrizeFormRow[]) => {
  const errors: PrizeFormErrors = {};

  rows.forEach((row, index) => {
    const rowErrors: Partial<Record<keyof CreatePrizeRequest, string>> = {};

    if (!row.prizeName.trim()) {
      rowErrors.prizeName = 'Prize name is required.';
    }

    if (row.amount === '' || Number(row.amount) <= 0) {
      rowErrors.amount = 'Amount must be greater than 0.';
    }

    if (![1, 2, 3].includes(Number(row.finishPosition))) {
      rowErrors.finishPosition = 'Finish position must be 1, 2, or 3.';
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[index] = rowErrors;
    }
  });

  return errors;
};

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
  || String(parseVndAmount(current.prize)) !== String(parseVndAmount(original.prize));

const hasRegistrationWindowChanges = (current: TournamentMutationData, original: Tournament) =>
  toInstantString(current.registrationOpenAt) !== toInstantString(original.registrationOpenAt)
  || toInstantString(current.registrationCloseAt) !== toInstantString(original.registrationCloseAt);

const TournamentManagementPage = () => {
  const navigate = useNavigate();
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
  const [createPrizeRows, setCreatePrizeRows] = useState<PrizeFormRow[]>(createDefaultPrizeRows);
  const [createPrizeErrors, setCreatePrizeErrors] = useState<PrizeFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [globalTournamentCount, setGlobalTournamentCount] = useState<number | null>(null);
  const [showTournamentSuccess, setShowTournamentSuccess] = useState(false);
  const [lastCreatedTournament, setLastCreatedTournament] = useState<Tournament | null>(null);
  const [raceModalTournament, setRaceModalTournament] = useState<Tournament | null>(null);
  const [isRaceModalOpen, setIsRaceModalOpen] = useState(false);

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

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

  const upcomingCount = tournaments.filter((tournament) => tournament.status === 'Upcoming').length;
  const totalParticipants = tournaments.reduce((total, tournament) => total + tournament.currentParticipants, 0);
  const totalTournamentCount = globalTournamentCount ?? tournaments.length;
  const editableTournamentStatuses = getEditableTournamentStatuses(selectedTournament);

  const openCreateModal = () => {
    setSelectedTournament(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setCreatePrizeRows(createDefaultPrizeRows());
    setCreatePrizeErrors({});
    setMessage('');
    setShowTournamentSuccess(false);
    setLastCreatedTournament(null);
    setIsFormOpen(true);
  };

  const openEditModal = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setFormData(toFormData(tournament));
    setFormErrors({});
    setCreatePrizeRows(createDefaultPrizeRows());
    setCreatePrizeErrors({});
    setMessage('');
    setShowTournamentSuccess(false);
    setLastCreatedTournament(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedTournament(null);
    setFormErrors({});
    setCreatePrizeRows(createDefaultPrizeRows());
    setCreatePrizeErrors({});
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

  const handleCreatePrizeChange = (index: number, field: EditablePrizeField, value: string | number) => {
    setCreatePrizeRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row,
      ),
    );

    setCreatePrizeErrors((current) => {
      if (!current[index]?.[field]) {
        return current;
      }

      const nextErrors = { ...current };
      const rowErrors = { ...nextErrors[index] };
      delete rowErrors[field];

      if (Object.keys(rowErrors).length === 0) {
        delete nextErrors[index];
      } else {
        nextErrors[index] = rowErrors;
      }

      return nextErrors;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateTournamentForm(formData, selectedTournament);
    const prizeErrors = selectedTournament ? {} : validatePrizeRows(createPrizeRows);
    setFormErrors(errors);
    setCreatePrizeErrors(prizeErrors);

    if (Object.keys(errors).length > 0 || Object.keys(prizeErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      if (selectedTournament) {
        const statusChanged = formData.status !== selectedTournament.status;
        const shouldUseWorkflow = statusChanged && isTournamentWorkflowStatus(formData.status);
        const shouldUpdateCoreFields = hasTournamentCoreChanges(formData, selectedTournament);
        const shouldUpdateRegistrationWindow = formData.status === 'Registration Open'
          && (statusChanged || hasRegistrationWindowChanges(formData, selectedTournament));
        const shouldUpdateThroughGenericEndpoint = shouldUpdateCoreFields || (statusChanged && !shouldUseWorkflow);
        const responseMessages: string[] = [];
        let finalTournament = selectedTournament;

        if (shouldUpdateThroughGenericEndpoint) {
          finalTournament = await tournamentService.updateTournament(selectedTournament.tournamentId, {
            ...formData,
            status: shouldUseWorkflow ? selectedTournament.status : formData.status,
          });

          if (finalTournament.responseMessage) {
            responseMessages.push(finalTournament.responseMessage);
          }
        }

        if (shouldUpdateRegistrationWindow) {
          const registrationOpenAt = toInstantString(formData.registrationOpenAt);
          const registrationCloseAt = toInstantString(formData.registrationCloseAt);

          if (!registrationOpenAt || !registrationCloseAt) {
            throw new Error('Registration dates must be valid.');
          }

          finalTournament = await tournamentService.openRegistration(selectedTournament.tournamentId, {
            registrationOpenAt,
            registrationCloseAt,
          });
        } else if (shouldUseWorkflow && formData.status === 'Registration Closed') {
          finalTournament = await tournamentService.closeRegistration(selectedTournament.tournamentId);
        } else if (shouldUseWorkflow && formData.status === 'Ongoing') {
          finalTournament = await tournamentService.startTournament(selectedTournament.tournamentId);
        } else if (shouldUseWorkflow && formData.status === 'Completed') {
          finalTournament = await tournamentService.completeTournament(selectedTournament.tournamentId);
        }

        if (finalTournament.responseMessage && !responseMessages.includes(finalTournament.responseMessage)) {
          responseMessages.push(finalTournament.responseMessage);
        }

        setTournaments((current) =>
          current.map((tournament) =>
            tournament.tournamentId === selectedTournament.tournamentId ? finalTournament : tournament,
          ),
        );
        setViewingTournament((current) =>
          current?.tournamentId === selectedTournament.tournamentId ? finalTournament : current,
        );
        const fallbackMessage = shouldUpdateRegistrationWindow && !statusChanged
            ? 'Tournament registration window updated.'
            : shouldUseWorkflow
              ? `Tournament moved to ${formData.status}.`
              : 'Tournament updated.';
        setMessage(responseMessages.join('\n') || fallbackMessage);
      } else {
        const newTournament = await tournamentService.createTournament(formData);
        const prizeResult = await tournamentService.createPrizes(newTournament.tournamentId, createPrizeRows.map(toPrizeRequest));
        setTournaments((current) => [newTournament, ...current]);
        setGlobalTournamentCount((current) => (current === null ? current : current + 1));
        setLastCreatedTournament(newTournament);
        setCreatePrizeRows(createDefaultPrizeRows());
        setCreatePrizeErrors({});
        setShowTournamentSuccess(true);
        setMessage([newTournament.responseMessage, prizeResult.responseMessage].filter(Boolean).join('\n') || 'Tournament and prizes created successfully.');
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
              className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:grid-cols-3"
              variants={revealContainer}
            >
              <motion.div variants={revealUp}>
                <MetricCard icon={<Trophy className="h-4 w-4" />} label="Total" value={String(totalTournamentCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Upcoming" value={String(upcomingCount).padStart(2, '0')} />
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
                        {tournament.status === 'Completed' && (
                          <Link
                            to={`/tournaments/${tournament.tournamentId}/prize-awards`}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                            aria-label={`Manage prize awards for ${tournament.tournamentName}`}
                            title={`Manage prize awards for ${tournament.tournamentName}`}
                          >
                            <Medal className="h-4 w-4" />
                          </Link>
                        )}
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
            createPrizeRows={createPrizeRows}
            createPrizeErrors={createPrizeErrors}
            isSaving={isSaving}
            isEditing={Boolean(selectedTournament)}
            editableStatuses={editableTournamentStatuses}
            selectedTournament={selectedTournament}
            onChange={handleFieldChange}
            onCreatePrizeChange={handleCreatePrizeChange}
            onSubmit={handleSubmit}
            onCancel={closeFormModal}
            showTournamentSuccess={showTournamentSuccess}
            lastCreatedTournament={lastCreatedTournament}
            onDone={() => {
              setShowTournamentSuccess(false);
              setLastCreatedTournament(null);
              closeFormModal();
            }}
            onCreateSchedule={(tournament) => {
              setShowTournamentSuccess(false);
              setLastCreatedTournament(null);
              setRaceModalTournament(null);
              setIsRaceModalOpen(false);
              setIsFormOpen(false);
              navigate(`/admin/schedule?tournamentId=${tournament.tournamentId}&create=1`);
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


const TournamentForm = ({
  formData,
  formErrors,
  createPrizeRows,
  createPrizeErrors,
  isSaving,
  isEditing,
  editableStatuses,
  selectedTournament,
  onChange,
  onCreatePrizeChange,
  onSubmit,
  onCancel,
  showTournamentSuccess,
  lastCreatedTournament,
  onDone,
  onCreateSchedule,
}: {
  formData: TournamentMutationData;
  formErrors: TournamentFormErrors;
  createPrizeRows: PrizeFormRow[];
  createPrizeErrors: PrizeFormErrors;
  isSaving: boolean;
  isEditing: boolean;
  editableStatuses: TournamentStatus[];
  selectedTournament: Tournament | null;
  onChange: <K extends keyof TournamentMutationData>(field: K, value: TournamentMutationData[K]) => void;
  onCreatePrizeChange: (index: number, field: EditablePrizeField, value: string | number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  showTournamentSuccess?: boolean;
  lastCreatedTournament?: Tournament | null;
  onDone?: () => void;
  onCreateSchedule?: (tournament: Tournament) => void;
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
            onClick={() => onCreateSchedule?.(lastCreatedTournament)}
            className="gold-gradient w-full rounded-xl px-6 py-3 text-body-sm font-extrabold text-on-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            Create Schedule
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
              <select value={formData.location} onChange={(event) => onChange('location', event.target.value)} className={inputClassName}>
                <option value="">Select location</option>
                {tournamentLocationOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Start Date" error={formErrors.startDate}>
              <input
                type="date"
                min={isEditing ? undefined : getLocalDateInputValue()}
                value={formData.startDate}
                onChange={(event) => onChange('startDate', event.target.value)}
                className={inputClassName}
              />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="End Date" error={formErrors.endDate}>
              <input type="date" value={formData.endDate} onChange={(event) => onChange('endDate', event.target.value)} className={inputClassName} />
            </Field>
          </motion.div>
          <motion.div variants={revealUp}>
            <Field label="Prize Pool" error={formErrors.prize}>
              <input
                type="text"
                inputMode="numeric"
                value={formatVndAmountInput(formData.prize)}
                onChange={(event) => onChange('prize', normalizeVndAmountInput(event.target.value))}
                className={inputClassName}
                placeholder="500.000.000"
              />
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
                <Field label="Registration Open At" error={formErrors.registrationOpenAt}>
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

        {!isEditing && (
          <motion.div className="space-y-4 border-t border-outline-variant pt-6" variants={revealUp}>
            <div>
              <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Prize Setup</p>
              <h3 className="mt-1 font-display text-title-large font-extrabold text-primary">Create prizes with tournament</h3>
            </div>
            <PrizeRowsEditor rows={createPrizeRows} formErrors={createPrizeErrors} onChange={onCreatePrizeChange} />
          </motion.div>
        )}

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

      {isEditing && selectedTournament && (
        <motion.div variants={revealUp}>
          <TournamentPrizeForm tournament={selectedTournament} />
        </motion.div>
      )}
    </motion.div>
  );
};

const PrizeRowsEditor = ({
  rows,
  formErrors,
  onChange,
}: {
  rows: PrizeFormRow[];
  formErrors: PrizeFormErrors;
  onChange: (index: number, field: EditablePrizeField, value: string | number) => void;
}) => (
  <div className="overflow-x-auto rounded-md border border-outline-variant">
    <table className="w-full min-w-[860px] text-left">
      <thead className="border-b border-outline-variant bg-surface-container">
        <tr>
          <th className="w-[150px] px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Position</th>
          <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Prize Name</th>
          <th className="w-[180px] px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Amount</th>
          <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Note</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
        {rows.map((row, index) => (
          <tr key={row.finishPosition}>
            <td className="px-4 py-3 align-top">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-body-sm font-extrabold text-primary">
                  {row.finishPosition}
                </span>
                <span className="text-body-sm font-bold text-on-surface-variant">
                  {prizePositionLabels[row.finishPosition] ?? `#${row.finishPosition}`}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              <input
                type="text"
                value={row.prizeName}
                onChange={(event) => onChange(index, 'prizeName', event.target.value)}
                className={inputClassName}
              />
              {formErrors[index]?.prizeName && <span className="mt-1 block text-label-md text-error">{formErrors[index]?.prizeName}</span>}
            </td>
            <td className="px-4 py-3 align-top">
              <input
                type="text"
                inputMode="numeric"
                value={formatVndAmountInput(row.amount)}
                onChange={(event) => {
                  const amount = normalizeVndAmountInput(event.target.value);
                  onChange(index, 'amount', amount === '' ? '' : Number(amount));
                }}
                className={inputClassName}
                placeholder="100.000.000"
              />
              {formErrors[index]?.amount && <span className="mt-1 block text-label-md text-error">{formErrors[index]?.amount}</span>}
            </td>
            <td className="px-4 py-3 align-top">
              <input
                type="text"
                value={row.note}
                onChange={(event) => onChange(index, 'note', event.target.value)}
                className={inputClassName}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TournamentPrizeForm = ({
  tournament,
  showHeader = true,
}: {
  tournament: Tournament;
  showHeader?: boolean;
}) => {
  const [rows, setRows] = useState<PrizeFormRow[]>(createDefaultPrizeRows);
  const [originalRows, setOriginalRows] = useState<PrizeFormRow[]>([]);
  const [formErrors, setFormErrors] = useState<PrizeFormErrors>({});
  const [isLoadingPrizes, setIsLoadingPrizes] = useState(true);
  const [isSavingPrizes, setIsSavingPrizes] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useToastNotifications([
    notice ? { tone: notice.tone, text: notice.text } : null,
  ]);

  const loadPrizes = useCallback(async () => {
    setIsLoadingPrizes(true);
    setNotice(null);

    try {
      const prizes = await tournamentService.getPrizes(tournament.tournamentId);
      const nextRows = mergePrizeRows(prizes);

      setRows(nextRows);
      setOriginalRows(prizes.length > 0 ? nextRows : []);
      setFormErrors({});
    } catch (error) {
      setRows(createDefaultPrizeRows());
      setOriginalRows([]);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load prizes.') });
    } finally {
      setIsLoadingPrizes(false);
    }
  }, [tournament.tournamentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPrizes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPrizes]);

  const hasExistingPrizes = originalRows.some((row) => Boolean(getPrizeIdentifier(row)));

  const handleRowChange = (index: number, field: EditablePrizeField, value: string | number) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row,
      ),
    );

    setFormErrors((current) => {
      if (!current[index]?.[field]) {
        return current;
      }

      const nextErrors = { ...current };
      const rowErrors = { ...nextErrors[index] };
      delete rowErrors[field];

      if (Object.keys(rowErrors).length === 0) {
        delete nextErrors[index];
      } else {
        nextErrors[index] = rowErrors;
      }

      return nextErrors;
    });
  };

  const handlePrizeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePrizeRows(rows);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingPrizes(true);
    setNotice(null);

    try {
      if (!hasExistingPrizes) {
        await tournamentService.createPrizes(tournament.tournamentId, rows.map(toPrizeRequest));
        setNotice({ tone: 'success', text: 'Prizes created successfully.' });
        await loadPrizes();
        return;
      }

      const changedRows = rows.filter((row) => {
        const prizeId = getPrizeIdentifier(row);
        const originalRow = originalRows.find((item) =>
          getPrizeIdentifier(item) === prizeId || item.finishPosition === row.finishPosition,
        );

        return Boolean(prizeId && originalRow && hasPrizeChanged(row, originalRow));
      });
      const missingRows = rows.filter((row) => !getPrizeIdentifier(row));

      if (changedRows.length === 0 && missingRows.length === 0) {
        setNotice({ tone: 'success', text: 'No prize changes to save.' });
        return;
      }

      await Promise.all([
        ...changedRows.map((row) =>
          tournamentService.updatePrize(tournament.tournamentId, getPrizeIdentifier(row) ?? row.finishPosition, toPrizeRequest(row)),
        ),
        ...(missingRows.length > 0
          ? [tournamentService.createPrizes(tournament.tournamentId, missingRows.map(toPrizeRequest))]
          : []),
      ]);

      setNotice({ tone: 'success', text: 'Prizes updated successfully.' });
      await loadPrizes();
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to save prizes.') });
    } finally {
      setIsSavingPrizes(false);
    }
  };

  return (
    <form onSubmit={handlePrizeSubmit} className="space-y-4">
      {showHeader && (
        <div className="flex flex-col gap-3 border-t border-outline-variant pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Prize Management</p>
            <h3 className="mt-1 font-display text-title-large font-extrabold text-primary">{tournament.tournamentName}</h3>
          </div>
          <button
            type="button"
            onClick={() => void loadPrizes()}
            disabled={isLoadingPrizes || isSavingPrizes}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPrizes ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {!showHeader && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void loadPrizes()}
            disabled={isLoadingPrizes || isSavingPrizes}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPrizes ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {isLoadingPrizes ? (
        <InlineEmptyState text="Loading prizes..." />
      ) : (
        <PrizeRowsEditor rows={rows} formErrors={formErrors} onChange={handleRowChange} />
      )}

      <div className="flex justify-end border-t border-outline-variant pt-4">
        <button
          type="submit"
          disabled={isLoadingPrizes || isSavingPrizes}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isSavingPrizes ? 'Saving...' : hasExistingPrizes ? 'Save Prize Changes' : 'Create Prizes'}
        </button>
      </div>
    </form>
  );
};

const RaceCrudPanel = ({ tournament }: { tournament: Tournament }) => {
  const [races, setRaces] = useState<RaceCrudItem[]>([]);
  const [scheduleOptions, setScheduleOptions] = useState<RaceScheduleOption[]>([]);
  const [raceForm, setRaceForm] = useState<RaceFormData>(emptyRaceFormData);
  const [editingRaceId, setEditingRaceId] = useState<number | null>(null);
  const [pointRules, setPointRules] = useState<PointRuleRequest[]>(createDefaultPointRules);
  const [pointRuleError, setPointRuleError] = useState('');
  const [isLoadingPointRules, setIsLoadingPointRules] = useState(false);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRaceSuccess, setShowRaceSuccess] = useState(false);
  const [lastCreatedRace, setLastCreatedRace] = useState<RaceCrudItem | null>(null);
  const availableRaceNumbers = useMemo(
    () => createRaceNumberOptions(races.length, raceForm.raceNumber),
    [raceForm.raceNumber, races.length],
  );

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadRaces = useCallback(async () => {
    setIsLoadingRaces(true);
    setErrorMessage('');

    try {
      const data = await raceCrudService.getRacesByTournament(tournament.tournamentId);
      setRaces(data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load races.'));
    } finally {
      setIsLoadingRaces(false);
    }
  }, [tournament.tournamentId]);

  const loadScheduleOptions = useCallback(async () => {
    setIsLoadingSchedules(true);

    try {
      const data = await raceCrudService.getScheduleOptions(tournament.tournamentId);
      setScheduleOptions(data);
      setRaceForm((current) => {
        if (current.scheduleId || data.length === 0) {
          return current;
        }

        const firstSchedule = data[0];
        return {
          ...current,
          scheduleId: firstSchedule.scheduleId,
          scheduledAt: firstSchedule.raceDate ? `${firstSchedule.raceDate}T09:00` : '',
        };
      });
    } catch (error) {
      setScheduleOptions([]);
      setErrorMessage(getApiErrorMessage(error, 'Unable to load schedules.'));
    } finally {
      setIsLoadingSchedules(false);
    }
  }, [tournament.tournamentId]);


  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRaces();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRaces]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadScheduleOptions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadScheduleOptions]);


  const resetRaceForm = () => {
    const firstSchedule = scheduleOptions[0];
    setEditingRaceId(null);
    setPointRules(createDefaultPointRules());
    setPointRuleError('');
    setIsLoadingPointRules(false);
    setRaceForm({
      ...emptyRaceFormData,
      raceNumber: races.length + 1,
      scheduleId: firstSchedule?.scheduleId,
      scheduledAt: firstSchedule?.raceDate ? `${firstSchedule.raceDate}T09:00` : '',
    });
  };

  const handleScheduleChange = (scheduleId?: number) => {
    const schedule = scheduleOptions.find((option) => option.scheduleId === scheduleId);
    setRaceForm((current) => ({
      ...current,
      scheduleId,
      scheduledAt: schedule?.raceDate ? `${schedule.raceDate}T09:00` : '',
    }));
  };

  const editRace = async (race: RaceCrudItem) => {
    const normalizedRankGroup = race.rankGroup.trim().toUpperCase().slice(-1);
    const normalizedTrackType = raceTrackTypeOptions.find((trackType) => trackType.toLowerCase() === race.trackType.trim().toLowerCase());
    setEditingRaceId(race.raceId);
    setPointRules(createDefaultPointRules());
    setPointRuleError('');
    setIsLoadingPointRules(true);
    setRaceForm({
      scheduleId: race.scheduleId,
      name: race.name,
      raceNumber: race.raceNumber,
      rankGroup: raceRankGroupOptions.includes(normalizedRankGroup as (typeof raceRankGroupOptions)[number]) ? normalizedRankGroup : 'A',
      lapCount: race.lapCount,
      scheduledAt: toDateTimeInputValue(race.scheduledAt),
      predictionClosesAt: toDateTimeInputValue(race.predictionClosesAt),
      distanceM: race.distanceM,
      trackType: normalizedTrackType ?? 'Turf',
      maxHorses: race.maxHorses,
      maxReferees: race.maxReferees,
      status: normalizeRaceCrudStatus(race.status),
    });

    try {
      const currentPointRules = await pointRuleService.getPointRules(race.raceId);
      setPointRules(
        currentPointRules.length > 0
          ? currentPointRules.map(({ finishPosition, points, note }) => ({ finishPosition, points, note }))
          : createDefaultPointRules(),
      );
    } catch (error) {
      setPointRules([]);
      setPointRuleError(getApiErrorMessage(error, 'Unable to load point rules. Open the race again to retry.'));
    } finally {
      setIsLoadingPointRules(false);
    }
  };

  const handlePointRuleChange = <K extends keyof PointRuleRequest>(index: number, field: K, value: PointRuleRequest[K]) => {
    setPointRules((current) => current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, [field]: value } : rule)));
    setPointRuleError('');
  };

  const addPointRule = () => {
    setPointRules((current) => [...current, createNextPointRule(current)]);
    setPointRuleError('');
  };

  const removePointRule = (index: number) => {
    if (pointRules.length === 1) {
      setPointRuleError('At least one point rule is required.');
      return;
    }

    setPointRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
    setPointRuleError('');
  };

  const handleRaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    if (!editingRaceId && !raceForm.scheduleId) {
      setErrorMessage('Select a schedule before saving a race.');
      return;
    }

    const validationError = validatePointRules(pointRules);
    if (validationError) {
      setPointRuleError(validationError);
      return;
    }

    const currentRace = races.find((race) => race.raceId === editingRaceId);

    if (currentRace?.assignedRefereeCount && raceForm.maxReferees < currentRace.assignedRefereeCount) {
      setErrorMessage(`Max referees cannot be lower than ${currentRace.assignedRefereeCount} assigned referees.`);
      return;
    }

    if (currentRace?.registeredHorseCount && raceForm.maxHorses < currentRace.registeredHorseCount) {
      setErrorMessage(`Max horses cannot be lower than ${currentRace.registeredHorseCount} registered horses.`);
      return;
    }

    const pointRulePayload = pointRules
      .map((rule) => ({ ...rule, note: rule.note.trim() }))
      .sort((first, second) => first.finishPosition - second.finishPosition);

    try {
      const savedRace = editingRaceId
        ? await raceCrudService.updateRace(editingRaceId, raceForm)
        : await raceCrudService.createRace(tournament.tournamentId, raceForm);

      try {
        if (editingRaceId) {
          await pointRuleService.replacePointRules(editingRaceId, pointRulePayload);
        } else {
          await pointRuleService.createPointRules(savedRace.raceId, pointRulePayload);
        }
      } catch (error) {
        const action = editingRaceId ? 'updated' : 'created';
        if (!editingRaceId) {
          setEditingRaceId(savedRace.raceId);
        }
        setPointRuleError(getApiErrorMessage(error, `Race was ${action}, but its point rules could not be saved.`));
        setErrorMessage(`Race was ${action}, but point rules were not saved. Please retry.`);
        await loadRaces();
        return;
      }

      if (editingRaceId) {
        setMessage('Race and point rules updated.');
      } else {
        setLastCreatedRace(savedRace);
        setShowRaceSuccess(true);
      }
      resetRaceForm();
      await loadRaces();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save race.'));
    }
  };

  const deleteRace = async (race: RaceCrudItem) => {
    const confirmed = window.confirm(`Cancel race "${race.name}"?`);

    if (!confirmed) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    try {
      await raceCrudService.deleteRace(race.raceId, tournament.tournamentId);
      setMessage('Race cancelled.');
      await loadRaces();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to cancel race.'));
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
            Manage race schedules, capacity, and track information
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
              <p className="text-body-md text-on-surface-variant mb-8">Create your first race to start building the tournament schedule</p>
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
                  className="glass-panel rounded-3xl border-2 border-outline-variant p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
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
                      <IconButton label={`Update ${race.name}`} onClick={(e) => { e.stopPropagation(); void editRace(race); }}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={`Cancel ${race.name}`} onClick={(e) => { e.stopPropagation(); void deleteRace(race); }} danger>
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
            pointRules={pointRules}
            pointRuleError={pointRuleError}
            isLoadingPointRules={isLoadingPointRules}
            onPointRuleChange={handlePointRuleChange}
            onAddPointRule={addPointRule}
            onRemovePointRule={removePointRule}
            raceNumberOptions={availableRaceNumbers}
            scheduleOptions={scheduleOptions}
            isLoadingSchedules={isLoadingSchedules}
            isEditing={Boolean(editingRaceId)}
            onSubmit={handleRaceSubmit}
            onReset={resetRaceForm}
            onChange={(field, value) => setRaceForm((current) => ({ ...current, [field]: value }))}
            onScheduleChange={handleScheduleChange}
            showRaceSuccess={showRaceSuccess}
            lastCreatedRace={lastCreatedRace}
            onDone={() => {
              setShowRaceSuccess(false);
              setLastCreatedRace(null);
            }}
          />
        </motion.div>
      </motion.div>

    </motion.section>
  );
};

const RaceFormPanel = ({
  form,
  pointRules,
  pointRuleError,
  isLoadingPointRules,
  onPointRuleChange,
  onAddPointRule,
  onRemovePointRule,
  raceNumberOptions,
  scheduleOptions,
  isLoadingSchedules,
  isEditing,
  onSubmit,
  onReset,
  onChange,
  onScheduleChange,
  showRaceSuccess,
  lastCreatedRace,
  onDone,
}: {
  form: RaceFormData;
  pointRules: PointRuleRequest[];
  pointRuleError: string;
  isLoadingPointRules: boolean;
  onPointRuleChange: <K extends keyof PointRuleRequest>(index: number, field: K, value: PointRuleRequest[K]) => void;
  onAddPointRule: () => void;
  onRemovePointRule: (index: number) => void;
  raceNumberOptions: number[];
  scheduleOptions: RaceScheduleOption[];
  isLoadingSchedules: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onChange: <K extends keyof RaceFormData>(field: K, value: RaceFormData[K]) => void;
  onScheduleChange: (scheduleId?: number) => void;
  showRaceSuccess?: boolean;
  lastCreatedRace?: RaceCrudItem | null;
  onDone?: () => void;
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
              {lastCreatedRace.name} has been added to the tournament schedule
            </p>
          </div>
        </motion.div>
        <motion.div className="grid gap-4" variants={revealContainer}>
          <motion.button
            type="button"
            onClick={onDone}
            className="w-full rounded-2xl border-2 border-outline-variant px-8 py-4 text-label-lg font-bold text-on-surface-variant hover:text-primary hover:border-primary"
            variants={revealUp}
            whileHover="hover"
            whileTap="tap"
          >
            Done
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
            <select value={form.raceNumber} onChange={(event) => onChange('raceNumber', Number(event.target.value))} required className={inputClassName}>
              {raceNumberOptions.map((raceNumber) => (
                <option key={raceNumber} value={raceNumber}>Race {raceNumber}</option>
              ))}
            </select>
          </Field>
        </motion.div>

        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Rank group">
            <select value={form.rankGroup} onChange={(event) => onChange('rankGroup', event.target.value)} required className={inputClassName}>
              {raceRankGroupOptions.map((rankGroup) => (
                <option key={rankGroup} value={rankGroup}>Group {rankGroup}</option>
              ))}
            </select>
          </Field>
          <Field label="Lap count">
            <input type="number" min="1" value={form.lapCount || ''} onChange={(event) => onChange('lapCount', Number(event.target.value))} required className={inputClassName} placeholder="5" />
          </Field>
        </motion.div>

        {/* Date & Time */}
        <motion.div className="grid gap-4 md:grid-cols-2" variants={revealUp}>
          <Field label="Scheduled at">
            <input type="datetime-local" value={form.scheduledAt} readOnly required className={`${inputClassName} cursor-not-allowed opacity-80`} />
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
            <select value={form.trackType} onChange={(event) => onChange('trackType', event.target.value)} className={inputClassName}>
              {raceTrackTypeOptions.map((trackType) => (
                <option key={trackType} value={trackType}>{trackType}</option>
              ))}
            </select>
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
            <select value={form.status} onChange={(event) => onChange('status', event.target.value)} className={inputClassName}>
              {raceStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Schedule">
            <select
              value={form.scheduleId ?? ''}
              onChange={(event) => onScheduleChange(event.target.value ? Number(event.target.value) : undefined)}
              disabled={isEditing || isLoadingSchedules || scheduleOptions.length === 0}
              required
              className={inputClassName}
            >
              <option value="">
                {isEditing && !form.scheduleId ? 'Current schedule' : isLoadingSchedules ? 'Loading schedules...' : 'Select schedule'}
              </option>
              {scheduleOptions.map((schedule) => (
                <option key={schedule.scheduleId} value={schedule.scheduleId}>
                  Day {schedule.dayNumber} - {schedule.title}
                </option>
              ))}
            </select>
          </Field>
        </motion.div>

        <motion.div className="space-y-3" variants={revealUp}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h5 className="text-label-lg font-extrabold text-primary">Point rules</h5>
              <p className="text-body-sm text-on-surface-variant">Saved separately from the race details.</p>
            </div>
            <button
              type="button"
              onClick={onAddPointRule}
              className="inline-flex items-center gap-1 rounded-xl border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary"
            >
              <Plus className="h-4 w-4" />
              Add rule
            </button>
          </div>

          {isLoadingPointRules ? (
            <p className="rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">Loading point rules...</p>
          ) : (
            <div className="space-y-3">
              {pointRules.map((rule, index) => (
                <div key={`${index}-${rule.finishPosition}`} className="grid gap-2 rounded-2xl border border-outline-variant p-3 sm:grid-cols-[90px_90px_minmax(0,1fr)_40px]">
                  <label className="space-y-1">
                    <span className="text-label-xs font-bold text-on-surface-variant">Position</span>
                    <input
                      type="number"
                      min="1"
                      value={rule.finishPosition}
                      onChange={(event) => onPointRuleChange(index, 'finishPosition', Number(event.target.value))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-label-xs font-bold text-on-surface-variant">Points</span>
                    <input
                      type="number"
                      min="0"
                      value={rule.points}
                      onChange={(event) => onPointRuleChange(index, 'points', Number(event.target.value))}
                      className={inputClassName}
                      required
                    />
                  </label>
                  <label className="min-w-0 space-y-1">
                    <span className="text-label-xs font-bold text-on-surface-variant">Note</span>
                    <input
                      value={rule.note}
                      maxLength={255}
                      onChange={(event) => onPointRuleChange(index, 'note', event.target.value)}
                      className={inputClassName}
                      placeholder="Optional"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemovePointRule(index)}
                    disabled={pointRules.length === 1}
                    aria-label={`Remove point rule ${index + 1}`}
                    className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {pointRuleError ? <p className="text-body-sm font-semibold text-error">{pointRuleError}</p> : null}
        </motion.div>
      </div>

      <motion.button 
        type="submit" 
        className="mt-8 w-full gold-gradient rounded-2xl px-8 py-4 text-label-lg font-extrabold text-on-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        disabled={isLoadingPointRules}
        variants={revealUp}
        whileHover="hover"
        whileTap="tap"
      >
        {isEditing ? 'Update Race' : 'Create Race'}
      </motion.button>
    </motion.form>
  );
};

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
        title="Prize Management"
        icon={<Trophy className="h-5 w-5 text-secondary" />}
      >
        <TournamentPrizeForm tournament={tournament} showHeader={false} />
      </DetailSection>

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

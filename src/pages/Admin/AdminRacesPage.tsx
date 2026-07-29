import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  BadgeDollarSign,
  Ban,
  CalendarDays,
  CheckCircle2,
  Flag,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { adminUserService, type AdminRefereeOption } from '../../services/adminUserService';
import { pointRuleService } from '../../services/pointRuleService';
import { tournamentService, type RefereeAssignmentItem } from '../../services/tournamentService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { formatRefereeRoleLabel } from '../../utils/permissions';
import type { PointRuleRequest, PointRuleResponse } from '../../types/pointRule';
import {
  adminScheduleRaceApi,
  rankGroupOptions,
  toDateTimeInputValue,
  type AdminRaceFormData,
  type AdminRaceItem,
  type AdminScheduleItem,
  type AdminTournamentOption,
  type RaceRankGroup,
} from '../../services/adminScheduleRaceApi';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};
type RaceFormErrors = Partial<Record<keyof AdminRaceFormData, string>>;
type PointRuleFormData = PointRuleRequest & {
  id?: number;
  raceId?: number;
};
type PointRuleFormErrors = Partial<Record<keyof PointRuleRequest, string>>;
type RaceAction = 'openBetting' | 'cancel';
type PendingRaceAction = {
  action: RaceAction;
  race: AdminRaceItem;
};
type RaceActionSuccess = {
  action: RaceAction;
  raceName: string;
  text: string;
};
type RaceStatusFilter = 'All' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
type RefereeAssignmentFormData = {
  refereeId: number | '';
  refereeRole: string;
};

const emptyRaceForm: AdminRaceFormData = {
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
};

const createDefaultPointRules = (): PointRuleFormData[] => [
  { finishPosition: 1, points: 0, note: '' },
  { finishPosition: 2, points: 0, note: '' },
  { finishPosition: 3, points: 0, note: '' },
];

const emptyRefereeForm: RefereeAssignmentFormData = {
  refereeId: '',
  refereeRole: '',
};

const statusFilterOptions: RaceStatusFilter[] = ['All', 'scheduled', 'ongoing', 'completed', 'cancelled'];
const trackTypeOptions = ['Turf', 'Dirt', 'Synthetic'] as const;
const createRaceNumberOptions = (raceCount: number, currentRaceNumber: number) =>
  Array.from({ length: Math.max(1, raceCount + 1, currentRaceNumber) }, (_, index) => index + 1);

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

const normalizeStatus = (status: string) => status.trim().toLowerCase().replace(/[_\s-]+/g, '_');

const isOpenForBettingStatus = (status: string) => {
  const value = normalizeStatus(status);
  return value === 'open_for_betting'
    || value === 'betting_open'
    || (value.includes('open') && value.includes('betting'));
};

const getRaceStatusClassName = (status: string) => {
  const value = normalizeStatus(status);

  if (value.includes('ongoing') || value.includes('progress') || value.includes('running') || value.includes('live')) {
    return 'border-secondary/30 bg-secondary/10 text-secondary';
  }

  if (value.includes('complete') || value.includes('finish')) {
    return 'border-primary/30 bg-primary/10 text-primary';
  }

  if (value.includes('cancel')) {
    return 'border-error/30 bg-error-container/20 text-error';
  }

  return 'border-outline-variant bg-surface-container-highest text-on-surface-variant';
};

const getStatusFilterValue = (status: string): Exclude<RaceStatusFilter, 'All'> => {
  const value = normalizeStatus(status);

  if (value.includes('ongoing') || value.includes('progress') || value.includes('running') || value.includes('live')) {
    return 'ongoing';
  }

  if (value.includes('complete') || value.includes('finish')) {
    return 'completed';
  }

  if (value.includes('cancel')) {
    return 'cancelled';
  }

  return 'scheduled';
};


const canOpenBetting = (status: string) => normalizeStatus(status) === 'ready';

const canAssignReferee = (status: string) => {
  if (isOpenForBettingStatus(status)) {
    return true;
  }

  const value = normalizeStatus(status);
  return !(
    value.includes('ongoing')
    || value.includes('progress')
    || value.includes('running')
    || value.includes('live')
    || value.includes('complete')
    || value.includes('finish')
    || value.includes('cancel')
  );
};

const validateRaceForm = (data: AdminRaceFormData, existingRace?: AdminRaceItem | null) => {
  const errors: RaceFormErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Race name is required.';
  }

  if (Number(data.raceNumber) <= 0) {
    errors.raceNumber = 'Race number must be greater than 0.';
  }

  if (!rankGroupOptions.includes(data.rankGroup)) {
    errors.rankGroup = 'Select a rank group.';
  }

  if (Number(data.lapCount) <= 0) {
    errors.lapCount = 'Lap count must be greater than 0.';
  }

  if (!data.scheduledAt) {
    errors.scheduledAt = 'Scheduled time is required.';
  }

  if (Number(data.distanceM) <= 0) {
    errors.distanceM = 'Distance must be greater than 0.';
  }

  if (Number(data.maxHorses) <= 0) {
    errors.maxHorses = 'Max horses must be greater than 0.';
  } else if (existingRace?.registeredHorseCount && Number(data.maxHorses) < existingRace.registeredHorseCount) {
    errors.maxHorses = `Capacity cannot be lower than ${existingRace.registeredHorseCount} registered horses.`;
  }

  if (Number(data.maxReferees) <= 0) {
    errors.maxReferees = 'Max referees must be greater than 0.';
  } else if (existingRace?.assignedRefereeCount && Number(data.maxReferees) < existingRace.assignedRefereeCount) {
    errors.maxReferees = `Capacity cannot be lower than ${existingRace.assignedRefereeCount} assigned referees.`;
  }

  if (!trackTypeOptions.includes(data.trackType as (typeof trackTypeOptions)[number])) {
    errors.trackType = 'Select a track type.';
  }

  return errors;
};

const validatePointRules = (rules: PointRuleFormData[]) => {
  const errors = rules.map<PointRuleFormErrors>(() => ({}));
  let listError = '';

  if (rules.length === 0) {
    listError = 'At least one point rule is required.';
  }

  const finishPositionCounts = new Map<number, number>();

  rules.forEach((rule) => {
    const finishPosition = Number(rule.finishPosition);

    if (Number.isInteger(finishPosition) && finishPosition > 0) {
      finishPositionCounts.set(finishPosition, (finishPositionCounts.get(finishPosition) ?? 0) + 1);
    }
  });

  rules.forEach((rule, index) => {
    const finishPosition = Number(rule.finishPosition);
    const points = Number(rule.points);

    if (!Number.isInteger(finishPosition) || finishPosition <= 0) {
      errors[index].finishPosition = 'Position must be greater than 0.';
    } else if ((finishPositionCounts.get(finishPosition) ?? 0) > 1) {
      errors[index].finishPosition = 'Position must be unique.';
    }

    if (!Number.isFinite(points) || points < 0) {
      errors[index].points = 'Points must be 0 or greater.';
    }
  });

  return {
    errors,
    listError,
    hasErrors: Boolean(listError) || errors.some((error) => Object.values(error).some(Boolean)),
  };
};

const toPointRuleFormData = (rule: PointRuleResponse): PointRuleFormData => ({
  id: rule.id,
  raceId: rule.raceId,
  finishPosition: rule.finishPosition,
  points: rule.points,
  note: rule.note ?? '',
});

const toPointRulePayload = (rules: PointRuleFormData[]): PointRuleRequest[] =>
  [...rules]
    .sort((first, second) => first.finishPosition - second.finishPosition)
    .map((rule) => ({
      finishPosition: Number(rule.finishPosition),
      points: Number(rule.points),
      note: rule.note.trim(),
    }));

const createNextPointRule = (rules: PointRuleFormData[]): PointRuleFormData => ({
  finishPosition: Math.max(0, ...rules.map((rule) => Number(rule.finishPosition) || 0)) + 1,
  points: 0,
  note: '',
});

const toFormData = (race: AdminRaceItem): AdminRaceFormData => ({
  name: race.name,
  raceNumber: race.raceNumber,
  rankGroup: rankGroupOptions.includes(race.rankGroup as RaceRankGroup) ? (race.rankGroup as RaceRankGroup) : 'A',
  lapCount: race.lapCount,
  scheduledAt: toDateTimeInputValue(race.scheduledAt),
  predictionClosesAt: toDateTimeInputValue(race.predictionClosesAt),
  distanceM: race.distanceM,
  trackType: race.trackType === '-' ? '' : race.trackType,
  maxHorses: race.maxHorses,
  maxReferees: race.maxReferees,
});

const defaultScheduledAt = (schedule: AdminScheduleItem | null) => {
  if (!schedule?.raceDate) {
    return '';
  }

  return `${schedule.raceDate}T09:00`;
};

const getRefereeOptionLabel = (referee: AdminRefereeOption) => {
  const name = referee.fullName || referee.username || 'Unnamed referee';
  const username = referee.username ? `@${referee.username}` : referee.email;

  if (!referee.hasRefereeProfile) {
    return `${name}${username ? ` (${username})` : ''} - missing referee profile`;
  }

  return `${name}${username ? ` (${username})` : ''} - Ref #${referee.refereeId}`;
};

const AdminRacesPage = () => {
  const [tournaments, setTournaments] = useState<AdminTournamentOption[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [schedules, setSchedules] = useState<AdminScheduleItem[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | ''>('');
  const [races, setRaces] = useState<AdminRaceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RaceStatusFilter>('All');
  const [isTournamentLoading, setIsTournamentLoading] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isRaceLoading, setIsRaceLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPointRulesLoading, setIsPointRulesLoading] = useState(false);
  const [actionRaceId, setActionRaceId] = useState<number | null>(null);
  const [pendingRaceAction, setPendingRaceAction] = useState<PendingRaceAction | null>(null);
  const [raceActionSuccess, setRaceActionSuccess] = useState<RaceActionSuccess | null>(null);
  const [editingRace, setEditingRace] = useState<AdminRaceItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<AdminRaceFormData>(emptyRaceForm);
  const [formErrors, setFormErrors] = useState<RaceFormErrors>({});
  const [pointRules, setPointRules] = useState<PointRuleFormData[]>(createDefaultPointRules);
  const [pointRuleErrors, setPointRuleErrors] = useState<PointRuleFormErrors[]>([]);
  const [pointRuleListError, setPointRuleListError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedRefereeRace, setSelectedRefereeRace] = useState<AdminRaceItem | null>(null);
  const [refereeList, setRefereeList] = useState<RefereeAssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refereeOptions, setRefereeOptions] = useState<AdminRefereeOption[]>([]);
  const [isRefereeOptionsLoading, setIsRefereeOptionsLoading] = useState(false);
  const [isAssigningReferee, setIsAssigningReferee] = useState(false);
  const [refereeForm, setRefereeForm] = useState<RefereeAssignmentFormData>(emptyRefereeForm);

  useToastNotifications([notice]);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.tournamentId === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId],
  );

  const raceId = selectedRefereeRace?.raceId;

  const fetchRefereeList = useCallback(async () => {
    if (!raceId) {
      setRefereeList([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await tournamentService.getRaceReferees(raceId);
      setRefereeList(data);
      setRaces((current) =>
        current.map((race) => (race.raceId === raceId ? { ...race, assignedRefereeCount: data.length } : race)),
      );
      setSelectedRefereeRace((current) =>
        current?.raceId === raceId ? { ...current, assignedRefereeCount: data.length } : current,
      );
    } catch (apiError) {
      setRefereeList([]);
      setError(getApiErrorMessage(apiError, 'Unable to load referee assignments.'));
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  const loadRefereeOptions = async () => {
    setIsRefereeOptionsLoading(true);

    try {
      const data = await adminUserService.getReferees();
      setRefereeOptions(data);
    } catch (apiError) {
      setRefereeOptions([]);
      setError(getApiErrorMessage(apiError, 'Unable to load referee users.'));
    } finally {
      setIsRefereeOptionsLoading(false);
    }
  };

  const loadTournaments = async () => {
    setIsTournamentLoading(true);
    setNotice(null);

    try {
      const data = await adminScheduleRaceApi.getTournaments();
      setTournaments(data);
      setSelectedTournamentId((current) => current || data[0]?.tournamentId || '');
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load tournaments.') });
    } finally {
      setIsTournamentLoading(false);
    }
  };

  const loadSchedules = async (tournamentId = selectedTournamentId, tournament = selectedTournament) => {
    if (!tournamentId) {
      setSchedules([]);
      setSelectedScheduleId('');
      return;
    }

    setIsScheduleLoading(true);
    setNotice(null);

    try {
      const data = await adminScheduleRaceApi.getSchedules(tournamentId, tournament ?? undefined);
      setSchedules(data);
      setSelectedScheduleId((current) => {
        if (current && data.some((schedule) => schedule.scheduleId === current)) {
          return current;
        }

        return data[0]?.scheduleId || '';
      });
    } catch (error) {
      setSchedules([]);
      setSelectedScheduleId('');
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load schedules.') });
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const loadRaces = async (tournamentId = selectedTournamentId) => {
    if (!tournamentId) {
      setRaces([]);
      return;
    }

    setIsRaceLoading(true);
    setNotice(null);

    try {
      const data = await adminScheduleRaceApi.getRacesByTournament(tournamentId);
      setRaces(data);
      setSelectedRefereeRace((current) =>
        current ? data.find((race) => race.raceId === current.raceId) ?? current : null,
      );
    } catch (error) {
      setRaces([]);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load races.') });
    } finally {
      setIsRaceLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTournaments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedules();
      void loadRaces();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedTournamentId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchRefereeList();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchRefereeList]);

  const scheduleRaces = useMemo(() => {
    if (!selectedScheduleId) {
      return [];
    }

    return races.filter((race) => race.scheduleId === selectedScheduleId);
  }, [races, selectedScheduleId]);

  const filteredRaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return scheduleRaces.filter((race) => {
      const searchableValues = [
        race.name,
        race.rankGroup,
        race.trackType,
        race.status,
        race.scheduleTitle ?? '',
        String(race.raceNumber),
      ];
      const matchesSearch = !query || searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All' || getStatusFilterValue(race.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [scheduleRaces, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const scheduled = scheduleRaces.filter((race) => getStatusFilterValue(race.status) === 'scheduled').length;
    const ongoing = scheduleRaces.filter((race) => getStatusFilterValue(race.status) === 'ongoing').length;
    const completed = scheduleRaces.filter((race) => getStatusFilterValue(race.status) === 'completed').length;

    return { scheduled, ongoing, completed };
  }, [scheduleRaces]);

  const availableRaceNumbers = useMemo(
    () => createRaceNumberOptions(scheduleRaces.length, formData.raceNumber),
    [formData.raceNumber, scheduleRaces.length],
  );

  const openCreateModal = () => {
    if (!selectedScheduleId || !selectedSchedule) {
      setNotice({ tone: 'error', text: 'Select a schedule before creating a race.' });
      return;
    }

    const nextRaceNumber = scheduleRaces.length + 1;

    setEditingRace(null);
    setFormData({
      ...emptyRaceForm,
      raceNumber: nextRaceNumber,
      name: `Race ${nextRaceNumber}`,
      scheduledAt: defaultScheduledAt(selectedSchedule),
    });
    setFormErrors({});
    setPointRules(createDefaultPointRules());
    setPointRuleErrors([]);
    setPointRuleListError('');
    setIsPointRulesLoading(false);
    setIsFormOpen(true);
  };

  const openEditModal = async (race: AdminRaceItem) => {
    setEditingRace(race);
    setFormData(toFormData(race));
    setFormErrors({});
    setPointRules(createDefaultPointRules());
    setPointRuleErrors([]);
    setPointRuleListError('');
    setIsFormOpen(true);
    setIsPointRulesLoading(true);

    const [raceResult, pointRuleResult] = await Promise.allSettled([
      adminScheduleRaceApi.getRace(race.raceId),
      pointRuleService.getPointRules(race.raceId),
    ]);

    if (raceResult.status === 'fulfilled') {
      const latestRace = raceResult.value;
      setEditingRace({ ...race, ...latestRace });
      setFormData(toFormData({ ...race, ...latestRace }));
    } else {
      setNotice({ tone: 'error', text: 'Could not refresh this race. Showing the list version instead.' });
    }

    if (pointRuleResult.status === 'fulfilled') {
      setPointRules(pointRuleResult.value.length > 0 ? pointRuleResult.value.map(toPointRuleFormData) : createDefaultPointRules());
    } else {
      setPointRuleListError(getApiErrorMessage(pointRuleResult.reason, 'Unable to load point rules.'));
    }

    setIsPointRulesLoading(false);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingRace(null);
    setFormData(emptyRaceForm);
    setFormErrors({});
    setPointRules(createDefaultPointRules());
    setPointRuleErrors([]);
    setPointRuleListError('');
    setIsPointRulesLoading(false);
  };

  const openRefereeModal = (race: AdminRaceItem) => {
    setSelectedRefereeRace(race);
    setRefereeForm(emptyRefereeForm);
    setError(null);
    void loadRefereeOptions();
  };

  const closeRefereeModal = () => {
    setSelectedRefereeRace(null);
    setRefereeList([]);
    setRefereeForm(emptyRefereeForm);
    setError(null);
  };

  const openRaceActionConfirmation = (race: AdminRaceItem, action: RaceAction) => {
    setNotice(null);
    setPendingRaceAction({ race, action });
  };

  const handleRefereeFormChange = <K extends keyof RefereeAssignmentFormData>(
    field: K,
    value: RefereeAssignmentFormData[K],
  ) => {
    setRefereeForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleAssignReferee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!raceId) {
      setError('Select a race before assigning a referee.');
      return;
    }

    if (selectedRefereeRace && !canAssignReferee(selectedRefereeRace.status)) {
      setError(`Referees cannot be assigned while this race is ${selectedRefereeRace.status}.`);
      return;
    }

    const refereeId = Number(refereeForm.refereeId);
    const refereeRole = refereeForm.refereeRole.trim();
    const selectedReferee = refereeOptions.find((referee) => referee.refereeId === refereeId);

    if (!Number.isFinite(refereeId) || refereeId <= 0) {
      setError('Select a referee before assigning.');
      return;
    }

    if (!selectedReferee?.hasRefereeProfile) {
      setError('This referee user does not have a referee profile ID yet.');
      return;
    }

    if (!refereeRole) {
      setError('Referee role is required.');
      return;
    }

    if (selectedRefereeRace && refereeList.length >= selectedRefereeRace.maxReferees) {
      setError(`This race already has its maximum of ${selectedRefereeRace.maxReferees} referees.`);
      return;
    }

    setIsAssigningReferee(true);
    setError(null);

    try {
      const createdAssignment = await tournamentService.assignReferee(raceId, refereeId, refereeRole);
      const selectedRefereeUserId = Number(selectedReferee?.userId);
      const nextAssignment: RefereeAssignmentItem = {
        ...createdAssignment,
        raceId: createdAssignment.raceId ?? raceId,
        raceName: createdAssignment.raceName ?? selectedRefereeRace?.name,
        refereeId: createdAssignment.refereeId ?? refereeId,
        refereeUserId: createdAssignment.refereeUserId ?? (Number.isFinite(selectedRefereeUserId) ? selectedRefereeUserId : undefined),
        refereeUsername: createdAssignment.refereeUsername ?? selectedReferee?.username,
        refereeFullName: createdAssignment.refereeFullName ?? selectedReferee?.fullName,
        refereeRole: createdAssignment.refereeRole ?? refereeRole,
        assignedAt: createdAssignment.assignedAt ?? new Date().toISOString(),
      };

      const nextRefereeCount = refereeList.length + 1;
      setRefereeList((current) => [...current, nextAssignment]);
      setRefereeForm(emptyRefereeForm);
      setRaces((current) =>
        current.map((race) =>
          race.raceId === raceId
            ? {
                ...race,
                assignedRefereeCount: nextRefereeCount,
              }
            : race,
        ),
      );
      setSelectedRefereeRace((current) =>
        current?.raceId === raceId ? { ...current, assignedRefereeCount: nextRefereeCount } : current,
      );
      setNotice({ tone: 'success', text: createdAssignment.responseMessage || 'Referee assigned successfully.' });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to assign referee.'));
    } finally {
      setIsAssigningReferee(false);
    }
  };

  const handleFieldChange = <K extends keyof AdminRaceFormData>(field: K, value: AdminRaceFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handlePointRuleChange = <K extends keyof PointRuleRequest>(
    index: number,
    field: K,
    value: PointRuleRequest[K],
  ) => {
    setPointRules((current) =>
      current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, [field]: value } : rule)),
    );
    setPointRuleErrors((current) =>
      current.map((error, errorIndex) => (errorIndex === index ? { ...error, [field]: undefined } : error)),
    );
    setPointRuleListError('');
  };

  const handleAddPointRule = () => {
    setPointRules((current) => [...current, createNextPointRule(current)]);
    setPointRuleErrors((current) => [...current, {}]);
    setPointRuleListError('');
  };

  const handleRemovePointRule = (index: number) => {
    if (!pointRules[index]) {
      return;
    }

    if (pointRules.length === 1) {
      setPointRuleListError('At least one point rule is required.');
      return;
    }

    setPointRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
    setPointRuleErrors((current) => current.filter((_, errorIndex) => errorIndex !== index));
    setPointRuleListError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedScheduleId) {
      setNotice({ tone: 'error', text: 'Select a schedule before saving a race.' });
      return;
    }

    const errors = validateRaceForm(formData, editingRace);
    const pointRuleValidation = validatePointRules(pointRules);
    setFormErrors(errors);
    setPointRuleErrors(pointRuleValidation.errors);
    setPointRuleListError(pointRuleValidation.listError);

    if (Object.keys(errors).length > 0 || pointRuleValidation.hasErrors) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const pointRulePayload = toPointRulePayload(pointRules);

      let successText: string;

      if (editingRace) {
        const updatedRace = await adminScheduleRaceApi.updateRace(editingRace.raceId, formData);
        let pointRuleResult;

        try {
          pointRuleResult = await pointRuleService.replacePointRules(
            updatedRace.raceId || editingRace.raceId,
            pointRulePayload,
          );
        } catch (pointRuleError) {
          const pointRuleErrorText = getApiErrorMessage(pointRuleError, 'Unable to replace point rules.');
          setPointRuleListError(pointRuleErrorText);
          await loadRaces();
          setNotice({ tone: 'error', text: `Race details were updated, but point rules were not replaced. ${pointRuleErrorText}` });
          return;
        }
        successText = [updatedRace.responseMessage, pointRuleResult.responseMessage].filter(Boolean).join('\n') || 'Race updated successfully.';
      } else {
        const createdRace = await adminScheduleRaceApi.createRace(selectedScheduleId, formData);
        const pointRuleResult = await pointRuleService.createPointRules(createdRace.raceId, pointRulePayload);
        successText = [createdRace.responseMessage, pointRuleResult.responseMessage].filter(Boolean).join('\n') || 'Race created successfully.';
      }

      closeFormModal();
      await loadRaces();
      setNotice({ tone: 'success', text: successText });
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to save race.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRaceAction = async (race: AdminRaceItem, action: RaceAction) => {
    const labels: Record<RaceAction, string> = {
      openBetting: 'open betting for',
      cancel: 'cancel',
    };

    setActionRaceId(race.raceId);
    setNotice(null);

    try {
      let successText: string;

      if (action === 'openBetting') {
        successText = await adminScheduleRaceApi.openBetting(race.raceId) || `Race "${race.name}" is now open for betting.`;
      } else {
        successText = await adminScheduleRaceApi.cancelRace(race.raceId) || `Race "${race.name}" cancelled successfully.`;
      }

      await loadRaces();

      setPendingRaceAction(null);
      setRaceActionSuccess({ action, raceName: race.name, text: successText });
    } catch (error) {
      const detail = getApiErrorMessage(error, `Unable to ${labels[action]} race.`);
      setNotice({
        tone: 'error',
        text: action === 'openBetting'
          ? `Could not open betting for "${race.name}".\n${detail}`
          : detail,
      });
    } finally {
      setActionRaceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="admin-surface-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Races</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Races</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Select a tournament and schedule before creating races. Race actions stay scoped to the selected schedule.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[680px] xl:grid-cols-4">
              <MetricCard icon={<Flag className="h-4 w-4" />} label="Races" value={isRaceLoading ? '...' : String(scheduleRaces.length).padStart(2, '0')} />
              <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Scheduled" value={isRaceLoading ? '...' : String(stats.scheduled).padStart(2, '0')} />
              <MetricCard icon={<Activity className="h-4 w-4" />} label="Ongoing" value={isRaceLoading ? '...' : String(stats.ongoing).padStart(2, '0')} />
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Completed" value={isRaceLoading ? '...' : String(stats.completed).padStart(2, '0')} />
            </div>
          </div>
        </section>

        {notice && <StatusBanner tone={notice.tone} text={notice.text} />}

        <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="admin-surface-panel flex-1 rounded-xl p-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[210px_210px_minmax(220px,1fr)_180px_140px]">
              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value ? Number(event.target.value) : '')}
                  disabled={isTournamentLoading}
                  aria-label="Select tournament"
                  className={filterInputClassName}
                >
                  <option value="">{isTournamentLoading ? 'Loading tournaments...' : 'Select tournament'}</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.tournamentId} value={tournament.tournamentId}>
                      {tournament.tournamentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={selectedScheduleId}
                  onChange={(event) => setSelectedScheduleId(event.target.value ? Number(event.target.value) : '')}
                  disabled={!selectedTournamentId || isScheduleLoading}
                  aria-label="Select schedule"
                  className={filterInputClassName}
                >
                  <option value="">{isScheduleLoading ? 'Loading schedules...' : 'Select schedule'}</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.scheduleId} value={schedule.scheduleId}>
                      Day {schedule.dayNumber} - {schedule.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search races..."
                className={filterInputClassName}
              />
            </div>

              <div className="relative">
                <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as RaceStatusFilter)}
                  className={filterInputClassName}
              aria-label="Filter race status"
            >
              {statusFilterOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

              <button
                type="button"
                onClick={() => {
                  void loadSchedules();
                  void loadRaces();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!selectedScheduleId || isScheduleLoading}
            className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Create Race
          </button>
        </section>

        <section className="admin-surface-panel overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Race</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Schedule</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Scheduled At</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Distance</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Capacity</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isRaceLoading && filteredRaces.map((race) => (
                  <tr key={race.raceId} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{race.name}</p>
                      <p className="mt-1 text-label-sm font-semibold text-outline">
                        Race #{race.raceNumber} / Group {race.rankGroup}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-semibold text-on-surface-variant">{race.scheduleTitle ?? selectedSchedule?.title ?? '-'}</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">{race.tournamentName ?? selectedTournament?.tournamentName ?? '-'}</p>
                    </td>
                    <td className="px-5 py-4 text-body-sm font-semibold text-on-surface-variant">{formatDateTime(race.scheduledAt)}</td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{race.distanceM}m</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">{race.trackType || '-'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{race.registeredHorseCount ?? 0}/{race.maxHorses} horses</p>
                      <p className="mt-1 text-label-sm text-on-surface-variant">{race.assignedRefereeCount ?? 0}/{race.maxReferees} refs</p>
                    </td>
                    <td className="px-5 py-4">
                      <RaceStatusBadge status={race.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton label={`Edit ${race.name}`} onClick={() => void openEditModal(race)} disabled={actionRaceId === race.raceId}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={canAssignReferee(race.status) ? `Manage referees for ${race.name}` : `${race.name} cannot assign referees from ${race.status}`}
                          onClick={() => openRefereeModal(race)}
                          disabled={actionRaceId === race.raceId || !canAssignReferee(race.status)}
                        >
                          <Users className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={canOpenBetting(race.status) ? `Open betting for ${race.name}` : `${race.name} cannot open betting from ${race.status}`}
                          onClick={() => openRaceActionConfirmation(race, 'openBetting')}
                          disabled={actionRaceId === race.raceId || !canOpenBetting(race.status)}
                        >
                          <BadgeDollarSign className="h-4 w-4" />
                        </IconButton>

                        <IconButton label={`Cancel ${race.name}`} onClick={() => openRaceActionConfirmation(race, 'cancel')} disabled={actionRaceId === race.raceId} danger>
                          <Ban className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isRaceLoading || filteredRaces.length === 0) && (
            <EmptyState
              title={isRaceLoading ? 'Loading races' : 'No races found'}
              description={
                isRaceLoading
                  ? 'Fetching races from the selected tournament.'
                  : selectedScheduleId
                    ? 'No race matches the current schedule and filters.'
                    : 'Select a schedule before managing races.'
              }
            />
          )}
        </section>

        {isFormOpen && (
          <Modal
            title={editingRace ? 'Edit race' : 'Create race'}
            subtitle={editingRace ? `Race #${editingRace.raceNumber}` : selectedSchedule?.title ?? 'New race'}
            onClose={closeFormModal}
          >
            <RaceForm
              formData={formData}
              formErrors={formErrors}
              raceNumberOptions={availableRaceNumbers}
              pointRules={pointRules}
              pointRuleErrors={pointRuleErrors}
              pointRuleListError={pointRuleListError}
              isSaving={isSaving}
              isPointRulesLoading={isPointRulesLoading}
              isEditing={Boolean(editingRace)}
              onSubmit={handleSubmit}
              onChange={handleFieldChange}
              onPointRuleChange={handlePointRuleChange}
              onAddPointRule={handleAddPointRule}
              onRemovePointRule={handleRemovePointRule}
              onCancel={closeFormModal}
            />
          </Modal>
        )}

        {selectedRefereeRace && (
          <Modal
            title="Manage referees"
            subtitle={`Race #${selectedRefereeRace.raceNumber} / ${selectedRefereeRace.name}`}
            onClose={closeRefereeModal}
          >
            <RefereeAssignmentPanel
              race={selectedRefereeRace}
              refereeList={refereeList}
              refereeOptions={refereeOptions}
              formData={refereeForm}
              loading={loading}
              isRefereeOptionsLoading={isRefereeOptionsLoading}
              error={error}
              isAssigning={isAssigningReferee}
              onSubmit={handleAssignReferee}
              onChange={handleRefereeFormChange}
              onRefresh={() => void fetchRefereeList()}
              onCancel={closeRefereeModal}
            />
          </Modal>
        )}

        {pendingRaceAction && (
          <RaceActionConfirmationModal
            action={pendingRaceAction.action}
            race={pendingRaceAction.race}
            isProcessing={actionRaceId === pendingRaceAction.race.raceId}
            onConfirm={() => void handleRaceAction(pendingRaceAction.race, pendingRaceAction.action)}
            onClose={() => {
              if (actionRaceId === null) {
                setPendingRaceAction(null);
              }
            }}
          />
        )}

        {raceActionSuccess && (
          <RaceActionSuccessModal
            result={raceActionSuccess}
            onClose={() => setRaceActionSuccess(null)}
          />
        )}
      </div>
    </div>
  );
};

const filterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none';

const inputClassName =
  'w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 p-3">
    <div className="flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display mt-2 truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: Notice) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`mb-6 whitespace-pre-wrap break-words rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}
  >
    {text}
  </div>
);

const RaceStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getRaceStatusClassName(status)}`}>
    {status || '-'}
  </span>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <Search className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
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
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex h-9 w-9 items-center justify-center rounded-md border bg-surface-container-low text-on-surface-variant transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      danger ? 'border-error/30 hover:border-error hover:text-error' : 'border-outline-variant hover:border-primary hover:text-primary'
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
  maxWidthClassName = 'max-w-5xl',
  closeDisabled = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
  closeDisabled?: boolean;
}) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8" role="presentation">
    <div className={`mx-auto ${maxWidthClassName} rounded-lg border border-outline-variant bg-surface-container shadow-xl`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
        <div>
          <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
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

const raceActionCopy: Record<RaceAction, {
  title: string;
  question: string;
  description: string;
  confirmLabel: string;
  processingLabel: string;
  successTitle: string;
}> = {
  openBetting: {
    title: 'Open Betting',
    question: 'Open betting for this race?',
    description: 'The race will move from Ready to Open for Betting and betting options will be generated for spectators.',
    confirmLabel: 'Open Betting',
    processingLabel: 'Opening...',
    successTitle: 'Betting Opened',
  },
  cancel: {
    title: 'Cancel Race',
    question: 'Cancel this race?',
    description: 'The race will move to Cancelled and no further race operations should be performed.',
    confirmLabel: 'Cancel Race',
    processingLabel: 'Cancelling...',
    successTitle: 'Race Cancelled',
  },
};

const RaceActionConfirmationModal = ({
  action,
  race,
  isProcessing,
  onConfirm,
  onClose,
}: {
  action: RaceAction;
  race: AdminRaceItem;
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const copy = raceActionCopy[action];
  const isCancelAction = action === 'cancel';
  const ActionIcon = isCancelAction ? Ban : BadgeDollarSign;
  const iconClassName = isCancelAction
    ? 'bg-error-container/30 text-error'
    : 'bg-secondary/10 text-secondary';
  const confirmButtonClassName = isCancelAction
    ? 'border-error/40 text-error hover:border-error hover:bg-error-container/20'
    : 'border-secondary/40 bg-secondary text-on-secondary hover:bg-opacity-90';

  return (
    <Modal
      title={copy.title}
      subtitle={`Race #${race.raceNumber} / ${race.name}`}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      closeDisabled={isProcessing}
    >
      <div className="space-y-6 p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconClassName}`}>
            <ActionIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-body-lg font-bold text-on-surface">{copy.question}</h3>
            <p className="mt-2 text-body-sm leading-6 text-on-surface-variant">{copy.description}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep Race
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-6 py-3 text-body-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClassName}`}
          >
            <ActionIcon className={`h-4 w-4 ${isProcessing ? 'animate-pulse' : ''}`} />
            {isProcessing ? copy.processingLabel : copy.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const RaceActionSuccessModal = ({ result, onClose }: { result: RaceActionSuccess; onClose: () => void }) => {
  const copy = raceActionCopy[result.action];

  return (
    <Modal
      title={copy.successTitle}
      subtitle={result.raceName}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-6 p-6">
        <div className="flex items-start gap-4" role="status">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="min-w-0 whitespace-pre-wrap break-words pt-2 text-body-sm leading-6 text-on-surface-variant">
            {result.text}
          </p>
        </div>

        <div className="flex justify-end border-t border-outline-variant pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-colors hover:bg-opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const RaceForm = ({
  formData,
  formErrors,
  raceNumberOptions,
  pointRules,
  pointRuleErrors,
  pointRuleListError,
  isSaving,
  isPointRulesLoading,
  isEditing,
  onSubmit,
  onChange,
  onPointRuleChange,
  onAddPointRule,
  onRemovePointRule,
  onCancel,
}: {
  formData: AdminRaceFormData;
  formErrors: RaceFormErrors;
  raceNumberOptions: number[];
  pointRules: PointRuleFormData[];
  pointRuleErrors: PointRuleFormErrors[];
  pointRuleListError: string;
  isSaving: boolean;
  isPointRulesLoading: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof AdminRaceFormData>(field: K, value: AdminRaceFormData[K]) => void;
  onPointRuleChange: <K extends keyof PointRuleRequest>(index: number, field: K, value: PointRuleRequest[K]) => void;
  onAddPointRule: () => void;
  onRemovePointRule: (index: number) => void;
  onCancel: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-6 p-6">
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Race Name" error={formErrors.name}>
        <input type="text" value={formData.name} onChange={(event) => onChange('name', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Race Number" error={formErrors.raceNumber}>
        <select value={formData.raceNumber} onChange={(event) => onChange('raceNumber', Number(event.target.value))} className={inputClassName}>
          {raceNumberOptions.map((raceNumber) => (
            <option key={raceNumber} value={raceNumber}>Race {raceNumber}</option>
          ))}
        </select>
      </Field>
      <Field label="Rank Group" error={formErrors.rankGroup}>
        <select value={formData.rankGroup} onChange={(event) => onChange('rankGroup', event.target.value as RaceRankGroup)} className={inputClassName}>
          {rankGroupOptions.map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </Field>
      <Field label="Scheduled At" error={formErrors.scheduledAt}>
        <input type="datetime-local" value={formData.scheduledAt} readOnly className={`${inputClassName} cursor-not-allowed opacity-80`} />
      </Field>
      <Field label="Prediction Closes At">
        <input type="datetime-local" value={formData.predictionClosesAt} onChange={(event) => onChange('predictionClosesAt', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Distance (m)" error={formErrors.distanceM}>
        <input type="number" min="1" value={formData.distanceM || ''} onChange={(event) => onChange('distanceM', Number(event.target.value))} className={inputClassName} />
      </Field>
      <Field label="Lap Count" error={formErrors.lapCount}>
        <input type="number" min="1" value={formData.lapCount || ''} onChange={(event) => onChange('lapCount', Number(event.target.value))} className={inputClassName} />
      </Field>
      <Field label="Max Horses" error={formErrors.maxHorses}>
        <input type="number" min="1" value={formData.maxHorses || ''} onChange={(event) => onChange('maxHorses', Number(event.target.value))} className={inputClassName} />
      </Field>
      <Field label="Max Referees" error={formErrors.maxReferees}>
        <input type="number" min="1" value={formData.maxReferees || ''} onChange={(event) => onChange('maxReferees', Number(event.target.value))} className={inputClassName} />
      </Field>
      <div className="md:col-span-2 xl:col-span-3">
        <Field label="Track Type">
          <div className="relative">
            <Gauge className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
            <select
              value={formData.trackType}
              onChange={(event) => onChange('trackType', event.target.value)}
              className={`${inputClassName} pl-10`}
            >
              {trackTypeOptions.map((trackType) => (
                <option key={trackType} value={trackType}>{trackType}</option>
              ))}
            </select>
          </div>
        </Field>
      </div>
    </div>

    <PointRulesEditor
      rules={pointRules}
      errors={pointRuleErrors}
      listError={pointRuleListError}
      isLoading={isPointRulesLoading}
      isSaving={isSaving}
      onChange={onPointRuleChange}
      onAdd={onAddPointRule}
      onRemove={onRemovePointRule}
    />

    <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving || isPointRulesLoading}
        className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Race'}
      </button>
    </div>
  </form>
);

const RefereeAssignmentPanel = ({
  race,
  refereeList,
  refereeOptions,
  formData,
  loading,
  isRefereeOptionsLoading,
  error,
  isAssigning,
  onSubmit,
  onChange,
  onRefresh,
  onCancel,
}: {
  race: AdminRaceItem;
  refereeList: RefereeAssignmentItem[];
  refereeOptions: AdminRefereeOption[];
  formData: RefereeAssignmentFormData;
  loading: boolean;
  isRefereeOptionsLoading: boolean;
  error: string | null;
  isAssigning: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof RefereeAssignmentFormData>(field: K, value: RefereeAssignmentFormData[K]) => void;
  onRefresh: () => void;
  onCancel: () => void;
}) => {
  const hasAssignableReferees = refereeOptions.some((referee) => referee.hasRefereeProfile);
  const isAtCapacity = refereeList.length >= race.maxReferees;
  const canAssign = canAssignReferee(race.status);

  return (
  <form onSubmit={onSubmit} className="space-y-6 p-6">
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <Field label="Referee">
        <select
          value={formData.refereeId || ''}
          onChange={(event) => onChange('refereeId', event.target.value ? Number(event.target.value) : '')}
          disabled={isRefereeOptionsLoading || refereeOptions.length === 0 || isAtCapacity || !canAssign}
          className={inputClassName}
        >
          <option value="">
            {isRefereeOptionsLoading
              ? 'Loading referees...'
              : refereeOptions.length > 0
                ? hasAssignableReferees
                  ? 'Select referee'
                  : 'No assignable referee profiles found'
                : 'No referee users found'}
          </option>
          {refereeOptions.map((referee) => {
            const refereeId = referee.refereeId;
            const isAssigned = refereeList.some((assignment) => assignment.refereeId === refereeId);
            const isMissingProfile = !referee.hasRefereeProfile;

            return (
              <option key={`${referee.userId ?? 'referee'}-${refereeId}`} value={refereeId} disabled={isAssigned || isMissingProfile}>
                {getRefereeOptionLabel(referee)}{isAssigned ? ' (assigned)' : ''}
              </option>
            );
          })}
        </select>
      </Field>
      <Field label="Referee Role">
        <select
          value={formData.refereeRole}
          onChange={(event) => onChange('refereeRole', event.target.value)}
          disabled={isAtCapacity || !canAssign}
          className={inputClassName}
        >
          <option value="">Select referee role</option>
          <option value="chief_referee">Chief referee</option>
          <option value="main_referee">Main referee</option>
        </select>
      </Field>
      <button
        type="submit"
        disabled={isAssigning || isRefereeOptionsLoading || isAtCapacity || !canAssign}
        className="inline-flex h-[46px] items-center justify-center gap-2 rounded-md bg-secondary px-5 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <UserPlus className="h-4 w-4" />
        {isAssigning ? 'Assigning...' : 'Assign'}
      </button>
    </div>

    {(error || isAtCapacity || !canAssign) && (
      <div role="alert" className="whitespace-pre-wrap break-words rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
        {error
          || (isAtCapacity
            ? `Referee capacity reached (${refereeList.length}/${race.maxReferees}). Increase Max Referees before assigning another referee.`
            : `Referees cannot be assigned while this race is ${race.status}.`)}
      </div>
    )}

    <section className="space-y-4 border-t border-outline-variant pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-body-lg font-bold text-primary">Assigned Referees</h3>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            {refereeList.length}/{race.maxReferees} referees assigned
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
          Loading referee assignments...
        </div>
      ) : refereeList.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-outline-variant">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Referee</th>
                <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Role</th>
                <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Assigned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {refereeList.map((assignment, index) => (
                <tr key={assignment.id ?? assignment.refAssignId ?? assignment.assignmentId ?? `${assignment.refereeId ?? 'referee'}-${index}`}>
                  <td className="px-4 py-3">
                    <p className="text-body-sm font-bold text-primary">
                      {assignment.refereeFullName ?? assignment.refereeUsername ?? `Referee ${assignment.refereeId ?? '-'}`}
                    </p>
                    <p className="mt-1 text-label-sm text-on-surface-variant">
                      ID {assignment.refereeId ?? '-'} / User {assignment.refereeUserId ?? '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
                    {formatRefereeRoleLabel(assignment.refereeRole, '-')}
                  </td>
                  <td className="px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
                    {formatDateTime(assignment.assignedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
          No referees assigned yet.
        </div>
      )}
    </section>

    <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Close
      </button>
    </div>
  </form>
  );
};

const PointRulesEditor = ({
  rules,
  errors,
  listError,
  isLoading,
  isSaving,
  onChange,
  onAdd,
  onRemove,
}: {
  rules: PointRuleFormData[];
  errors: PointRuleFormErrors[];
  listError: string;
  isLoading: boolean;
  isSaving: boolean;
  onChange: <K extends keyof PointRuleRequest>(index: number, field: K, value: PointRuleRequest[K]) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) => (
  <section className="space-y-4 border-t border-outline-variant pt-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="text-body-lg font-bold text-primary">Point Rules</h3>
      <button
        type="button"
        onClick={onAdd}
        disabled={isLoading || isSaving}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        Add rule
      </button>
    </div>

    {listError && (
      <div className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
        {listError}
      </div>
    )}

    {isLoading ? (
      <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm font-semibold text-on-surface-variant">
        Loading point rules...
      </div>
    ) : (
      <div className="overflow-x-auto rounded-md border border-outline-variant">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Finish Position</th>
              <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Points</th>
              <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Note</th>
              <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
            {rules.map((rule, index) => {
              const rowErrors = errors[index] ?? {};
              return (
                <tr key={rule.id ?? `${rule.finishPosition}-${index}`}>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      min="1"
                      value={rule.finishPosition || ''}
                      onChange={(event) => onChange(index, 'finishPosition', Number(event.target.value))}
                      className={inputClassName}
                    />
                    {rowErrors.finishPosition && <span className="mt-1 block text-label-md text-error">{rowErrors.finishPosition}</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="number"
                      min="0"
                      value={rule.points}
                      onChange={(event) => onChange(index, 'points', Number(event.target.value))}
                      className={inputClassName}
                    />
                    {rowErrors.points && <span className="mt-1 block text-label-md text-error">{rowErrors.points}</span>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="text"
                      value={rule.note}
                      onChange={(event) => onChange(index, 'note', event.target.value)}
                      className={inputClassName}
                    />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      disabled={isSaving || rules.length === 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-error/30 text-error transition-colors hover:border-error hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Remove point rule for position ${rule.finishPosition || index + 1}`}
                      title="Remove rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default AdminRacesPage;

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ClipboardCheck, ClipboardList, Eye, FileText, Flag, RefreshCw, Save, Send, ShieldCheck, Timer, Trophy, Users } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import {
  raceOperationsService,
  type ChiefInspectionRegistrationItem,
  type ChiefInspectionRequest,
  type ChiefRaceParticipantItem,
  type RaceResultWorkflowItem,
  type RefereeAssignedRaceItem,
  type RefereeReportFormData,
  type RefereeReportItem,
} from '../../services/raceOperationsService';
import { raceRoundService, type RaceRoundItem } from '../../services/raceRoundService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { formatRefereeRoleLabel } from '../../utils/permissions';

type LapTimeDraftMap = Record<string, string>;
type DisqualificationReasonMap = Record<string, string>;
type ResultView = 'overall' | string;
type ChiefInspectionAction = {
  status: ChiefInspectionRequest['status'];
  registration: ChiefInspectionRegistrationItem;
};
type OverallDisqualificationTarget = RaceResultWorkflowItem;

const initialReportForm: RefereeReportFormData = {
  reportType: 'inspection',
  inspectionNotes: '',
  violationNotes: '',
  resultNotes: '',
  verdict: 'clean',
};

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';
const MAIN_INSPECTION_REPORT_TYPE = 'inspection';
const MAIN_VIOLATION_REPORT_TYPE = 'violation';
const getMainReportType = (verdict?: string) => (normalizeStatus(verdict) === 'violation' ? MAIN_VIOLATION_REPORT_TYPE : MAIN_INSPECTION_REPORT_TYPE);
const getAssignmentId = (item: ChiefRaceParticipantItem | RaceResultWorkflowItem) => item.assignmentId ?? ('id' in item ? item.id : undefined) ?? 0;
const getRegistrationId = (item: ChiefInspectionRegistrationItem) => item.registrationId ?? item.regId ?? item.id ?? 0;
const getLapViewValue = (lap: number) => 'lap:' + lap;
const getLapDraftKey = (lap: number, assignmentId: number) => lap + ':' + assignmentId;
const TEMP_LAP_POSITION_OFFSET = 100000;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatRaceOptionLabel = (race: RefereeAssignedRaceItem) => {
  const tournament = race.tournamentName?.trim() || 'Tournament -';
  const scheduleDay = race.dayNumber
    ? 'Day ' + race.dayNumber
    : race.scheduleTitle?.trim() || (race.scheduleId ? 'Schedule #' + race.scheduleId : '') || formatDateTime(race.scheduledAt);
  return tournament + ' - ' + scheduleDay + ' - ' + race.raceName;
};

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return minutes > 0 ? minutes + ':' + seconds.toFixed(2).padStart(5, '0') : value.toFixed(2) + 's';
};

const formatSecondsInput = (value?: number | null) => (
  value === null || value === undefined || !Number.isFinite(value) ? '' : Number(value.toFixed(2)).toString()
);

const parseSecondsInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes(':')) {
    const [minutesPart, secondsPart] = trimmed.split(':');
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    return Number.isFinite(minutes) && Number.isFinite(seconds) ? Number((minutes * 60 + seconds).toFixed(2)) : undefined;
  }
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) && seconds > 0 ? Number(seconds.toFixed(2)) : undefined;
};

const formatStatusLabel = (status?: string) => {
  if (!status?.trim()) return '-';
  return status.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
};

const statusClassName = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'completed' || normalized === 'published') return 'border-secondary/30 bg-secondary/10 text-secondary';
  if (normalized === 'in_progress' || normalized === 'confirmed') return 'border-primary/30 bg-primary/10 text-primary';
  if (normalized === 'draft' || normalized === 'ready') return 'border-tertiary/30 bg-tertiary/10 text-tertiary';
  if (normalized === 'cancelled' || normalized === 'rejected' || normalized === 'disqualified') return 'border-error/30 bg-error-container/20 text-error';
  if (normalized === 'qualified' || normalized === 'approved') return 'border-secondary/30 bg-secondary/10 text-secondary';
  return 'border-outline-variant bg-surface-container text-on-surface-variant';
};

const isRegistrationClosedStatus = (status?: string) => normalizeStatus(status) === 'registration_closed';
const isOpenForBettingStatus = (status?: string) => ['open_for_betting', 'betting_open'].includes(normalizeStatus(status));
const isConfirmedStatus = (status?: string) => normalizeStatus(status) === 'confirmed';

const getInspectionWorkflowLabel = (registration: ChiefInspectionRegistrationItem) => {
  const registrationStatus = normalizeStatus(registration.status);
  const chiefStatus = normalizeStatus(registration.chiefInspectionStatus);

  if (registrationStatus === 'rejected' || chiefStatus === 'rejected') return 'Rejected';
  if (registrationStatus === 'approved') return 'Final approved';
  if (chiefStatus === 'approved') return 'Chief approved - waiting admin';
  if (!isConfirmedStatus(registration.ownerConfirmationStatus) || !isConfirmedStatus(registration.jockeyStatus)) return 'Pending jockey confirmation';
  return 'Waiting chief inspection';
};
const getStoredApprovedIds = (raceId: string) => {
  if (typeof window === 'undefined') return new Set<number>();
  try {
    const raw = window.localStorage.getItem('chief-participant-inspection:' + raceId);
    const ids = raw ? JSON.parse(raw) as unknown : [];
    return new Set(Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set<number>();
  }
};

const persistApprovedIds = (raceId: string, ids: Set<number>) => {
  if (typeof window === 'undefined' || !raceId) return;
  window.localStorage.setItem('chief-participant-inspection:' + raceId, JSON.stringify(Array.from(ids)));
};

const getStoredDisqualifiedIds = (raceId: string) => {
  if (typeof window === 'undefined') return new Set<number>();
  try {
    const raw = window.localStorage.getItem('chief-participant-disqualified:' + raceId);
    const ids = raw ? JSON.parse(raw) as unknown : [];
    return new Set(Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set<number>();
  }
};

const persistDisqualifiedIds = (raceId: string, ids: Set<number>) => {
  if (typeof window === 'undefined' || !raceId) return;
  window.localStorage.setItem('chief-participant-disqualified:' + raceId, JSON.stringify(Array.from(ids)));
};

const getStoredDisqualifyReasons = (raceId: string): DisqualificationReasonMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('chief-participant-disqualify-reasons:' + raceId);
    const reasons = raw ? JSON.parse(raw) as unknown : {};
    return reasons && typeof reasons === 'object' && !Array.isArray(reasons) ? reasons as DisqualificationReasonMap : {};
  } catch {
    return {};
  }
};

const persistDisqualifyReasons = (raceId: string, reasons: DisqualificationReasonMap) => {
  if (typeof window === 'undefined' || !raceId) return;
  window.localStorage.setItem('chief-participant-disqualify-reasons:' + raceId, JSON.stringify(reasons));
};
const RaceControlPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRaceId, setSelectedRaceId] = useState(() => searchParams.get('raceId') ?? '');
  const [assignedRaces, setAssignedRaces] = useState<RefereeAssignedRaceItem[]>([]);
  const [inspectionRegistrations, setInspectionRegistrations] = useState<ChiefInspectionRegistrationItem[]>([]);
  const [participants, setParticipants] = useState<ChiefRaceParticipantItem[]>([]);
  const [reports, setReports] = useState<RefereeReportItem[]>([]);
  const [draftResults, setDraftResults] = useState<RaceResultWorkflowItem[]>([]);
  const [draftStatus, setDraftStatus] = useState('');
  const [raceRounds, setRaceRounds] = useState<RaceRoundItem[]>([]);
  const [approvedAssignmentIds, setApprovedAssignmentIds] = useState<Set<number>>(() => new Set());
  const [disqualifiedAssignmentIds, setDisqualifiedAssignmentIds] = useState<Set<number>>(() => new Set());
  const [disqualifyReasons, setDisqualifyReasons] = useState<DisqualificationReasonMap>({});
  const [lapTimeDrafts, setLapTimeDrafts] = useState<LapTimeDraftMap>({});
  const [selectedView, setSelectedView] = useState<ResultView>('overall');
  const [reportForm, setReportForm] = useState<RefereeReportFormData>(initialReportForm);
  const [chiefFinalNotes, setChiefFinalNotes] = useState('');
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(true);
  const [isLoadingRaceData, setIsLoadingRaceData] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isStartConfirmOpen, setIsStartConfirmOpen] = useState(false);
  const [isResultConfirmOpen, setIsResultConfirmOpen] = useState(false);
  const [overallDisqualificationTarget, setOverallDisqualificationTarget] = useState<OverallDisqualificationTarget | null>(null);
  const [overallDisqualificationNote, setOverallDisqualificationNote] = useState('');
  const [overallDisqualificationError, setOverallDisqualificationError] = useState('');
  const [inspectionAction, setInspectionAction] = useState<ChiefInspectionAction | null>(null);
  const [inspectionNote, setInspectionNote] = useState('');
  const [inspectionError, setInspectionError] = useState('');
  const [isReportHistoryOpen, setIsReportHistoryOpen] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState<RefereeReportItem | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const normalizedRaceId = selectedRaceId.trim();
  const activeRace = useMemo(() => assignedRaces.find((race) => String(race.raceId) === normalizedRaceId), [assignedRaces, normalizedRaceId]);
  const refereeRole = normalizeStatus(activeRace?.refereeRole);
  const visibleRaceStatus = activeRace?.status ?? draftStatus;
  const activeRaceStatus = normalizeStatus(visibleRaceStatus);
  const isRegistrationClosedRace = isRegistrationClosedStatus(visibleRaceStatus);
  const isOpenForBettingRace = isOpenForBettingStatus(visibleRaceStatus);
  const hasRaceStarted = ['in_progress', 'in_process', 'running', 'started', 'completed', 'published'].includes(activeRaceStatus);
  const isChiefReferee = refereeRole === 'chief_referee';
  const isMainReferee = refereeRole === 'main_referee';
  const roleLabel = activeRace?.refereeRole ? formatRefereeRoleLabel(activeRace.refereeRole) : 'Referee';
  const draftByAssignment = useMemo(() => new Map(draftResults.map((result) => [result.assignmentId, result])), [draftResults]);
  const participantByAssignment = useMemo(() => new Map(participants.map((participant) => [getAssignmentId(participant), participant])), [participants]);
  const reviewedParticipants = useMemo(() => participants.filter((participant) => {
    const assignmentId = getAssignmentId(participant);
    return approvedAssignmentIds.has(assignmentId) || disqualifiedAssignmentIds.has(assignmentId);
  }), [approvedAssignmentIds, disqualifiedAssignmentIds, participants]);
  const pendingParticipants = useMemo(() => participants.filter((participant) => {
    const assignmentId = getAssignmentId(participant);
    return !approvedAssignmentIds.has(assignmentId) && !disqualifiedAssignmentIds.has(assignmentId);
  }), [approvedAssignmentIds, disqualifiedAssignmentIds, participants]);
  const inspectedRegistrationCount = inspectionRegistrations.filter((registration) => normalizeStatus(registration.chiefInspectionStatus)).length;
  const canStartRace = !isBusy && isChiefReferee && isOpenForBettingRace && !hasRaceStarted;
  const sortedDraftResults = useMemo(() => [...draftResults].sort((first, second) => (
    (first.finishPosition ?? Number.MAX_SAFE_INTEGER) - (second.finishPosition ?? Number.MAX_SAFE_INTEGER)
    || (first.finishTimeSec ?? Number.MAX_SAFE_INTEGER) - (second.finishTimeSec ?? Number.MAX_SAFE_INTEGER)
    || first.assignmentId - second.assignmentId
  )), [draftResults]);
  const lapNumbers = useMemo(() => {
    const maxLap = Math.max(
      0,
      activeRace?.lapCount ?? 0,
      ...raceRounds.map((round) => round.roundNumber).filter((round) => round > 0),
      ...raceRounds.map((round) => round.lapCount ?? 0).filter((count) => count > 0),
    );
    return maxLap > 0 ? Array.from({ length: maxLap }, (_, index) => index + 1) : [1];
  }, [activeRace?.lapCount, raceRounds]);
  const selectedLapNumber = selectedView.startsWith('lap:') ? Number(selectedView.replace('lap:', '')) : undefined;
  const selectedLapRows = useMemo(() => {
    if (!selectedLapNumber) return [];
    const lapRows = raceRounds
      .filter((round) => round.roundNumber === selectedLapNumber)
      .sort((first, second) => first.position - second.position);

    if (reviewedParticipants.length === 0) return lapRows;

    const lapRowByAssignment = new Map(lapRows.map((round) => [round.assignmentId, round]));
    return reviewedParticipants.map((participant) => {
      const assignmentId = getAssignmentId(participant);
      const savedRow = lapRowByAssignment.get(assignmentId);
      if (savedRow) {
        return {
          ...savedRow,
          horseId: savedRow.horseId ?? participant.horseId,
          horseName: savedRow.horseName ?? participant.horseName,
          jockeyId: savedRow.jockeyId ?? participant.jockeyId,
          jockeyFullName: savedRow.jockeyFullName ?? participant.jockeyFullName,
        };
      }

      return {
        roundId: -assignmentId,
        raceId: Number(normalizedRaceId) || participant.raceId || 0,
        assignmentId,
        horseId: participant.horseId,
        horseName: participant.horseName,
        jockeyId: participant.jockeyId,
        jockeyFullName: participant.jockeyFullName,
        roundNumber: selectedLapNumber,
        position: 0,
        lapTimeSec: undefined,
        recordedAt: undefined,
      };
    });
  }, [normalizedRaceId, raceRounds, reviewedParticipants, selectedLapNumber]);
  const overallDraftResults = useMemo(() => {
    if (reviewedParticipants.length === 0) return sortedDraftResults;

    const lapTotals = new Map<number, number>();
    raceRounds.forEach((round) => {
      if (round.assignmentId > 0 && round.lapTimeSec !== undefined && round.lapTimeSec > 0) {
        lapTotals.set(round.assignmentId, (lapTotals.get(round.assignmentId) ?? 0) + round.lapTimeSec);
      }
    });

    Object.entries(lapTimeDrafts).forEach(([key, value]) => {
      const [lapPart, assignmentPart] = key.split(':');
      const lapNumber = Number(lapPart);
      const assignmentId = Number(assignmentPart);
      const parsedTime = parseSecondsInput(value);
      const hasSavedRound = raceRounds.some((round) => round.roundNumber === lapNumber && round.assignmentId === assignmentId);
      if (!hasSavedRound && assignmentId > 0 && parsedTime !== undefined && parsedTime > 0) {
        lapTotals.set(assignmentId, (lapTotals.get(assignmentId) ?? 0) + parsedTime);
      }
    });

    const baseRows = reviewedParticipants.map((participant) => {
      const assignmentId = getAssignmentId(participant);
      const saved = draftByAssignment.get(assignmentId);
      const isDisqualified = disqualifiedAssignmentIds.has(assignmentId) || Boolean(saved?.isDisqualified);
      return {
        ...saved,
        assignmentId,
        raceId: participant.raceId ?? saved?.raceId,
        horseId: participant.horseId ?? saved?.horseId,
        horseName: participant.horseName ?? saved?.horseName,
        jockeyId: participant.jockeyId ?? saved?.jockeyId,
        jockeyFullName: participant.jockeyFullName ?? saved?.jockeyFullName,
        gateNumber: participant.gateNumber ?? saved?.gateNumber,
        finishPosition: saved?.finishPosition ?? null,
        finishTimeSec: isDisqualified ? null : lapTotals.get(assignmentId) ?? saved?.finishTimeSec ?? null,
        isDisqualified,
        disqualifyReason: disqualifyReasons[String(assignmentId)] || saved?.disqualifyReason,
        status: isDisqualified ? 'disqualified' : saved?.status ?? 'draft',
      };
    });
    const qualifiedRows = baseRows
      .filter((row) => !row.isDisqualified)
      .sort((first, second) => (first.finishTimeSec ?? Number.MAX_SAFE_INTEGER) - (second.finishTimeSec ?? Number.MAX_SAFE_INTEGER) || first.assignmentId - second.assignmentId)
      .map((row, index) => ({ ...row, finishPosition: row.finishTimeSec ? index + 1 : row.finishPosition ?? null }));
    const disqualifiedRows = baseRows.filter((row) => row.isDisqualified).map((row) => ({ ...row, finishPosition: null, finishTimeSec: null }));
    return [...qualifiedRows, ...disqualifiedRows];
  }, [disqualifiedAssignmentIds, disqualifyReasons, draftByAssignment, lapTimeDrafts, raceRounds, reviewedParticipants, sortedDraftResults]);
  const mainReports = useMemo(() => reports.filter((report) => normalizeStatus(report.refereeRole) === 'main_referee'), [reports]);
  const submittedReports = mainReports.length > 0 ? mainReports : reports;
  const handleSelectRace = useCallback((raceId: string) => {
    setSelectedRaceId(raceId);
    setSelectedView('overall');
    const nextParams = new URLSearchParams(searchParams);
    if (raceId.trim()) nextParams.set('raceId', raceId.trim());
    else nextParams.delete('raceId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadAssignedRaces = useCallback(async () => {
    setIsLoadingAssigned(true);
    setErrorMessage('');
    try {
      const data = await raceOperationsService.getAssignedRaces();
      setAssignedRaces(data);
      if (!normalizedRaceId && data.length > 0) handleSelectRace(String(data[0].raceId));
      return data;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load assigned races.'));
      return [];
    } finally {
      setIsLoadingAssigned(false);
    }
  }, [handleSelectRace, normalizedRaceId]);

  const loadRaceData = async (raceId: string, role: string, raceStatus = activeRaceStatus) => {
    if (!raceId) {
      setInspectionRegistrations([]);
      setParticipants([]);
      setReports([]);
      setDraftResults([]);
      setDraftStatus('');
      setRaceRounds([]);
      setDisqualifiedAssignmentIds(new Set());
      setDisqualifyReasons({});
      setLapTimeDrafts({});
      return;
    }

    const shouldLoadInspection = role === 'chief_referee' && isRegistrationClosedStatus(raceStatus);
    const shouldLoadParticipants = role === 'chief_referee' && !shouldLoadInspection;

    setIsLoadingRaceData(true);
    setErrorMessage('');
    try {
      const [reportData, draftData, roundData, participantData, inspectionData] = await Promise.all([
        raceOperationsService.getReports(raceId).catch(() => []),
        raceOperationsService.getDraft(raceId).catch(() => null),
        raceRoundService.getRoundsByRace(raceId).catch(() => []),
        shouldLoadParticipants ? raceOperationsService.getChiefParticipants(raceId).catch(() => []) : Promise.resolve([]),
        shouldLoadInspection ? raceOperationsService.getChiefInspectionRegistrations(raceId) : Promise.resolve([]),
      ]);
      const nextDraftResults = draftData?.results ?? [];
      const nextLapTimeDrafts = roundData.reduce<LapTimeDraftMap>((draftMap, item) => {
        draftMap[getLapDraftKey(item.roundNumber, item.assignmentId)] = formatSecondsInput(item.lapTimeSec);
        return draftMap;
      }, {});
      const storedApprovedIds = getStoredApprovedIds(raceId);
      const storedDisqualifiedIds = getStoredDisqualifiedIds(raceId);
      const storedReasons = getStoredDisqualifyReasons(raceId);
      nextDraftResults.forEach((result) => {
        if (result.isDisqualified) {
          storedDisqualifiedIds.add(result.assignmentId);
          if (result.disqualifyReason) storedReasons[String(result.assignmentId)] = result.disqualifyReason;
        } else {
          storedApprovedIds.add(result.assignmentId);
        }
      });
      setReports(reportData);
      setDraftResults(nextDraftResults);
      setDraftStatus(draftData?.status ?? '');
      setRaceRounds(roundData);
      setParticipants(participantData);
      setInspectionRegistrations(inspectionData);
      setLapTimeDrafts(nextLapTimeDrafts);
      setApprovedAssignmentIds(storedApprovedIds);
      setDisqualifiedAssignmentIds(storedDisqualifiedIds);
      setDisqualifyReasons(storedReasons);
      persistApprovedIds(raceId, storedApprovedIds);
      persistDisqualifiedIds(raceId, storedDisqualifiedIds);
      persistDisqualifyReasons(raceId, storedReasons);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load race control data.'));
      setInspectionRegistrations([]);
    } finally {
      setIsLoadingRaceData(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAssignedRaces(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAssignedRaces]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRaceData(normalizedRaceId, refereeRole, activeRaceStatus), 0);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedRaceId, refereeRole, activeRaceStatus]);
  const withBusy = async (work: () => Promise<void>) => {
    setIsBusy(true);
    setMessage('');
    setErrorMessage('');
    try {
      await work();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Request failed.'));
    } finally {
      setIsBusy(false);
    }
  };

  const approveParticipant = (participant: ChiefRaceParticipantItem) => {
    const assignmentId = getAssignmentId(participant);
    if (!assignmentId || !normalizedRaceId) return;
    setApprovedAssignmentIds((current) => {
      const next = new Set(current);
      next.add(assignmentId);
      persistApprovedIds(normalizedRaceId, next);
      return next;
    });
    setDisqualifiedAssignmentIds((current) => {
      const next = new Set(current);
      next.delete(assignmentId);
      persistDisqualifiedIds(normalizedRaceId, next);
      return next;
    });
  };

  const disqualifyParticipant = (participant: ChiefRaceParticipantItem) => {
    const assignmentId = getAssignmentId(participant);
    if (!assignmentId || !normalizedRaceId) return;
    setDisqualifiedAssignmentIds((current) => {
      const next = new Set(current);
      next.add(assignmentId);
      persistDisqualifiedIds(normalizedRaceId, next);
      return next;
    });
    setApprovedAssignmentIds((current) => {
      const next = new Set(current);
      next.delete(assignmentId);
      persistApprovedIds(normalizedRaceId, next);
      return next;
    });
  };

  const updateDisqualifyReason = (assignmentId: number, reason: string) => {
    if (!normalizedRaceId) return;
    setDisqualifyReasons((current) => {
      const next = { ...current, [String(assignmentId)]: reason };
      persistDisqualifyReasons(normalizedRaceId, next);
      return next;
    });
  };
  const openOverallDisqualification = (result: RaceResultWorkflowItem) => {
    if (result.isDisqualified) return;
    setOverallDisqualificationTarget(result);
    setOverallDisqualificationNote(disqualifyReasons[String(result.assignmentId)] || result.disqualifyReason || '');
    setOverallDisqualificationError('');
    setErrorMessage('');
  };

  const closeOverallDisqualification = () => {
    setOverallDisqualificationTarget(null);
    setOverallDisqualificationNote('');
    setOverallDisqualificationError('');
  };

  const confirmOverallDisqualification = () => {
    if (!overallDisqualificationTarget || !normalizedRaceId) return;

    const assignmentId = overallDisqualificationTarget.assignmentId;
    const trimmedNote = overallDisqualificationNote.trim();
    if (!assignmentId) {
      setOverallDisqualificationError('Assignment id is missing.');
      return;
    }
    if (!trimmedNote) {
      setOverallDisqualificationError('Disqualified note is required.');
      return;
    }

    setDisqualifiedAssignmentIds((current) => {
      const next = new Set(current);
      next.add(assignmentId);
      persistDisqualifiedIds(normalizedRaceId, next);
      return next;
    });
    setApprovedAssignmentIds((current) => {
      const next = new Set(current);
      next.delete(assignmentId);
      persistApprovedIds(normalizedRaceId, next);
      return next;
    });
    setDisqualifyReasons((current) => {
      const next = { ...current, [String(assignmentId)]: trimmedNote };
      persistDisqualifyReasons(normalizedRaceId, next);
      return next;
    });
    setDraftResults((current) => current.map((result) => (
      result.assignmentId === assignmentId
        ? { ...result, isDisqualified: true, finishPosition: null, finishTimeSec: null, disqualifyReason: trimmedNote, status: 'disqualified' }
        : result
    )));
    setMessage((overallDisqualificationTarget.horseName ?? 'Assignment #' + assignmentId) + ' marked as disqualified.');
    closeOverallDisqualification();
  };

  const openInspectionAction = (status: ChiefInspectionRequest['status'], registration: ChiefInspectionRegistrationItem) => {
    setInspectionAction({ status, registration });
    setInspectionNote('');
    setInspectionError('');
    setErrorMessage('');
  };

  const closeInspectionAction = () => {
    setInspectionAction(null);
    setInspectionNote('');
    setInspectionError('');
  };

  const handleInspectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inspectionAction || !normalizedRaceId) return;

    const registrationId = getRegistrationId(inspectionAction.registration);
    const trimmedNote = inspectionNote.trim();

    if (!registrationId) {
      setInspectionError('Registration id is missing.');
      return;
    }

    if (!trimmedNote) {
      setInspectionError('Inspection note is required.');
      return;
    }

    await withBusy(async () => {
      await raceOperationsService.inspectRegistration(normalizedRaceId, registrationId, {
        status: inspectionAction.status,
        note: trimmedNote,
      });
      const refreshedRaces = await loadAssignedRaces();
      const refreshedRace = refreshedRaces.find((race) => String(race.raceId) === normalizedRaceId);
      closeInspectionAction();
      setMessage(inspectionAction.status === 'approved' ? 'Horse inspection approved.' : 'Horse inspection rejected.');
      await loadRaceData(normalizedRaceId, refereeRole, normalizeStatus(refreshedRace?.status ?? activeRaceStatus));
    });
  };
  const handleRequestStartRace = () => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before starting it.');
      return;
    }
    if (!isOpenForBettingRace) {
      setErrorMessage('Admin must open betting before the Chief referee can start this race.');
      return;
    }
    if (hasRaceStarted) {
      setErrorMessage('This race has already started.');
      return;
    }
    setErrorMessage('');
    setIsStartConfirmOpen(true);
  };

  const handleStartRace = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before starting it.');
      return;
    }
    if (!isOpenForBettingRace) {
      setErrorMessage('Admin must open betting before the Chief referee can start this race.');
      return;
    }
    if (hasRaceStarted) {
      setErrorMessage('This race has already started.');
      setIsStartConfirmOpen(false);
      return;
    }
    const raceName = activeRace?.raceName ?? 'Race #' + normalizedRaceId;
    await withBusy(async () => {
      const response = await raceOperationsService.startChiefRace(normalizedRaceId, {
        forceCloseBetting: true,
        note: 'Chief referee started ' + raceName + ' after participant inspection.',
      });
      setIsStartConfirmOpen(false);
      setDraftStatus(response.status);
      setAssignedRaces((current) => current.map((race) => (String(race.raceId) === normalizedRaceId ? { ...race, status: response.status } : race)));
      setMessage(response.message || 'Race started.');
      await loadAssignedRaces();
      await loadRaceData(normalizedRaceId, refereeRole);
    });
  };
  const handleSaveDraft = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before saving draft results.');
      return;
    }
    if (!selectedLapNumber) {
      setErrorMessage('Open a Lap view to enter lap times. Overall is read-only.');
      return;
    }
    if (reviewedParticipants.length === 0) {
      setErrorMessage('Check at least one participant before saving lap results.');
      return;
    }

    const parsedRows = reviewedParticipants.map((participant) => {
      const assignmentId = getAssignmentId(participant);
      const isDisqualified = disqualifiedAssignmentIds.has(assignmentId);
      const lapTimeSec = isDisqualified ? undefined : parseSecondsInput(lapTimeDrafts[getLapDraftKey(selectedLapNumber, assignmentId)] ?? '');
      const disqualifyReason = disqualifyReasons[String(assignmentId)]?.trim();
      return { assignmentId, lapTimeSec, horseName: participant.horseName, isDisqualified, disqualifyReason };
    });
    const invalidRow = parsedRows.find((row) => !row.isDisqualified && (!row.assignmentId || row.lapTimeSec === undefined || row.lapTimeSec <= 0));
    if (invalidRow) {
      setErrorMessage('Enter a valid Lap ' + selectedLapNumber + ' time for ' + (invalidRow.horseName ?? 'assignment #' + invalidRow.assignmentId) + '.');
      return;
    }
    const invalidDisqualifiedRow = parsedRows.find((row) => row.isDisqualified && !row.disqualifyReason);
    if (invalidDisqualifiedRow) {
      setErrorMessage('Enter a disqualification reason for ' + (invalidDisqualifiedRow.horseName ?? 'assignment #' + invalidDisqualifiedRow.assignmentId) + '.');
      return;
    }

    await withBusy(async () => {
      const existingSelectedLapRows = raceRounds.filter((round) => round.roundNumber === selectedLapNumber && round.roundId > 0);
      const stagedLapRows = await Promise.all(existingSelectedLapRows.map((round) => (
        raceRoundService.updateRound(round.roundId, { position: TEMP_LAP_POSITION_OFFSET + round.roundId })
      )));
      const existingLapAssignmentIds = new Set(existingSelectedLapRows.map((round) => round.assignmentId));
      const stagedLapByAssignment = new Map(stagedLapRows.map((round) => [round.assignmentId, round]));
      const savedLapRows = await Promise.all(parsedRows
        .filter((row) => !row.isDisqualified && Boolean(row.assignmentId && row.lapTimeSec))
        .map((row) => ({ assignmentId: row.assignmentId, lapTimeSec: row.lapTimeSec as number }))
        .sort((first, second) => first.lapTimeSec - second.lapTimeSec)
        .map((row, index) => {
          const savedRound = raceRounds.find((round) => round.roundNumber === selectedLapNumber && round.assignmentId === row.assignmentId);
          const payload = {
            assignmentId: row.assignmentId,
            roundNumber: selectedLapNumber,
            position: index + 1,
            lapTimeSec: row.lapTimeSec,
          };
          return savedRound?.roundId && savedRound.roundId > 0
            ? raceRoundService.updateRound(savedRound.roundId, payload)
            : raceRoundService.createRound(payload);
        }));

      const savedLapByAssignment = new Map(savedLapRows.map((round) => [round.assignmentId, round]));
      const createdLapRows = savedLapRows.filter((round) => !existingLapAssignmentIds.has(round.assignmentId));
      const nextRaceRounds = [
        ...raceRounds.map((round) => {
          if (round.roundNumber !== selectedLapNumber) return round;
          return savedLapByAssignment.get(round.assignmentId) ?? stagedLapByAssignment.get(round.assignmentId) ?? round;
        }),
        ...createdLapRows,
      ].sort((first, second) => first.roundNumber - second.roundNumber || first.position - second.position || first.assignmentId - second.assignmentId);

      const totalTimes = new Map<number, number>();
      nextRaceRounds.forEach((round) => {
        if (round.assignmentId > 0 && round.lapTimeSec !== undefined && round.lapTimeSec > 0) {
          totalTimes.set(round.assignmentId, (totalTimes.get(round.assignmentId) ?? 0) + round.lapTimeSec);
        }
      });
      const qualifiedResults = parsedRows
        .filter((row) => !row.isDisqualified && Boolean(row.assignmentId && totalTimes.get(row.assignmentId)))
        .map((row) => ({ assignmentId: row.assignmentId, finishTimeSec: totalTimes.get(row.assignmentId) as number }))
        .sort((first, second) => first.finishTimeSec - second.finishTimeSec)
        .map((row, index) => ({ assignmentId: row.assignmentId, finishPosition: index + 1, finishTimeSec: row.finishTimeSec, isDisqualified: false, disqualifyReason: undefined }));
      const disqualifiedResults = parsedRows
        .filter((row) => row.isDisqualified && Boolean(row.assignmentId))
        .map((row) => ({ assignmentId: row.assignmentId, finishPosition: undefined, finishTimeSec: undefined, isDisqualified: true, disqualifyReason: row.disqualifyReason }));
      const results = [...qualifiedResults, ...disqualifiedResults];
      const nextDraft = draftResults.length > 0
        ? await raceOperationsService.updateDraft(normalizedRaceId, { results })
        : await raceOperationsService.createDraft(normalizedRaceId, { results });
      setRaceRounds(nextRaceRounds);
      setDraftResults(nextDraft.results);
      setDraftStatus(nextDraft.status);
      setMessage('Lap ' + selectedLapNumber + ' times saved. Overall draft was recalculated.');
      await loadRaceData(normalizedRaceId, refereeRole);
    });
  };
  const handleRequestConfirmResults = () => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before confirming results.');
      return;
    }
    if (draftResults.length === 0) {
      setErrorMessage('Save draft results before confirming.');
      return;
    }
    setErrorMessage('');
    setIsResultConfirmOpen(true);
  };

  const handleConfirmResults = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before confirming results.');
      return;
    }
    if (draftResults.length === 0) {
      setErrorMessage('Save draft results before confirming.');
      return;
    }
    await withBusy(async () => {
      const confirmed = await raceOperationsService.confirmChiefResults(normalizedRaceId);
      setIsResultConfirmOpen(false);
      setDraftResults(confirmed);
      setDraftStatus('confirmed');
      setMessage('Race results confirmed for Admin review.');
      await loadRaceData(normalizedRaceId, refereeRole);
    });
  };
  const handleSubmitMainReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before submitting a report.');
      return;
    }
    await withBusy(async () => {
      const created = await raceOperationsService.createReport(normalizedRaceId, {
        reportType: getMainReportType(reportForm.verdict),
        inspectionNotes: reportForm.inspectionNotes,
        violationNotes: reportForm.verdict === 'violation' ? reportForm.violationNotes : '',
        resultNotes: reportForm.resultNotes,
        verdict: reportForm.verdict,
      });
      setMessage('Report #' + created.reportId + ' submitted.');
      setReportForm(initialReportForm);
      await loadRaceData(normalizedRaceId, refereeRole);
    });
  };

  const handleSubmitChiefFinalReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before submitting a final report.');
      return;
    }
    if (!chiefFinalNotes.trim()) {
      setErrorMessage('Enter final report notes before submitting.');
      return;
    }
    await withBusy(async () => {
      const created = await raceOperationsService.createChiefFinalReport(normalizedRaceId, chiefFinalNotes);
      setMessage('Final report #' + created.reportId + ' submitted.');
      setChiefFinalNotes('');
      await loadRaceData(normalizedRaceId, refereeRole);
    });
  };

  const isUnsupportedReferee = Boolean(normalizedRaceId && !isChiefReferee && !isMainReferee && !isLoadingRaceData);

  return (
    <main className="min-h-screen bg-surface py-8 text-on-surface">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 md:px-8">
        <section className="glass-panel rounded-xl p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,430px)] xl:items-center">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-secondary/30 bg-secondary/10 px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-secondary">
                <ShieldCheck className="h-4 w-4" /> Referee race control
              </div>
              <h1 className="font-display text-headline-md font-extrabold text-primary md:text-headline-lg">{activeRace?.raceName ?? 'Select an assigned race'}</h1>
            </div>
            <div className="min-w-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <label className="text-label-sm font-bold uppercase tracking-wider text-outline" htmlFor="race-control-selector">Assigned race</label>
              <div className="mt-2 flex min-w-0 gap-2">
                <select id="race-control-selector" value={selectedRaceId} onChange={(event) => handleSelectRace(event.target.value)} disabled={isLoadingAssigned} className="w-full min-w-0 max-w-full flex-1 cursor-pointer truncate rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
                  <option value="">Select race</option>
                  {assignedRaces.map((race) => <option key={String(race.assignmentId ?? race.raceId) + '-' + String(race.refereeRole)} value={race.raceId}>{formatRaceOptionLabel(race)}</option>)}
                </select>
                <button type="button" onClick={() => void loadRaceData(normalizedRaceId, refereeRole)} disabled={isLoadingRaceData || !normalizedRaceId} className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50" aria-label="Refresh race data" title="Refresh">
                  <RefreshCw className={['h-4 w-4', isLoadingRaceData ? 'animate-spin' : ''].filter(Boolean).join(' ')} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {errorMessage && <div className="rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">{errorMessage}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={<Flag className="h-4 w-4" />} label="Race status" value={formatStatusLabel(visibleRaceStatus)} />
          <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Referee role" value={roleLabel} />
          <MetricCard icon={<Users className="h-4 w-4" />} label="Participants" value={isChiefReferee ? String(isRegistrationClosedRace ? inspectionRegistrations.length : participants.length) : String(draftResults.length)} />
          <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Reviewed" value={isChiefReferee ? (isRegistrationClosedRace ? inspectedRegistrationCount + '/' + inspectionRegistrations.length : reviewedParticipants.length + '/' + participants.length) : draftStatus || '-'} />
          <MetricCard icon={<FileText className="h-4 w-4" />} label="Reports" value={String(reports.length)} />
        </section>

        {!normalizedRaceId && <EmptyState title="No race selected" description="Choose one assigned race to open the Chief or Main referee workflow." />}
        {isUnsupportedReferee && <EmptyState title="No Chief/Main assignment" description="This race is assigned to a referee role that does not have a dedicated workflow on this screen." />}
        {normalizedRaceId && isChiefReferee && (
          <div className="grid gap-6">
            {isRegistrationClosedRace ? (
              <section className="glass-panel rounded-xl p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <SectionTitle icon={<ClipboardCheck className="h-5 w-5" />} eyebrow="Chief referee" title="Horse inspection" />
                  <StatusBadge status={visibleRaceStatus} />
                </div>
                <ChiefInspectionTable
                  registrations={inspectionRegistrations}
                  isLoading={isLoadingRaceData}
                  isBusy={isBusy}
                  onApprove={(registration) => openInspectionAction('approved', registration)}
                  onReject={(registration) => openInspectionAction('rejected', registration)}
                />
              </section>
            ) : (
              <>
                <section className="glass-panel rounded-xl p-5 md:p-6">
                  <SectionTitle icon={<ClipboardCheck className="h-5 w-5" />} eyebrow="Chief referee" title="Race start" />
                  <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {pendingParticipants.map((participant) => {
                      const assignmentId = getAssignmentId(participant);
                      return (
                        <ParticipantCard
                          key={assignmentId}
                          participant={participant}
                          disqualifyReason={disqualifyReasons[String(assignmentId)] ?? ''}
                          onReasonChange={(value) => updateDisqualifyReason(assignmentId, value)}
                          onPass={() => approveParticipant(participant)}
                          onDisqualify={() => disqualifyParticipant(participant)}
                        />
                      );
                    })}
                    {pendingParticipants.length === 0 && <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 text-body-sm font-semibold text-secondary">Final approved participants are ready for race operations.</div>}
                  </div>
                  <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-body-sm text-on-surface-variant">Chief start is available after Admin opens betting. Current race status: <StatusBadge status={visibleRaceStatus} /></p>
                    <button type="button" onClick={handleRequestStartRace} disabled={!canStartRace} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant disabled:opacity-80"><Flag className="h-4 w-4" /> {hasRaceStarted ? 'Race started' : 'Start race'}</button>
                  </div>
                </section>

                <section className="glass-panel rounded-xl p-5 md:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <SectionTitle icon={<Trophy className="h-5 w-5" />} eyebrow="Draft result" title="Checked horses" />
                    <ResultViewSelect value={selectedView} lapNumbers={lapNumbers} onChange={setSelectedView} />
                  </div>
                  {selectedView === 'overall' ? (
                    <ReadOnlyResultTable results={overallDraftResults} isActionDisabled={isBusy || isLoadingRaceData} onDisqualify={openOverallDisqualification} />
                  ) : (
                    <ChiefLapDraftTable rows={selectedLapRows} participantByAssignment={participantByAssignment} disqualifiedAssignmentIds={disqualifiedAssignmentIds} disqualifyReasons={disqualifyReasons} lapTimeDrafts={lapTimeDrafts} isBusy={isBusy || isLoadingRaceData} onLapTimeChange={(lapNumber, assignmentId, value) => setLapTimeDrafts((current) => ({ ...current, [getLapDraftKey(lapNumber, assignmentId)]: value }))} />
                  )}
                  <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-outline-variant pt-4">
                    <button type="button" onClick={() => void handleSaveDraft()} disabled={isBusy || !selectedLapNumber || reviewedParticipants.length === 0} className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button>
                    <button type="button" onClick={handleRequestConfirmResults} disabled={isBusy || draftResults.length === 0} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/40 px-5 py-3 text-body-sm font-bold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Confirm result</button>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <article className="glass-panel rounded-xl p-5 md:p-6">
                    <SectionTitle icon={<Eye className="h-5 w-5" />} eyebrow="Main referee" title="Submitted reports" />
                    <ReportTable reports={submittedReports} onViewDetail={setSelectedReportDetail} />
                  </article>
                  <article className="glass-panel rounded-xl p-5 md:p-6">
                    <SectionTitle icon={<Send className="h-5 w-5" />} eyebrow="Admin handoff" title="Final report" />
                    <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmitChiefFinalReport(event)}>
                      <TextArea label="Final notes" value={chiefFinalNotes} onChange={setChiefFinalNotes} placeholder="Race completion summary for Admin" />
                      <button type="submit" disabled={isBusy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /> Submit final report</button>
                    </form>
                  </article>
                </section>
              </>
            )}
          </div>
        )}
        {normalizedRaceId && isMainReferee && (
          <div className="grid gap-6">
            <section className="glass-panel rounded-xl p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <SectionTitle icon={<Timer className="h-5 w-5" />} eyebrow="Main referee" title="Chief saved result" />
                <ResultViewSelect value={selectedView} lapNumbers={lapNumbers} onChange={setSelectedView} />
              </div>
              {selectedView === 'overall' ? <ReadOnlyResultTable results={sortedDraftResults} /> : <LapResultTable rows={selectedLapRows} />}
            </section>

            <section className="glass-panel rounded-xl p-5 md:p-6">
              <SectionTitle icon={<ClipboardList className="h-5 w-5" />} eyebrow="Race report" title="Submit report" />
              <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmitMainReport(event)}>
                <SelectInput label="Report type" value={reportForm.reportType ?? getMainReportType(reportForm.verdict)} options={[{ value: MAIN_INSPECTION_REPORT_TYPE, label: 'Inspection report' }, { value: MAIN_VIOLATION_REPORT_TYPE, label: 'Violation report' }]} onChange={(value) => setReportForm((current) => ({ ...current, reportType: value, verdict: value === MAIN_VIOLATION_REPORT_TYPE ? 'violation' : 'clean', violationNotes: value === MAIN_VIOLATION_REPORT_TYPE ? current.violationNotes : '' }))} />
                <SelectInput label="Verdict" value={reportForm.verdict ?? 'clean'} options={[{ value: 'clean', label: 'Clean - no violation' }, { value: 'violation', label: 'Violation detected' }]} onChange={(value) => setReportForm((current) => ({ ...current, reportType: getMainReportType(value), verdict: value, violationNotes: value === 'violation' ? current.violationNotes : '' }))} />
                <TextArea label="Inspection notes" value={reportForm.inspectionNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, inspectionNotes: value }))} />
                {reportForm.verdict === 'violation' && <TextArea label="Violation notes" value={reportForm.violationNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, violationNotes: value }))} />}
                <TextArea label="Result notes" value={reportForm.resultNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, resultNotes: value }))} />
                <button type="submit" disabled={isBusy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-body-sm font-bold text-on-primary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /> Submit report</button>
              </form>
              <div className="mt-6 flex justify-end border-t border-outline-variant pt-5">
                <button type="button" onClick={() => setIsReportHistoryOpen(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-primary transition-colors hover:border-primary hover:bg-primary/10">
                  <Eye className="h-4 w-4" /> View report history
                </button>
              </div>
            </section>
          </div>
        )}
        {selectedReportDetail && (
          <ModalPortal>
            <section className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="submitted-report-detail-title">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle icon={<Eye className="h-5 w-5" />} eyebrow="Submitted reports" title={'Report #' + selectedReportDetail.reportId} />
                <button type="button" onClick={() => setSelectedReportDetail(null)} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary">Close</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ReportDetailField label="Report type">{formatStatusLabel(selectedReportDetail.reportType)}</ReportDetailField>
                <ReportDetailField label="Verdict"><StatusBadge status={selectedReportDetail.verdict} /></ReportDetailField>
                <ReportDetailField label="Referee">{selectedReportDetail.refereeFullName ?? '-'}</ReportDetailField>
                <ReportDetailField label="Role">{formatRefereeRoleLabel(selectedReportDetail.refereeRole)}</ReportDetailField>
                <ReportDetailField label="Race">{selectedReportDetail.raceName ?? '-'}</ReportDetailField>
                <ReportDetailField label="Submitted">{formatDateTime(selectedReportDetail.submittedAt)}</ReportDetailField>
              </div>
              <div className="mt-5 grid gap-4">
                <ReportDetailNote label="Inspection notes" value={selectedReportDetail.inspectionNotes} />
                <ReportDetailNote label="Violation notes" value={selectedReportDetail.violationNotes} />
                <ReportDetailNote label="Result notes" value={selectedReportDetail.resultNotes} />
              </div>
            </section>
          </ModalPortal>
        )}
        {isReportHistoryOpen && (
          <ModalPortal>
            <section className="max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="report-history-title">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle icon={<FileText className="h-5 w-5" />} eyebrow="Report history" title="Recent reports" />
                <button type="button" onClick={() => setIsReportHistoryOpen(false)} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary">Close</button>
              </div>
              <ReportTable reports={reports} />
            </section>
          </ModalPortal>
        )}

        {inspectionAction && (
          <ChiefInspectionActionModal
            action={inspectionAction}
            note={inspectionNote}
            error={inspectionError}
            isBusy={isBusy}
            onNoteChange={setInspectionNote}
            onSubmit={handleInspectionSubmit}
            onClose={closeInspectionAction}
          />
        )}
        {overallDisqualificationTarget && (
          <OverallDisqualificationModal
            target={overallDisqualificationTarget}
            note={overallDisqualificationNote}
            error={overallDisqualificationError}
            isBusy={isBusy || isLoadingRaceData}
            onNoteChange={setOverallDisqualificationNote}
            onConfirm={confirmOverallDisqualification}
            onClose={closeOverallDisqualification}
          />
        )}
        {isStartConfirmOpen && (
          <ModalPortal>
            <section className="w-full max-w-md rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="start-race-confirm-title">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Flag className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h2 id="start-race-confirm-title" className="font-display text-title-large font-bold text-primary">Start race?</h2>
                  <p className="mt-2 text-body-sm text-on-surface-variant">
                    {activeRace?.raceName ?? 'This race'} will move into progress and betting will be closed for this race.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                <span>Checked participants: {reviewedParticipants.length}/{participants.length}</span>
                <span>Disqualified: {disqualifiedAssignmentIds.size}</span>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsStartConfirmOpen(false)} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => void handleStartRace()} disabled={isBusy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-body-sm font-bold text-on-primary transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Flag className="h-4 w-4" /> {isBusy ? 'Starting...' : 'Start race'}</button>
              </div>
            </section>
          </ModalPortal>
        )}

        {isResultConfirmOpen && (
          <ModalPortal>
            <section className="w-full max-w-md rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="confirm-result-title">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary"><CheckCircle2 className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h2 id="confirm-result-title" className="font-display text-title-large font-bold text-primary">Confirm result?</h2>
                  <p className="mt-2 text-body-sm text-on-surface-variant">
                    {activeRace?.raceName ?? 'This race'} result draft will be confirmed and sent to Admin review.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 rounded-md border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
                <span>Result rows: {draftResults.length}</span>
                <span>Disqualified: {draftResults.filter((result) => result.isDisqualified).length}</span>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setIsResultConfirmOpen(false)} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => void handleConfirmResults()} disabled={isBusy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-secondary px-5 py-2.5 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {isBusy ? 'Confirming...' : 'Confirm result'}</button>
              </div>
            </section>
          </ModalPortal>
        )}
      </div>
    </main>
  );
};

const ChiefInspectionTable = ({
  registrations,
  isLoading,
  isBusy,
  onApprove,
  onReject,
}: {
  registrations: ChiefInspectionRegistrationItem[];
  isLoading: boolean;
  isBusy: boolean;
  onApprove: (registration: ChiefInspectionRegistrationItem) => void;
  onReject: (registration: ChiefInspectionRegistrationItem) => void;
}) => (
  <div className="mt-5 overflow-x-auto rounded-lg border border-outline-variant bg-white">
    <table className="w-full min-w-[1080px] text-left">
      <thead className="border-b border-outline-variant bg-surface-container">
        <tr>
          <TableHead>Horse</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Jockey</TableHead>
          <TableHead>Gate</TableHead>
          <TableHead>Owner confirm</TableHead>
          <TableHead>Chief inspection</TableHead>
          <TableHead>Note</TableHead>
          <TableHead>Actions</TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant">
        {!isLoading && registrations.map((registration) => {
          const registrationId = getRegistrationId(registration);
          const workflowLabel = getInspectionWorkflowLabel(registration);
          const chiefStatus = normalizeStatus(registration.chiefInspectionStatus);
          const isRejected = workflowLabel === 'Rejected';
          const canInspect = !isBusy && !isRejected && chiefStatus !== 'approved';

          return (
            <tr key={registrationId || `${registration.raceId ?? 'race'}-${registration.horseId ?? 'horse'}`} className="align-top transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-4"><HorseIdentity horseName={registration.horseName} avatarUrl={registration.horseAvatarUrl} subtext={'Registration #' + (registrationId || '-')} /></td>
              <td className="px-4 py-4 text-body-sm font-semibold text-on-surface-variant">{registration.ownerFullName ?? '-'}<span className="mt-1 block text-label-sm text-outline">{registration.ownerStableName ?? 'No stable'}</span></td>
              <td className="px-4 py-4 text-body-sm font-semibold text-on-surface-variant">{registration.jockeyFullName ?? '-'}<span className="mt-1 block text-label-sm text-outline">{formatStatusLabel(registration.jockeyStatus)}</span></td>
              <td className="px-4 py-4 text-body-sm font-bold text-primary">{registration.gateNumber ?? '-'}</td>
              <td className="px-4 py-4"><StatusBadge status={registration.ownerConfirmationStatus} /></td>
              <td className="px-4 py-4"><InspectionWorkflowBadge label={workflowLabel} /><span className="mt-2 block text-label-sm text-on-surface-variant">Chief: {formatStatusLabel(registration.chiefInspectionStatus)}</span></td>
              <td className="max-w-xs px-4 py-4 text-body-sm text-on-surface-variant">{registration.chiefInspectionNote?.trim() || '-'}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onApprove(registration)} disabled={!canInspect} className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                  <button type="button" onClick={() => onReject(registration)} disabled={!canInspect} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"><Flag className="h-4 w-4" /> Reject</button>
                </div>
              </td>
            </tr>
          );
        })}
        {isLoading && <TableEmpty colSpan={8} text="Loading registrations waiting for chief inspection..." />}
        {!isLoading && registrations.length === 0 && <TableEmpty colSpan={8} text="No registrations are waiting for chief inspection on this race." />}
      </tbody>
    </table>
  </div>
);

const InspectionWorkflowBadge = ({ label }: { label: string }) => {
  const className = label === 'Rejected'
    ? 'border-error/30 bg-error-container/20 text-error'
    : label === 'Final approved' || label === 'Chief approved - waiting admin'
      ? 'border-secondary/30 bg-secondary/10 text-secondary'
      : label === 'Waiting chief inspection'
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-tertiary/30 bg-tertiary/10 text-tertiary';

  return <span className={['inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', className].join(' ')}>{label}</span>;
};

const ModalPortal = ({ children }: { children: ReactNode }) => {
  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6" role="presentation">
      {children}
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
};

const OverallDisqualificationModal = ({
  target,
  note,
  error,
  isBusy,
  onNoteChange,
  onConfirm,
  onClose,
}: {
  target: OverallDisqualificationTarget;
  note: string;
  error: string;
  isBusy: boolean;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <ModalPortal>
    <section className="max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="overall-disqualification-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-error-container/40 text-error"><Flag className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 id="overall-disqualification-title" className="font-display text-title-large font-bold text-primary">Disqualify horse?</h2>
            <p className="mt-2 text-body-sm text-on-surface-variant">This horse will be marked as disqualified in the Chief draft result.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Close</button>
      </div>
      <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
        <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
          <HorseIdentity horseName={target.horseName} subtext={'Assignment #' + target.assignmentId} />
        </div>
        <TextArea label="Disqualified note" value={note} onChange={onNoteChange} placeholder="Required reason for disqualification" />
        {error && <div className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">{error}</div>}
        <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isBusy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-error/40 px-5 py-2.5 text-body-sm font-bold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50"><Flag className="h-4 w-4" /> Confirm disqualified</button>
        </div>
      </form>
    </section>
  </ModalPortal>
);
const ChiefInspectionActionModal = ({
  action,
  note,
  error,
  isBusy,
  onNoteChange,
  onSubmit,
  onClose,
}: {
  action: ChiefInspectionAction;
  note: string;
  error: string;
  isBusy: boolean;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) => {
  const isApprove = action.status === 'approved';

  return (
    <ModalPortal>
      <section className="w-full max-w-xl rounded-lg border border-outline-variant bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="chief-inspection-action-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle icon={isApprove ? <CheckCircle2 className="h-5 w-5" /> : <Flag className="h-5 w-5" />} eyebrow="Chief inspection" title={isApprove ? 'Approve inspection' : 'Reject inspection'} />
          <button type="button" onClick={onClose} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Close</button>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
          <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
            <HorseIdentity horseName={action.registration.horseName} avatarUrl={action.registration.horseAvatarUrl} subtext={action.registration.jockeyFullName ? 'Jockey: ' + action.registration.jockeyFullName : undefined} />
          </div>
          <TextArea label="Inspection note" value={note} onChange={onNoteChange} placeholder="Required chief inspection note" />
          {error && <div className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">{error}</div>}
          <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isBusy} className="cursor-pointer rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isBusy} className={['inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-5 py-2.5 text-body-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50', isApprove ? 'bg-secondary text-white hover:bg-opacity-90' : 'border border-error/40 text-error hover:bg-error-container/20'].join(' ')}>
              {isApprove ? <CheckCircle2 className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
              {isBusy ? 'Saving...' : isApprove ? 'Approve inspection' : 'Reject inspection'}
            </button>
          </div>
        </form>
      </section>
    </ModalPortal>
  );
};
const ChiefLapDraftTable = ({
  rows,
  participantByAssignment,
  disqualifiedAssignmentIds,
  disqualifyReasons,
  lapTimeDrafts,
  isBusy,
  onLapTimeChange,
}: {
  rows: RaceRoundItem[];
  participantByAssignment: Map<number, ChiefRaceParticipantItem>;
  disqualifiedAssignmentIds: Set<number>;
  disqualifyReasons: DisqualificationReasonMap;
  lapTimeDrafts: LapTimeDraftMap;
  isBusy: boolean;
  onLapTimeChange: (lapNumber: number, assignmentId: number, value: string) => void;
}) => (
  <div className="mt-5 overflow-x-auto rounded-lg border border-outline-variant bg-white">
    <table className="w-full min-w-[760px] text-left">
      <thead className="border-b border-outline-variant bg-surface-container"><tr><TableHead>Lap rank</TableHead><TableHead>Horse</TableHead><TableHead>Jockey</TableHead><TableHead>Lap time</TableHead><TableHead>Recorded</TableHead></tr></thead>
      <tbody className="divide-y divide-outline-variant">
        {rows.map((row) => {
          const participant = participantByAssignment.get(row.assignmentId);
          const isDisqualified = disqualifiedAssignmentIds.has(row.assignmentId);
          const reason = disqualifyReasons[String(row.assignmentId)] || '-';
          return (
            <tr key={row.roundId} className="transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-4 font-display text-xl font-extrabold text-primary">{row.position > 0 ? '#' + row.position : '-'}</td>
              <td className="px-4 py-4"><HorseIdentity horseName={participant?.horseName ?? row.horseName} avatarUrl={participant?.horseAvatarUrl} subtext={'Assignment #' + row.assignmentId} /></td>
              <td className="px-4 py-4 text-body-sm font-semibold text-on-surface-variant">{participant?.jockeyFullName ?? row.jockeyFullName ?? '-'}</td>
              <td className="px-4 py-4">
                {isDisqualified ? (
                  <span className="block max-w-[220px] break-words text-body-sm font-semibold text-error">{reason}</span>
                ) : (
                  <input type="text" inputMode="decimal" value={lapTimeDrafts[getLapDraftKey(row.roundNumber, row.assignmentId)] ?? formatSecondsInput(row.lapTimeSec)} onChange={(event) => onLapTimeChange(row.roundNumber, row.assignmentId, event.target.value)} placeholder="23.45 or 0:23.45" disabled={isBusy} className="w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm font-semibold focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" aria-label={'Lap ' + row.roundNumber + ' time for ' + (participant?.horseName ?? row.horseName ?? 'assignment ' + row.assignmentId)} />
                )}
              </td>
              <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatDateTime(row.recordedAt)}</td>
            </tr>
          );
        })}
        {rows.length === 0 && <TableEmpty colSpan={5} text="Checked horses will appear here." />}
      </tbody>
    </table>
  </div>
);

const ReadOnlyResultTable = ({
  results,
  isActionDisabled = false,
  onDisqualify,
}: {
  results: RaceResultWorkflowItem[];
  isActionDisabled?: boolean;
  onDisqualify?: (result: RaceResultWorkflowItem) => void;
}) => {
  const hasAction = Boolean(onDisqualify);
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-outline-variant bg-white">
      <table className={['w-full text-left', hasAction ? 'min-w-[840px]' : 'min-w-[720px]'].join(' ')}>
        <thead className="border-b border-outline-variant bg-surface-container"><tr><TableHead>Rank</TableHead><TableHead>Horse</TableHead><TableHead>Jockey</TableHead><TableHead>Gate</TableHead><TableHead>Total time</TableHead><TableHead>Status</TableHead>{hasAction && <TableHead>Action</TableHead>}</tr></thead>
        <tbody className="divide-y divide-outline-variant">
          {results.map((result, index) => (
            <tr key={String(result.resultId ?? result.assignmentId) + '-' + index} className="transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-4 font-display text-xl font-extrabold text-primary">{result.isDisqualified ? 'DQ' : '#' + (result.finishPosition ?? index + 1)}</td>
              <td className="px-4 py-4"><HorseIdentity horseName={result.horseName} subtext={'Assignment #' + result.assignmentId} /></td>
              <td className="px-4 py-4 text-body-sm font-semibold text-on-surface-variant">{result.jockeyFullName ?? '-'}</td>
              <td className="px-4 py-4 text-body-sm font-bold text-primary">{result.gateNumber ?? '-'}</td>
              <td className="px-4 py-4 text-body-sm font-bold text-secondary">{formatSeconds(result.finishTimeSec)}</td>
              <td className="px-4 py-4"><StatusBadge status={result.isDisqualified ? 'disqualified' : result.status} /></td>
              {hasAction && (
                <td className="px-4 py-4">
                  <button type="button" onClick={() => onDisqualify?.(result)} disabled={isActionDisabled || result.isDisqualified} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-50">
                    <Flag className="h-4 w-4" /> Disqualified
                  </button>
                </td>
              )}
            </tr>
          ))}
          {results.length === 0 && <TableEmpty colSpan={hasAction ? 7 : 6} text="Chief draft results are not available yet." />}
        </tbody>
      </table>
    </div>
  );
};
const LapResultTable = ({ rows, participantByAssignment }: { rows: RaceRoundItem[]; participantByAssignment?: Map<number, ChiefRaceParticipantItem> }) => (
  <div className="mt-5 overflow-x-auto rounded-lg border border-outline-variant bg-white">
    <table className="w-full min-w-[680px] text-left">
      <thead className="border-b border-outline-variant bg-surface-container"><tr><TableHead>Lap rank</TableHead><TableHead>Horse</TableHead><TableHead>Jockey</TableHead><TableHead>Lap time</TableHead><TableHead>Recorded</TableHead></tr></thead>
      <tbody className="divide-y divide-outline-variant">
        {rows.map((row) => {
          const participant = participantByAssignment?.get(row.assignmentId);
          return (
            <tr key={row.roundId} className="transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-4 font-display text-xl font-extrabold text-primary">{row.position > 0 ? '#' + row.position : '-'}</td>
              <td className="px-4 py-4"><HorseIdentity horseName={participant?.horseName ?? row.horseName} avatarUrl={participant?.horseAvatarUrl} subtext={'Assignment #' + row.assignmentId} /></td>
              <td className="px-4 py-4 text-body-sm font-semibold text-on-surface-variant">{participant?.jockeyFullName ?? row.jockeyFullName ?? '-'}</td>
              <td className="px-4 py-4 text-body-sm font-bold text-secondary">{formatSeconds(row.lapTimeSec)}</td>
              <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatDateTime(row.recordedAt)}</td>
            </tr>
          );
        })}
        {rows.length === 0 && <TableEmpty colSpan={5} text="No lap data found for this view." />}
      </tbody>
    </table>
  </div>
);

const ParticipantCard = ({
  participant,
  disqualifyReason,
  onReasonChange,
  onPass,
  onDisqualify,
}: {
  participant: ChiefRaceParticipantItem;
  disqualifyReason: string;
  onReasonChange: (value: string) => void;
  onPass: () => void;
  onDisqualify: () => void;
}) => (
  <article className="rounded-lg border border-outline-variant bg-white p-4 transition-colors hover:border-primary/50">
    <HorseIdentity horseName={participant.horseName} avatarUrl={participant.horseAvatarUrl} />
    <div className="mt-4 grid grid-cols-2 gap-2">
      <InfoPill label="Gate" value={participant.gateNumber ?? '-'} />
      <InfoPill label="Jockey" value={participant.jockeyFullName ?? '-'} />
      <InfoPill label="Status" value={participant.status ?? '-'} />
      <InfoPill label="Owner confirm" value={participant.ownerConfirmationStatus ?? '-'} />
    </div>
    <label className="mt-4 grid gap-2">
      <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Disqualification reason</span>
      <input value={disqualifyReason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Required only when disqualified" className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
    </label>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={onPass} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90"><CheckCircle2 className="h-4 w-4" /> Pass check</button>
      <button type="button" onClick={onDisqualify} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-error/40 px-4 py-2.5 text-body-sm font-bold text-error transition-colors hover:bg-error-container/20"><Flag className="h-4 w-4" /> Disqualify</button>
    </div>
  </article>
);
const ReportTable = ({ reports, compact = false, onViewDetail }: { reports: RefereeReportItem[]; compact?: boolean; onViewDetail?: (report: RefereeReportItem) => void }) => {
  const colSpan = onViewDetail ? 6 : 5;

  return (
    <div className={['mt-4 overflow-x-auto rounded-lg border border-outline-variant bg-white', compact ? 'max-h-72' : ''].filter(Boolean).join(' ')}>
      <table className="w-full min-w-[720px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <TableHead>Report</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead>Referee</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Submitted</TableHead>
            {onViewDetail && <TableHead>Action</TableHead>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {reports.map((report) => (
            <tr key={report.reportId} className="align-top transition-colors hover:bg-surface-container-low/70">
              <td className="px-4 py-4 text-body-sm font-bold text-primary">#{report.reportId}<span className="mt-1 block text-label-sm text-outline">{report.reportType ?? '-'}</span></td>
              <td className="px-4 py-4"><StatusBadge status={report.verdict} /></td>
              <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.refereeFullName ?? '-'}<span className="mt-1 block text-label-sm text-outline">{formatRefereeRoleLabel(report.refereeRole)}</span></td>
              <td className="max-w-sm px-4 py-4 text-body-sm text-on-surface-variant">{report.violationNotes || report.resultNotes || report.inspectionNotes || '-'}</td>
              <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatDateTime(report.submittedAt)}</td>
              {onViewDetail && (
                <td className="px-4 py-4">
                  <button type="button" onClick={() => onViewDetail(report)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant text-primary transition-colors hover:border-primary hover:bg-primary/10" aria-label={'View report #' + report.reportId + ' detail'} title="View detail">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {reports.length === 0 && <TableEmpty colSpan={colSpan} text="No reports found for this race." />}
        </tbody>
      </table>
    </div>
  );
};

const ReportDetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-wider text-outline">{label}</p>
    <div className="mt-1 break-words text-body-sm font-semibold text-on-surface">{children}</div>
  </div>
);

const ReportDetailNote = ({ label, value }: { label: string; value?: string }) => (
  <section className="rounded-md border border-outline-variant bg-surface-container-low p-4">
    <h3 className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</h3>
    <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-on-surface-variant">{value?.trim() || '-'}</p>
  </section>
);
const ResultViewSelect = ({ value, lapNumbers, onChange }: { value: ResultView; lapNumbers: number[]; onChange: (value: ResultView) => void }) => (
  <label className="grid min-w-[220px] gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Lap view</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="cursor-pointer rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none">
      <option value="overall">Overall result</option>
      {lapNumbers.map((lap) => <option key={lap} value={getLapViewValue(lap)}>Lap {lap}</option>)}
    </select>
  </label>
);

const SectionTitle = ({ icon, eyebrow, title }: { icon: ReactNode; eyebrow: string; title: string }) => (
  <div className="min-w-0"><p className="inline-flex items-center gap-2 text-label-sm font-bold uppercase tracking-wider text-secondary">{icon}{eyebrow}</p><h2 className="font-display mt-1 text-title-large font-bold text-primary">{title}</h2></div>
);

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <article className="rounded-lg border border-outline-variant bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3 text-on-surface-variant"><span className="text-label-sm font-bold uppercase tracking-wider">{label}</span><span className="text-secondary">{icon}</span></div><p className="font-display mt-3 truncate text-2xl font-extrabold text-primary" title={value}>{value}</p></article>
);

const HorseIdentity = ({ horseName, avatarUrl, subtext }: { horseName?: string; avatarUrl?: string; subtext?: string }) => (
  <div className="flex min-w-0 items-center gap-3">
    {avatarUrl ? <img src={avatarUrl} alt={horseName ?? 'Race horse'} className="h-11 w-11 shrink-0 rounded-md border border-outline-variant object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface-container text-label-sm font-bold text-outline">H</div>}
    <div className="min-w-0"><p className="break-words text-body-sm font-bold text-primary">{horseName ?? 'Unknown horse'}</p>{subtext && <p className="mt-1 break-words text-label-sm text-on-surface-variant">{subtext}</p>}</div>
  </div>
);

const InfoPill = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="min-w-0 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2"><p className="truncate text-[10px] font-bold uppercase tracking-wider text-outline">{label}</p><p className="mt-1 truncate text-body-sm font-semibold text-on-surface" title={String(value)}>{value}</p></div>
);

const StatusBadge = ({ status }: { status?: string }) => (
  <span className={['inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', statusClassName(status)].join(' ')}>{formatStatusLabel(status)}</span>
);

const SelectInput = ({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) => (
  <label className="grid gap-2"><span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="cursor-pointer rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
);

const TextArea = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <label className="grid gap-2"><span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="min-h-[112px] rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm text-on-surface focus:border-primary focus:outline-none" /></label>
);

const TableHead = ({ children }: { children: ReactNode }) => <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">{children}</th>;
const TableEmpty = ({ colSpan, text }: { colSpan: number; text: string }) => <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">{text}</td></tr>;
const EmptyState = ({ title, description }: { title: string; description: string }) => <section className="rounded-xl border border-outline-variant bg-white p-8 text-center"><h2 className="font-display text-title-large font-bold text-primary">{title}</h2><p className="mt-2 text-body-sm text-on-surface-variant">{description}</p></section>;

export default RaceControlPage;

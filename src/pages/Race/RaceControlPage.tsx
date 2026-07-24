import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ClipboardList, Flag, Gauge, Layers, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import {
  raceOperationsService,
  type RaceDraftResultItemInput,
  type RacePointRuleItem,
  type RaceResultDraftData,
  type RaceResultWorkflowItem,
  type RefereeAssignedRaceItem,
  type RefereeReportFormData,
  type RefereeReportItem,
} from '../../services/raceOperationsService';
import { raceRoundService, type RaceRoundItem } from '../../services/raceRoundService';
import { scheduleService, type RaceParticipantItem } from '../../services/scheduleService';
import { raceCrudService, type RaceCrudItem } from '../../services/raceCrudService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { useAdminRaceResults } from '../../hooks/useAdminRaceResults';
import { formatRefereeRoleLabel } from '../../utils/permissions';

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';
const toDateTimeInputValue = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

type LapEntryDraft = {
  position: string;
  lapTimeSec: string;
  recordedAt: string;
};

type ParticipantLapStats = {
  completedLaps: number;
  bestLapSec?: number;
  averageLapSec?: number;
};

const getLapDraftKey = (lapNumber: number, assignmentId: number) => `${lapNumber}:${assignmentId}`;

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${value.toFixed(2)}s`;
};

const roundSeconds = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  return Number(value.toFixed(2));
};

const formatSecondsInput = (value?: number | null) => {
  const rounded = roundSeconds(value);
  return rounded === undefined ? '' : rounded.toFixed(2);
};

const normalizeDraftPositions = (items: RaceDraftResultItemInput[]) => {
  let nextPosition = 1;
  return items.map((item) => ({
    ...item,
    finishPosition: item.isDisqualified ? undefined : nextPosition++,
  }));
};

const sortDraftItems = (items: RaceDraftResultItemInput[]) => [...items].sort((a, b) => {
  if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1;
  return (a.finishPosition ?? Number.MAX_SAFE_INTEGER) - (b.finishPosition ?? Number.MAX_SAFE_INTEGER);
});

const createEmptyPointRule = (): RacePointRuleItem => ({
  finishPosition: 1,
  points: 0,
  note: '',
});

const initialReportForm: RefereeReportFormData = {
  reportType: 'final',
  inspectionNotes: '',
  violationNotes: '',
  resultNotes: '',
  verdict: 'clean',
};

const reportTypeOptions = [
  { value: 'final', label: 'Final report' },
  { value: 'incident', label: 'Incident report' },
  { value: 'inspection', label: 'Inspection report' },
];

const verdictOptions = [
  { value: 'clean', label: 'Clean - no violation' },
  { value: 'violation', label: 'Violation detected' },
];

const RaceControlPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = authService.getStoredUserProfile();
  const roleType = profile?.roleType;
  const isAdmin = roleType === 'admin';
  const isReferee = roleType === 'race_referee';

  const [selectedRaceId, setSelectedRaceId] = useState(() => searchParams.get('raceId') ?? '');
  const [isAssignedRaceDropdownOpen, setIsAssignedRaceDropdownOpen] = useState(false);
  const [assignedRaces, setAssignedRaces] = useState<RefereeAssignedRaceItem[]>([]);
  const [participants, setParticipants] = useState<JockeyAssignmentItem[]>([]);
  const [reports, setReports] = useState<RefereeReportItem[]>([]);
  const [draft, setDraft] = useState<RaceResultDraftData | null>(null);
  const [raceSnapshot, setRaceSnapshot] = useState<RaceCrudItem | null>(null);
  const [raceRounds, setRaceRounds] = useState<RaceRoundItem[]>([]);
  const [lapRanking, setLapRanking] = useState<RaceResultWorkflowItem[]>([]);
  const [lapParticipants, setLapParticipants] = useState<RaceParticipantItem[]>([]);
  const [selectedLapNumber, setSelectedLapNumber] = useState(1);
  const [lapEntryDrafts, setLapEntryDrafts] = useState<Record<string, LapEntryDraft>>({});
  const [savingLapAssignmentId, setSavingLapAssignmentId] = useState<number | null>(null);
  const [pointRules, setPointRules] = useState<RacePointRuleItem[]>([createEmptyPointRule()]);
  const [reportForm, setReportForm] = useState<RefereeReportFormData>(initialReportForm);
  const [draftItems, setDraftItems] = useState<RaceDraftResultItemInput[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const [forceCloseBetting, setForceCloseBetting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(isReferee);
  const [isLoadingRaceData, setIsLoadingRaceData] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const {
    resultList: adminResults,
    isLoading: isLoadingAdminResults,
    setResultList: setAdminResults,
    fetchRaceResults: fetchAdminRaceResults,
    handleConfirm: confirmAdminResults,
    handleCancel: cancelAdminResults,
    handlePublish: publishAdminResults,
  } = useAdminRaceResults({ autoFetch: false });

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const normalizedRaceId = selectedRaceId.trim();

  const activeRaceSummary = useMemo(() => {
    if (!normalizedRaceId) {
      return undefined;
    }

    return assignedRaces.find((item) => String(item.raceId) === normalizedRaceId);
  }, [assignedRaces, normalizedRaceId]);

  const refereeRole = normalizeStatus(activeRaceSummary?.refereeRole);
  const canEditResults = isReferee && ['chief_referee', 'main_referee'].includes(refereeRole);
  const isRaceInProgress = normalizeStatus(activeRaceSummary?.status ?? raceSnapshot?.status ?? draft?.status) === 'in_progress';
  const currentRefereeId = profile?.refereeProfile?.refereeId ?? profile?.userId;
  const automaticReportId = draft?.reportId
    ?? reports.find((report) => report.refereeId === currentRefereeId)?.reportId;
  const participantByAssignmentId = useMemo(
    () => new Map(participants.map((participant) => [participant.assignmentId ?? participant.id ?? 0, participant])),
    [participants],
  );
  const configuredLapCount = useMemo(
    () => raceSnapshot?.lapCount ?? raceRounds.find((round) => round.lapCount && round.lapCount > 0)?.lapCount,
    [raceRounds, raceSnapshot?.lapCount],
  );
  const lapStatsByAssignment = useMemo(() => {
    const stats = new Map<number, ParticipantLapStats>();

    lapParticipants.forEach((participant) => {
      const participantRounds = raceRounds.filter((round) => (
        round.assignmentId === participant.assignmentId
        && round.lapTimeSec !== undefined
      ));
      const lapTimes = participantRounds
        .map((round) => round.lapTimeSec as number)
        .filter((time) => Number.isFinite(time) && time > 0);
      const totalTime = lapTimes.reduce((total, time) => total + time, 0);

      stats.set(participant.assignmentId, {
        completedLaps: participantRounds.length,
        bestLapSec: lapTimes.length > 0 ? Math.min(...lapTimes) : undefined,
        averageLapSec: lapTimes.length > 0 ? totalTime / lapTimes.length : undefined,
      });
    });

    return stats;
  }, [lapParticipants, raceRounds]);

  const handleSelectRace = (raceId: string) => {
    if (raceId.trim() !== normalizedRaceId) {
      setSelectedLapNumber(1);
      setLapEntryDrafts({});
    }
    setSelectedRaceId(raceId);
    const nextParams = new URLSearchParams(searchParams);
    if (raceId.trim()) nextParams.set('raceId', raceId.trim());
    else nextParams.delete('raceId');
    setSearchParams(nextParams, { replace: true });
  };
  const loadAssignedRaces = async () => {
    if (!isReferee) {
      return;
    }

    setIsLoadingAssigned(true);
    try {
      const data = await raceOperationsService.getAssignedRaces();
      setAssignedRaces(data);
      if (!normalizedRaceId && data.length > 0) {
        handleSelectRace(String(data[0].raceId));
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load assigned races.'));
    } finally {
      setIsLoadingAssigned(false);
    }
  };

  const loadRaceData = async (raceId: string) => {
    if (!raceId) {
      setReports([]);
      setDraft(null);
      setParticipants([]);
      setRaceRounds([]);
      setLapRanking([]);
      setRaceSnapshot(null);
      setLapParticipants([]);
      setLapEntryDrafts({});
      setDraftItems([]);
      setAdminResults([]);
      setPointRules([createEmptyPointRule()]);
      return;
    }

    setIsLoadingRaceData(true);
    setErrorMessage('');

    try {
      const [roundData, lapParticipantData, rankingData, raceSnapshotData] = await Promise.all([
        raceRoundService.getRoundsByRace(raceId),
        scheduleService.getRaceParticipants(Number(raceId)),
        raceOperationsService.getResultsByRace(raceId).catch(() => []),
        isAdmin ? raceCrudService.getRaceById(raceId).catch(() => null) : Promise.resolve(null),
      ]);
      setRaceRounds(roundData);
      setLapParticipants(lapParticipantData.filter((participant) => participant.assignmentId > 0));
      setLapRanking(rankingData);
      setRaceSnapshot(raceSnapshotData);

      if (isReferee) {
        const [reportData, draftData, assignmentData] = await Promise.all([
          raceOperationsService.getReports(raceId),
          raceOperationsService.getDraft(raceId).catch(() => null),
          jockeyAssignmentService.getAll(),
        ]);
        const raceParticipants = assignmentData
          .filter((item) => String(item.raceId) === String(raceId) && normalizeStatus(item.status) === 'confirmed')
          .sort((a, b) => (a.gateNumber ?? Number.MAX_SAFE_INTEGER) - (b.gateNumber ?? Number.MAX_SAFE_INTEGER));
        const nextDraftItems = draftData?.results.length
          ? sortDraftItems(draftData.results.map((item) => ({
            assignmentId: item.assignmentId,
            finishPosition: item.finishPosition ?? undefined,
            finishTimeSec: roundSeconds(item.finishTimeSec),
            isDisqualified: item.isDisqualified,
            disqualifyReason: item.disqualifyReason ?? '',
          })))
          : normalizeDraftPositions(raceParticipants
            .map((item) => ({
              assignmentId: item.assignmentId ?? item.id ?? 0,
              finishTimeSec: undefined,
              isDisqualified: false,
              disqualifyReason: '',
            }))
            .filter((item) => item.assignmentId > 0));

        setParticipants(raceParticipants);
        setReports(reportData);
        setDraft(draftData);
        setDraftItems(nextDraftItems);
      }

      if (isAdmin) {
        const [, ruleData] = await Promise.all([
          fetchAdminRaceResults(raceId),
          raceOperationsService.getPointRules(raceId).catch(() => []),
        ]);
        setPointRules(ruleData.length > 0 ? ruleData : [createEmptyPointRule()]);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load race workflow data.'));
    } finally {
      setIsLoadingRaceData(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAssignedRaces();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRaceData(normalizedRaceId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedRaceId, isAdmin, isReferee]);

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

  const updateLapEntryDraft = (assignmentId: number, field: keyof LapEntryDraft, value: string) => {
    const draftKey = getLapDraftKey(selectedLapNumber, assignmentId);
    setLapEntryDrafts((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] ?? { position: '', lapTimeSec: '', recordedAt: '' }),
        [field]: value,
      },
    }));
  };

  const handleSaveLapEntry = async (participant: RaceParticipantItem) => {
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before saving lap results.');
      return;
    }

    if (!Number.isInteger(selectedLapNumber) || selectedLapNumber < 1) {
      setErrorMessage('Lap number must be a positive integer.');
      return;
    }

    if (configuredLapCount && selectedLapNumber > configuredLapCount) {
      setErrorMessage(`Lap number cannot be greater than the configured ${configuredLapCount} laps.`);
      return;
    }

    const existingRound = raceRounds.find((round) => (
      round.assignmentId === participant.assignmentId
      && round.roundNumber === selectedLapNumber
    ));
    const draftKey = getLapDraftKey(selectedLapNumber, participant.assignmentId);
    const draftEntry = lapEntryDrafts[draftKey] ?? {
      position: existingRound?.position ? String(existingRound.position) : '',
      lapTimeSec: formatSecondsInput(existingRound?.lapTimeSec),
      recordedAt: toDateTimeInputValue(existingRound?.recordedAt ?? new Date().toISOString()),
    };
    const position = Number(draftEntry?.position);
    const lapTimeSec = roundSeconds(Number(draftEntry?.lapTimeSec));

    if (!Number.isInteger(position) || position < 1) {
      setErrorMessage(`Enter a valid position for ${participant.horseName}.`);
      return;
    }

    if (lapTimeSec === undefined || lapTimeSec < 0.01) {
      setErrorMessage(`Enter a lap time of at least 0.01 seconds for ${participant.horseName}.`);
      return;
    }

    setSavingLapAssignmentId(participant.assignmentId);
    setMessage('');
    setErrorMessage('');
    try {
      const payload = {
        assignmentId: participant.assignmentId,
        roundNumber: selectedLapNumber,
        position,
        lapTimeSec,
        recordedAt: draftEntry?.recordedAt,
      };

      if (existingRound) {
        await raceRoundService.updateRound(existingRound.roundId, payload);
      } else {
        await raceRoundService.createRound(payload);
      }

      const refreshedRounds = await raceRoundService.getRoundsByRace(normalizedRaceId);
      setRaceRounds(refreshedRounds);
      setLapEntryDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[draftKey];
        return nextDrafts;
      });

      const savedMessage = `${participant.horseName} - Lap ${selectedLapNumber} ${existingRound ? 'updated' : 'created'}.`;
      try {
        const recalculatedRanking = await raceOperationsService.recalculateResultsFromRounds(normalizedRaceId);
        setLapRanking(recalculatedRanking);
        setAdminResults(recalculatedRanking);
        if (isReferee) {
          setDraftItems(sortDraftItems(recalculatedRanking.map((result) => ({
            assignmentId: result.assignmentId,
            finishPosition: result.finishPosition ?? undefined,
            finishTimeSec: roundSeconds(result.finishTimeSec),
            isDisqualified: result.isDisqualified,
            disqualifyReason: result.disqualifyReason ?? '',
          }))));
        }
        setMessage(`${savedMessage} Race ranking recalculated.`);
      } catch (rankingError) {
        setMessage(savedMessage);
        setErrorMessage(`Lap was saved, but ranking could not be recalculated. ${getApiErrorMessage(rankingError, 'Please retry.')}`);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to save lap result.'));
    } finally {
      setSavingLapAssignmentId(null);
    }
  };

  const moveDraftItem = (index: number, direction: -1 | 1) => {
    setDraftItems((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return normalizeDraftPositions(next);
    });
  };

  const updateDraftItem = (index: number, nextItem: RaceDraftResultItemInput) => {
    setDraftItems((current) => normalizeDraftPositions(
      current.map((item, itemIndex) => itemIndex === index ? nextItem : item),
    ));
  };
  const handleSubmitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before submitting a report.');
      return;
    }
    if (!isRaceInProgress) {
      setErrorMessage('Reports can only be submitted while the race is in progress.');
      return;
    }

    await withBusy(async () => {
      const created = await raceOperationsService.createReport(normalizedRaceId, reportForm);
      setMessage(`Report #${created.reportId} submitted.`);
      setReportForm(initialReportForm);
      await loadRaceData(normalizedRaceId);
    });
  };

  const handleSubmitDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before submitting draft results.');
      return;
    }
    if (!canEditResults) {
      setErrorMessage('Only a chief or main referee can save race results.');
      return;
    }
    if (!isRaceInProgress) {
      setErrorMessage('Race results can only be saved while the race is in progress.');
      return;
    }
    if (draftItems.length === 0) {
      setErrorMessage('No confirmed horse assignments were found for this race.');
      return;
    }

    await withBusy(async () => {
      const payload = {
        reportId: automaticReportId,
        results: normalizeDraftPositions(draftItems),
      };
      const nextDraft = draft
        ? await raceOperationsService.updateDraft(normalizedRaceId, payload)
        : await raceOperationsService.createDraft(normalizedRaceId, payload);

      setDraft(nextDraft);
      setMessage(draft ? 'Draft results updated.' : 'Draft results created.');
      await loadRaceData(normalizedRaceId);
    });
  };

  const handleStartRace = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Enter a race ID before starting the race.');
      return;
    }

    const raceName = activeRaceSummary?.raceName ?? draft?.raceName ?? adminResults[0]?.raceName ?? `Race #${normalizedRaceId}`;
    const bettingMessage = forceCloseBetting
      ? 'Betting will be closed when the race starts.'
      : 'Betting will not be force-closed by this action.';

    if (!window.confirm(`Start "${raceName}" as an Admin?\n\n${bettingMessage}`)) {
      return;
    }

    await withBusy(async () => {
      try {
        const response = await raceOperationsService.startRace(normalizedRaceId, {
          forceCloseBetting,
          note: `Admin started "${raceName}"${forceCloseBetting ? ' and requested betting closure' : ''}.`,
        });
        await loadRaceData(normalizedRaceId);

        const bettingWasClosed = response.bettingClosed ?? forceCloseBetting;
        setMessage(
          response.message
            ? `Admin action completed for "${response.raceName || raceName}".\n${response.message}`
            : `Race "${response.raceName || raceName}" is now in progress.${bettingWasClosed ? ' Betting has been closed for this race.' : ''}`,
        );
      } catch (error) {
        throw new Error(
          `Could not start "${raceName}" as Admin.\n${getApiErrorMessage(error, 'Unable to start race.')}`,
          { cause: error },
        );
      }
    });
  };

  const handleSavePointRules = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Enter a race ID before saving point rules.');
      return;
    }

    await withBusy(async () => {
      const hasExistingRules = pointRules.some((rule) => rule.id);
      const savedRules = hasExistingRules
        ? await raceOperationsService.updatePointRules(normalizedRaceId, pointRules)
        : await raceOperationsService.createPointRules(normalizedRaceId, pointRules);

      setPointRules(savedRules.length > 0 ? savedRules : [createEmptyPointRule()]);
      setMessage('Point rules saved.');
    });
  };

  const handleDeletePointRule = async (index: number) => {
    const rule = pointRules[index];

    if (!rule?.id || !normalizedRaceId) {
      setPointRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }

    await withBusy(async () => {
      await raceOperationsService.deletePointRule(normalizedRaceId, rule.id as number);
      setMessage('Point rule deleted.');
      await loadRaceData(normalizedRaceId);
    });
  };

  const handleConfirmResults = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Enter a race ID before confirming results.');
      return;
    }

    setMessage('');
    setErrorMessage('');
    await confirmAdminResults(normalizedRaceId);
  };

  const handleCancelResults = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Enter a race ID before cancelling results.');
      return;
    }

    setMessage('');
    setErrorMessage('');
    const cancelled = await cancelAdminResults(normalizedRaceId, cancelReason);

    if (cancelled) {
      setCancelReason('');
    }
  };

  const handlePublishResults = async () => {
    if (!normalizedRaceId) {
      setErrorMessage('Enter a race ID before publishing results.');
      return;
    }

    setMessage('');
    setErrorMessage('');
    await publishAdminResults(normalizedRaceId);
  };

  const publishedCount = adminResults.filter((item) => String(item.status ?? '').toLowerCase() === 'published').length;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                {isAdmin ? 'Admin Workflow' : 'Referee Workflow'}
              </p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">
                Referee report and race result control
              </h1>
              <p className="mt-2 max-w-3xl text-body-sm text-on-surface-variant">
                This board now follows the backend workflow: report, draft result, admin confirm, and admin publish.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <MetricCard icon={<Flag className="h-4 w-4" />} label="Selected Race" value={normalizedRaceId || '--'} />
              <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Reports" value={String(reports.length).padStart(2, '0')} />
              <MetricCard icon={isReferee ? <Users className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} label={isReferee ? 'Participants' : 'Published'} value={String(isReferee ? participants.length : publishedCount).padStart(2, '0')} />
            </div>
          </div>
        </div>

        <section className={`relative mb-6 grid items-stretch gap-4 xl:grid-cols-[320px_minmax(0,1fr)] ${isAssignedRaceDropdownOpen ? 'z-[80]' : 'z-10'}`}>
          <article className="glass-panel h-full rounded-xl p-4">
            <div className="mb-3 flex items-center gap-3">
              <Gauge className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-medium font-bold text-primary">Race selector</h2>
            </div>

            {isReferee && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-outline">Assigned race</p>
                  <button
                    type="button"
                    onClick={() => void loadAssignedRaces()}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant text-primary transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy || isLoadingAssigned}
                    aria-label="Refresh assigned races"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingAssigned ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAssignedRaceDropdownOpen((current) => !current)}
                    disabled={isBusy || isLoadingAssigned || assignedRaces.length === 0}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-semibold text-on-surface">
                        {isLoadingAssigned
                          ? 'Loading assigned races...'
                          : activeRaceSummary?.raceName ?? (assignedRaces.length > 0 ? 'Choose assigned race' : 'No assigned races found')}
                      </span>
                      <span className="mt-1 block truncate text-label-sm text-on-surface-variant">
                        {activeRaceSummary
                          ? `${getScheduleLabel(activeRaceSummary)} - ${activeRaceSummary.refereeRole ?? 'Referee'} - ${activeRaceSummary.status}`
                          : 'Assign race'}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-primary transition-transform ${isAssignedRaceDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAssignedRaceDropdownOpen && assignedRaces.length > 0 && (
                    <div className="absolute left-0 right-0 z-[90] mt-2 max-h-72 overflow-y-auto rounded-lg border border-outline-variant bg-white p-2 shadow-xl">
                      {assignedRaces.map((race) => (
                        <button
                          key={race.assignmentId ?? race.raceId}
                          type="button"
                          onClick={() => handleSelectRace(String(race.raceId))}
                          className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                            String(race.raceId) === normalizedRaceId
                              ? 'bg-primary-container/15 text-primary'
                              : 'hover:bg-surface-container-high'
                          }`}
                        >
                          <p className="truncate text-body-sm font-semibold text-on-surface">{race.raceName}</p>
                          <p className="mt-1 truncate text-label-sm text-on-surface-variant">
                            {getScheduleLabel(race)} - {race.refereeRole ?? 'Referee'} - {race.status}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isReferee && (
              <p className="text-body-sm text-on-surface-variant">
                Open a race from the admin list to load workflow data.
              </p>
            )}
          </article>

          <article className="glass-panel h-full rounded-xl p-4">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-medium font-bold text-primary">Current race snapshot</h2>
            </div>
            {!normalizedRaceId ? (
              <p className="text-body-sm text-on-surface-variant">Choose an assigned race to load workflow data.</p>
            ) : isLoadingRaceData || isLoadingAdminResults ? (
              <p className="text-body-sm text-on-surface-variant">Loading workflow data...</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <InfoTile label="Race ID" value={normalizedRaceId} />
                <InfoTile label="Race Name" value={activeRaceSummary?.raceName ?? raceSnapshot?.name ?? draft?.raceName ?? adminResults[0]?.raceName ?? '-'} />
                <InfoTile label="Schedule" value={getScheduleLabel(activeRaceSummary ?? raceSnapshot ?? undefined)} />
                <InfoTile label="Tournament" value={activeRaceSummary?.tournamentName ?? raceSnapshot?.tournamentName ?? adminResults[0]?.tournamentName ?? lapRanking[0]?.tournamentName ?? '-'} />
                <InfoTile label="Status" value={activeRaceSummary?.status ?? raceSnapshot?.status ?? draft?.status ?? adminResults[0]?.status ?? '-'} />
                <InfoTile label={isReferee ? "Participants" : "Result records"} value={String(isReferee ? participants.length : adminResults.length)} />
              </div>
            )}
          </article>
        </section>
        <div className="space-y-6">
          <section className="glass-panel rounded-xl p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-secondary" />
                  <h2 className="font-display text-title-large font-bold text-primary">Lap results</h2>
                </div>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Save each participant result separately for the selected lap. Admin and every race referee can use this section.
                </p>
              </div>
              <label className="w-full max-w-[220px] text-label-sm font-semibold text-on-surface-variant">
                Lap number{configuredLapCount ? ` (1-${configuredLapCount})` : ''}
                <input
                  type="number"
                  min="1"
                  max={configuredLapCount}
                  step="1"
                  value={selectedLapNumber}
                  onChange={(event) => {
                    const nextLap = Number(event.target.value);
                    setSelectedLapNumber(Number.isFinite(nextLap) ? Math.max(1, Math.trunc(nextLap)) : 1);
                  }}
                  className="mt-2 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm text-primary focus:border-primary focus:outline-none"
                />
              </label>
            </div>

            {!normalizedRaceId ? (
              <p className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm text-on-surface-variant">
                Select a race to manage lap results.
              </p>
            ) : isLoadingRaceData ? (
              <p className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm text-on-surface-variant">
                Loading lap results...
              </p>
            ) : lapParticipants.length === 0 ? (
              <p className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm text-on-surface-variant">
                No confirmed participants were found for this race.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="border-b border-outline-variant bg-surface-container">
                    <tr>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Participant</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Position</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Lap time (sec)</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Recorded at</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                      <th className="px-4 py-3 text-right text-label-sm uppercase tracking-wider text-outline">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {lapParticipants.map((participant) => {
                      const existingRound = raceRounds.find((round) => (
                        round.assignmentId === participant.assignmentId
                        && round.roundNumber === selectedLapNumber
                      ));
                      const draftKey = getLapDraftKey(selectedLapNumber, participant.assignmentId);
                      const entry = lapEntryDrafts[draftKey] ?? {
                        position: existingRound?.position ? String(existingRound.position) : '',
                        lapTimeSec: formatSecondsInput(existingRound?.lapTimeSec),
                        recordedAt: toDateTimeInputValue(existingRound?.recordedAt ?? new Date().toISOString()),
                      };

                      return (
                        <tr key={participant.assignmentId}>
                          <td className="px-4 py-4">
                            <p className="text-body-sm font-bold text-primary">{participant.horseName}</p>
                            <p className="mt-1 text-label-sm text-on-surface-variant">
                              {participant.jockeyName} | Gate {participant.gateNumber || '-'} | Assignment #{participant.assignmentId}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <input type="number" min="1" step="1" value={entry.position} onChange={(event) => updateLapEntryDraft(participant.assignmentId, 'position', event.target.value)} aria-label={`Position for ${participant.horseName}`} className="w-24 rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
                          </td>
                          <td className="px-4 py-4">
                            <input type="number" min="0.01" step="0.01" value={entry.lapTimeSec} onChange={(event) => updateLapEntryDraft(participant.assignmentId, 'lapTimeSec', event.target.value)} aria-label={`Lap time for ${participant.horseName}`} className="w-32 rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
                          </td>
                          <td className="px-4 py-4">
                            <input type="datetime-local" value={entry.recordedAt} onChange={(event) => updateLapEntryDraft(participant.assignmentId, 'recordedAt', event.target.value)} aria-label={`Recorded time for ${participant.horseName}`} className="rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
                          </td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">
                            {existingRound ? `Saved #${existingRound.roundId}` : 'Not saved'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button type="button" onClick={() => void handleSaveLapEntry(participant)} disabled={savingLapAssignmentId !== null} className="rounded-md bg-secondary px-4 py-2 text-label-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                              {savingLapAssignmentId === participant.assignmentId ? 'Saving...' : existingRound ? 'Update' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8 border-t border-outline-variant pt-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-title-medium font-bold text-primary">Race ranking</h3>
                    <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-secondary">
                      Live from laps
                    </span>
                  </div>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Ranking and lap statistics update after every saved lap. Chief and main referees can adjust this same list before saving the official draft.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isReferee && (
                    <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {formatRefereeRoleLabel(activeRaceSummary?.refereeRole)}
                    </span>
                  )}
                  <span className="text-label-sm font-semibold text-on-surface-variant">
                    {(isReferee ? draftItems.length : lapRanking.length)} ranked participant(s)
                  </span>
                </div>
              </div>

              {isReferee ? (
                <form onSubmit={handleSubmitDraft} className="grid gap-4">
                  {!canEditResults && (
                    <p className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                      Ranking is read-only. Only a chief or main referee can save the official draft.
                    </p>
                  )}
                  {canEditResults && !isRaceInProgress && (
                    <p className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                      Ranking can be edited and saved when the race is in progress.
                    </p>
                  )}
                  <p className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm text-on-surface-variant">
                    {automaticReportId
                      ? 'Your report will be linked to this ranking automatically.'
                      : 'No report from your account is available yet. You can still save the ranking without entering a report ID.'}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Lap data supplies the live order and statistics. Use the arrow buttons only when an official adjustment is required.
                  </p>

                  <div className="space-y-3">
                    {draftItems.map((item, index) => {
                      const rankingIndex = lapRanking.findIndex((result) => result.assignmentId === item.assignmentId);
                      const rankingResult = rankingIndex >= 0 ? lapRanking[rankingIndex] : undefined;
                      const stats = lapStatsByAssignment.get(item.assignmentId);
                      const leader = lapRanking[0];
                      const leaderStats = leader ? lapStatsByAssignment.get(leader.assignmentId) : undefined;
                      const canCompareGap = rankingIndex > 0
                        && stats?.completedLaps === leaderStats?.completedLaps
                        && rankingResult?.finishTimeSec != null
                        && leader?.finishTimeSec != null;
                      const gap = canCompareGap && rankingResult && leader
                        ? Number(rankingResult.finishTimeSec) - Number(leader.finishTimeSec)
                        : undefined;

                      return (
                        <ParticipantResultRow
                          key={item.assignmentId}
                          item={item}
                          participant={participantByAssignmentId.get(item.assignmentId)}
                          index={index}
                          total={draftItems.length}
                          lapStats={stats}
                          configuredLapCount={configuredLapCount}
                          points={rankingResult?.pointsAwarded ?? 0}
                          gapLabel={rankingIndex === 0 ? 'Leader' : gap === undefined ? '-' : `+${formatSeconds(gap)}`}
                          isEditable={canEditResults && isRaceInProgress}
                          onChange={(nextItem) => updateDraftItem(index, nextItem)}
                          onMove={(direction) => moveDraftItem(index, direction)}
                        />
                      );
                    })}
                    {!isLoadingRaceData && draftItems.length === 0 && (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm text-on-surface-variant">
                        No confirmed horse assignments found for this race.
                      </div>
                    )}
                  </div>

                  <button
                    disabled={isBusy || !canEditResults || !isRaceInProgress || draftItems.length === 0}
                    className="cursor-pointer rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {draft ? 'Update draft ranking' : 'Save draft ranking'}
                  </button>
                </form>
              ) : lapRanking.length === 0 ? (
                <p className="rounded-md bg-surface-container-low px-4 py-6 text-center text-body-sm text-on-surface-variant">Save a lap result to calculate the race ranking.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left">
                    <thead className="border-b border-outline-variant bg-surface-container">
                      <tr>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Rank</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Participant</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Completed</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Total time</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Best lap</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Average</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Gap</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {lapRanking.map((result, index) => {
                        const participant = lapParticipants.find((item) => item.assignmentId === result.assignmentId);
                        const stats = lapStatsByAssignment.get(result.assignmentId);
                        const leader = lapRanking[0];
                        const leaderStats = leader ? lapStatsByAssignment.get(leader.assignmentId) : undefined;
                        const canCompareGap = index > 0 && stats?.completedLaps === leaderStats?.completedLaps && result.finishTimeSec != null && leader?.finishTimeSec != null;
                        const gap = canCompareGap ? Number(result.finishTimeSec) - Number(leader.finishTimeSec) : undefined;

                        return (
                          <tr key={result.resultId ?? result.assignmentId} className="transition-colors hover:bg-surface-container-low">
                            <td className="px-4 py-4 font-display text-title-medium font-extrabold text-secondary">#{result.finishPosition ?? index + 1}</td>
                            <td className="px-4 py-4"><p className="text-body-sm font-bold text-primary">{participant?.horseName ?? result.horseName ?? `Assignment #${result.assignmentId}`}</p><p className="mt-1 text-label-sm text-on-surface-variant">{participant?.jockeyName ?? result.jockeyFullName ?? '-'}</p></td>
                            <td className="px-4 py-4 text-body-sm text-on-surface-variant">{stats?.completedLaps ?? 0}{configuredLapCount ? `/${configuredLapCount}` : ''}</td>
                            <td className="px-4 py-4 text-body-sm font-bold text-primary">{formatSeconds(result.finishTimeSec)}</td>
                            <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatSeconds(stats?.bestLapSec)}</td>
                            <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatSeconds(stats?.averageLapSec)}</td>
                            <td className="px-4 py-4 text-body-sm text-on-surface-variant">{index === 0 ? 'Leader' : gap === undefined ? '-' : `+${formatSeconds(gap)}`}</td>
                            <td className="px-4 py-4 text-body-sm font-bold text-primary">{result.pointsAwarded ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {isReferee && (
            <section>
              <article className="glass-panel rounded-xl p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-secondary" />
                  <h2 className="font-display text-title-large font-bold text-primary">Submit report</h2>
                </div>
                {!isRaceInProgress && (
                  <p className="mb-4 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">Reports can be submitted when the race is in progress.</p>
                )}
                <form onSubmit={handleSubmitReport} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectInput label="Report type" value={reportForm.reportType ?? 'final'} options={reportTypeOptions} onChange={(value) => setReportForm((current) => ({ ...current, reportType: value }))} />
                    <SelectInput label="Verdict" value={reportForm.verdict ?? 'clean'} options={verdictOptions} onChange={(value) => setReportForm((current) => ({ ...current, verdict: value }))} />
                  </div>
                  <TextArea label="Inspection notes" value={reportForm.inspectionNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, inspectionNotes: value }))} />
                  {reportForm.verdict === 'violation' && !reportForm.violationNotes?.trim() && (
                    <p className="text-label-sm font-semibold text-error">Violation notes are required when the verdict is Violation.</p>
                  )}
                  <TextArea label="Violation notes" value={reportForm.violationNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, violationNotes: value }))} />
                  <TextArea label="Result notes" value={reportForm.resultNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, resultNotes: value }))} />
                  <button disabled={isBusy || !isRaceInProgress} className="cursor-pointer rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    Submit report
                  </button>
                </form>
              </article>

            </section>
          )}

          {isReferee && (
            <section className="glass-panel rounded-xl p-6">
              <h2 className="font-display mb-5 text-title-large font-bold text-primary">Submitted reports</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-outline-variant bg-surface-container">
                    <tr>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Report ID</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Verdict</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Referee</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Role</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Type</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {reports.map((report) => (
                      <tr key={report.reportId}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{report.reportId}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.verdict ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.refereeFullName ?? `Referee #${report.refereeId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatRefereeRoleLabel(report.refereeRole)}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.reportType ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatDateTime(report.submittedAt)}</td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No reports found for this race.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {isAdmin && (
            <>
              <section className="grid gap-6 xl:grid-cols-2">
                <article className="glass-panel rounded-xl p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <Flag className="h-5 w-5 text-secondary" />
                    <h2 className="font-display text-title-large font-bold text-primary">Start race</h2>
                  </div>
                  <label className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-primary">
                    <input type="checkbox" checked={forceCloseBetting} onChange={(event) => setForceCloseBetting(event.target.checked)} />
                    Force close betting when starting race
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleStartRace()}
                    disabled={isBusy || !normalizedRaceId}
                    className="mt-4 rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start race
                  </button>
                </article>

                <article className="glass-panel rounded-xl p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-secondary" />
                    <h2 className="font-display text-title-large font-bold text-primary">Point rules</h2>
                  </div>
                  <div className="space-y-3">
                    {pointRules.map((rule, index) => (
                      <div key={rule.id ?? index} className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
                        <TextInput label="Position" type="number" value={String(rule.finishPosition || '')} onChange={(value) => setPointRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, finishPosition: Number(value) } : item))} />
                        <TextInput label="Points" type="number" value={String(rule.points || '')} onChange={(value) => setPointRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, points: Number(value) } : item))} />
                        <TextInput label="Note" value={rule.note ?? ''} onChange={(value) => setPointRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note: value } : item))} />
                        <button
                          type="button"
                          onClick={() => void handleDeletePointRule(index)}
                          className="self-end rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPointRules((current) => [...current, createEmptyPointRule()])}
                      className="rounded-md border border-outline-variant px-4 py-2 text-label-sm font-bold text-on-surface"
                    >
                      Add rule
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSavePointRules()}
                      disabled={isBusy}
                      className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90"
                    >
                      Save point rules
                    </button>
                  </div>
                </article>
              </section>

              <section className="glass-panel rounded-xl p-6">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <h2 className="font-display text-title-large font-bold text-primary">Admin race results</h2>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => void handleConfirmResults()} disabled={isBusy || isLoadingAdminResults} className="rounded-md bg-secondary px-4 py-2 text-label-sm font-bold text-white">Confirm</button>
                    <button type="button" onClick={() => void handlePublishResults()} disabled={isBusy || isLoadingAdminResults} className="rounded-md bg-primary px-4 py-2 text-label-sm font-bold text-on-primary">Publish</button>
                  </div>
                </div>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="min-w-0 flex-1">
                    <TextArea label="Cancel reason" value={cancelReason} onChange={setCancelReason} />
                  </div>
                  <button type="button" onClick={() => void handleCancelResults()} disabled={isBusy || isLoadingAdminResults} className="rounded-md border border-error/40 px-4 py-3 text-label-sm font-bold text-error">
                    Cancel results
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-outline-variant bg-surface-container">
                      <tr>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Assignment</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Jockey</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Position</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Time</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Points</th>
                        <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {adminResults.map((item) => (
                        <tr key={`${item.resultId ?? item.assignmentId}-${item.assignmentId}`}>
                          <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.assignmentId}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.horseName ?? '-'}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.jockeyFullName ?? '-'}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.finishPosition ?? '-'}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatSeconds(item.finishTimeSec)}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.pointsAwarded ?? 0}</td>
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.status ?? '-'}</td>
                        </tr>
                      ))}
                      {adminResults.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No admin result records found for this race.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ParticipantResultRow = ({
  item,
  participant,
  index,
  total,
  lapStats,
  configuredLapCount,
  points,
  gapLabel,
  isEditable,
  onChange,
  onMove,
}: {
  item: RaceDraftResultItemInput;
  participant?: JockeyAssignmentItem;
  index: number;
  total: number;
  lapStats?: ParticipantLapStats;
  configuredLapCount?: number;
  points: number;
  gapLabel: string;
  isEditable: boolean;
  onChange: (item: RaceDraftResultItemInput) => void;
  onMove: (direction: -1 | 1) => void;
}) => (
  <article className="rounded-lg border border-outline-variant bg-surface-container-low p-4 transition-colors hover:border-primary/40">
    <div className="grid gap-4 lg:grid-cols-[64px_minmax(0,1.2fr)_minmax(0,0.8fr)_140px_auto] lg:items-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg font-display text-xl font-extrabold ${item.isDisqualified ? 'bg-error-container/40 text-error' : 'bg-secondary/15 text-secondary'}`}>
        {item.isDisqualified ? 'DQ' : item.finishPosition ?? index + 1}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {participant?.horseAvatarUrl ? (
          <img src={participant.horseAvatarUrl} alt={participant.horseName ?? 'Race horse'} className="h-11 w-11 shrink-0 rounded-md border border-outline-variant object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-white text-label-sm font-bold text-outline">H</div>
        )}
        <div className="min-w-0">
          <p className="break-words text-body-sm font-bold text-primary">{participant?.horseName ?? `Assignment #${item.assignmentId}`}</p>
          <p className="mt-1 text-label-sm text-on-surface-variant">Gate {participant?.gateNumber ?? '-'} | Assignment #{item.assignmentId}</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Jockey</p>
        <p className="mt-1 break-words text-body-sm font-semibold text-on-surface-variant">{participant?.jockeyFullName ?? `Jockey ${participant?.jockeyId ?? '-'}`}</p>
      </div>
      <label className="grid gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Total time (sec)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          disabled={!isEditable || item.isDisqualified}
          value={item.finishTimeSec ?? ''}
          onChange={(event) => onChange({ ...item, finishTimeSec: event.target.value ? Number(event.target.value) : undefined })}
          className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-container disabled:opacity-70"
          aria-label={`Total time for ${participant?.horseName ?? `assignment ${item.assignmentId}`}`}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={!isEditable || index === 0}
          aria-label={`Move ${participant?.horseName ?? 'horse'} up`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={!isEditable || index === total - 1}
          aria-label={`Move ${participant?.horseName ?? 'horse'} down`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="mt-3 grid gap-2 border-t border-outline-variant pt-3 sm:grid-cols-2 lg:grid-cols-5">
      <RankingStat label="Completed" value={`${lapStats?.completedLaps ?? 0}${configuredLapCount ? `/${configuredLapCount}` : ''}`} />
      <RankingStat label="Best lap" value={formatSeconds(lapStats?.bestLapSec)} />
      <RankingStat label="Average" value={formatSeconds(lapStats?.averageLapSec)} />
      <RankingStat label="Gap" value={gapLabel} />
      <RankingStat label="Points" value={String(points)} emphasis />
    </div>

    <div className="mt-3 grid gap-3 border-t border-outline-variant pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <label className={`flex items-center gap-2 text-body-sm font-semibold text-primary ${isEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
        <input
          type="checkbox"
          checked={item.isDisqualified}
          disabled={!isEditable}
          onChange={(event) => onChange({ ...item, isDisqualified: event.target.checked })}
        />
        Disqualified
      </label>
      {item.isDisqualified && (
        <label className="grid gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Disqualification reason</span>
          <input
            value={item.disqualifyReason ?? ''}
            disabled={!isEditable}
            onChange={(event) => onChange({ ...item, disqualifyReason: event.target.value })}
            className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-container disabled:opacity-70"
          />
        </label>
      )}
    </div>
  </article>
);

const RankingStat = ({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div className="rounded-md border border-outline-variant/70 bg-white px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-wider text-outline">{label}</p>
    <p className={`mt-1 text-body-sm font-bold ${emphasis ? 'text-secondary' : 'text-on-surface'}`}>{value}</p>
  </div>
);
const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2">
    <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
    <p className="mt-1 truncate text-body-sm font-semibold text-on-surface" title={value}>{value}</p>
  </div>
);

const TextInput = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <label className="grid min-w-0 gap-2">
    <span className="min-w-0 break-words text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-w-0 w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none"
    />
  </label>
);

const SelectInput = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => (
  <label className="grid min-w-0 gap-2">
    <span className="min-w-0 break-words text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-w-0 w-full cursor-pointer rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const TextArea = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="grid min-w-0 gap-2">
    <span className="min-w-0 break-words text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="min-h-[104px] w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none"
    />
  </label>
);

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type RaceScheduleSummary = {
  scheduleId?: number;
  scheduleTitle?: string;
  dayNumber?: number;
  scheduledAt?: string;
};

const getScheduleLabel = (race?: RaceScheduleSummary) => {
  const title = race?.scheduleTitle?.trim();
  if (title) {
    return title;
  }

  if (race?.dayNumber) {
    return `Day ${race.dayNumber}`;
  }

  if (race?.scheduleId) {
    return `Schedule #${race.scheduleId}`;
  }

  return formatDateTime(race?.scheduledAt);
};

export default RaceControlPage;

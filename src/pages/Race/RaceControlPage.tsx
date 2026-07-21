import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Flag, Gauge, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem } from '../../services/jockeyAssignmentService';
import {
  raceOperationsService,
  type RaceDraftResultItemInput,
  type RacePointRuleItem,
  type RaceResultDraftData,
  type RefereeAssignedRaceItem,
  type RefereeReportFormData,
  type RefereeReportItem,
} from '../../services/raceOperationsService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { useAdminRaceResults } from '../../hooks/useAdminRaceResults';

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

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
  const [assignedRaces, setAssignedRaces] = useState<RefereeAssignedRaceItem[]>([]);
  const [participants, setParticipants] = useState<JockeyAssignmentItem[]>([]);
  const [reports, setReports] = useState<RefereeReportItem[]>([]);
  const [draft, setDraft] = useState<RaceResultDraftData | null>(null);
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
  const isRaceInProgress = normalizeStatus(activeRaceSummary?.status ?? draft?.status) === 'in_progress';
  const currentRefereeId = profile?.refereeProfile?.refereeId ?? profile?.userId;
  const automaticReportId = draft?.reportId
    ?? reports.find((report) => report.refereeId === currentRefereeId)?.reportId;
  const participantByAssignmentId = useMemo(
    () => new Map(participants.map((participant) => [participant.assignmentId ?? participant.id ?? 0, participant])),
    [participants],
  );

  const handleSelectRace = (raceId: string) => {
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
      setDraftItems([]);
      setAdminResults([]);
      setPointRules([createEmptyPointRule()]);
      return;
    }

    setIsLoadingRaceData(true);
    setErrorMessage('');

    try {
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
            finishTimeSec: item.finishTimeSec ?? undefined,
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

        <section className="mb-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <article className="glass-panel rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <Gauge className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">Race selector</h2>
            </div>

            <TextInput
              label="Race ID"
              value={selectedRaceId}
              onChange={handleSelectRace}
              placeholder="Enter race ID"
            />

            {isReferee && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-outline">Assigned races</p>
                  <button
                    type="button"
                    onClick={() => void loadAssignedRaces()}
                    className="text-label-sm font-semibold text-primary"
                    disabled={isBusy || isLoadingAssigned}
                  >
                    Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {isLoadingAssigned ? (
                    <p className="text-body-sm text-on-surface-variant">Loading assigned races...</p>
                  ) : assignedRaces.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">No assigned races found.</p>
                  ) : assignedRaces.map((race) => (
                    <button
                      key={race.assignmentId ?? race.raceId}
                      type="button"
                      onClick={() => handleSelectRace(String(race.raceId))}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                        String(race.raceId) === normalizedRaceId
                          ? 'border-primary bg-primary-container/10'
                          : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      <p className="font-semibold text-on-surface">{race.raceName}</p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Race #{race.raceId} • {race.refereeRole ?? 'Referee'} • {race.status}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className="glass-panel rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">Current race snapshot</h2>
            </div>
            {!normalizedRaceId ? (
              <p className="text-body-sm text-on-surface-variant">Select or enter a race to load workflow data.</p>
            ) : isLoadingRaceData || isLoadingAdminResults ? (
              <p className="text-body-sm text-on-surface-variant">Loading workflow data...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoTile label="Race ID" value={normalizedRaceId} />
                <InfoTile label="Race Name" value={activeRaceSummary?.raceName ?? draft?.raceName ?? adminResults[0]?.raceName ?? '-'} />
                <InfoTile label="Status" value={activeRaceSummary?.status ?? draft?.status ?? adminResults[0]?.status ?? '-'} />
                <InfoTile label={isReferee ? "Participants" : "Result records"} value={String(isReferee ? participants.length : adminResults.length)} />
              </div>
            )}
          </article>
        </section>

        <div className="space-y-6">
          {isReferee && (
            <section className="grid gap-6 xl:grid-cols-2">
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

              <article className="glass-panel rounded-xl p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-secondary" />
                    <h2 className="font-display text-title-large font-bold text-primary">Race ranking</h2>
                  </div>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{activeRaceSummary?.refereeRole ?? 'Referee'}</span>
                </div>
                {!canEditResults && (
                  <p className="mb-4 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">Only a chief or main referee can save the official draft ranking.</p>
                )}
                {canEditResults && !isRaceInProgress && (
                  <p className="mb-4 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">Ranking can be saved when the race is in progress.</p>
                )}
                <form onSubmit={handleSubmitDraft} className="grid gap-4">
                  <p className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm text-on-surface-variant">
                    {automaticReportId
                      ? 'Your report will be linked to this ranking automatically.'
                      : 'No report from your account is available yet. You can still save the ranking without entering a report ID.'}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Use the arrow buttons to reorder horses. Finish positions update automatically.</p>
                  <div className="space-y-3">
                    {draftItems.map((item, index) => (
                      <ParticipantResultRow
                        key={item.assignmentId}
                        item={item}
                        participant={participantByAssignmentId.get(item.assignmentId)}
                        index={index}
                        total={draftItems.length}
                        onChange={(nextItem) => updateDraftItem(index, nextItem)}
                        onMove={(direction) => moveDraftItem(index, direction)}
                      />
                    ))}
                    {!isLoadingRaceData && draftItems.length === 0 && (
                      <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-8 text-center text-body-sm text-on-surface-variant">No confirmed horse assignments found for this race.</div>
                    )}
                  </div>
                  <button disabled={isBusy || !canEditResults || !isRaceInProgress || draftItems.length === 0}
                    className="cursor-pointer rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                    {draft ? 'Update draft ranking' : 'Save draft ranking'}
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
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Type</th>
                      <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {reports.map((report) => (
                      <tr key={report.reportId}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{report.reportId}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.verdict ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{report.reportType ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{formatDateTime(report.submittedAt)}</td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No reports found for this race.</td>
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
                          <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.finishTimeSec ?? '-'}</td>
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
  onChange,
  onMove,
}: {
  item: RaceDraftResultItemInput;
  participant?: JockeyAssignmentItem;
  index: number;
  total: number;
  onChange: (item: RaceDraftResultItemInput) => void;
  onMove: (direction: -1 | 1) => void;
}) => (
  <article className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
    <div className="grid gap-4 lg:grid-cols-[64px_minmax(0,1.2fr)_minmax(0,0.8fr)_120px_auto] lg:items-center">
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
          <p className="mt-1 text-label-sm text-on-surface-variant">Gate {participant?.gateNumber ?? '-'} ? Assignment #{item.assignmentId}</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Jockey</p>
        <p className="mt-1 break-words text-body-sm font-semibold text-on-surface-variant">{participant?.jockeyFullName ?? `Jockey ${participant?.jockeyId ?? '-'}`}</p>
      </div>
      <label className="grid gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Time (sec)</span>
        <input type="number" min="0" step="0.001" disabled={item.isDisqualified} value={item.finishTimeSec ?? ''}
          onChange={(event) => onChange({ ...item, finishTimeSec: event.target.value ? Number(event.target.value) : undefined })}
          className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:opacity-50" />
      </label>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${participant?.horseName ?? 'horse'} up`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move ${participant?.horseName ?? 'horse'} down`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-outline-variant bg-white text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
      </div>
    </div>
    <div className="mt-3 grid gap-3 border-t border-outline-variant pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <label className="flex cursor-pointer items-center gap-2 text-body-sm font-semibold text-primary">
        <input type="checkbox" checked={item.isDisqualified} onChange={(event) => onChange({ ...item, isDisqualified: event.target.checked })} />
        Disqualified
      </label>
      {item.isDisqualified && (
        <label className="grid gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Disqualification reason</span>
          <input value={item.disqualifyReason ?? ''} onChange={(event) => onChange({ ...item, disqualifyReason: event.target.value })}
            className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none" />
        </label>
      )}
    </div>
  </article>
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
  <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
    <p className="text-label-sm font-bold uppercase tracking-[0.12em] text-outline">{label}</p>
    <p className="mt-2 font-semibold text-on-surface">{value}</p>
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

export default RaceControlPage;

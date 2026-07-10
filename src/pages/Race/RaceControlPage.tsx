import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ClipboardList, Flag, Gauge, ShieldCheck, Trophy } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
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

const createEmptyDraftItem = (): RaceDraftResultItemInput => ({
  assignmentId: 0,
  finishPosition: undefined,
  finishTimeSec: undefined,
  isDisqualified: false,
  disqualifyReason: '',
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

const RaceControlPage = () => {
  const profile = authService.getStoredUserProfile();
  const roleType = profile?.roleType;
  const isAdmin = roleType === 'admin';
  const isReferee = roleType === 'race_referee';

  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [assignedRaces, setAssignedRaces] = useState<RefereeAssignedRaceItem[]>([]);
  const [reports, setReports] = useState<RefereeReportItem[]>([]);
  const [draft, setDraft] = useState<RaceResultDraftData | null>(null);
  const [pointRules, setPointRules] = useState<RacePointRuleItem[]>([createEmptyPointRule()]);
  const [reportForm, setReportForm] = useState<RefereeReportFormData>(initialReportForm);
  const [draftReportId, setDraftReportId] = useState('');
  const [draftItems, setDraftItems] = useState<RaceDraftResultItemInput[]>([createEmptyDraftItem()]);
  const [cancelReason, setCancelReason] = useState('');
  const [forceCloseBetting, setForceCloseBetting] = useState(false);
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

  const loadAssignedRaces = async () => {
    if (!isReferee) {
      return;
    }

    setIsLoadingAssigned(true);
    try {
      const data = await raceOperationsService.getAssignedRaces();
      setAssignedRaces(data);
      if (!normalizedRaceId && data.length > 0) {
        setSelectedRaceId(String(data[0].raceId));
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
      setAdminResults([]);
      setPointRules([createEmptyPointRule()]);
      return;
    }

    setIsLoadingRaceData(true);
    setErrorMessage('');

    try {
      if (isReferee) {
        const [reportData, draftData] = await Promise.all([
          raceOperationsService.getReports(raceId),
          raceOperationsService.getDraft(raceId).catch(() => null),
        ]);

        setReports(reportData);
        setDraft(draftData);
        setDraftReportId(String(draftData?.reportId ?? reportData[0]?.reportId ?? ''));
        setDraftItems(
          draftData?.results.length
            ? draftData.results.map((item) => ({
              assignmentId: item.assignmentId,
              finishPosition: item.finishPosition ?? undefined,
              finishTimeSec: item.finishTimeSec ?? undefined,
              isDisqualified: item.isDisqualified,
              disqualifyReason: item.disqualifyReason ?? '',
            }))
            : [createEmptyDraftItem()],
        );
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
    void loadAssignedRaces();
  }, []);

  useEffect(() => {
    void loadRaceData(normalizedRaceId);
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

  const handleSubmitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedRaceId) {
      setErrorMessage('Select a race before submitting a report.');
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

    await withBusy(async () => {
      const payload = {
        reportId: draftReportId ? Number(draftReportId) : undefined,
        results: draftItems,
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

    await withBusy(async () => {
      const response = await raceOperationsService.startRace(normalizedRaceId, { forceCloseBetting });
      setMessage(response.message ?? 'Race started successfully.');
      await loadRaceData(normalizedRaceId);
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
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Published" value={String(publishedCount).padStart(2, '0')} />
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
              onChange={setSelectedRaceId}
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
                      onClick={() => setSelectedRaceId(String(race.raceId))}
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
              <div className="grid gap-4 md:grid-cols-3">
                <InfoTile label="Race ID" value={normalizedRaceId} />
                <InfoTile label="Race Name" value={activeRaceSummary?.raceName ?? draft?.raceName ?? adminResults[0]?.raceName ?? '-'} />
                <InfoTile label="Status" value={activeRaceSummary?.status ?? draft?.status ?? adminResults[0]?.status ?? '-'} />
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
                <form onSubmit={handleSubmitReport} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="Report type" value={reportForm.reportType ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, reportType: value }))} />
                    <TextInput label="Verdict" value={reportForm.verdict ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, verdict: value }))} />
                  </div>
                  <TextArea label="Inspection notes" value={reportForm.inspectionNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, inspectionNotes: value }))} />
                  <TextArea label="Violation notes" value={reportForm.violationNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, violationNotes: value }))} />
                  <TextArea label="Result notes" value={reportForm.resultNotes ?? ''} onChange={(value) => setReportForm((current) => ({ ...current, resultNotes: value }))} />
                  <button disabled={isBusy} className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">
                    Submit report
                  </button>
                </form>
              </article>

              <article className="glass-panel rounded-xl p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-secondary" />
                  <h2 className="font-display text-title-large font-bold text-primary">Draft results</h2>
                </div>
                <form onSubmit={handleSubmitDraft} className="grid gap-4">
                  <TextInput label="Report ID" type="number" value={draftReportId} onChange={setDraftReportId} placeholder="Use one submitted report ID" />
                  <div className="space-y-3">
                    {draftItems.map((item, index) => (
                      <DraftRow
                        key={index}
                        item={item}
                        onChange={(nextItem) => setDraftItems((current) => current.map((entry, entryIndex) => entryIndex === index ? nextItem : entry))}
                        onRemove={() => setDraftItems((current) => current.length === 1 ? current : current.filter((_, entryIndex) => entryIndex !== index))}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setDraftItems((current) => [...current, createEmptyDraftItem()])}
                      className="rounded-md border border-outline-variant px-4 py-2 text-label-sm font-bold text-on-surface"
                    >
                      Add result row
                    </button>
                    <button disabled={isBusy} className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">
                      {draft ? 'Update draft' : 'Create draft'}
                    </button>
                  </div>
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
                    disabled={isBusy}
                    className="mt-4 rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90"
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

const DraftRow = ({
  item,
  onChange,
  onRemove,
}: {
  item: RaceDraftResultItemInput;
  onChange: (item: RaceDraftResultItemInput) => void;
  onRemove: () => void;
}) => (
  <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextInput label="Assignment ID" type="number" value={String(item.assignmentId || '')} onChange={(value) => onChange({ ...item, assignmentId: Number(value) })} />
      <TextInput label="Finish position" type="number" value={String(item.finishPosition ?? '')} onChange={(value) => onChange({ ...item, finishPosition: value ? Number(value) : undefined })} />
      <TextInput label="Finish time sec" type="number" value={String(item.finishTimeSec ?? '')} onChange={(value) => onChange({ ...item, finishTimeSec: value ? Number(value) : undefined })} />
      <TextInput label="DQ reason" value={item.disqualifyReason ?? ''} onChange={(value) => onChange({ ...item, disqualifyReason: value })} />
    </div>
    <div className="mt-3 flex items-center justify-between">
      <label className="flex items-center gap-3 text-body-sm font-semibold text-primary">
        <input type="checkbox" checked={item.isDisqualified} onChange={(event) => onChange({ ...item, isDisqualified: event.target.checked })} />
        Disqualified
      </label>
      <button type="button" onClick={onRemove} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error">
        Remove row
      </button>
    </div>
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

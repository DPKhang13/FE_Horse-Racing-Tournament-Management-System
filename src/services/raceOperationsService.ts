import { apiClient, getApiResponseMessage, unwrapApiData, unwrapApiList } from './apiClient';
import { formatRefereeRoleLabel } from '../utils/permissions';

type RawObject = Record<string, unknown>;

export type RacePointRuleItem = {
  id?: number;
  raceId?: number;
  finishPosition: number;
  points: number;
  note?: string;
};

export type RefereeAssignedRaceItem = {
  raceId: number;
  raceName: string;
  tournamentName?: string;
  scheduleId?: number;
  scheduleTitle?: string;
  dayNumber?: number;
  status: string;
  scheduledAt?: string;
  predictionClosesAt?: string;
  refereeRole?: string;
  assignmentId?: number;
  assignedAt?: string;
};

export type ChiefRaceParticipantItem = {
  assignmentId?: number;
  id?: number;
  regId?: number;
  ownerConfirmationStatus?: string;
  raceId?: number;
  jockeyId?: number;
  gateNumber?: number;
  status?: string;
  invitedAt?: string;
  responseDeadline?: string;
  respondedAt?: string;
  cancelledAt?: string;
  expiredAt?: string;
  raceName?: string;
  tournamentName?: string;
  raceNumber?: number;
  scheduledAt?: string;
  horseId?: number;
  horseName?: string;
  horseAvatarUrl?: string;
  ownerId?: number;
  ownerFullName?: string;
  ownerStableName?: string;
  jockeyFullName?: string;
  jockeyAvatarUrl?: string;
};

export type RefereeReportFormData = {
  reportType?: string;
  inspectionNotes?: string;
  violationNotes?: string;
  resultNotes?: string;
  verdict?: string;
};

export type RefereeReportItem = {
  reportId: number;
  raceId: number;
  raceName: string;
  refereeId?: number;
  refereeFullName?: string;
  refereeRole?: string;
  reportType?: string;
  inspectionNotes?: string;
  violationNotes?: string;
  resultNotes?: string;
  verdict?: string;
  submittedAt?: string;
};

export type RaceDraftResultItemInput = {
  assignmentId: number;
  finishPosition?: number;
  finishTimeSec?: number;
  isDisqualified: boolean;
  disqualifyReason?: string;
};

export type RaceResultWorkflowItem = {
  id?: number;
  resultId?: number;
  assignmentId: number;
  raceId?: number;
  reportId?: number;
  horseId?: number;
  horseName?: string;
  jockeyId?: number;
  jockeyFullName?: string;
  gateNumber?: number;
  finishPosition?: number | null;
  finishTimeSec?: number | null;
  pointsAwarded?: number;
  isDisqualified: boolean;
  disqualifyReason?: string;
  status?: string;
  raceName?: string;
  tournamentId?: number;
  tournamentName?: string;
  reportVerdict?: string;
  publishedAt?: string;
  recordedAt?: string;
};

export type RaceResultDraftData = {
  raceId: number;
  raceName: string;
  status: string;
  reportId?: number;
  submittedByRefereeId?: number;
  results: RaceResultWorkflowItem[];
};

export type RaceStartData = {
  raceId: number;
  raceName: string;
  previousStatus?: string;
  status: string;
  scheduledAt?: string;
  predictionClosesAt?: string;
  bettingClosed?: boolean;
  message?: string;
};

export type RacePublishData = {
  raceId: number;
  raceName: string;
  raceStatus: string;
  publishedAt?: string;
  totalResults?: number;
  winnerHorseId?: number;
  winnerHorseName?: string;
  winnerJockeyId?: number;
  winnerJockeyName?: string;
  totalBetsSettled?: number;
  totalRewardsPaid?: number;
  message?: string;
};

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};


const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const asOptionalNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const asNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const asBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
};

const mapPointRule = (raw: RawObject): RacePointRuleItem => ({
  id: asOptionalNumber(raw.id),
  raceId: asOptionalNumber(raw.raceId),
  finishPosition: asNumber(raw.finishPosition),
  points: asNumber(raw.points),
  note: asString(raw.note) || undefined,
});

const mapAssignedRace = (raw: RawObject): RefereeAssignedRaceItem => ({
  raceId: asNumber(raw.raceId),
  tournamentName: asString(raw.tournamentName) || undefined,
  scheduleId: asOptionalNumber(raw.scheduleId),
  scheduleTitle: asString(raw.scheduleTitle ?? raw.scheduleName) || undefined,
  dayNumber: asOptionalNumber(raw.dayNumber ?? raw.day),
  raceName: asString(raw.raceName, 'Race'),
  status: asString(raw.status, 'scheduled'),
  scheduledAt: asString(raw.scheduledAt) || undefined,
  predictionClosesAt: asString(raw.predictionClosesAt) || undefined,
  refereeRole: formatRefereeRoleLabel(raw.refereeRole, '') || undefined,
  assignmentId: asOptionalNumber(raw.assignmentId),
  assignedAt: asString(raw.assignedAt) || undefined,
});

const mapChiefParticipant = (raw: RawObject): ChiefRaceParticipantItem => ({
  assignmentId: asOptionalNumber(raw.assignmentId),
  id: asOptionalNumber(raw.id),
  regId: asOptionalNumber(raw.regId),
  ownerConfirmationStatus: asString(raw.ownerConfirmationStatus) || undefined,
  raceId: asOptionalNumber(raw.raceId),
  jockeyId: asOptionalNumber(raw.jockeyId),
  gateNumber: asOptionalNumber(raw.gateNumber),
  status: asString(raw.status) || undefined,
  invitedAt: asString(raw.invitedAt) || undefined,
  responseDeadline: asString(raw.responseDeadline) || undefined,
  respondedAt: asString(raw.respondedAt) || undefined,
  cancelledAt: asString(raw.cancelledAt) || undefined,
  expiredAt: asString(raw.expiredAt) || undefined,
  raceName: asString(raw.raceName) || undefined,
  tournamentName: asString(raw.tournamentName) || undefined,
  raceNumber: asOptionalNumber(raw.raceNumber),
  scheduledAt: asString(raw.scheduledAt) || undefined,
  horseId: asOptionalNumber(raw.horseId),
  horseName: asString(raw.horseName) || undefined,
  horseAvatarUrl: asString(raw.horseAvatarUrl) || undefined,
  ownerId: asOptionalNumber(raw.ownerId),
  ownerFullName: asString(raw.ownerFullName) || undefined,
  ownerStableName: asString(raw.ownerStableName) || undefined,
  jockeyFullName: asString(raw.jockeyFullName) || undefined,
  jockeyAvatarUrl: asString(raw.jockeyAvatarUrl) || undefined,
});

const mapReport = (raw: RawObject): RefereeReportItem => ({
  reportId: asNumber(raw.reportId ?? raw.id),
  raceId: asNumber(raw.raceId),
  raceName: asString(raw.raceName, 'Race'),
  refereeId: asOptionalNumber(raw.refereeId),
  refereeFullName: asString(raw.refereeFullName) || undefined,
  refereeRole: formatRefereeRoleLabel(raw.refereeRole, '') || undefined,
  reportType: asString(raw.reportType) || undefined,
  inspectionNotes: asString(raw.inspectionNotes) || undefined,
  violationNotes: asString(raw.violationNotes) || undefined,
  resultNotes: asString(raw.resultNotes) || undefined,
  verdict: asString(raw.verdict) || undefined,
  submittedAt: asString(raw.submittedAt) || undefined,
});

const mapWorkflowResult = (raw: RawObject): RaceResultWorkflowItem => ({
  id: asOptionalNumber(raw.id),
  resultId: asOptionalNumber(raw.resultId),
  assignmentId: asNumber(raw.assignmentId),
  raceId: asOptionalNumber(raw.raceId),
  reportId: asOptionalNumber(raw.reportId),
  horseId: asOptionalNumber(raw.horseId),
  horseName: asString(raw.horseName) || undefined,
  jockeyId: asOptionalNumber(raw.jockeyId),
  jockeyFullName: asString(raw.jockeyFullName) || undefined,
  gateNumber: asOptionalNumber(raw.gateNumber),
  finishPosition: raw.finishPosition === null ? null : asOptionalNumber(raw.finishPosition),
  finishTimeSec: asNullableNumber(raw.finishTimeSec),
  pointsAwarded: asOptionalNumber(raw.pointsAwarded),
  isDisqualified: asBoolean(raw.isDisqualified),
  disqualifyReason: asString(raw.disqualifyReason) || undefined,
  status: asString(raw.status) || undefined,
  raceName: asString(raw.raceName) || undefined,
  tournamentId: asOptionalNumber(raw.tournamentId),
  tournamentName: asString(raw.tournamentName) || undefined,
  reportVerdict: asString(raw.reportVerdict) || undefined,
  publishedAt: asString(raw.publishedAt) || undefined,
  recordedAt: asString(raw.recordedAt) || undefined,
});

const mapDraft = (raw: RawObject): RaceResultDraftData => ({
  raceId: asNumber(raw.raceId),
  raceName: asString(raw.raceName, 'Race'),
  status: asString(raw.status, 'draft'),
  reportId: asOptionalNumber(raw.reportId),
  submittedByRefereeId: asOptionalNumber(raw.submittedByRefereeId),
  results: Array.isArray(raw.results) ? raw.results.map((item) => mapWorkflowResult(item as RawObject)) : [],
});

const mapRaceStart = (raw: RawObject): RaceStartData => ({
  raceId: asNumber(raw.raceId),
  raceName: asString(raw.raceName, 'Race'),
  previousStatus: asString(raw.previousStatus) || undefined,
  status: asString(raw.status, 'in_progress'),
  scheduledAt: asString(raw.scheduledAt) || undefined,
  predictionClosesAt: asString(raw.predictionClosesAt) || undefined,
  bettingClosed: raw.bettingClosed === undefined ? undefined : asBoolean(raw.bettingClosed),
  message: asString(raw.message) || undefined,
});

const mapPublishResponse = (raw: RawObject): RacePublishData => ({
  raceId: asNumber(raw.raceId),
  raceName: asString(raw.raceName, 'Race'),
  raceStatus: asString(raw.raceStatus, 'completed'),
  publishedAt: asString(raw.publishedAt) || undefined,
  totalResults: asOptionalNumber(raw.totalResults),
  winnerHorseId: asOptionalNumber(raw.winnerHorseId),
  winnerHorseName: asString(raw.winnerHorseName) || undefined,
  winnerJockeyId: asOptionalNumber(raw.winnerJockeyId),
  winnerJockeyName: asString(raw.winnerJockeyName) || undefined,
  totalBetsSettled: asOptionalNumber(raw.totalBetsSettled),
  totalRewardsPaid: asOptionalNumber(raw.totalRewardsPaid),
  message: asString(raw.message) || undefined,
});

const toDraftPayload = (data: { reportId?: number; results: RaceDraftResultItemInput[] }) => ({
  reportId: data.reportId ? Number(data.reportId) : undefined,
  results: data.results.map((item) => ({
    assignmentId: Number(item.assignmentId),
    finishPosition: item.finishPosition ? Number(item.finishPosition) : undefined,
    finishTimeSec: item.finishTimeSec ? Number(item.finishTimeSec.toFixed(2)) : undefined,
    isDisqualified: Boolean(item.isDisqualified),
    disqualifyReason: item.disqualifyReason?.trim() || undefined,
  })),
});

export const raceOperationsService = {
  async getPointRules(raceId: number | string): Promise<RacePointRuleItem[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/point-rules/get`);
    return unwrapApiList<RawObject>(response).map(mapPointRule);
  },

  async createPointRules(raceId: number | string, rules: RacePointRuleItem[]): Promise<RacePointRuleItem[]> {
    const response = await apiClient.post(
      `/api/v1/admin/races/${raceId}/point-rules/create`,
      rules.map((rule) => ({
        finishPosition: Number(rule.finishPosition),
        points: Number(rule.points),
        note: rule.note?.trim() || undefined,
      })),
    );
    return unwrapApiList<RawObject>(response).map(mapPointRule);
  },

  async updatePointRules(raceId: number | string, rules: RacePointRuleItem[]): Promise<RacePointRuleItem[]> {
    const response = await apiClient.put(
      `/api/v1/admin/races/${raceId}/point-rules/update`,
      rules.map((rule) => ({
        finishPosition: Number(rule.finishPosition),
        points: Number(rule.points),
        note: rule.note?.trim() || undefined,
      })),
    );
    return unwrapApiList<RawObject>(response).map(mapPointRule);
  },

  async deletePointRule(raceId: number | string, ruleId: number | string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/races/${raceId}/point-rules/delete/${ruleId}`);
  },

  async startRace(raceId: number | string, data: { forceCloseBetting?: boolean; note?: string } = {}): Promise<RaceStartData> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/start`, {
      forceCloseBetting: data.forceCloseBetting ?? false,
      note: data.note?.trim() || undefined,
    });
    const raceStart = mapRaceStart(unwrapApiData<RawObject>(response));
    return {
      ...raceStart,
      message: getApiResponseMessage(response) || raceStart.message,
    };
  },

  async startChiefRace(raceId: number | string, data: { forceCloseBetting?: boolean; note?: string } = {}): Promise<RaceStartData> {
    const response = await apiClient.patch(`/api/v1/referee/chief/races/${raceId}/start`, {
      forceCloseBetting: data.forceCloseBetting ?? true,
      note: data.note?.trim() || undefined,
    });
    const raceStart = mapRaceStart(unwrapApiData<RawObject>(response));
    return {
      ...raceStart,
      message: getApiResponseMessage(response) || raceStart.message,
    };
  },

  async getAssignedRaces(): Promise<RefereeAssignedRaceItem[]> {
    const response = await apiClient.get('/api/v1/referee/races/get-my-assigned');
    return unwrapApiList<RawObject>(response).map(mapAssignedRace);
  },

  async getChiefParticipants(raceId: number | string): Promise<ChiefRaceParticipantItem[]> {
    const response = await apiClient.get(`/api/v1/referee/chief/races/${raceId}/participants`);
    return unwrapApiList<RawObject>(response).map(mapChiefParticipant);
  },

  async createReport(raceId: number | string, data: RefereeReportFormData): Promise<RefereeReportItem> {
    const response = await apiClient.post(`/api/v1/referee/races/${raceId}/reports/create`, {
      reportType: data.reportType?.trim() ?? '',
      inspectionNotes: data.inspectionNotes?.trim() ?? '',
      violationNotes: data.violationNotes?.trim() ?? '',
      resultNotes: data.resultNotes?.trim() ?? '',
      verdict: data.verdict?.trim() ?? '',
    });
    return mapReport(unwrapApiData<RawObject>(response));
  },

  async getReports(raceId: number | string): Promise<RefereeReportItem[]> {
    const response = await apiClient.get(`/api/v1/referee/races/${raceId}/reports/get`);
    return unwrapApiList<RawObject>(response).map(mapReport);
  },

  async createChiefFinalReport(raceId: number | string, resultNotes: string): Promise<RefereeReportItem> {
    const response = await apiClient.post(`/api/v1/referee/races/${raceId}/reports/create`, {
      reportType: 'final',
      inspectionNotes: '',
      violationNotes: '',
      resultNotes: resultNotes.trim(),
      verdict: 'clean',
    });
    return mapReport(unwrapApiData<RawObject>(response));
  },

  async createDraft(raceId: number | string, data: { reportId?: number; results: RaceDraftResultItemInput[] }): Promise<RaceResultDraftData> {
    const response = await apiClient.post(`/api/v1/referee/chief/races/${raceId}/results/draft`, toDraftPayload(data));
    return mapDraft(unwrapApiData<RawObject>(response));
  },

  async updateDraft(raceId: number | string, data: { reportId?: number; results: RaceDraftResultItemInput[] }): Promise<RaceResultDraftData> {
    const response = await apiClient.put(`/api/v1/referee/chief/races/${raceId}/results/draft`, toDraftPayload(data));
    return mapDraft(unwrapApiData<RawObject>(response));
  },

  async getDraft(raceId: number | string): Promise<RaceResultDraftData> {
    const response = await apiClient.get(`/api/v1/referee/races/${raceId}/results/draft`);
    return mapDraft(unwrapApiData<RawObject>(response));
  },

  async confirmChiefResults(raceId: number | string): Promise<RaceResultWorkflowItem[]> {
    const response = await apiClient.patch(`/api/v1/referee/chief/races/${raceId}/results/confirm`);
    return unwrapApiList<RawObject>(response).map(mapWorkflowResult);
  },

  async getAdminResults(raceId: number | string): Promise<RaceResultWorkflowItem[]> {
    const response = await apiClient.get(`/api/v1/admin/races/${raceId}/results/get`);
    return unwrapApiList<RawObject>(response).map(mapWorkflowResult);
  },

  async getResultsByRace(raceId: number | string): Promise<RaceResultWorkflowItem[]> {
    const response = await apiClient.get(`/api/race-results/race/${raceId}/get-all`);
    return unwrapApiList<RawObject>(response).map(mapWorkflowResult);
  },

  async recalculateResultsFromRounds(raceId: number | string): Promise<RaceResultWorkflowItem[]> {
    const response = await apiClient.post(`/api/race-results/race/${raceId}/recalculate-from-rounds`);
    return unwrapApiList<RawObject>(response).map(mapWorkflowResult);
  },

  async confirmResults(raceId: number | string): Promise<RaceResultWorkflowItem[]> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/results/confirm`);
    return unwrapApiList<RawObject>(response).map(mapWorkflowResult);
  },

  async cancelResults(raceId: number | string, reason?: string): Promise<void> {
    await apiClient.patch(`/api/v1/admin/races/${raceId}/results/cancel`, reason?.trim() ? { reason: reason.trim() } : undefined);
  },

  async publishResults(raceId: number | string): Promise<RacePublishData> {
    const response = await apiClient.patch(`/api/v1/admin/races/${raceId}/results/publish`);
    return mapPublishResponse(unwrapApiData<RawObject>(response));
  },
};

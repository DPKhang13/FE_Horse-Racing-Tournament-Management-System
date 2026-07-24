import { apiClient, getApiResponseMessage, unwrapApiList } from './apiClient';
import type { PointRuleRequest, PointRuleResponse } from '../types/pointRule';

type RawRecord = Record<string, unknown>;

const isRawRecord = (value: unknown): value is RawRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const asString = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value);
  return text.trim() ? text : fallback;
};

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const extractList = (value: unknown): RawRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(isRawRecord);
  }

  if (!isRawRecord(value)) {
    return [];
  }

  for (const key of ['data', 'result', 'content', 'items', 'records', 'pointRules', 'rules']) {
    const nestedList = extractList(value[key]);

    if (nestedList.length > 0) {
      return nestedList;
    }
  }

  return [];
};

const unwrapPointRuleList = (response: Parameters<typeof unwrapApiList<RawRecord>>[0]) => {
  const directList = unwrapApiList<RawRecord>(response).filter(isRawRecord);

  if (directList.length > 0) {
    return directList;
  }

  return extractList(response.data);
};

const mapPointRule = (raw: RawRecord, raceId?: number | string): PointRuleResponse => ({
  id: asNumber(raw.id ?? raw.ruleId ?? raw.pointRuleId),
  raceId: asNumber(raw.raceId, asNumber(raceId)),
  finishPosition: asNumber(raw.finishPosition),
  points: asNumber(raw.points),
  note: asString(raw.note),
});

const toPointRulePayload = (rules: PointRuleRequest[]) =>
  rules
    .map((rule) => ({
      finishPosition: Number(rule.finishPosition),
      points: Number(rule.points),
      note: rule.note.trim(),
    }))
    .sort((first, second) => first.finishPosition - second.finishPosition);

const sortPointRules = <T extends PointRuleRequest>(rules: T[]) =>
  [...rules].sort((first, second) => first.finishPosition - second.finishPosition);

const getPointRuleEndpoint = (raceId: number | string) => `/api/v1/admin/races/${raceId}/point-rules`;

export type PointRuleMutationResult = {
  pointRules: PointRuleResponse[];
  responseMessage: string;
};

export const pointRuleService = {
  async getPointRules(raceId: number | string): Promise<PointRuleResponse[]> {
    const response = await apiClient.get(`${getPointRuleEndpoint(raceId)}/get`);

    return sortPointRules(unwrapPointRuleList(response).map((item) => mapPointRule(item, raceId)));
  },

  async createPointRules(raceId: number | string, rules: PointRuleRequest[]): Promise<PointRuleMutationResult> {
    const response = await apiClient.post(`${getPointRuleEndpoint(raceId)}/create`, toPointRulePayload(rules));

    return {
      pointRules: sortPointRules(unwrapPointRuleList(response).map((item) => mapPointRule(item, raceId))),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async replacePointRules(raceId: number | string, rules: PointRuleRequest[]): Promise<PointRuleMutationResult> {
    const response = await apiClient.put(`${getPointRuleEndpoint(raceId)}/update`, toPointRulePayload(rules));

    return {
      pointRules: sortPointRules(unwrapPointRuleList(response).map((item) => mapPointRule(item, raceId))),
      responseMessage: getApiResponseMessage(response),
    };
  },

  async deletePointRule(raceId: number | string, ruleId: number | string): Promise<string> {
    const response = await apiClient.delete(`${getPointRuleEndpoint(raceId)}/delete/${ruleId}`);
    return getApiResponseMessage(response);
  },
};

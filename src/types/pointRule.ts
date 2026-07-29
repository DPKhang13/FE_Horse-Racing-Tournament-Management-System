export type PointRuleRequest = {
  finishPosition: number;
  points: number;
  note: string;
};

export type PointRuleResponse = PointRuleRequest & {
  id: number;
  raceId: number;
};

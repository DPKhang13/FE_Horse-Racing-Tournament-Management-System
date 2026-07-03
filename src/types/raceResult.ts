export type RaceResultStatus = 'draft' | 'confirmed' | 'published';

export type TrackType = 'Turf' | 'Dirt' | 'Synthetic';

export type RaceResultEntry = {
  id: string;
  assignmentId: string;
  horseId: string;
  horseName: string;
  jockeyName: string;
  gateNumber: number;
  finishPosition: number | null;
  finishTime: string | null;
  pointsAwarded: number;
  isDisqualified: boolean;
  disqualificationReason?: string;
  prizeAmount?: string;
};

export type PrizeDistribution = {
  position: number;
  amount: string;
  label: string;
};

export type RaceResultSummary = {
  id: string;
  raceId: string;
  raceName: string;
  raceNumber: number;
  tournamentName: string;
  track: string;
  location: string;
  date: string;
  distance: string;
  trackType: TrackType;
  grade: string;
  status: RaceResultStatus;
  publishedAt?: string;
  winnerHorse: string;
  winnerJockey: string;
  winnerTime: string;
  totalPrizePool: string;
  entries: RaceResultEntry[];
  prizeDistributions: PrizeDistribution[];
};

export type RaceResultListItem = {
  id: string;
  raceId: string;
  raceName: string;
  raceNumber: number;
  tournamentName: string;
  track: string;
  date: string;
  status: RaceResultStatus;
  publishedAt?: string;
  totalPrizePool: string;
  topFinishers: Array<{
    rank: number;
    horseName: string;
    jockeyName: string;
    finishTime: string;
  }>;
};

export type RankingCategory = 'horse' | 'jockey';

export type RankingEntry = {
  rank: number;
  entityId: string;
  name: string;
  subtitle?: string;
  totalPoints: number;
  totalWins: number;
  totalRaces: number;
  winRate: number;
  recentForm?: string;
};

export type RankingBoard = {
  category: RankingCategory;
  tournamentName: string;
  season: string;
  lastUpdated: string;
  entries: RankingEntry[];
};

export type RaceResultFilters = {
  search?: string;
  status?: RaceResultStatus | 'all';
  tournament?: string;
};

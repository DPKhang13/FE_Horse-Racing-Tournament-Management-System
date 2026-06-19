import type {
  RaceResultEntry,
  RaceResultSummary,
  RankingBoard,
  RankingCategory,
  RankingEntry,
  TrackType,
} from '../types/raceResult';

type MockRunner = {
  horseId: string;
  horseName: string;
  jockeyName: string;
  finishTime: string | null;
  points: number;
  odds: string;
  disqualified?: string;
};

const prizeByPosition = ['₫320,000,000', '₫160,000,000', '₫80,000,000'];

const createEntries = (raceId: string, runners: MockRunner[]): RaceResultEntry[] =>
  runners.map((runner, index) => {
    const finishPosition = runner.disqualified ? null : index + 1;

    return {
      id: `${raceId}-${index + 1}`,
      assignmentId: `assignment-${raceId}-${index + 1}`,
      horseId: runner.horseId,
      horseName: runner.horseName,
      jockeyName: runner.jockeyName,
      gateNumber: index + 1,
      finishPosition,
      finishTime: runner.finishTime,
      pointsAwarded: runner.disqualified ? 0 : runner.points,
      isDisqualified: Boolean(runner.disqualified),
      disqualificationReason: runner.disqualified,
      prizeAmount: finishPosition && finishPosition <= 3 ? prizeByPosition[finishPosition - 1] : '-',
      odds: runner.odds,
    };
  });

const createResult = ({
  id,
  raceName,
  raceNumber,
  tournamentName,
  track,
  date,
  distance,
  trackType,
  grade,
  status,
  publishedAt,
  runners,
}: {
  id: string;
  raceName: string;
  raceNumber: number;
  tournamentName: string;
  track: string;
  date: string;
  distance: string;
  trackType: TrackType;
  grade: string;
  status: RaceResultSummary['status'];
  publishedAt?: string;
  runners: MockRunner[];
}): RaceResultSummary => {
  const entries = createEntries(id, runners);
  const winner = entries.find((entry) => entry.finishPosition === 1);

  return {
    id,
    raceId: id,
    raceName,
    raceNumber,
    tournamentName,
    track,
    location: track,
    date,
    distance,
    trackType,
    grade,
    status,
    publishedAt,
    winnerHorse: winner?.horseName ?? '-',
    winnerJockey: winner?.jockeyName ?? '-',
    winnerTime: winner?.finishTime ?? '-',
    totalPrizePool: '₫640,000,000',
    entries,
    prizeDistributions: [
      { position: 1, amount: '₫320,000,000', label: 'Champion' },
      { position: 2, amount: '₫160,000,000', label: 'Runner-up' },
      { position: 3, amount: '₫80,000,000', label: 'Third place' },
      { position: 4, amount: '₫48,000,000', label: 'Fourth place' },
      { position: 5, amount: '₫32,000,000', label: 'Fifth place' },
    ],
  };
};

export const mockRaceResults: RaceResultSummary[] = [
  createResult({
    id: 'result-101',
    raceName: 'Riverfront Classic',
    raceNumber: 6,
    tournamentName: 'National Stakes 2026',
    track: 'Saigon Riverside Track',
    date: '2026-06-18T05:30:00+07:00',
    distance: '1600m',
    trackType: 'Turf',
    grade: 'Elite',
    status: 'published',
    publishedAt: '2026-06-18T07:00:00+07:00',
    runners: [
      { horseId: 'horse-201', horseName: 'Lightning Bolt', jockeyName: 'Ethan Cole', finishTime: '1:22.45', points: 100, odds: '2.4' },
      { horseId: 'horse-206', horseName: 'Silver Comet', jockeyName: 'Oliver Dang', finishTime: '1:22.91', points: 80, odds: '3.1' },
      { horseId: 'horse-203', horseName: 'Neon Legend', jockeyName: 'Liam Pham', finishTime: '1:23.18', points: 65, odds: '2.8' },
      { horseId: 'horse-207', horseName: 'Crimson Star', jockeyName: 'Sophia Nguyen', finishTime: '1:23.77', points: 50, odds: '4.5' },
      { horseId: 'horse-209', horseName: 'Thunder Road', jockeyName: 'Mia Tran', finishTime: '1:24.09', points: 40, odds: '5.0' },
    ],
  }),
  createResult({
    id: 'result-102',
    raceName: 'Moonlight Stakes',
    raceNumber: 4,
    tournamentName: 'City Derby 2026',
    track: 'City Derby Arena',
    date: '2026-06-17T19:30:00+07:00',
    distance: '1400m',
    trackType: 'Synthetic',
    grade: 'Premium',
    status: 'published',
    publishedAt: '2026-06-17T21:15:00+07:00',
    runners: [
      { horseId: 'horse-203', horseName: 'Neon Legend', jockeyName: 'Liam Pham', finishTime: '1:18.90', points: 100, odds: '2.7' },
      { horseId: 'horse-208', horseName: 'Midnight Crown', jockeyName: 'Mia Tran', finishTime: '1:19.21', points: 80, odds: '3.4' },
      { horseId: 'horse-205', horseName: 'Royal Echo', jockeyName: 'Noah Vu', finishTime: '1:19.66', points: 65, odds: '4.2' },
      { horseId: 'horse-204', horseName: 'Emerald Wind', jockeyName: 'Ava Le', finishTime: '1:20.03', points: 50, odds: '3.8' },
      { horseId: 'horse-211', horseName: 'Blue Horizon', jockeyName: 'Kai Nguyen', finishTime: null, points: 0, odds: '6.1', disqualified: 'Track boundary violation' },
    ],
  }),
  createResult({
    id: 'result-103',
    raceName: 'Highland Cup',
    raceNumber: 3,
    tournamentName: 'Autumn Championship 2026',
    track: 'Da Lat Highland Course',
    date: '2026-06-15T15:00:00+07:00',
    distance: '2000m',
    trackType: 'Dirt',
    grade: 'Champion',
    status: 'confirmed',
    runners: [
      { horseId: 'horse-212', horseName: 'Winter Sky', jockeyName: 'Sophia Nguyen', finishTime: '1:41.76', points: 100, odds: '3.0' },
      { horseId: 'horse-201', horseName: 'Lightning Bolt', jockeyName: 'Ethan Cole', finishTime: '1:42.05', points: 80, odds: '2.5' },
      { horseId: 'horse-209', horseName: 'Thunder Road', jockeyName: 'Mia Tran', finishTime: '1:42.44', points: 65, odds: '4.1' },
      { horseId: 'horse-206', horseName: 'Silver Comet', jockeyName: 'Oliver Dang', finishTime: '1:42.89', points: 50, odds: '3.6' },
      { horseId: 'horse-207', horseName: 'Crimson Star', jockeyName: 'Ava Le', finishTime: '1:43.30', points: 40, odds: '5.2' },
    ],
  }),
  createResult({
    id: 'result-104',
    raceName: 'Coastal Dash',
    raceNumber: 2,
    tournamentName: 'National Stakes 2026',
    track: 'Vung Tau Coastal Track',
    date: '2026-06-14T09:00:00+07:00',
    distance: '1200m',
    trackType: 'Turf',
    grade: 'Open',
    status: 'published',
    publishedAt: '2026-06-14T10:30:00+07:00',
    runners: [
      { horseId: 'horse-204', horseName: 'Emerald Wind', jockeyName: 'Ava Le', finishTime: '1:08.24', points: 100, odds: '3.5' },
      { horseId: 'horse-212', horseName: 'Winter Sky', jockeyName: 'Sophia Nguyen', finishTime: '1:08.57', points: 80, odds: '3.0' },
      { horseId: 'horse-208', horseName: 'Midnight Crown', jockeyName: 'Mia Tran', finishTime: '1:08.96', points: 65, odds: '4.0' },
      { horseId: 'horse-205', horseName: 'Royal Echo', jockeyName: 'Noah Vu', finishTime: '1:09.31', points: 50, odds: '4.7' },
      { horseId: 'horse-211', horseName: 'Blue Horizon', jockeyName: 'Kai Nguyen', finishTime: '1:09.88', points: 40, odds: '5.4' },
    ],
  }),
  createResult({
    id: 'result-105',
    raceName: 'Capital Trophy',
    raceNumber: 1,
    tournamentName: 'Spring Invitational 2026',
    track: 'Hanoi Capital Course',
    date: '2026-06-12T14:00:00+07:00',
    distance: '1800m',
    trackType: 'Dirt',
    grade: 'Elite',
    status: 'draft',
    runners: [
      { horseId: 'horse-206', horseName: 'Silver Comet', jockeyName: 'Oliver Dang', finishTime: '1:35.18', points: 100, odds: '3.2' },
      { horseId: 'horse-209', horseName: 'Thunder Road', jockeyName: 'Ethan Cole', finishTime: '1:35.61', points: 80, odds: '3.9' },
      { horseId: 'horse-207', horseName: 'Crimson Star', jockeyName: 'Ava Le', finishTime: '1:36.04', points: 65, odds: '4.4' },
      { horseId: 'horse-203', horseName: 'Neon Legend', jockeyName: 'Liam Pham', finishTime: '1:36.42', points: 50, odds: '2.9' },
      { horseId: 'horse-201', horseName: 'Lightning Bolt', jockeyName: 'Mia Tran', finishTime: '1:36.80', points: 40, odds: '2.6' },
    ],
  }),
];

const rankingEntry = (
  rank: number,
  entityId: string,
  name: string,
  subtitle: string,
  totalPoints: number,
  totalWins: number,
  totalRaces: number,
  recentForm: string,
): RankingEntry => ({
  rank,
  entityId,
  name,
  subtitle,
  totalPoints,
  totalWins,
  totalRaces,
  winRate: Math.round((totalWins / totalRaces) * 100),
  recentForm,
});

const rankingEntries: Record<RankingCategory, RankingEntry[]> = {
  horse: [
    rankingEntry(1, 'horse-203', 'Neon Legend', 'City Lights Stable', 315, 3, 5, '1-1-4'),
    rankingEntry(2, 'horse-201', 'Lightning Bolt', 'Golden Hoof Racing', 300, 2, 5, '1-2-5'),
    rankingEntry(3, 'horse-204', 'Emerald Wind', 'Greenfield Stable', 265, 2, 5, '4-1-2'),
    rankingEntry(4, 'horse-206', 'Silver Comet', 'North Star Racing', 260, 1, 5, '2-4-1'),
    rankingEntry(5, 'horse-212', 'Winter Sky', 'Highland Equestrian', 245, 1, 4, '1-2-3'),
    rankingEntry(6, 'horse-209', 'Thunder Road', 'Storm Chasers', 225, 0, 5, '5-3-2'),
  ],
  jockey: [
    rankingEntry(1, 'jockey-301', 'Liam Pham', 'JCK-2026-014', 355, 4, 8, '1-1-2'),
    rankingEntry(2, 'jockey-302', 'Ethan Cole', 'JCK-2026-007', 340, 3, 8, '1-2-2'),
    rankingEntry(3, 'jockey-303', 'Sophia Nguyen', 'JCK-2026-021', 315, 3, 9, '1-1-4'),
    rankingEntry(4, 'jockey-304', 'Mia Tran', 'JCK-2026-005', 285, 2, 9, '2-3-3'),
    rankingEntry(5, 'jockey-305', 'Ava Le', 'JCK-2026-018', 260, 2, 8, '4-1-3'),
    rankingEntry(6, 'jockey-306', 'Oliver Dang', 'JCK-2026-011', 240, 1, 8, '2-4-1'),
  ],
  owner: [
    rankingEntry(1, 'owner-401', 'Nguyen Minh Racing', 'Golden Hoof Racing', 580, 5, 12, '1-2-1'),
    rankingEntry(2, 'owner-402', 'Tran Gia Stable', 'City Lights Stable', 545, 4, 11, '1-1-4'),
    rankingEntry(3, 'owner-403', 'Le Thanh Equestrian', 'Greenfield Stable', 490, 4, 12, '4-1-2'),
    rankingEntry(4, 'owner-404', 'Pham Quang Racing', 'North Star Racing', 455, 3, 11, '2-4-1'),
    rankingEntry(5, 'owner-405', 'Highland Horse Club', 'Highland Equestrian', 410, 2, 10, '1-2-3'),
    rankingEntry(6, 'owner-406', 'Vu Bao Stable', 'Storm Chasers', 365, 2, 10, '5-3-2'),
  ],
};

export const mockRankingBoards: Record<RankingCategory, RankingBoard> = {
  horse: {
    category: 'horse',
    tournamentName: 'HTMS Overall Championship',
    season: '2026',
    lastUpdated: '2026-06-19T10:30:00+07:00',
    entries: rankingEntries.horse,
  },
  jockey: {
    category: 'jockey',
    tournamentName: 'HTMS Overall Championship',
    season: '2026',
    lastUpdated: '2026-06-19T10:30:00+07:00',
    entries: rankingEntries.jockey,
  },
  owner: {
    category: 'owner',
    tournamentName: 'HTMS Overall Championship',
    season: '2026',
    lastUpdated: '2026-06-19T10:30:00+07:00',
    entries: rankingEntries.owner,
  },
};

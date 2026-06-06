import type { ActivePrediction, OpenRacePrediction, ResultTrackingItem } from '../types/prediction';

export const openPredictions: OpenRacePrediction[] = [
  {
    id: 1,
    raceName: 'Starlight Sprint',
    date: 'Jun 10, 2026',
    track: 'Epsom Downs',
    closesAt: '12:45 PM',
    grade: 'Grade 1',
    surface: 'Turf',
    favoriteHorse: 'Thunder Bolt',
    odds: '2.40',
    status: 'Open'
  },
  {
    id: 2,
    raceName: 'Pacific Classic',
    date: 'Jun 10, 2026',
    track: 'Santa Anita',
    closesAt: '1:30 PM',
    grade: 'Grade 2',
    surface: 'Dirt',
    favoriteHorse: 'Desert Wind',
    odds: '1.85',
    status: 'Open'
  },
  {
    id: 3,
    raceName: 'Dubai Gold Cup',
    date: 'Jun 11, 2026',
    track: 'Meydan Racecourse',
    closesAt: '2:15 PM',
    grade: 'Grade 1',
    surface: 'Turf',
    favoriteHorse: 'Oasis Dream',
    odds: '3.10',
    status: 'Open'
  }
];

export const activePredictions: ActivePrediction[] = [
  {
    id: 1,
    raceName: 'Starlight Sprint',
    selection: 'Thunder Bolt',
    jockey: 'L. Carter',
    stake: '120 pts',
    status: 'Pending',
    points: '120',
    result: 'Awaiting result'
  },
  {
    id: 2,
    raceName: 'Golden Meadow Cup',
    selection: 'Silver Arrow',
    jockey: 'K. Thomas',
    stake: '100 pts',
    status: 'Won',
    points: '+320',
    result: 'Finished 1st'
  }
];

export const trackedResults: ResultTrackingItem[] = [
  {
    id: 1,
    raceName: 'Golden Meadow Cup',
    winner: 'Silver Arrow',
    finishPosition: '1st',
    finishTime: '01:42.80',
    prize: '$12,000',
    publishedAt: '10 min ago',
    predictionStatus: 'Won'
  },
  {
    id: 2,
    raceName: 'Riverstone Derby',
    winner: 'Midnight Blaze',
    finishPosition: '2nd',
    finishTime: '01:36.10',
    prize: '$8,500',
    publishedAt: '32 min ago',
    predictionStatus: 'Lost'
  },
  {
    id: 3,
    raceName: 'Crystal Stakes',
    winner: 'Eclipse Dancer',
    finishPosition: '3rd',
    finishTime: '01:37.54',
    prize: '$6,800',
    publishedAt: '1h ago',
    predictionStatus: 'Pending'
  }
];

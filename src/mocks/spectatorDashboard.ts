import type { RaceCardItem, PredictionItem, ResultItem, NotificationItem } from '../types/spectatorDashboard';

export const upcomingRaces: RaceCardItem[] = [
  { id: 1, raceName: 'Starlight Sprint', track: 'Epsom Downs • R4', time: '2M LEFT', status: 'Live', favoriteHorse: 'Thunder Bolt', odds: '2.40' },
  { id: 2, raceName: 'Pacific Classic', track: 'Santa Anita • R7', time: 'LIVE', status: 'Live', favoriteHorse: 'Desert Wind', odds: '1.85' },
  { id: 3, raceName: 'Dubai Gold Cup', track: 'Meydan • R2', time: '15M', status: 'Upcoming', favoriteHorse: 'Oasis Dream', odds: '3.10' },
];

export const myPredictions: PredictionItem[] = [
  { id: 1, raceName: 'Starlight Sprint', horse: 'Thunder Bolt', jockey: 'L. Carter', stake: '120 pts', status: 'Open' },
  { id: 2, raceName: 'Pacific Classic', horse: 'Desert Wind', jockey: 'M. Silva', stake: '80 pts', status: 'Settled' },
];

export const latestResults: ResultItem[] = [
  { id: 1, raceName: 'Golden Meadow Cup', winner: 'Silver Arrow', finishTime: '01:42.80', prize: '$12,000', publishedAt: '10 min ago' },
  { id: 2, raceName: 'Riverstone Derby', winner: 'Midnight Blaze', finishTime: '01:36.10', prize: '$8,500', publishedAt: '32 min ago' },
];

export const notifications: NotificationItem[] = [
  { id: 1, title: 'Prediction window closes in 15 min', detail: 'Place your final pick for Starlight Sprint before the lock.', time: 'Now' },
  { id: 2, title: 'Result published', detail: 'Golden Meadow Cup result is now available for review.', time: '10 min ago' },
];

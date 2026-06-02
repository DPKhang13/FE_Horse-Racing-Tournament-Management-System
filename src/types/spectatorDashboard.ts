export interface RaceCardItem {
  id: number;
  raceName: string;
  track: string;
  time: string;
  status: 'Live' | 'Upcoming' | 'Closed';
  favoriteHorse: string;
  odds: string;
}

export interface PredictionItem {
  id: number;
  raceName: string;
  horse: string;
  jockey: string;
  stake: string;
  status: 'Open' | 'Settled';
}

export interface ResultItem {
  id: number;
  raceName: string;
  winner: string;
  finishTime: string;
  prize: string;
  publishedAt: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  detail: string;
  time: string;
}

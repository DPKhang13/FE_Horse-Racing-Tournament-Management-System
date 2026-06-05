export interface OpenRacePrediction {
  id: number;
  raceName: string;
  date: string;
  track: string;
  closesAt: string;
  grade: string;
  surface: string;
  favoriteHorse: string;
  odds: string;
  status: 'Open' | 'Closed' | 'Live';
}

export interface ActivePrediction {
  id: number;
  raceName: string;
  selection: string;
  jockey: string;
  stake: string;
  status: 'Pending' | 'Settled' | 'Lost' | 'Won';
  points: string;
  result: string;
}

export interface ResultTrackingItem {
  id: number;
  raceName: string;
  winner: string;
  finishPosition: string;
  finishTime: string;
  prize: string;
  publishedAt: string;
  predictionStatus: 'Won' | 'Lost' | 'Pending';
}

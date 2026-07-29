export interface PredictionOption {
  optionId?: number;
  horseId: number;
  horseName: string;
  jockeyName: string;
  odds: number;
}

export interface OpenRacePrediction {
  id: number;
  raceName: string;
  raceNumber?: number;
  tournamentName: string;
  date: string;
  scheduledAt?: string;
  track: string;
  closesAt: string;
  distanceM?: number;
  grade: string;
  surface: string;
  favoriteHorse: string;
  odds: string;
  status: 'Open' | 'Closed' | 'Live';
  options: PredictionOption[];
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

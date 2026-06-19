export type TournamentStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export type MatchStatus = 'Scheduled' | 'Ongoing' | 'Finished' | 'Cancelled';

export type TournamentParticipant = {
  participantId: string;
  horseName: string;
  ownerName: string;
  jockeyName: string;
  stableName: string;
  status: string;
};

export type TournamentMatch = {
  matchId: string;
  matchName: string;
  round: string;
  matchDate: string;
  startTime: string;
  endTime: string;
  arenaLocation: string;
  participant1: string;
  participant2: string;
  matchStatus: MatchStatus;
};

export type Tournament = {
  tournamentId: number;
  id: string;
  tournamentName: string;
  tournamentType: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  registrationDeadline: string;
  maximumParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prize: string;
  status: TournamentStatus;
  rulesNotes: string;
  participants: TournamentParticipant[];
  schedule: TournamentMatch[];
  createdAt?: string;
  updatedAt?: string;
};

export type TournamentMutationData = {
  tournamentName: string;
  tournamentType: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  registrationDeadline: string;
  maximumParticipants: number;
  entryFee: number;
  prize: string;
  status: TournamentStatus;
  rulesNotes: string;
};

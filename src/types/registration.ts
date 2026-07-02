export type RegistrationStatus = string;

export type RegistrationResponse = {
  id?: number | string;
  regId: number;
  tournamentId: number;
  raceId: number;
  horseId: number;
  ownerId: number;
  jockeyId?: number | null;
  status: RegistrationStatus;
  ownerConfirmationStatus?: string | null;
  registeredAt?: string | null;
  tournamentName?: string | null;
  raceName?: string | null;
  raceNumber?: number | null;
  scheduledAt?: string | null;
  horseName?: string | null;
  horseAvatarUrl?: string | null;
  ownerFullName?: string | null;
  ownerStableName?: string | null;
  jockeyFullName?: string | null;
};

export type ApproveRegistrationRequest = {
  note: string;
};

export type RejectRegistrationRequest = {
  reason: string;
};

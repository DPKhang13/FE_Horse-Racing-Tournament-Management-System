export type RegistrationStatus = string;

export type RegistrationResponse = {
  id?: number | string;
  regId: number;
  tournamentId: number;
  raceId: number;
  horseId: number;
  ownerId: number;
  jockeyId?: number | null;
  gateNumber?: number | null;
  status: RegistrationStatus;
  ownerConfirmationStatus?: string | null;
  ownerConfirmedAt?: string | null;
  registeredAt?: string | null;
  approvedAt?: string | null;
  tournamentName?: string | null;
  raceName?: string | null;
  raceNumber?: number | null;
  raceStatus?: string | null;
  scheduledAt?: string | null;
  horseName?: string | null;
  horseAvatarUrl?: string | null;
  ownerFullName?: string | null;
  ownerStableName?: string | null;
  jockeyFullName?: string | null;
  jockeyStatus?: string | null;
  chiefInspectionStatus?: string | null;
  chiefInspectionNote?: string | null;
  chiefInspectedByFullName?: string | null;
  chiefInspectedAt?: string | null;
  adminReviewedByFullName?: string | null;
  adminReviewedAt?: string | null;
  adminReviewNote?: string | null;
  approvedByFullName?: string | null;
};

export type ApproveRegistrationRequest = {
  note?: string;
};

export type RejectRegistrationRequest = {
  reason?: string;
};

type RaceRegistrationScheduleCandidate = {
  id?: number | string;
  regId?: number | string;
  raceId?: number | string;
  raceName?: string | null;
  raceStatus?: string | null;
  horseId?: number | string;
  scheduledAt?: string | null;
  status?: string | null;
};

export const normalizeRegistrationStatus = (value?: string | null) =>
  value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

const getRegistrationKey = (registration: RaceRegistrationScheduleCandidate) =>
  registration.regId ?? registration.id ?? '';

const getScheduleTime = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export const isScheduleActiveRegistration = (registration: RaceRegistrationScheduleCandidate) => {
  const registrationStatus = normalizeRegistrationStatus(registration.status);
  const raceStatus = normalizeRegistrationStatus(registration.raceStatus);

  if (['completed', 'cancelled', 'canceled'].includes(raceStatus)) {
    return false;
  }

  return !['rejected', 'cancelled', 'canceled', 'deleted'].includes(registrationStatus);
};

export const isApprovedRegistration = (registration: RaceRegistrationScheduleCandidate) =>
  normalizeRegistrationStatus(registration.status) === 'approved';

export const findHorseScheduleConflict = (
  target: RaceRegistrationScheduleCandidate,
  registrations: RaceRegistrationScheduleCandidate[],
  isConflictCandidate: (registration: RaceRegistrationScheduleCandidate) => boolean = isScheduleActiveRegistration,
) => {
  const targetHorseId = String(target.horseId ?? '');
  const targetRaceId = String(target.raceId ?? '');
  const targetKey = String(getRegistrationKey(target));
  const targetScheduleTime = getScheduleTime(target.scheduledAt);

  if (!targetHorseId || !targetScheduleTime) {
    return undefined;
  }

  return registrations.find((registration) => {
    const registrationKey = String(getRegistrationKey(registration));
    const registrationRaceId = String(registration.raceId ?? '');

    return String(registration.horseId ?? '') === targetHorseId
      && registrationRaceId !== targetRaceId
      && (!targetKey || registrationKey !== targetKey)
      && getScheduleTime(registration.scheduledAt) === targetScheduleTime
      && isConflictCandidate(registration);
  });
};

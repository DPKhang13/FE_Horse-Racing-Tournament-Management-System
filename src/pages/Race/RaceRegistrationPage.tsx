import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronRight, ClipboardList, Search, Trophy, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import { raceRegistrationService, type RaceRegistrationItem } from '../../services/raceRegistrationService';
import { scheduleService, type RaceScheduleItem, type TournamentApiItem } from '../../services/scheduleService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import type { Horse } from '../../types/horse';
import type { UserProfile } from '../../types/user';

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value?: number) => {
  if (!value) {
    return '-';
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

const tournamentIdOf = (tournament: TournamentApiItem) => tournament.tournamentId ?? tournament.id ?? 0;

const getTournamentName = (tournament: TournamentApiItem) => tournament.name ?? `Tournament ${tournamentIdOf(tournament)}`;

const getQueueStatusClassName = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === 'approved') {
    return 'bg-secondary/15 text-secondary';
  }

  if (normalized === 'rejected') {
    return 'bg-error/15 text-error';
  }

  return 'bg-surface-container-high text-on-surface-variant';
};

const RaceRegistrationPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [items, setItems] = useState<RaceRegistrationItem[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [races, setRaces] = useState<RaceScheduleItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentApiItem[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentApiItem | null>(null);
  const [selectedRace, setSelectedRace] = useState<RaceScheduleItem | null>(null);
  const [isRacePickerOpen, setIsRacePickerOpen] = useState(false);
  const [isHorsePickerOpen, setIsHorsePickerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [queueSearch, setQueueSearch] = useState('');

  const isOwner = profile?.roleType === 'horse_owner';
  const canApprove = profile?.roleType === 'admin';

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadRegistrations = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentProfile = profile ?? await authService.getCurrentUser();
      setProfile(currentProfile);

      if (currentProfile.roleType === 'horse_owner') {
        const [registrations, horseList, raceList, tournamentList] = await Promise.all([
          raceRegistrationService.getMine(),
          HorseService.getOwnerHorses(currentProfile),
          scheduleService.getRaceSchedule(),
          scheduleService.getTournaments(),
        ]);

        setItems(registrations);
        setHorses(horseList);
        setRaces(raceList);
        setTournaments(tournamentList);
      } else {
        setItems(await raceRegistrationService.getAll());
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load race registrations.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRegistrations();
  }, []);

  const openRegistrationTournaments = useMemo(
    () => tournaments.filter((tournament) => normalizeStatus(tournament.status) === 'registration_open'),
    [tournaments],
  );

  const selectedTournamentId = selectedTournament ? tournamentIdOf(selectedTournament) : 0;

  const tournamentRaces = useMemo(
    () => races
      .filter((race) => race.tournamentId === selectedTournamentId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [races, selectedTournamentId],
  );

  const availableHorses = useMemo(() => {
    if (!selectedRace) {
      return horses;
    }

    return horses.filter((horse) => {
      const sameRankGroup = !selectedRace.rankGroup || selectedRace.rankGroup === '-' || horse.rankGroup === selectedRace.rankGroup;
      const notYetRegistered = !items.some((item) => item.raceId === selectedRace.raceId && item.horseId === horse.horseId);
      return sameRankGroup && notYetRegistered;
    });
  }, [horses, items, selectedRace]);

  const filteredQueue = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.tournamentName,
        item.raceName,
        item.horseName,
        item.ownerStableName,
        item.ownerFullName,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, queueSearch]);

  const handleTournamentSelect = (tournament: TournamentApiItem) => {
    setSelectedTournament(tournament);
    setSelectedRace(null);
    setIsRacePickerOpen(true);
  };

  const handleRaceSelect = (race: RaceScheduleItem) => {
    setSelectedRace(race);
    setIsRacePickerOpen(false);
    setIsHorsePickerOpen(true);
  };

  const handleCreate = async (horse: Horse) => {
    if (!selectedTournament || !selectedRace) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.create({
        tournamentId: tournamentIdOf(selectedTournament),
        raceId: selectedRace.raceId,
        horseId: horse.horseId,
      });

      setMessage(`Registered ${horse.name} for ${selectedRace.raceName}.`);
      setIsHorsePickerOpen(false);
      setSelectedRace(null);
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create registration.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.approve(id);
      setMessage('Registration approved.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not approve registration.'));
    }
  };

  const handleReject = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.reject(id);
      setMessage('Registration rejected.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not reject registration.'));
    }
  };

  const handleDelete = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.delete(id);
      setMessage('Registration deleted.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not delete registration.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="mx-auto max-w-container px-4 md:px-margin-desktop">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Race Registrations</p>
            <h1 className="mt-2 text-headline-lg font-bold text-primary">Entry management</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              {isOwner
                ? 'Choose a tournament with registration open, then pick a race and horse in order.'
                : 'Review the registration queue and process approvals from one place.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsQueueOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-md border border-outline-variant bg-white px-4 py-2 text-body-sm font-bold text-primary shadow-sm transition-colors hover:border-primary"
          >
            <ClipboardList className="h-4 w-4" />
            Registration queue
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-extrabold text-on-surface-variant">
              {items.length}
            </span>
          </button>
        </div>

        {isOwner ? (
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="text-title-large font-bold text-primary">Open registration tournaments</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Only tournaments in `Registration Open` are shown here.
                </p>
              </div>
            </div>

            {isLoading ? (
              <EmptyState
                title="Loading tournaments"
                description="Fetching tournaments and races from the server."
                icon={<Search className="h-5 w-5" />}
              />
            ) : openRegistrationTournaments.length === 0 ? (
              <EmptyState
                title="No tournament is open for registration"
                description="When admin opens registration, available tournaments will appear here."
                icon={<Trophy className="h-5 w-5" />}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {openRegistrationTournaments.map((tournament) => {
                  const tournamentId = tournamentIdOf(tournament);
                  const raceCount = races.filter((race) => race.tournamentId === tournamentId).length;

                  return (
                    <button
                      key={tournamentId}
                      type="button"
                      onClick={() => handleTournamentSelect(tournament)}
                      className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low px-5 py-5 text-left transition-colors hover:border-primary hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-secondary">
                            T-{String(tournamentId).padStart(3, '0')}
                          </p>
                          <h3 className="mt-2 text-title-large font-bold text-primary">{getTournamentName(tournament)}</h3>
                        </div>
                        <ChevronRight className="mt-1 h-5 w-5 text-outline" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoPill label="Location" value={tournament.location ?? '-'} />
                        <InfoPill label="Start" value={formatDateTime(tournament.startDate)} />
                        <InfoPill label="Races" value={String(raceCount)} />
                      </div>

                      <p className="text-body-sm font-semibold text-on-surface-variant">
                        Prize pool {formatCurrency(tournament.prizePool)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <EmptyState
              title="Queue-focused view"
              description="This role does not register horses directly. Use the queue button to review and process requests."
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </section>
        )}
      </div>

      {isRacePickerOpen && selectedTournament && (
        <Modal
          title={`Select a race for ${getTournamentName(selectedTournament)}`}
          subtitle={`T-${String(tournamentIdOf(selectedTournament)).padStart(3, '0')}`}
          onClose={() => {
            setIsRacePickerOpen(false);
            setSelectedTournament(null);
          }}
        >
          <div className="space-y-4 p-6">
            {tournamentRaces.length === 0 ? (
              <EmptyState
                title="No races available"
                description="This tournament does not have any race ready for registration yet."
                icon={<ClipboardList className="h-5 w-5" />}
              />
            ) : (
              tournamentRaces.map((race) => (
                <button
                  key={race.raceId}
                  type="button"
                  onClick={() => handleRaceSelect(race)}
                  className="grid w-full gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-5 py-4 text-left transition-colors hover:border-primary hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-body-lg font-bold text-primary">{race.raceName}</h3>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        Race #{race.raceNumber || race.raceId} • Group {race.rankGroup}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-outline" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoPill label="Schedule" value={formatDateTime(race.scheduledAt)} />
                    <InfoPill label="Track" value={race.trackType} />
                    <InfoPill label="Slots" value={`${race.registeredHorseCount}/${race.maxHorses || '-'}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {isHorsePickerOpen && selectedTournament && selectedRace && (
        <Modal
          title={`Choose horse for ${selectedRace.raceName}`}
          subtitle={getTournamentName(selectedTournament)}
          onClose={() => {
            setIsHorsePickerOpen(false);
            setSelectedRace(null);
          }}
        >
          <div className="space-y-4 p-6">
            <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-3">
              <InfoPill label="Rank group" value={selectedRace.rankGroup} />
              <InfoPill label="Distance" value={`${selectedRace.distanceM} m`} />
              <InfoPill label="Schedule" value={formatDateTime(selectedRace.scheduledAt)} />
            </div>

            {availableHorses.length === 0 ? (
              <EmptyState
                title="No horse available"
                description="All matching horses are already registered or there is no horse in the same rank group."
                icon={<Trophy className="h-5 w-5" />}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableHorses.map((horse) => (
                  <div key={horse.horseId} className="rounded-lg border border-outline-variant bg-white p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={horse.avatarUrl}
                        alt={horse.name}
                        className="h-16 w-16 rounded-md border border-outline-variant object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-body-lg font-bold text-primary">{horse.name}</h3>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {horse.breed} • Group {horse.rankGroup}
                        </p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {horse.rankingPoints} points • {horse.totalWins} wins
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleCreate(horse)}
                      className="mt-4 w-full rounded-md bg-secondary px-4 py-3 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Registering...' : 'Register this horse'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {isQueueOpen && (
        <Modal title="Registration queue" subtitle="Review and processing" onClose={() => setIsQueueOpen(false)}>
          <div className="space-y-4 p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search by tournament, race, horse, owner, status..."
                className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Race</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Owner</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                        Loading registrations...
                      </td>
                    </tr>
                  ) : filteredQueue.map((item) => {
                    const id = item.regId ?? item.id ?? '';

                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">
                          {item.tournamentName ?? `Tournament ${item.tournamentId ?? '-'}`}
                        </td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">
                          {item.raceName ?? `Race ${item.raceId ?? '-'}`}
                        </td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">
                          {item.horseName ?? `Horse ${item.horseId ?? '-'}`}
                        </td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">
                          {item.ownerStableName ?? item.ownerFullName ?? '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getQueueStatusClassName(item.status)}`}>
                            {item.status ?? '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {canApprove && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleApprove(id)}
                                  className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleReject(id)}
                                  className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(id)}
                                className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && filteredQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                        No registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-white px-3 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">{label}</p>
    <p className="mt-1 text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

const EmptyState = ({ title, description, icon }: { title: string; description: string; icon: ReactNode }) => (
  <div className="px-4 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">
      {icon}
    </div>
    <h3 className="mt-4 text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/55 px-4 py-8">
    <div className="mx-auto max-w-5xl rounded-lg border border-outline-variant bg-white shadow-xl">
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
        <div>
          <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default RaceRegistrationPage;

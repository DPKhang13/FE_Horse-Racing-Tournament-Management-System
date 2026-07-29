import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, ClipboardList, Search, Trophy, X, DoorOpen } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import { raceRegistrationService, type RaceRegistrationItem, type GateAvailability } from '../../services/raceRegistrationService';
import { scheduleService, type RaceScheduleItem, type TournamentApiItem } from '../../services/scheduleService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import type { Horse } from '../../types/horse';
import type { UserProfile } from '../../types/user';
import { findHorseScheduleConflict } from '../../utils/raceRegistrationConflicts';

const formatDateTime = (value?: string | null) => {
  if (!value) { return '-'; }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return '-'; }

  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatCurrency = (value?: number) => {
  if (!value) { return '-'; }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

const normalizeStatus = (value?: string) => value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

const tournamentIdOf = (tournament: TournamentApiItem) => tournament.tournamentId ?? tournament.id ?? 0;
const getTournamentName = (tournament: TournamentApiItem) => tournament.name ?? `Tournament ${tournamentIdOf(tournament)}`;
const getScheduleName = (race: RaceScheduleItem) =>
  race.scheduleTitle?.trim() || (race.dayNumber ? `Day ${race.dayNumber}` : '-');

const isFutureDate = (value?: string) => {
  if (!value) { return false; }
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > Date.now();
};

const isRegistrationOpenTournament = (tournament: TournamentApiItem) => {
  if (normalizeStatus(tournament.status) !== 'registration_open') { return false; }
  return isFutureDate(tournament.registrationCloseAt ?? tournament.endDate ?? tournament.startDate);
};

const isRegistrationOpenFutureRace = (race: RaceScheduleItem) =>
  normalizeStatus(race.status) === 'registration_open' && isFutureDate(race.scheduledAt);

const getQueueStatusClassName = (status?: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'approved') { return 'bg-secondary/15 text-secondary'; }
  if (normalized === 'rejected') { return 'bg-error/15 text-error'; }
  if (normalized === 'cancelled') { return 'bg-surface-container-high text-on-surface-variant line-through'; }
  return 'bg-surface-container-high text-on-surface-variant';
};

const hasAssignedJockey = (item: RaceRegistrationItem) => Boolean(item.jockeyId || item.jockeyFullName);
const isOwnerConfirmed = (item: RaceRegistrationItem) => normalizeStatus(item.ownerConfirmationStatus) === 'confirmed';

const canApproveRegistration = (item: RaceRegistrationItem) => {
  const status = normalizeStatus(item.status);
  return status === 'pending' && hasAssignedJockey(item) && isOwnerConfirmed(item);
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
  const [isGatePickerOpen, setIsGatePickerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [gateAvailability, setGateAvailability] = useState<GateAvailability | null>(null);
  const [selectedGate, setSelectedGate] = useState<number | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [viewingRegistration, setViewingRegistration] = useState<RaceRegistrationItem | null>(null);
  const [cancellingId, setCancellingId] = useState<number | string | null>(null);

  const isOwner = profile?.roleType === 'horse_owner';
  const canApprove = profile?.roleType === 'admin';

  useToastNotifications([
    message ? { tone: 'success', text: message } : null,
    errorMessage ? { tone: 'error', text: errorMessage } : null,
  ]);

  const loadRegistrations = useCallback(async () => {
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
      } else if (currentProfile.roleType === 'admin') {
        setItems(await raceRegistrationService.getPendingApproval());
      } else {
        setItems(await raceRegistrationService.getAll());
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load race registrations.'));
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRegistrations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRegistrations]);

  const getAvailableRacesForTournament = useCallback((tournamentId: number) =>
    races.filter((race) => race.tournamentId === tournamentId).filter(isRegistrationOpenFutureRace)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()), [races]);

  const openRegistrationTournaments = useMemo(
    () => tournaments.filter((tournament) => {
      const tournamentId = tournamentIdOf(tournament);
      return isRegistrationOpenTournament(tournament) && getAvailableRacesForTournament(tournamentId).length > 0;
    }), [getAvailableRacesForTournament, tournaments],
  );

  const selectedTournamentId = selectedTournament ? tournamentIdOf(selectedTournament) : 0;
  const tournamentRaces = useMemo(() => getAvailableRacesForTournament(selectedTournamentId), [getAvailableRacesForTournament, selectedTournamentId]);

  const availableHorses = useMemo(() => {
    if (!selectedRace) { return horses; }
    return horses.filter((horse) => {
      const sameRankGroup = !selectedRace.rankGroup || selectedRace.rankGroup === '-' || horse.rankGroup === selectedRace.rankGroup;
      const notYetRegistered = !items.some((item) => item.raceId === selectedRace.raceId && item.horseId === horse.horseId);
      const hasScheduleConflict = Boolean(findHorseScheduleConflict({
        raceId: selectedRace.raceId,
        horseId: horse.horseId,
        scheduledAt: selectedRace.scheduledAt,
      }, items));
      return sameRankGroup && notYetRegistered && !hasScheduleConflict;
    });
  }, [horses, items, selectedRace]);

  const filteredQueue = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    if (!query) { return items; }
    return items.filter((item) => {
      const haystack = [item.tournamentName, item.raceName, item.horseName, item.ownerStableName, item.ownerFullName, item.status]
        .filter(Boolean).join(' ').toLowerCase();
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

  const handleHorseSelect = async (horse: Horse) => {
    if (!selectedRace) { return; }
    const conflict = findHorseScheduleConflict({
      raceId: selectedRace.raceId,
      horseId: horse.horseId,
      scheduledAt: selectedRace.scheduledAt,
    }, items);

    if (conflict) {
      setErrorMessage(`Ngua da co race trung gio dua voi ${conflict.raceName ?? `Race ${conflict.raceId ?? '-'}`} (${formatDateTime(conflict.scheduledAt)}).`);
      return;
    }

    setSelectedHorse(horse);
    setIsHorsePickerOpen(false);
    try {
      const gates = await raceRegistrationService.getAvailableGates(selectedRace.raceId);
      setGateAvailability(gates);
      setSelectedGate(null);
      setIsGatePickerOpen(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not load available gates.'));
    }
  };

  const handleCreate = async () => {
    if (!selectedTournament || !selectedRace || !selectedHorse || selectedGate == null) { return; }
    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');
    try {
      await raceRegistrationService.create({
        tournamentId: tournamentIdOf(selectedTournament),
        raceId: selectedRace.raceId,
        horseId: selectedHorse.horseId,
        gateNumber: selectedGate,
      });
      setMessage(`Registration for ${selectedHorse.name} (Gate ${selectedGate}) was created. You can invite a jockey now.`);
      setIsGatePickerOpen(false);
      setSelectedRace(null);
      setSelectedHorse(null);
      setSelectedGate(null);
      setGateAvailability(null);
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create registration.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number | string) => {
    setMessage(''); setErrorMessage('');
    try {
      await raceRegistrationService.approve(id);
      setMessage('Registration approved.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not approve registration.'));
    }
  };

  const handleReject = async (id: number | string) => {
    setMessage(''); setErrorMessage('');
    try {
      await raceRegistrationService.reject(id);
      setMessage('Registration rejected.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not reject registration.'));
    }
  };

  const handleCancel = async (id: number | string) => {
    setCancellingId(id);
    setMessage(''); setErrorMessage('');
    try {
      await raceRegistrationService.cancel(id);
      setMessage('Registration cancelled.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not cancel registration.'));
    } finally {
      setCancellingId(null);
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
                ? 'Choose a tournament with registration open, pick a gate, register a horse, then invite and confirm a jockey before admin approval.'
                : 'Review registrations that already have a confirmed jockey assignment before approving them.'}
            </p>
          </div>
          {!isOwner && (
            <button type="button" onClick={() => setIsQueueOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-md border border-outline-variant bg-white px-4 py-2 text-body-sm font-bold text-primary shadow-sm transition-colors hover:border-primary">
              <ClipboardList className="h-4 w-4" /> Registration queue
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-extrabold text-on-surface-variant">{items.length}</span>
            </button>
          )}
        </div>

        {isOwner ? (
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-secondary" />
              <div>
                <h2 className="text-title-large font-bold text-primary">Open registration tournaments</h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Only future tournaments and races currently open for registration are shown here.
                </p>
              </div>
            </div>
            {isLoading ? (
              <EmptyState title="Loading tournaments" description="Fetching tournaments and races from the server." icon={<Search className="h-5 w-5" />} />
            ) : openRegistrationTournaments.length === 0 ? (
              <EmptyState title="No tournament is open for registration" description="When admin opens registration for a future race, available tournaments will appear here." icon={<Trophy className="h-5 w-5" />} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {openRegistrationTournaments.map((tournament) => {
                  const tournamentId = tournamentIdOf(tournament);
                  const raceCount = getAvailableRacesForTournament(tournamentId).length;
                  return (
                    <button key={tournamentId} type="button" onClick={() => handleTournamentSelect(tournament)}
                      className="grid gap-4 rounded-lg border border-outline-variant bg-surface-container-low px-5 py-5 text-left transition-colors hover:border-primary hover:bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-label-sm font-bold uppercase tracking-[0.16em] text-secondary">T-{String(tournamentId).padStart(3, '0')}</p>
                          <h3 className="mt-2 text-title-large font-bold text-primary">{getTournamentName(tournament)}</h3>
                        </div>
                        <ChevronRight className="mt-1 h-5 w-5 text-outline" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoPill label="Location" value={tournament.location ?? '-'} />
                        <InfoPill label="Start" value={formatDateTime(tournament.startDate)} />
                        <InfoPill label="Races" value={String(raceCount)} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoPill label="Registration closes" value={formatDateTime(tournament.registrationCloseAt)} />
                        <InfoPill label="End" value={formatDateTime(tournament.endDate)} />
                      </div>
                      <p className="text-body-sm font-semibold text-on-surface-variant">Prize pool {formatCurrency(tournament.prizePool)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
            <EmptyState title="Queue-focused view" description="This role does not register horses directly. Use the queue button to review and process requests." icon={<CheckCircle2 className="h-5 w-5" />} />
          </section>
        )}

        {isOwner && (
          <section className="mt-6 rounded-xl border border-outline-variant bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-secondary" />
                <div>
                  <h2 className="text-title-large font-bold text-primary">Registration queue</h2>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Your race registrations are shown as cards for quick review.
                  </p>
                </div>
              </div>
              <label className="relative block w-full md:max-w-sm">
                <span className="sr-only">Search race registrations</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="search"
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Search horse, race, or status"
                  className="w-full rounded-md border border-outline-variant bg-white py-2.5 pl-10 pr-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
                />
              </label>
            </div>

            {isLoading ? (
              <EmptyState title="Loading registrations" description="Fetching your race registrations from the server." icon={<Search className="h-5 w-5" />} />
            ) : filteredQueue.length === 0 ? (
              <EmptyState title="No registrations found" description="Try another search or register a horse for an open race." icon={<ClipboardList className="h-5 w-5" />} />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredQueue.map((item) => {
                  const id = item.regId ?? item.id ?? '';
                  const isPending = normalizeStatus(item.status) === 'pending';
                  return (
                    <article key={id} className="flex h-full min-w-0 flex-col rounded-xl border border-outline-variant bg-surface-container-low p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">REG-{id}</p>
                          <h3 className="mt-1 truncate text-body-lg font-bold text-primary">
                            {item.horseName ?? `Horse ${item.horseId ?? '-'}`}
                          </h3>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getQueueStatusClassName(item.status)}`}>
                          {item.status ?? '-'}
                        </span>
                      </div>

                      <p className="mt-3 break-words text-body-sm font-semibold text-on-surface">
                        {item.raceName ?? `Race ${item.raceId ?? '-'}`}
                      </p>
                      <p className="mt-1 break-words text-body-sm text-on-surface-variant">
                        {item.tournamentName ?? `Tournament ${item.tournamentId ?? '-'}`}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoPill label="Gate" value={item.gateNumber != null ? `#${item.gateNumber}` : '-'} />
                        <InfoPill label="Schedule" value={formatDateTime(item.scheduledAt)} />
                        <InfoPill label="Jockey" value={item.jockeyFullName ?? 'Not assigned'} />
                        <InfoPill label="Owner confirmation" value={item.ownerConfirmationStatus ?? '-'} />
                      </div>

                      <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
                        <button
                          type="button"
                          onClick={() => setViewingRegistration(item)}
                          className="rounded-md border border-outline-variant bg-white px-3 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary"
                        >
                          Details
                        </button>
                        {isPending && (
                          <button
                            type="button"
                            disabled={cancellingId === id}
                            onClick={() => void handleCancel(id)}
                            className="rounded-md border border-error/40 bg-white px-3 py-2 text-label-sm font-bold text-error transition-colors hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingId === id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Race picker */}
      {isRacePickerOpen && selectedTournament && (
        <Modal title={`Select a race for ${getTournamentName(selectedTournament)}`} subtitle={`T-${String(tournamentIdOf(selectedTournament)).padStart(3, '0')}`}
          onClose={() => { setIsRacePickerOpen(false); setSelectedTournament(null); }}>
          <div className="space-y-4 p-6">
            {tournamentRaces.length === 0 ? (
              <EmptyState title="No races available" description="This tournament does not have any future race open for registration." icon={<ClipboardList className="h-5 w-5" />} />
            ) : (
              tournamentRaces.map((race) => (
                <button key={race.raceId} type="button" onClick={() => handleRaceSelect(race)}
                  className="grid w-full gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-5 py-4 text-left transition-colors hover:border-primary hover:bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-body-lg font-bold text-primary">{race.raceName}</h3>
                        <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-label-sm font-bold text-secondary">
                          {getScheduleName(race)}
                        </span>
                      </div>
                      <p className="mt-1 text-body-sm text-on-surface-variant">Race #{race.raceNumber || race.raceId} • Group {race.rankGroup}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-outline" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoPill label="Schedule" value={getScheduleName(race)} />
                    <InfoPill label="Race time" value={formatDateTime(race.scheduledAt)} />
                    <InfoPill label="Track" value={race.trackType} />
                    <InfoPill label="Slots" value={`${race.registeredHorseCount}/${race.maxHorses || '-'}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Horse picker */}
      {isHorsePickerOpen && selectedTournament && selectedRace && (
        <Modal title={`Choose horse for ${selectedRace.raceName}`} subtitle={getTournamentName(selectedTournament)}
          onClose={() => { setIsHorsePickerOpen(false); setSelectedRace(null); }}>
          <div className="space-y-4 p-6">
            <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoPill label="Schedule" value={getScheduleName(selectedRace)} />
              <InfoPill label="Rank group" value={selectedRace.rankGroup} />
              <InfoPill label="Distance" value={`${selectedRace.distanceM} m`} />
              <InfoPill label="Race time" value={formatDateTime(selectedRace.scheduledAt)} />
            </div>
            {availableHorses.length === 0 ? (
              <EmptyState title="No horse available" description="All matching horses are already registered, busy at this race time, or there is no horse in the same rank group." icon={<Trophy className="h-5 w-5" />} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableHorses.map((horse) => (
                  <div key={horse.horseId} className="rounded-lg border border-outline-variant bg-white p-4">
                    <div className="flex items-start gap-4">
                      <img src={horse.avatarUrl} alt={horse.name} className="h-16 w-16 rounded-md border border-outline-variant object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-body-lg font-bold text-primary">{horse.name}</h3>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{horse.breed} • Group {horse.rankGroup}</p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">{horse.rankingPoints} points • {horse.totalWins} wins</p>
                      </div>
                    </div>
                    <button type="button" disabled={isSubmitting} onClick={() => void handleHorseSelect(horse)}
                      className="mt-4 w-full rounded-md bg-secondary px-4 py-3 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
                      {isSubmitting ? 'Loading gates...' : 'Select horse'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Gate picker */}
      {isGatePickerOpen && selectedRace && selectedHorse && gateAvailability && (
        <Modal title={`Pick gate for ${selectedHorse.name}`} subtitle={`${selectedRace.raceName} · Gate ${gateAvailability.gateCount} available`}
          onClose={() => { setIsGatePickerOpen(false); setSelectedHorse(null); setGateAvailability(null); }}>
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-2">
              <DoorOpen className="h-4 w-4" />
              <span>{gateAvailability.availableGates.length} gate(s) available · Occupied: {gateAvailability.occupiedGates.join(', ') || 'none'}</span>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: gateAvailability.gateCount }, (_, i) => i + 1).map((gate) => {
                const isOccupied = gateAvailability.occupiedGates.includes(gate);
                const isSelected = selectedGate === gate;
                return (
                  <button key={gate} type="button" disabled={isOccupied}
                    onClick={() => setSelectedGate(gate)}
                    className={`aspect-square rounded-lg border text-center transition-colors ${
                      isSelected
                        ? 'border-secondary bg-secondary/15 text-secondary font-bold'
                        : isOccupied
                          ? 'border-outline-variant bg-surface-container text-outline cursor-not-allowed line-through'
                          : 'border-outline-variant bg-white text-primary hover:border-secondary hover:bg-secondary/5'
                    }`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Gate</p>
                    <p className="text-2xl font-extrabold">{String(gate).padStart(2, '0')}</p>
                    {isOccupied && <p className="text-[9px]">taken</p>}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-3">
              <InfoPill label="Horse" value={selectedHorse.name} />
              <InfoPill label="Gate" value={selectedGate != null ? String(selectedGate) : 'Not selected'} />
              <InfoPill label="Status" value={selectedGate != null ? 'Ready' : 'Pick a gate'} />
            </div>
            <button type="button" disabled={selectedGate == null || isSubmitting} onClick={() => void handleCreate()}
              className="w-full rounded-md bg-secondary px-4 py-3 text-body-sm font-bold text-white transition-opacity hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Registering...' : selectedGate != null ? `Register at Gate ${selectedGate}` : 'Select a gate first'}
            </button>
          </div>
        </Modal>
      )}

      {/* Registration queue */}
      {!isOwner && isQueueOpen && (
        <Modal title="Registration queue" subtitle="Review and processing" onClose={() => setIsQueueOpen(false)}>
          <div className="space-y-4 p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input type="text" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search by tournament, race, horse, owner, status..."
                className="w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm focus:border-primary focus:outline-none" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Race</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Gate</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Owner</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Jockey</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading registrations...</td></tr>
                  ) : filteredQueue.map((item) => {
                    const id = item.regId ?? item.id ?? '';
                    const canApproveRegistrationItem = canApproveRegistration(item);
                    const isPending = normalizeStatus(item.status) === 'pending';
                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.tournamentName ?? `Tournament ${item.tournamentId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.raceName ?? `Race ${item.raceId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.horseName ?? `Horse ${item.horseId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">#{item.gateNumber ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.ownerStableName ?? item.ownerFullName ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.jockeyFullName ?? '-'}</td>
                        <td className="px-4 py-4">
                          <div className="grid gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getQueueStatusClassName(item.status)}`}>
                              {item.status ?? '-'}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Owner: {item.ownerConfirmationStatus ?? '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setViewingRegistration(item)}
                              className="rounded-md border border-outline-variant px-2 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary">Details</button>
                            {isOwner && isPending && (
                              <button type="button" disabled={cancellingId === id} onClick={() => void handleCancel(id)}
                                className="rounded-md border border-error/40 px-2 py-2 text-label-sm font-bold text-error transition-colors hover:bg-error/5 disabled:opacity-60">
                                {cancellingId === id ? '...' : 'Cancel'}
                              </button>
                            )}
                            {canApprove && (
                              <>
                                <button type="button" onClick={() => void handleApprove(id)} disabled={!canApproveRegistrationItem}
                                  className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-white"
                                  title={canApproveRegistrationItem ? 'Approve registration' : 'Waiting for confirmed jockey assignment.'}>Approve</button>
                                <button type="button" onClick={() => void handleReject(id)}
                                  className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error">Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && filteredQueue.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No registrations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Registration detail */}
      {viewingRegistration && (
        <Modal title={`Registration #${viewingRegistration.regId ?? viewingRegistration.id ?? '-'}`} subtitle={viewingRegistration.tournamentName ?? '-'}
          onClose={() => setViewingRegistration(null)}>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoPill label="Tournament" value={viewingRegistration.tournamentName ?? '-'} />
              <InfoPill label="Race" value={viewingRegistration.raceName ?? '-'} />
              <InfoPill label="Race Number" value={String(viewingRegistration.raceNumber ?? '-')} />
              <InfoPill label="Gate" value={viewingRegistration.gateNumber != null ? `#${viewingRegistration.gateNumber}` : '-'} />
              <InfoPill label="Scheduled At" value={formatDateTime(viewingRegistration.scheduledAt)} />
              <InfoPill label="Horse" value={viewingRegistration.horseName ?? '-'} />
              <InfoPill label="Jockey" value={viewingRegistration.jockeyFullName ?? '-'} />
              <InfoPill label="Owner" value={viewingRegistration.ownerFullName ?? '-'} />
              <InfoPill label="Stable" value={viewingRegistration.ownerStableName ?? '-'} />
              <InfoPill label="Status" value={viewingRegistration.status ?? '-'} />
              <InfoPill label="Owner Confirmation" value={viewingRegistration.ownerConfirmationStatus ?? '-'} />
              <InfoPill label="Registered At" value={formatDateTime(viewingRegistration.registeredAt)} />
              {viewingRegistration.approvedAt && <InfoPill label="Approved At" value={formatDateTime(viewingRegistration.approvedAt)} />}
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
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">{icon}</div>
    <h3 className="mt-4 text-body-lg font-bold text-primary">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => {
  const titleId = useId();

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/55 p-4 sm:p-8" role="presentation">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
          <div className="min-w-0">
            <p className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
            <h2 id={titleId} className="break-words text-headline-md font-bold text-primary">{title}</h2>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default RaceRegistrationPage;

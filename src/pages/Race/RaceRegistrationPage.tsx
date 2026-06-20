import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, ClipboardList, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import { jockeyService, type JockeyItem } from '../../services/jockeyService';
import { raceRegistrationService, type RaceRegistrationFormData, type RaceRegistrationItem } from '../../services/raceRegistrationService';
import { scheduleService, type RaceScheduleItem, type TournamentApiItem } from '../../services/scheduleService';
import type { Horse } from '../../types/horse';
import type { UserProfile } from '../../types/user';

const initialForm: RaceRegistrationFormData = {
  tournamentId: 0,
  raceId: 0,
  horseId: 0,
  jockeyId: undefined,
};

const RaceRegistrationPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [items, setItems] = useState<RaceRegistrationItem[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [jockeys, setJockeys] = useState<JockeyItem[]>([]);
  const [races, setRaces] = useState<RaceScheduleItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentApiItem[]>([]);
  const [form, setForm] = useState<RaceRegistrationFormData>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = profile?.roleType === 'horse_owner';
  const canApprove = profile?.roleType === 'admin' || profile?.roleType === 'race_referee';

  const loadRegistrations = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentProfile = profile ?? await authService.getCurrentUser();
      setProfile(currentProfile);
      if (currentProfile.roleType === 'horse_owner') {
        const [registrations, horseList, jockeyList, raceList, tournamentList] = await Promise.all([
          raceRegistrationService.getMine(),
          HorseService.getHorses(),
          jockeyService.getJockeys('available'),
          scheduleService.getRaceSchedule(),
          scheduleService.getTournaments(),
        ]);

        setItems(registrations);
        setHorses(horseList);
        setJockeys(jockeyList);
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.create(form);
      setForm(initialForm);
      setMessage('Race registration created.');
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create registration.'));
    }
  };

  const handleApprove = async (id: number | string, status: string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceRegistrationService.approve(id, status);
      setMessage(`Registration marked as ${status}.`);
      await loadRegistrations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not update registration status.'));
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
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Race Registrations</p>
          <h1 className="mt-2 text-headline-lg font-bold text-primary">Entry management</h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">Horse owners register horses for races. Admin and race referee accounts approve entries from this workspace.</p>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr]">
          {isOwner && (
            <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-secondary" />
                <h2 className="text-title-large font-bold text-primary">Create registration</h2>
              </div>
              <form onSubmit={handleCreate} className="grid gap-4">
                <SelectInput
                  label="Tournament"
                  value={form.tournamentId}
                  onChange={(value) => setForm((current) => ({ ...current, tournamentId: Number(value), raceId: 0 }))}
                  required
                >
                  <option value="">Select tournament</option>
                  {tournaments.map((tournament) => {
                    const id = tournament.tournamentId ?? tournament.id;

                    if (!id) {
                      return null;
                    }

                    return (
                      <option key={id} value={id}>
                        {tournament.name ?? `Tournament ${id}`}
                      </option>
                    );
                  })}
                </SelectInput>
                <SelectInput
                  label="Race"
                  value={form.raceId}
                  onChange={(value) => {
                    const selectedRace = races.find((race) => race.raceId === Number(value));
                    setForm((current) => ({
                      ...current,
                      raceId: Number(value),
                      tournamentId: selectedRace?.tournamentId ?? current.tournamentId,
                    }));
                  }}
                  required
                >
                  <option value="">Select race</option>
                  {races
                    .filter((race) => !form.tournamentId || race.tournamentId === form.tournamentId)
                    .map((race) => (
                      <option key={race.raceId} value={race.raceId}>
                        {race.raceName} / {race.tournamentName} / Group {race.rankGroup}
                      </option>
                    ))}
                </SelectInput>
                <SelectInput label="Horse" value={form.horseId} onChange={(value) => setForm((current) => ({ ...current, horseId: Number(value) }))} required>
                  <option value="">Select horse</option>
                  {horses.map((horse) => (
                    <option key={horse.horseId} value={horse.horseId}>
                      {horse.name} / {horse.breed} / Group {horse.rankGroup}
                    </option>
                  ))}
                </SelectInput>
                <SelectInput label="Jockey" value={form.jockeyId ?? ''} onChange={(value) => setForm((current) => ({ ...current, jockeyId: value ? Number(value) : undefined }))}>
                  <option value="">Select jockey (optional)</option>
                  {jockeys.map((jockey) => (
                    <option key={jockey.jockeyId} value={jockey.jockeyId}>
                      {jockey.fullName ?? jockey.username ?? `Jockey ${jockey.jockeyId}`}
                    </option>
                  ))}
                </SelectInput>
                <button className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">Register Horse</button>
              </form>
            </section>
          )}

          <section className={`rounded-xl border border-outline-variant bg-white p-6 shadow-sm ${isOwner ? '' : 'xl:col-span-2'}`}>
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-secondary" />
              <h2 className="text-title-large font-bold text-primary">Registration queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Race</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Owner</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading registrations...</td></tr>
                  ) : items.map((item) => {
                    const id = item.regId ?? item.id ?? '';
                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.raceName ?? `Race ${item.raceId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.horseName ?? `Horse ${item.horseId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.ownerStableName ?? item.ownerFullName ?? '-'}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.status ?? '-'}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {canApprove && (
                              <>
                                <button type="button" onClick={() => handleApprove(id, 'approved')} className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-white">Approve</button>
                                <button type="button" onClick={() => handleApprove(id, 'rejected')} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error">Reject</button>
                              </>
                            )}
                            {isOwner && (
                              <button type="button" onClick={() => handleDelete(id)} className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && items.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No registrations found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const SelectInput = ({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <select value={value || ''} onChange={(event) => onChange(event.target.value)} required={required} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none">
      {children}
    </select>
  </label>
);

export default RaceRegistrationPage;

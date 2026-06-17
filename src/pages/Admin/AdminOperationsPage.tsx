import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Award, CalendarDays, Flag, ShieldCheck, Trophy } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService, type PrizeItem, type TournamentFormData } from '../../services/tournamentService';
import type { TournamentApiItem } from '../../services/scheduleService';

const initialTournamentForm: TournamentFormData = {
  name: '',
  location: '',
  startDate: '',
  endDate: '',
  prizePool: 0,
  status: 'upcoming',
};

const AdminOperationsPage = () => {
  const [tournaments, setTournaments] = useState<TournamentApiItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournamentForm, setTournamentForm] = useState<TournamentFormData>(initialTournamentForm);
  const [prizes, setPrizes] = useState<PrizeItem[]>([
    { finishPosition: 1, prizeName: 'Champion', amount: 0, note: '' },
    { finishPosition: 2, prizeName: 'Runner Up', amount: 0, note: '' },
    { finishPosition: 3, prizeName: 'Third Place', amount: 0, note: '' },
  ]);
  const [raceId, setRaceId] = useState('');
  const [refereeId, setRefereeId] = useState('');
  const [refereeRole, setRefereeRole] = useState('main_referee');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadTournaments = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await tournamentService.getTournaments();
      setTournaments(data);
      if (!selectedTournamentId && data[0]) {
        setSelectedTournamentId(String(data[0].tournamentId ?? data[0].id ?? ''));
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load tournaments.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTournaments();
  }, []);

  const handleCreateTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await tournamentService.createTournament(tournamentForm);
      setTournamentForm(initialTournamentForm);
      setMessage('Tournament created.');
      await loadTournaments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create tournament.'));
    }
  };

  const handleCancelTournament = async (tournamentId: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await tournamentService.cancelTournament(tournamentId);
      setMessage('Tournament cancelled.');
      await loadTournaments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not cancel tournament.'));
    }
  };

  const handleCreatePrizes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await tournamentService.createPrizes(selectedTournamentId, prizes);
      setMessage('Prizes saved for selected tournament.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not save prizes.'));
    }
  };

  const handleAssignReferee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await tournamentService.assignReferee(raceId, Number(refereeId), refereeRole);
      setRaceId('');
      setRefereeId('');
      setMessage('Referee assigned to race.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not assign referee.'));
    }
  };

  const activeTournaments = tournaments.filter((item) => String(item.status ?? '').toLowerCase() !== 'cancelled').length;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Operations</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Tournament control room</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Create tournaments, configure prizes, and assign referees from one horizontal command surface.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Tournaments" value={String(tournaments.length).padStart(2, '0')} />
              <MetricCard icon={<Flag className="h-4 w-4" />} label="Active" value={String(activeTournaments).padStart(2, '0')} />
              <MetricCard icon={<Award className="h-4 w-4" />} label="Prize tiers" value={String(prizes.length).padStart(2, '0')} />
              <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Selected" value={selectedTournamentId || '-'} />
            </div>
          </div>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-3">
            <article className="glass-panel rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Create tournament</h2>
              </div>
              <form onSubmit={handleCreateTournament} className="grid gap-4">
                <TextInput label="Name" value={tournamentForm.name} onChange={(value) => setTournamentForm((form) => ({ ...form, name: value }))} required />
                <TextInput label="Location" value={tournamentForm.location} onChange={(value) => setTournamentForm((form) => ({ ...form, location: value }))} required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Start date" type="date" value={tournamentForm.startDate} onChange={(value) => setTournamentForm((form) => ({ ...form, startDate: value }))} required />
                  <TextInput label="End date" type="date" value={tournamentForm.endDate} onChange={(value) => setTournamentForm((form) => ({ ...form, endDate: value }))} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Prize pool" type="number" value={String(tournamentForm.prizePool)} onChange={(value) => setTournamentForm((form) => ({ ...form, prizePool: Number(value) }))} />
                  <TextInput label="Status" value={tournamentForm.status} onChange={(value) => setTournamentForm((form) => ({ ...form, status: value }))} />
                </div>
                <button className="rounded-lg bg-secondary px-5 py-3 text-body-sm font-bold text-on-secondary hover:bg-opacity-90">Create Tournament</button>
              </form>
            </article>

            <article className="glass-panel rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <Award className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Prize setup</h2>
              </div>
              <form onSubmit={handleCreatePrizes} className="grid gap-4">
                <SelectInput label="Tournament" value={selectedTournamentId} onChange={setSelectedTournamentId}>
                  {tournaments.map((item) => {
                    const id = item.tournamentId ?? item.id;
                    return <option key={id} value={id}>{item.name}</option>;
                  })}
                </SelectInput>
                {prizes.map((prize, index) => (
                  <div key={prize.finishPosition} className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
                    <p className="text-label-sm font-bold uppercase tracking-wider text-outline">Position {prize.finishPosition}</p>
                    <TextInput label="Prize name" value={prize.prizeName} onChange={(value) => setPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, prizeName: value } : item))} />
                    <TextInput label="Amount" type="number" value={String(prize.amount)} onChange={(value) => setPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, amount: Number(value) } : item))} />
                    <TextInput label="Note" value={prize.note ?? ''} onChange={(value) => setPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, note: value } : item))} />
                  </div>
                ))}
                <button className="gold-gradient rounded-lg px-5 py-3 text-body-sm font-bold text-on-primary">Save Prizes</button>
              </form>
            </article>

            <article className="glass-panel rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Assign referee</h2>
              </div>
              <form onSubmit={handleAssignReferee} className="grid gap-4">
                <TextInput label="Race ID" type="number" value={raceId} onChange={setRaceId} required />
                <TextInput label="Referee ID" type="number" value={refereeId} onChange={setRefereeId} required />
                <TextInput label="Referee role" value={refereeRole} onChange={setRefereeRole} required />
                <button className="gold-gradient rounded-lg px-5 py-3 text-body-sm font-bold text-on-primary">Assign Referee</button>
              </form>
            </article>
          </section>

          <section className="glass-panel rounded-xl p-6">
            <h2 className="font-display mb-5 text-title-large font-bold text-primary">Tournament list</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Name</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Location</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Dates</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading tournaments...</td></tr>
                  ) : tournaments.map((item) => {
                    const id = item.tournamentId ?? item.id ?? '';
                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.name}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.location}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.startDate} - {item.endDate}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.status}</td>
                        <td className="px-4 py-4 text-right">
                          <button type="button" onClick={() => handleCancelTournament(id)} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error hover:bg-error-container/10">Cancel</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const TextInput = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

const SelectInput = ({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none">
      {children}
    </select>
  </label>
);

export default AdminOperationsPage;

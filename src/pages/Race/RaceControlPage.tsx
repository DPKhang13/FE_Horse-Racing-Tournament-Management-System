import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, Flag, Gauge, Trophy } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { raceOperationsService, type RaceResultMutationData } from '../../services/raceOperationsService';
import { raceResultService } from '../../services/raceResultService';
import { betService } from '../../services/betService';
import type { RaceResultListItem } from '../../types/raceResult';

const initialResultForm: RaceResultMutationData = {
  assignmentId: 0,
  reportId: undefined,
  finalRound: 1,
  finishPosition: 1,
  finishTimeSec: undefined,
  pointsAwarded: 0,
  isDisqualified: false,
  disqualifyReason: '',
  status: 'draft',
};

const RaceControlPage = () => {
  const [results, setResults] = useState<RaceResultListItem[]>([]);
  const [resultForm, setResultForm] = useState<RaceResultMutationData>(initialResultForm);
  const [targetResultId, setTargetResultId] = useState('');
  const [betId, setBetId] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [settlementStatus, setSettlementStatus] = useState('won');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadResults = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      setResults(await raceResultService.getRaceResultList());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load race results.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadResults();
  }, []);

  const handleCreateResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await raceOperationsService.createResult(resultForm);
      setResultForm(initialResultForm);
      setMessage('Race result created.');
      await loadResults();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create race result.'));
    }
  };

  const handlePublish = async (id: string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceOperationsService.publishResult(id);
      setMessage('Race result published.');
      await loadResults();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not publish result.'));
    }
  };

  const handleDelete = async (id: string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await raceOperationsService.deleteResult(id);
      setMessage('Race result deleted.');
      await loadResults();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not delete result.'));
    }
  };

  const handleUpdateResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await raceOperationsService.updateResult(targetResultId, resultForm);
      setMessage('Race result updated.');
      await loadResults();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not update race result.'));
    }
  };

  const handleSettleBet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await betService.checkBet(betId, settlementStatus, rewardPoints ? Number(rewardPoints) : undefined);
      await raceOperationsService.calculateReward(betId, settlementStatus, rewardPoints ? Number(rewardPoints) : undefined);
      setMessage('Bet checked and reward calculated.');
      setBetId('');
      setRewardPoints('');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not settle bet reward.'));
    }
  };

  const publishedResults = results.filter((item) => String(item.status ?? '').toLowerCase() === 'published').length;

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Referee Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Results and rewards control</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Certify race outcomes, publish result records, and settle spectator rewards from a wide operations board.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[480px]">
              <MetricCard icon={<Flag className="h-4 w-4" />} label="Results" value={String(results.length).padStart(2, '0')} />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Published" value={String(publishedResults).padStart(2, '0')} />
              <MetricCard icon={<Gauge className="h-4 w-4" />} label="Mode" value="Live" />
            </div>
          </div>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-3">
            <article className="glass-panel min-w-0 rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <Flag className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Create result</h2>
              </div>
              <ResultForm form={resultForm} onChange={setResultForm} onSubmit={handleCreateResult} submitLabel="Create Result" />
            </article>

            <article className="glass-panel min-w-0 rounded-xl p-6">
              <h2 className="font-display mb-5 text-title-large font-bold text-primary">Update result</h2>
              <form onSubmit={handleUpdateResult} className="grid gap-4">
                <TextInput label="Result ID" value={targetResultId} onChange={setTargetResultId} required />
                <ResultFormFields form={resultForm} onChange={setResultForm} />
                <button className="gold-gradient rounded-lg px-5 py-3 text-body-sm font-bold text-on-primary">Update Result</button>
              </form>
            </article>

            <article className="glass-panel min-w-0 rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Settle bet reward</h2>
              </div>
              <form onSubmit={handleSettleBet} className="grid gap-4">
                <TextInput label="Bet ID" value={betId} onChange={setBetId} required />
                <TextInput label="Status" value={settlementStatus} onChange={setSettlementStatus} required />
                <TextInput label="Reward points" type="number" value={rewardPoints} onChange={setRewardPoints} />
                <button className="rounded-lg bg-secondary px-5 py-3 text-body-sm font-bold text-on-secondary hover:bg-opacity-90">Settle Reward</button>
              </form>
            </article>
          </section>

          <section className="glass-panel rounded-xl p-6">
            <h2 className="font-display mb-5 text-title-large font-bold text-primary">Race results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Race</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading results...</td></tr>
                  ) : results.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.raceName}</td>
                      <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.tournamentName}</td>
                      <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.status}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handlePublish(item.id)} className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary">Publish</button>
                          <button type="button" onClick={() => handleDelete(item.id)} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && results.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No race results found.</td></tr>
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

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const ResultForm = ({ form, onChange, onSubmit, submitLabel }: { form: RaceResultMutationData; onChange: (form: RaceResultMutationData) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitLabel: string }) => (
  <form onSubmit={onSubmit} className="grid gap-4">
    <ResultFormFields form={form} onChange={onChange} />
    <button className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">{submitLabel}</button>
  </form>
);

const ResultFormFields = ({ form, onChange }: { form: RaceResultMutationData; onChange: (form: RaceResultMutationData) => void }) => (
  <>
    <TextInput label="Assignment ID" type="number" value={String(form.assignmentId || '')} onChange={(value) => onChange({ ...form, assignmentId: Number(value) })} required />
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <TextInput label="Finish position" type="number" value={String(form.finishPosition ?? '')} onChange={(value) => onChange({ ...form, finishPosition: value ? Number(value) : undefined })} />
      <TextInput label="Finish time sec" type="number" value={String(form.finishTimeSec ?? '')} onChange={(value) => onChange({ ...form, finishTimeSec: value ? Number(value) : undefined })} />
    </div>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <TextInput label="Points" type="number" value={String(form.pointsAwarded ?? '')} onChange={(value) => onChange({ ...form, pointsAwarded: value ? Number(value) : undefined })} />
      <TextInput label="Status" value={form.status} onChange={(value) => onChange({ ...form, status: value })} />
    </div>
    <label className="flex items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-primary">
      <input type="checkbox" checked={form.isDisqualified} onChange={(event) => onChange({ ...form, isDisqualified: event.target.checked })} />
      Disqualified
    </label>
    <TextInput label="Disqualify reason" value={form.disqualifyReason ?? ''} onChange={(value) => onChange({ ...form, disqualifyReason: value })} />
  </>
);

const StatusBanner = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const TextInput = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) => (
  <label className="grid min-w-0 gap-2">
    <span className="min-w-0 break-words text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="min-w-0 w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

export default RaceControlPage;

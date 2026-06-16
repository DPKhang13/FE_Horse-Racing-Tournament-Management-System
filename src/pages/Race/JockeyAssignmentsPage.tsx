import { useEffect, useState, type FormEvent } from 'react';
import { Send, UserCheck } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem, type JockeyInvitationFormData } from '../../services/jockeyAssignmentService';
import { jockeyService, type JockeyItem } from '../../services/jockeyService';
import type { UserProfile } from '../../types/user';

const initialForm: JockeyInvitationFormData = {
  registrationId: 0,
  raceId: 0,
  jockeyId: 0,
  gateNumber: undefined,
  status: 'pending',
};

const JockeyAssignmentsPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [assignments, setAssignments] = useState<JockeyAssignmentItem[]>([]);
  const [jockeys, setJockeys] = useState<JockeyItem[]>([]);
  const [form, setForm] = useState<JockeyInvitationFormData>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isOwner = profile?.roleType === 'horse_owner';
  const isJockey = profile?.roleType === 'jockey';

  const loadAssignments = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentProfile = profile ?? await authService.getCurrentUser();
      setProfile(currentProfile);

      if (currentProfile.roleType === 'horse_owner') {
        const [sent, availableJockeys] = await Promise.all([
          jockeyAssignmentService.getSent(),
          jockeyService.getJockeys('active'),
        ]);
        setAssignments(sent);
        setJockeys(availableJockeys);
      } else {
        setAssignments(await jockeyAssignmentService.getMine());
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load jockey assignments.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.create(form);
      setForm(initialForm);
      setMessage('Jockey invitation created.');
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not create jockey invitation.'));
    }
  };

  const handleRespond = async (id: number | string, status: string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.respond(id, status);
      setMessage(`Invitation ${status}.`);
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not respond to invitation.'));
    }
  };

  const handleDelete = async (id: number | string) => {
    setMessage('');
    setErrorMessage('');

    try {
      await jockeyAssignmentService.delete(id);
      setMessage('Invitation deleted.');
      await loadAssignments();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not delete invitation.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-12">
      <div className="mx-auto max-w-container px-4 md:px-margin-desktop">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Jockey Assignments</p>
          <h1 className="mt-2 text-headline-lg font-bold text-primary">Invitation workspace</h1>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr]">
          {isOwner && (
            <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Send className="h-5 w-5 text-secondary" />
                <h2 className="text-title-large font-bold text-primary">Invite jockey</h2>
              </div>
              <form onSubmit={handleCreate} className="grid gap-4">
                <NumberInput label="Registration ID" value={form.registrationId} onChange={(value) => setForm((current) => ({ ...current, registrationId: value }))} required />
                <NumberInput label="Race ID" value={form.raceId} onChange={(value) => setForm((current) => ({ ...current, raceId: value }))} required />
                <label className="grid gap-2">
                  <span className="text-label-sm font-bold uppercase tracking-wider text-outline">Jockey</span>
                  <select value={form.jockeyId || ''} onChange={(event) => setForm((current) => ({ ...current, jockeyId: Number(event.target.value) }))} required className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none">
                    <option value="">Select jockey</option>
                    {jockeys.map((jockey) => (
                      <option key={jockey.jockeyId} value={jockey.jockeyId}>
                        {jockey.fullName ?? jockey.username ?? `Jockey ${jockey.jockeyId}`}
                      </option>
                    ))}
                  </select>
                </label>
                <NumberInput label="Gate number" value={form.gateNumber ?? 0} onChange={(value) => setForm((current) => ({ ...current, gateNumber: value || undefined }))} />
                <TextInput label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
                <button className="rounded-md bg-secondary px-5 py-3 text-body-sm font-bold text-white hover:bg-opacity-90">Send Invitation</button>
              </form>
            </section>
          )}

          <section className={`rounded-xl border border-outline-variant bg-white p-6 shadow-sm ${isOwner ? '' : 'xl:col-span-2'}`}>
            <div className="mb-5 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-secondary" />
              <h2 className="text-title-large font-bold text-primary">{isJockey ? 'My invitations' : 'Sent invitations'}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant bg-surface-container">
                  <tr>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Race</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Horse</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Jockey</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline">Status</th>
                    <th className="px-4 py-3 text-label-sm uppercase tracking-wider text-outline text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Loading invitations...</td></tr>
                  ) : assignments.map((item) => {
                    const id = item.assignmentId ?? item.id ?? '';
                    return (
                      <tr key={id}>
                        <td className="px-4 py-4 text-body-sm font-semibold text-primary">{item.raceName ?? `Race ${item.raceId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.horseName ?? `Horse ${item.horseId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.jockeyFullName ?? `Jockey ${item.jockeyId ?? '-'}`}</td>
                        <td className="px-4 py-4 text-body-sm text-on-surface-variant">{item.status ?? '-'}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {isJockey && (
                              <>
                                <button type="button" onClick={() => handleRespond(id, 'accepted')} className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-white">Accept</button>
                                <button type="button" onClick={() => handleRespond(id, 'rejected')} className="rounded-md border border-error/40 px-3 py-2 text-label-sm font-bold text-error">Reject</button>
                              </>
                            )}
                            {isOwner && (
                              <button type="button" onClick={() => handleDelete(id)} className="rounded-md border border-outline-variant px-3 py-2 text-label-sm font-bold text-primary">Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && assignments.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-body-sm text-on-surface-variant">No invitations found.</td></tr>
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

const TextInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

const NumberInput = ({ label, value, onChange, required = false }: { label: string; value: number; onChange: (value: number) => void; required?: boolean }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input type="number" value={value || ''} onChange={(event) => onChange(Number(event.target.value))} required={required} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

export default JockeyAssignmentsPage;

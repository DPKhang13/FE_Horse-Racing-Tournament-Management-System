import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Clock3, Send, UserCheck, Users } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { jockeyAssignmentService, type JockeyAssignmentItem, type JockeyInvitationFormData } from '../../services/jockeyAssignmentService';
import { jockeyService, type JockeyItem } from '../../services/jockeyService';
import { raceRegistrationService, type RaceRegistrationItem } from '../../services/raceRegistrationService';
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
  const [registrations, setRegistrations] = useState<RaceRegistrationItem[]>([]);
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
        const [sent, availableJockeys, registrationList] = await Promise.all([
          jockeyAssignmentService.getSent(),
          jockeyService.getJockeys('active'),
          raceRegistrationService.getMine(),
        ]);
        setAssignments(sent);
        setJockeys(availableJockeys);
        setRegistrations(registrationList);
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

  const pendingAssignments = assignments.filter((item) => String(item.status ?? '').toLowerCase() === 'pending').length;
  const raceOptions = registrations.filter((registration, index, source) => {
    const raceId = registration.raceId;
    return Boolean(raceId) && source.findIndex((item) => item.raceId === raceId) === index;
  });

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Jockey Dashboard</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Invitation workspace</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Send, review, accept, and reject jockey invitations in a wide queue layout.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[480px]">
              <MetricCard icon={<UserCheck className="h-4 w-4" />} label="Invitations" value={String(assignments.length).padStart(2, '0')} />
              <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Pending" value={String(pendingAssignments).padStart(2, '0')} />
              <MetricCard icon={<Users className="h-4 w-4" />} label="Jockeys" value={String(jockeys.length).padStart(2, '0')} />
            </div>
          </div>
        </div>

        {message && <StatusBanner tone="success" text={message} />}
        {errorMessage && <StatusBanner tone="error" text={errorMessage} />}

        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          {isOwner && (
            <section className="glass-panel rounded-xl p-6">
              <div className="mb-5 flex items-center gap-3">
                <Send className="h-5 w-5 text-secondary" />
                <h2 className="font-display text-title-large font-bold text-primary">Invite jockey</h2>
              </div>
              <form onSubmit={handleCreate} className="grid gap-4">
                <SelectInput
                  label="Registration"
                  value={form.registrationId}
                  onChange={(value) => {
                    const selectedRegistration = registrations.find((registration) => (registration.regId ?? registration.id) === Number(value));
                    setForm((current) => ({
                      ...current,
                      registrationId: Number(value),
                      raceId: selectedRegistration?.raceId ?? current.raceId,
                    }));
                  }}
                  required
                >
                  <option value="">Select registration</option>
                  {registrations.map((registration) => {
                    const id = registration.regId ?? registration.id;

                    if (!id) {
                      return null;
                    }

                    return (
                      <option key={id} value={id}>
                        {registration.horseName ?? `Horse ${registration.horseId ?? '-'}`} / {registration.raceName ?? `Race ${registration.raceId ?? '-'}`} / {registration.status ?? 'pending'}
                      </option>
                    );
                  })}
                </SelectInput>
                <SelectInput label="Race" value={form.raceId} onChange={(value) => setForm((current) => ({ ...current, raceId: Number(value) }))} required>
                  <option value="">Select race</option>
                  {raceOptions.map((registration) => (
                    <option key={registration.raceId} value={registration.raceId}>
                      {registration.raceName ?? `Race ${registration.raceId}`} / {registration.tournamentName ?? `Tournament ${registration.tournamentId ?? '-'}`}
                    </option>
                  ))}
                </SelectInput>
                <SelectInput label="Jockey" value={form.jockeyId} onChange={(value) => setForm((current) => ({ ...current, jockeyId: Number(value) }))} required>
                  <option value="">Select jockey</option>
                  {jockeys.map((jockey) => (
                    <option key={jockey.jockeyId} value={jockey.jockeyId}>
                      {jockey.fullName ?? jockey.username ?? `Jockey ${jockey.jockeyId}`}
                    </option>
                  ))}
                </SelectInput>
                <NumberInput label="Gate number" value={form.gateNumber ?? 0} onChange={(value) => setForm((current) => ({ ...current, gateNumber: value || undefined }))} />
                <TextInput label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
                <button className="rounded-lg bg-secondary px-5 py-3 text-body-sm font-bold text-on-secondary hover:bg-opacity-90">Send Invitation</button>
              </form>
            </section>
          )}

          <section className={`glass-panel rounded-xl p-6 ${isOwner ? '' : 'xl:col-span-2'}`}>
            <div className="mb-5 flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-title-large font-bold text-primary">{isJockey ? 'My invitations' : 'Sent invitations'}</h2>
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
                                <button type="button" onClick={() => handleRespond(id, 'accepted')} className="rounded-md bg-secondary px-3 py-2 text-label-sm font-bold text-on-secondary">Accept</button>
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

const TextInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
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

const NumberInput = ({ label, value, onChange, required = false }: { label: string; value: number; onChange: (value: number) => void; required?: boolean }) => (
  <label className="grid gap-2">
    <span className="text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    <input type="number" value={value || ''} onChange={(event) => onChange(Number(event.target.value))} required={required} className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm focus:border-primary focus:outline-none" />
  </label>
);

export default JockeyAssignmentsPage;

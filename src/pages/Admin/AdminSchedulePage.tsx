import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import {
  adminScheduleRaceApi,
  type AdminScheduleFormData,
  type AdminScheduleItem,
  type AdminTournamentOption,
} from '../../services/adminScheduleRaceApi';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};
type ScheduleFormErrors = Partial<Record<keyof AdminScheduleFormData, string>>;

const emptyScheduleForm: AdminScheduleFormData = {
  raceDate: '',
  dayNumber: 1,
  title: '',
  note: '',
};

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const validateScheduleForm = (data: AdminScheduleFormData) => {
  const errors: ScheduleFormErrors = {};

  if (!data.raceDate) {
    errors.raceDate = 'Race date is required.';
  }

  if (Number(data.dayNumber) <= 0) {
    errors.dayNumber = 'Day number must be greater than 0.';
  }

  if (!data.title.trim()) {
    errors.title = 'Title is required.';
  }

  return errors;
};

const toFormData = (schedule: AdminScheduleItem): AdminScheduleFormData => ({
  raceDate: schedule.raceDate,
  dayNumber: schedule.dayNumber,
  title: schedule.title,
  note: schedule.note,
});

const AdminSchedulePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTournamentId = Number(searchParams.get('tournamentId')) || undefined;
  const shouldOpenCreateForm = searchParams.get('create') === '1';
  const [tournaments, setTournaments] = useState<AdminTournamentOption[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | ''>('');
  const [schedules, setSchedules] = useState<AdminScheduleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isTournamentLoading, setIsTournamentLoading] = useState(true);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AdminScheduleItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<AdminScheduleFormData>(emptyScheduleForm);
  const [formErrors, setFormErrors] = useState<ScheduleFormErrors>({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);

  useToastNotifications([notice]);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.tournamentId === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const loadTournaments = async () => {
    setIsTournamentLoading(true);
    setNotice(null);

    try {
      const data = await adminScheduleRaceApi.getTournaments();
      const requestedTournament = data.find((tournament) => tournament.tournamentId === requestedTournamentId);
      setTournaments(data);
      setSelectedTournamentId((current) => requestedTournament?.tournamentId ?? (current || data[0]?.tournamentId || ''));
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load tournaments.') });
    } finally {
      setIsTournamentLoading(false);
    }
  };

  const loadSchedules = async (tournamentId = selectedTournamentId, tournament = selectedTournament) => {
    if (!tournamentId) {
      setSchedules([]);
      return;
    }

    setIsScheduleLoading(true);
    setNotice(null);

    try {
      const data = await adminScheduleRaceApi.getSchedules(tournamentId, tournament ?? undefined);
      setSchedules(data);
    } catch (error) {
      setSchedules([]);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load schedules.') });
    } finally {
      setIsScheduleLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTournaments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSchedules();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedTournamentId]);

  const filteredSchedules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return schedules.filter((schedule) => {
      const searchableValues = [
        schedule.title,
        schedule.note,
        schedule.tournamentName,
        schedule.raceDate,
        String(schedule.dayNumber),
      ];
      const matchesSearch = !query || searchableValues.some((value) => value.toLowerCase().includes(query));
      const matchesDate = !dateFilter || schedule.raceDate === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [dateFilter, schedules, searchTerm]);

  const upcomingCount = useMemo(() => {
    const today = todayInputValue();
    return schedules.filter((schedule) => schedule.raceDate >= today).length;
  }, [schedules]);

  const openCreateModal = useCallback(() => {
    const nextDayNumber = schedules.length + 1;

    setEditingSchedule(null);
    setFormData({
      raceDate: selectedTournament?.startDate || todayInputValue(),
      dayNumber: nextDayNumber,
      title: `Day ${nextDayNumber}`,
      note: '',
    });
    setFormErrors({});
    setFormError('');
    setIsFormOpen(true);
  }, [schedules.length, selectedTournament?.startDate]);


  useEffect(() => {
    if (!shouldOpenCreateForm || isTournamentLoading || selectedTournamentId !== requestedTournamentId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      openCreateModal();
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('create');
      setSearchParams(nextSearchParams, { replace: true });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isTournamentLoading, openCreateModal, requestedTournamentId, searchParams, selectedTournamentId, setSearchParams, shouldOpenCreateForm]);
  const openEditModal = async (schedule: AdminScheduleItem) => {
    setEditingSchedule(schedule);
    setFormData(toFormData(schedule));
    setFormErrors({});
    setFormError('');
    setIsFormOpen(true);

    try {
      const latestSchedule = await adminScheduleRaceApi.getSchedule(schedule.scheduleId, selectedTournament ?? undefined);
      setEditingSchedule(latestSchedule);
      setFormData(toFormData(latestSchedule));
    } catch {
      setNotice({ tone: 'error', text: 'Could not refresh this schedule. Showing the list version instead.' });
    }
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
    setFormData(emptyScheduleForm);
    setFormErrors({});
    setFormError('');
  };

  const handleFieldChange = <K extends keyof AdminScheduleFormData>(field: K, value: AdminScheduleFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTournamentId || !selectedTournament) {
      setFormError('Select a tournament before saving a schedule.');
      return;
    }

    setFormError('');
    const errors = validateScheduleForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      let savedSchedule: AdminScheduleItem;
      let fallbackMessage: string;

      if (editingSchedule) {
        savedSchedule = await adminScheduleRaceApi.updateSchedule(editingSchedule.scheduleId, formData, selectedTournament);
        fallbackMessage = 'Schedule updated successfully.';
      } else {
        savedSchedule = await adminScheduleRaceApi.createSchedule(selectedTournamentId, formData, selectedTournament);
        fallbackMessage = 'Schedule created successfully.';
      }

      closeFormModal();
      await loadSchedules(selectedTournamentId, selectedTournament);
      setNotice({ tone: 'success', text: savedSchedule.responseMessage || fallbackMessage });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to save schedule.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="admin-surface-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Schedule</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Schedule</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Create tournament days first, then manage races under the selected schedule.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Tournaments" value={String(tournaments.length).padStart(2, '0')} />
              <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Schedules" value={isScheduleLoading ? '...' : String(schedules.length).padStart(2, '0')} />
              <MetricCard icon={<ClipboardList className="h-4 w-4" />} label="Upcoming" value={isScheduleLoading ? '...' : String(upcomingCount).padStart(2, '0')} />
            </div>
          </div>
        </section>

        {notice && <StatusBanner tone={notice.tone} text={notice.text} />}

        <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="admin-surface-panel flex-1 rounded-xl p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_180px_140px]">
              <div className="relative">
                <Trophy className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value ? Number(event.target.value) : '')}
                  disabled={isTournamentLoading}
                  aria-label="Select tournament"
                  className={filterInputClassName}
                >
                  <option value="">{isTournamentLoading ? 'Loading tournaments...' : 'Select tournament'}</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.tournamentId} value={tournament.tournamentId}>
                      {tournament.tournamentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search schedule..."
                className={filterInputClassName}
              />
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              aria-label="Filter schedule by race date"
              className={plainFilterInputClassName}
            />

              <button
                type="button"
                onClick={() => void loadTournaments()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!selectedTournamentId || isTournamentLoading}
            className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </button>
        </section>

        <section className="admin-surface-panel overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Day</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Title</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Race Date</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Tournament</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Note</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isScheduleLoading && filteredSchedules.map((schedule) => (
                  <tr key={schedule.scheduleId} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-5 py-4">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-body-sm font-extrabold text-primary">
                        {schedule.dayNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{schedule.title}</p>
                      <p className="mt-1 text-label-sm font-semibold text-outline">SCH-{String(schedule.scheduleId).padStart(3, '0')}</p>
                    </td>
                    <td className="px-5 py-4 text-body-sm font-semibold text-on-surface-variant">{formatDate(schedule.raceDate)}</td>
                    <td className="px-5 py-4 text-body-sm font-semibold text-on-surface-variant">{schedule.tournamentName}</td>
                    <td className="max-w-[280px] px-5 py-4 text-body-sm text-on-surface-variant">
                      <span className="line-clamp-2">{schedule.note || '-'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <IconButton label={`Edit ${schedule.title}`} onClick={() => void openEditModal(schedule)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isScheduleLoading || filteredSchedules.length === 0) && (
            <EmptyState
              title={isScheduleLoading ? 'Loading schedules' : 'No schedules found'}
              description={
                isScheduleLoading
                  ? 'Fetching schedules from the selected tournament.'
                  : selectedTournamentId
                    ? 'No schedule matches the current filters.'
                    : 'Select a tournament to manage schedules.'
              }
            />
          )}
        </section>

        {isFormOpen && (
          <Modal
            title={editingSchedule ? 'Edit schedule' : 'Create schedule'}
            subtitle={editingSchedule ? `SCH-${String(editingSchedule.scheduleId).padStart(3, '0')}` : selectedTournament?.tournamentName ?? 'New schedule'}
            onClose={closeFormModal}
          >
            <ScheduleForm
              formData={formData}
              formErrors={formErrors}
              formError={formError}
              isSaving={isSaving}
              isEditing={Boolean(editingSchedule)}
              onSubmit={handleSubmit}
              onChange={handleFieldChange}
              onCancel={closeFormModal}
            />
          </Modal>
        )}
      </div>
    </div>
  );
};

const filterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none';

const plainFilterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const inputClassName =
  'w-full rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm transition-colors focus:border-primary focus:outline-none';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 p-3">
    <div className="flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display mt-2 truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: Notice) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`mb-6 whitespace-pre-wrap break-words rounded-md border px-4 py-3 text-body-sm font-semibold [overflow-wrap:anywhere] ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}
  >
    {text}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <Search className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const IconButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-form-modal-title"
      aria-describedby="schedule-form-modal-subtitle"
      className="mx-auto max-w-3xl rounded-lg border border-outline-variant bg-surface-container shadow-xl"
    >
      <div className="flex items-start justify-between gap-6 border-b border-outline-variant p-6">
        <div>
          <p id="schedule-form-modal-subtitle" className="mb-2 text-label-sm font-bold uppercase tracking-widest text-outline">{subtitle}</p>
          <h2 id="schedule-form-modal-title" className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          aria-label="Close modal"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm font-bold uppercase tracking-wider text-outline">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const ScheduleForm = ({
  formData,
  formErrors,
  formError,
  isSaving,
  isEditing,
  onSubmit,
  onChange,
  onCancel,
}: {
  formData: AdminScheduleFormData;
  formErrors: ScheduleFormErrors;
  formError: string;
  isSaving: boolean;
  isEditing: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof AdminScheduleFormData>(field: K, value: AdminScheduleFormData[K]) => void;
  onCancel: () => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-6 p-6">
    {formError && (
      <div
        role="alert"
        aria-live="assertive"
        className="whitespace-pre-wrap break-words rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error"
      >
        {formError}
      </div>
    )}
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Race Date" error={formErrors.raceDate}>
        <input type="date" value={formData.raceDate} onChange={(event) => onChange('raceDate', event.target.value)} className={inputClassName} />
      </Field>
      <Field label="Day Number" error={formErrors.dayNumber}>
        <input type="number" min="1" value={formData.dayNumber || ''} onChange={(event) => onChange('dayNumber', Number(event.target.value))} className={inputClassName} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Title" error={formErrors.title}>
          <input type="text" value={formData.title} onChange={(event) => onChange('title', event.target.value)} className={inputClassName} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Note">
          <textarea value={formData.note} onChange={(event) => onChange('note', event.target.value)} rows={4} className={inputClassName} />
        </Field>
      </div>
    </div>

    <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Schedule'}
      </button>
    </div>
  </form>
);

export default AdminSchedulePage;

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Coins,
  Filter,
  Gauge,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { betService, type BetOptionItem } from '../../services/betService';
import {
  adminScheduleRaceApi,
  type AdminRaceItem,
  type AdminTournamentOption,
} from '../../services/adminScheduleRaceApi';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);

const formatRate = (value: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parsePositiveInteger = (value: string) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const parsePositiveRate = (value: string) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const getOptionLabel = (option: BetOptionItem) => `OPT-${String(option.optionId).padStart(4, '0')}`;
const getJockeyName = (option: BetOptionItem) => option.jockeyFullName || option.jockeyName || '-';

const AdminBetManagementPage = () => {
  const [betOptions, setBetOptions] = useState<BetOptionItem[]>([]);
  const [raceIdFilter, setRaceIdFilter] = useState('');
  const [activeRaceId, setActiveRaceId] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateTournamentId, setGenerateTournamentId] = useState('');
  const [generateRaceId, setGenerateRaceId] = useState('');
  const [generateTournaments, setGenerateTournaments] = useState<AdminTournamentOption[]>([]);
  const [generateRaces, setGenerateRaces] = useState<AdminRaceItem[]>([]);
  const [generateError, setGenerateError] = useState('');
  const [isGenerateTournamentLoading, setIsGenerateTournamentLoading] = useState(false);
  const [isGenerateRaceLoading, setIsGenerateRaceLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<BetOptionItem | null>(null);
  const [rateValue, setRateValue] = useState('');
  const [rateError, setRateError] = useState('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isRateSaving, setIsRateSaving] = useState(false);
  const generateTournamentRequestIdRef = useRef(0);
  const generateRaceRequestIdRef = useRef(0);

  const loadOptions = async (raceId: number | '' = activeRaceId, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setNotice(null);

    try {
      const data = await betService.getBetOptions(raceId || undefined);
      setBetOptions(data);
    } catch (error) {
      setBetOptions([]);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load bet options.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    betService.getBetOptions()
      .then((data) => {
        if (isMounted) {
          setBetOptions(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setBetOptions([]);
          setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load bet options.') });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const raceIds = new Set(betOptions.map((option) => option.raceId).filter(Boolean));
    const totalBetPoints = betOptions.reduce((total, option) => total + option.totalBetPoints, 0);
    const totalBetCount = betOptions.reduce((total, option) => total + option.totalBetCount, 0);
    const averageRate = betOptions.length > 0
      ? betOptions.reduce((total, option) => total + option.currentRate, 0) / betOptions.length
      : 0;

    return {
      raceCount: raceIds.size,
      totalBetPoints,
      totalBetCount,
      averageRate,
    };
  }, [betOptions]);

  const handleApplyRaceFilter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!raceIdFilter.trim()) {
      setActiveRaceId('');
      await loadOptions('');
      return;
    }

    const parsedRaceId = parsePositiveInteger(raceIdFilter.trim());

    if (!parsedRaceId) {
      setNotice({ tone: 'error', text: 'Race ID must be a positive whole number.' });
      return;
    }

    setActiveRaceId(parsedRaceId);
    await loadOptions(parsedRaceId);
  };

  const clearRaceFilter = async () => {
    setRaceIdFilter('');
    setActiveRaceId('');
    await loadOptions('');
  };

  const loadGenerateTournaments = async () => {
    const requestId = generateTournamentRequestIdRef.current + 1;
    generateTournamentRequestIdRef.current = requestId;
    setIsGenerateTournamentLoading(true);

    try {
      const tournaments = await adminScheduleRaceApi.getTournaments();

      if (requestId !== generateTournamentRequestIdRef.current) {
        return;
      }

      setGenerateTournaments(tournaments);

      if (tournaments.length === 0) {
        setGenerateError('No tournaments are available.');
      }
    } catch (error) {
      if (requestId === generateTournamentRequestIdRef.current) {
        setGenerateTournaments([]);
        setGenerateError(getApiErrorMessage(error, 'Unable to load tournaments.'));
      }
    } finally {
      if (requestId === generateTournamentRequestIdRef.current) {
        setIsGenerateTournamentLoading(false);
      }
    }
  };

  const openGenerateModal = () => {
    setGenerateTournamentId('');
    setGenerateRaceId('');
    setGenerateTournaments([]);
    setGenerateRaces([]);
    setGenerateError('');
    setIsGenerateModalOpen(true);
    void loadGenerateTournaments();
  };

  const handleGenerateTournamentChange = async (tournamentId: string) => {
    const requestId = generateRaceRequestIdRef.current + 1;
    generateRaceRequestIdRef.current = requestId;
    setGenerateTournamentId(tournamentId);
    setGenerateRaceId('');
    setGenerateRaces([]);
    setGenerateError('');

    if (!tournamentId) {
      setIsGenerateRaceLoading(false);
      return;
    }

    setIsGenerateRaceLoading(true);

    try {
      const races = await adminScheduleRaceApi.getRacesByTournament(tournamentId);

      if (requestId !== generateRaceRequestIdRef.current) {
        return;
      }

      setGenerateRaces(races);

      if (races.length === 0) {
        setGenerateError('This tournament has no races available.');
      }
    } catch (error) {
      if (requestId === generateRaceRequestIdRef.current) {
        setGenerateRaces([]);
        setGenerateError(getApiErrorMessage(error, 'Unable to load races for this tournament.'));
      }
    } finally {
      if (requestId === generateRaceRequestIdRef.current) {
        setIsGenerateRaceLoading(false);
      }
    }
  };

  const closeGenerateModal = () => {
    generateTournamentRequestIdRef.current += 1;
    generateRaceRequestIdRef.current += 1;
    setIsGenerateModalOpen(false);
    setGenerateTournamentId('');
    setGenerateRaceId('');
    setGenerateRaces([]);
    setGenerateError('');
    setIsGenerateTournamentLoading(false);
    setIsGenerateRaceLoading(false);
  };

  const handleGenerateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!generateTournamentId) {
      setGenerateError('Select a tournament first.');
      return;
    }

    const parsedRaceId = parsePositiveInteger(generateRaceId);

    if (!parsedRaceId || !generateRaces.some((race) => race.raceId === parsedRaceId)) {
      setGenerateError('Select a race to generate bet options.');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const generatedOptions = await betService.generateBetOptionsForRace(parsedRaceId);
      setBetOptions(generatedOptions);
      setRaceIdFilter(String(parsedRaceId));
      setActiveRaceId(parsedRaceId);
      const generatedRace = generateRaces.find((race) => race.raceId === parsedRaceId);
      setNotice({
        tone: 'success',
        text: `Generated ${generatedOptions.length} bet option${generatedOptions.length === 1 ? '' : 's'} for ${generatedRace?.name ?? 'race'} #${parsedRaceId}.`,
      });
      closeGenerateModal();
    } catch (error) {
      setGenerateError(getApiErrorMessage(error, 'Unable to generate bet options for this race.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const openRateModal = async (option: BetOptionItem) => {
    setSelectedOption(option);
    setRateValue(option.currentRate ? String(option.currentRate) : '');
    setRateError('');
    setNotice(null);
    setIsRateModalOpen(true);
    setIsDetailLoading(true);

    try {
      const latestOption = await betService.getBetOptionById(option.optionId);
      setSelectedOption(latestOption);
      setRateValue(latestOption.currentRate ? String(latestOption.currentRate) : '');
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not refresh this bet option. Showing the list version instead.') });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeRateModal = () => {
    setIsRateModalOpen(false);
    setSelectedOption(null);
    setRateValue('');
    setRateError('');
  };

  const handleRateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOption) {
      return;
    }

    const parsedRate = parsePositiveRate(rateValue.trim());

    if (!parsedRate) {
      setRateError('Rate must be greater than 0.');
      return;
    }

    setIsRateSaving(true);
    setRateError('');

    try {
      const updatedOption = await betService.updateBetOptionRate(selectedOption.optionId, parsedRate);
      setBetOptions((currentOptions) =>
        currentOptions.map((option) => (option.optionId === updatedOption.optionId ? updatedOption : option)),
      );
      setNotice({ tone: 'success', text: `Updated rate for ${getOptionLabel(updatedOption)}.` });
      closeRateModal();
    } catch (error) {
      setRateError(getApiErrorMessage(error, 'Unable to update this rate.'));
    } finally {
      setIsRateSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <section className="admin-surface-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Admin Bet Management</p>
              <h1 className="font-display mt-2 text-headline-lg font-extrabold text-primary">Bet Management</h1>
              <p className="mt-2 max-w-2xl text-body-sm text-on-surface-variant">
                Generate race bet options, review option activity, and adjust admin-controlled odds before spectators place predictions.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[650px] xl:flex-none xl:grid-cols-4">
              <MetricCard icon={<Ticket className="h-4 w-4" />} label="Options" value={isLoading ? '...' : String(betOptions.length).padStart(2, '0')} />
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Races" value={isLoading ? '...' : String(stats.raceCount).padStart(2, '0')} />
              <MetricCard icon={<Coins className="h-4 w-4" />} label="Bet Points" value={isLoading ? '...' : formatNumber(stats.totalBetPoints)} />
              <MetricCard icon={<Gauge className="h-4 w-4" />} label="Avg Rate" value={isLoading ? '...' : formatRate(stats.averageRate)} />
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-stretch xl:justify-between">
          <div className="admin-surface-panel flex-1 rounded-xl p-4">
            <form onSubmit={handleApplyRaceFilter} className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_140px_120px]">
              <label className="relative">
                <span className="sr-only">Filter by race ID</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={raceIdFilter}
                  onChange={(event) => setRaceIdFilter(event.target.value)}
                  placeholder="Enter raceId to filter"
                  className={filterInputClassName}
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Filter className="h-4 w-4" />
                Apply
              </button>

              <button
                type="button"
                onClick={() => void clearRaceFilter()}
                disabled={isLoading && !activeRaceId}
                className="inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                All
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={openGenerateModal}
            className="gold-gradient inline-flex min-h-[76px] items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all xl:w-[240px]"
          >
            <WandSparkles className="h-4 w-4" />
            Generate Bets for Race
          </button>
        </section>

        {notice && <StatusBanner tone={notice.tone} text={notice.text} />}

        <section className="admin-surface-panel overflow-hidden rounded-lg">
          <div className="flex flex-col gap-4 border-b border-outline-variant p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-outline">
                {activeRaceId ? `Race #${activeRaceId}` : 'All bet options'}
              </p>
              <h2 className="mt-1 text-title-lg font-bold text-primary">Bet Options</h2>
            </div>

            <button
              type="button"
              onClick={() => void loadOptions()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant px-4 py-2.5 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead className="border-b border-outline-variant bg-surface-container">
                <tr>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Option</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Race</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Selection</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Rate</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Activity</th>
                  <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Updated</th>
                  <th className="px-5 py-4 text-right text-label-sm uppercase tracking-wider text-outline">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isLoading && betOptions.map((option) => (
                  <tr key={option.optionId} className="transition-colors hover:bg-surface-container-lowest">
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{getOptionLabel(option)}</p>
                      <p className="mt-1 text-label-sm font-semibold text-outline">
                        Assignment {option.assignmentId ? `#${option.assignmentId}` : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{option.raceName}</p>
                      <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">
                        Race {option.raceId ? `#${option.raceId}` : '-'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-[240px] items-center gap-3">
                        <ParticipantAvatar option={option} />
                        <div>
                          <p className="text-body-sm font-bold text-primary">{option.horseName}</p>
                          <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">Jockey: {getJockeyName(option)}</p>
                          <p className="mt-1 text-label-sm text-outline">Gate {option.gateNumber ?? '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-body-sm font-extrabold text-secondary">
                        {formatRate(option.currentRate)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-body-sm font-bold text-primary">{formatNumber(option.totalBetPoints)} pts</p>
                      <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{formatNumber(option.totalBetCount)} bets</p>
                    </td>
                    <td className="px-5 py-4 text-body-sm font-semibold text-on-surface-variant">{formatDateTime(option.updatedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void openRateModal(option)}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-4 py-2.5 text-label-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Rate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isLoading || betOptions.length === 0) && (
            <EmptyState
              title={isLoading ? 'Loading bet options' : 'No bet options found'}
              description={
                isLoading
                  ? 'Fetching bet option records from the API.'
                  : activeRaceId
                    ? 'No bet options were returned for this race.'
                    : 'Generate options for a race or refresh once backend data is available.'
              }
            />
          )}
        </section>
      </div>

      {isGenerateModalOpen && (
        <GenerateBetsModal
          tournamentId={generateTournamentId}
          raceId={generateRaceId}
          tournaments={generateTournaments}
          races={generateRaces}
          error={generateError}
          isTournamentLoading={isGenerateTournamentLoading}
          isRaceLoading={isGenerateRaceLoading}
          isSubmitting={isGenerating}
          onTournamentChange={(value) => void handleGenerateTournamentChange(value)}
          onRaceChange={(value) => {
            setGenerateRaceId(value);
            setGenerateError('');
          }}
          onClose={closeGenerateModal}
          onSubmit={handleGenerateSubmit}
        />
      )}

      {isRateModalOpen && selectedOption && (
        <EditRateModal
          option={selectedOption}
          rateValue={rateValue}
          error={rateError}
          isLoading={isDetailLoading}
          isSubmitting={isRateSaving}
          onChange={(value) => {
            setRateValue(value);
            setRateError('');
          }}
          onClose={closeRateModal}
          onSubmit={handleRateSubmit}
        />
      )}
    </div>
  );
};

const filterInputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none';

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
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
    {text}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <Sparkles className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const ParticipantAvatar = ({ option }: { option: BetOptionItem }) => {
  const imageUrl = option.horseAvatarUrl || option.jockeyAvatarUrl;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={option.horseName}
        className="h-12 w-12 rounded-md border border-outline-variant object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-outline-variant bg-surface-container-low">
      <Users className="h-5 w-5 text-outline" />
    </div>
  );
};

const GenerateBetsModal = ({
  tournamentId,
  raceId,
  tournaments,
  races,
  error,
  isTournamentLoading,
  isRaceLoading,
  isSubmitting,
  onTournamentChange,
  onRaceChange,
  onClose,
  onSubmit,
}: {
  tournamentId: string;
  raceId: string;
  tournaments: AdminTournamentOption[];
  races: AdminRaceItem[];
  error: string;
  isTournamentLoading: boolean;
  isRaceLoading: boolean;
  isSubmitting: boolean;
  onTournamentChange: (value: string) => void;
  onRaceChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <Modal title="Generate Bets for Race" subtitle="Auto-generate options" onClose={onClose} maxWidthClassName="max-w-xl">
    <form onSubmit={onSubmit} className="space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tournament">
          <select
            value={tournamentId}
            onChange={(event) => onTournamentChange(event.target.value)}
            disabled={isTournamentLoading || isSubmitting}
            className={inputClassName}
            autoFocus
          >
            <option value="">
              {isTournamentLoading ? 'Loading tournaments...' : 'Select tournament'}
            </option>
            {tournaments.map((tournament) => (
              <option key={tournament.tournamentId} value={tournament.tournamentId}>
                {tournament.tournamentName} (#{tournament.tournamentId})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Race">
          <select
            value={raceId}
            onChange={(event) => onRaceChange(event.target.value)}
            disabled={!tournamentId || isRaceLoading || isSubmitting}
            className={inputClassName}
          >
            <option value="">
              {!tournamentId
                ? 'Select tournament first'
                : isRaceLoading
                  ? 'Loading races...'
                  : races.length === 0
                    ? 'No races available'
                    : 'Select race'}
            </option>
            {races.map((race) => (
              <option key={race.raceId} value={race.raceId}>
                Race {race.raceNumber}: {race.name} (#{race.raceId})
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
          {error}
        </div>
      )}

      <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
        Select a tournament and race. The generated options will then be shown in the table for that race.
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isTournamentLoading || isRaceLoading || !raceId}
          className="gold-gradient inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-body-sm font-extrabold text-on-primary transition-all disabled:cursor-not-allowed disabled:opacity-70"
        >
          <WandSparkles className="h-4 w-4" />
          {isSubmitting ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </form>
  </Modal>
);

const EditRateModal = ({
  option,
  rateValue,
  error,
  isLoading,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: {
  option: BetOptionItem;
  rateValue: string;
  error: string;
  isLoading: boolean;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <Modal title="Edit Rate" subtitle={getOptionLabel(option)} onClose={onClose} maxWidthClassName="max-w-2xl">
    <form onSubmit={onSubmit} className="space-y-6 p-6">
      {isLoading && (
        <div className="rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
          Loading latest option detail...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <DetailItem label="Race" value={`${option.raceName} ${option.raceId ? `#${option.raceId}` : ''}`} />
        <DetailItem label="Selection" value={`${option.horseName} / ${getJockeyName(option)}`} />
        <DetailItem label="Current Rate" value={formatRate(option.currentRate)} />
        <DetailItem label="Activity" value={`${formatNumber(option.totalBetPoints)} pts / ${formatNumber(option.totalBetCount)} bets`} />
      </div>

      <Field label="New Rate" error={error}>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={rateValue}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
          autoFocus
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Saving...' : 'Save Rate'}
        </button>
      </div>
    </form>
  </Modal>
);

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-lowest/60 p-4">
    <p className="mb-2 text-label-sm font-bold uppercase tracking-wider text-outline">{label}</p>
    <p className="break-words text-body-sm font-semibold text-primary">{value || '-'}</p>
  </div>
);

const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClassName = 'max-w-5xl',
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8">
    <div className={`mx-auto rounded-lg border border-outline-variant bg-surface-container shadow-xl ${maxWidthClassName}`} role="dialog" aria-modal="true" aria-label={title}>
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

export default AdminBetManagementPage;

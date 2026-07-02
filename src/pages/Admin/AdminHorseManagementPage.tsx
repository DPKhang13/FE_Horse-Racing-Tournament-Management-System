import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Award,
  Eye,
  Gauge,
  Medal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRound,
  Weight,
  X,
} from 'lucide-react';
import { apiClient, getApiErrorMessage, unwrapApiList } from '../../services/apiClient';
import { HorseService } from '../../services/HorseService';
import type { Horse, HorseFormData } from '../../types/horse';

type ActiveTab = 'horses' | 'ranking';
type Notice = {
  tone: 'success' | 'error';
  text: string;
};
type AdminHorseFormData = HorseFormData & {
  ownerId: number | '';
};
type HorseFormErrors = Partial<Record<keyof AdminHorseFormData, string>>;
type RankedHorse = Horse & {
  rank?: number;
};
type RawRankedHorse = Record<string, unknown>;
type RawHorseOwner = Record<string, unknown>;
type HorseOwner = {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  status: string;
  avatarUrl: string;
  profileStatus: string;
};

const fallbackHorseImage = 'https://picsum.photos/300/300?random=horse-admin';

const emptyFormData: AdminHorseFormData = {
  ownerId: '',
  name: '',
  breed: '',
  age: 0,
  weightKg: 0,
  rankGroup: 'D',
  rankingPoints: 0,
  avatarUrl: '',
  totalWins: 0,
  status: 'active',
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);

const asNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const asText = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value);
  return text.trim() ? text : fallback;
};

const extractList = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const objectValue = value as Record<string, unknown>;

  for (const key of ['data', 'result', 'content', 'items', 'records', 'users']) {
    const list = extractList<T>(objectValue[key]);

    if (list.length > 0) {
      return list;
    }
  }

  return [];
};

const getHorseKey = (horse: Horse) => horse.horseId || asNumber(horse.id);
const getDisplayId = (horse: Horse) => `HRS-${String(getHorseKey(horse)).padStart(3, '0')}`;
const getHorseImage = (horse: Pick<Horse, 'avatarUrl'>) => horse.avatarUrl || fallbackHorseImage;
const getOwnerLabel = (owner: HorseOwner) => owner.fullName || owner.username || owner.email || `Owner #${owner.userId}`;

const getStatusClassName = (status: string) => {
  const value = status.toLowerCase();

  if (value.includes('delete') || value.includes('inactive') || value.includes('suspend')) {
    return 'border-error/30 bg-error-container/20 text-error';
  }

  if (value === 'active' || value.includes('available')) {
    return 'border-secondary/30 bg-secondary/10 text-secondary';
  }

  return 'border-outline-variant bg-surface-container-highest text-on-surface-variant';
};

const isActiveHorseStatus = (status: string) => {
  const value = status.toLowerCase();
  return value === 'active' || value.includes('available');
};

const validateHorseForm = (data: AdminHorseFormData, isCreateMode: boolean) => {
  const errors: HorseFormErrors = {};

  if (isCreateMode && data.ownerId === '') {
    errors.ownerId = 'Horse owner is required.';
  }

  if (!data.name.trim()) {
    errors.name = 'Horse name is required.';
  }

  if (!data.breed.trim()) {
    errors.breed = 'Breed is required.';
  }

  if (Number(data.age) <= 0) {
    errors.age = 'Age must be greater than 0.';
  }

  if (Number(data.weightKg) <= 0) {
    errors.weightKg = 'Weight must be greater than 0.';
  }

  if (!isCreateMode) {
    if (!data.rankGroup.trim()) {
      errors.rankGroup = 'Rank group is required.';
    }

    if (Number(data.rankingPoints) < 0) {
      errors.rankingPoints = 'Ranking points cannot be negative.';
    }

    if (Number(data.totalWins) < 0) {
      errors.totalWins = 'Total wins cannot be negative.';
    }
  }

  if (data.avatarUrl.trim()) {
    try {
      new URL(data.avatarUrl.trim());
    } catch {
      errors.avatarUrl = 'Avatar URL must be valid.';
    }
  }

  return errors;
};

const toFormData = (horse: Horse): AdminHorseFormData => ({
  ownerId: horse.ownerId ?? '',
  name: horse.name,
  breed: horse.breed,
  age: horse.age,
  weightKg: horse.weightKg,
  rankGroup: horse.rankGroup,
  rankingPoints: horse.rankingPoints,
  avatarUrl: horse.avatarUrl === fallbackHorseImage ? '' : horse.avatarUrl,
  totalWins: horse.totalWins,
  status: horse.status,
});

const mapRankedHorse = (raw: RawRankedHorse, index: number): RankedHorse => {
  const horseId = asNumber(raw.horseId ?? raw.id, index + 1);

  return {
    id: asText(raw.id, `HRS-${horseId}`),
    horseId,
    ownerId: raw.ownerId === undefined ? undefined : asNumber(raw.ownerId),
    name: asText(raw.name, 'Unnamed Horse'),
    breed: asText(raw.breed, '-'),
    age: asNumber(raw.age),
    weightKg: asNumber(raw.weightKg),
    rankGroup: asText(raw.rankGroup, '-'),
    rankingPoints: asNumber(raw.rankingPoints),
    avatarUrl: asText(raw.avatarUrl, fallbackHorseImage),
    totalWins: asNumber(raw.totalWins),
    status: asText(raw.status, 'active'),
    registeredAt: raw.registeredAt === undefined ? undefined : asText(raw.registeredAt),
    ownerFullName: raw.ownerFullName === undefined ? undefined : asText(raw.ownerFullName),
    ownerEmail: raw.ownerEmail === undefined ? undefined : asText(raw.ownerEmail),
    ownerPhone: raw.ownerPhone === undefined ? undefined : asText(raw.ownerPhone),
    ownerStableName: raw.ownerStableName === undefined ? undefined : asText(raw.ownerStableName),
    ownerLicenseNumber: raw.ownerLicenseNumber === undefined ? undefined : asText(raw.ownerLicenseNumber),
    rank: asNumber(raw.rank, index + 1),
  };
};

const getHorseRanking = async () => {
  const response = await apiClient.get('/api/horses/ranking');
  return unwrapApiList<RawRankedHorse>(response).map(mapRankedHorse);
};

const mapHorseOwner = (raw: RawHorseOwner): HorseOwner => ({
  userId: asNumber(raw.userId ?? raw.id ?? raw.ownerId),
  username: asText(raw.username),
  email: asText(raw.email),
  fullName: asText(raw.fullName),
  phone: asText(raw.phone),
  status: asText(raw.status),
  avatarUrl: asText(raw.avatarUrl),
  profileStatus: asText(raw.profileStatus),
});

const getHorseOwners = async () => {
  const response = await apiClient.get('/api/admin/users/horse-owners');
  const owners = unwrapApiList<RawHorseOwner>(response);
  const normalizedOwners = owners.length > 0 ? owners : extractList<RawHorseOwner>(response.data);

  return normalizedOwners.map(mapHorseOwner).filter((owner) => owner.userId > 0);
};

const createAdminHorse = async (data: AdminHorseFormData) => {
  await apiClient.post(`/api/horses/admin/owners/${Number(data.ownerId)}/create`, {
    name: data.name.trim(),
    breed: data.breed.trim(),
    age: Number(data.age),
    weightKg: Number(data.weightKg),
    rankGroup: 'D',
    avatarUrl: data.avatarUrl.trim() || fallbackHorseImage,
  });
};

const updateAdminHorse = async (horseId: number, data: AdminHorseFormData) => {
  await apiClient.put(`/api/horses/update/${horseId}`, {
    name: data.name.trim(),
    breed: data.breed.trim(),
    age: Number(data.age),
    weightKg: Number(data.weightKg),
    rankGroup: data.rankGroup.trim(),
    rankingPoints: Number(data.rankingPoints),
    avatarUrl: data.avatarUrl.trim() || fallbackHorseImage,
    totalWins: Number(data.totalWins),
    status: data.status || 'active',
  });
};

const deleteAdminHorse = async (horseId: number) => {
  await apiClient.put(`/api/horses/update/${horseId}`, {
    status: 'deleted',
  });
};

const AdminHorseManagementPage = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('horses');
  const [horses, setHorses] = useState<Horse[]>([]);
  const [rankedHorses, setRankedHorses] = useState<RankedHorse[]>([]);
  const [horseOwners, setHorseOwners] = useState<HorseOwner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rankFilter, setRankFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  const [isOwnersLoading, setIsOwnersLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ownerLoadError, setOwnerLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [viewingHorse, setViewingHorse] = useState<Horse | null>(null);
  const [formData, setFormData] = useState<AdminHorseFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<HorseFormErrors>({});

  const loadHorses = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setNotice(null);

    try {
      const data = await HorseService.getHorses();
      setHorses(data);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load horses.') });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRanking = async (showLoading = true) => {
    if (showLoading) {
      setIsRankingLoading(true);
    }

    try {
      setRankedHorses(await getHorseRanking());
    } catch {
      setRankedHorses([]);
    } finally {
      setIsRankingLoading(false);
    }
  };

  const loadHorseOwners = async () => {
    setIsOwnersLoading(true);
    setOwnerLoadError('');

    try {
      const owners = await getHorseOwners();
      setHorseOwners(owners);

      if (owners.length === 0) {
        setOwnerLoadError('No horse owners were returned by the API.');
      }
    } catch (error) {
      setHorseOwners([]);
      setOwnerLoadError(getApiErrorMessage(error, 'Unable to load horse owners.'));
    } finally {
      setIsOwnersLoading(false);
    }
  };

  useEffect(() => {
    void loadHorses();
    void loadRanking();
    void loadHorseOwners();
  }, []);

  const rankGroups = useMemo(() => {
    const values = horses.map((horse) => horse.rankGroup).filter(Boolean);
    return Array.from(new Set(values));
  }, [horses]);

  const statusOptions = useMemo(() => {
    const values = horses.map((horse) => horse.status).filter(Boolean);
    return Array.from(new Set(values));
  }, [horses]);

  const filteredHorses = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return horses.filter((horse) => {
      const searchableValues = [
        getDisplayId(horse),
        horse.name,
        horse.breed,
        horse.rankGroup,
        horse.status,
        horse.ownerFullName,
        horse.ownerEmail,
        horse.ownerPhone,
        horse.ownerStableName,
        horse.ownerLicenseNumber,
      ];
      const matchesSearch = !query || searchableValues.some((value) => value?.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'All' || horse.status === statusFilter;
      const matchesRank = rankFilter === 'All' || horse.rankGroup === rankFilter;

      return matchesSearch && matchesStatus && matchesRank;
    });
  }, [horses, rankFilter, searchTerm, statusFilter]);

  const totalWins = horses.reduce((total, horse) => total + Number(horse.totalWins || 0), 0);
  const topPoints = horses.reduce((max, horse) => Math.max(max, Number(horse.rankingPoints || 0)), 0);
  const activeHorseCount = horses.filter((horse) => isActiveHorseStatus(horse.status)).length;

  const refreshAfterMutation = async () => {
    await Promise.all([
      loadHorses(false),
      loadRanking(false),
    ]);
  };

  const openCreateModal = () => {
    setSelectedHorse(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setNotice(null);
    setIsFormOpen(true);

    if (horseOwners.length === 0 && !isOwnersLoading) {
      void loadHorseOwners();
    }
  };

  const openEditModal = (horse: Horse) => {
    setSelectedHorse(horse);
    setFormData(toFormData(horse));
    setFormErrors({});
    setNotice(null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedHorse(null);
    setFormErrors({});
  };

  const handleFieldChange = <K extends keyof AdminHorseFormData>(field: K, value: AdminHorseFormData[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (formErrors[field]) {
      setFormErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateHorseForm(formData, !selectedHorse);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const payload = {
        ...formData,
        age: Number(formData.age),
        weightKg: Number(formData.weightKg),
        rankingPoints: Number(formData.rankingPoints),
        totalWins: Number(formData.totalWins),
        avatarUrl: formData.avatarUrl.trim() || fallbackHorseImage,
      };

      if (selectedHorse) {
        await updateAdminHorse(getHorseKey(selectedHorse), payload);
        setNotice({ tone: 'success', text: 'Horse updated successfully.' });
      } else {
        await createAdminHorse(formData);
        setNotice({ tone: 'success', text: 'Horse created successfully.' });
      }

      closeFormModal();
      await refreshAfterMutation();
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to save horse.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewHorse = async (horse: Horse) => {
    setViewingHorse(horse);
    setIsDetailLoading(true);
    setNotice(null);

    try {
      setViewingHorse(await HorseService.getHorseById(getHorseKey(horse)));
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load horse details.') });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDelete = async (horse: Horse) => {
    const confirmed = window.confirm(`Delete "${horse.name}" from the horse list?`);

    if (!confirmed) {
      return;
    }

    setNotice(null);

    try {
      await deleteAdminHorse(getHorseKey(horse));
      setNotice({ tone: 'success', text: 'Horse marked as deleted.' });
      await refreshAfterMutation();
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to delete horse.') });
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Admin Horse Management</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">Horse Management</h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Manage horse profiles, owner records, competitive ranking, and registration metadata.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[610px] xl:flex-none xl:grid-cols-4">
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Total" value={isLoading ? '...' : String(horses.length).padStart(2, '0')} />
              <MetricCard icon={<ShieldCheck className="h-4 w-4" />} label="Active" value={isLoading ? '...' : String(activeHorseCount).padStart(2, '0')} />
              <MetricCard icon={<Award className="h-4 w-4" />} label="Wins" value={isLoading ? '...' : formatNumber(totalWins)} />
              <MetricCard icon={<Gauge className="h-4 w-4" />} label="Top Points" value={isLoading ? '...' : formatNumber(topPoints)} />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-stretch xl:justify-between">
          <div className="glass-panel flex-1 rounded-xl p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search horse, owner, stable..."
                  className={filterInputClassName}
                />
              </div>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={plainFilterInputClassName}>
                <option value="All">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)} className={plainFilterInputClassName}>
                <option value="All">All groups</option>
                {rankGroups.map((rankGroup) => (
                  <option key={rankGroup} value={rankGroup}>{rankGroup}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="gold-gradient inline-flex min-h-[84px] items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all xl:w-[194px]"
          >
            <Plus className="h-4 w-4" />
            Create Horse
          </button>
        </div>

        {notice && <StatusBanner tone={notice.tone} text={notice.text} />}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'horses'} onClick={() => setActiveTab('horses')}>
              All horses
            </TabButton>
            <TabButton active={activeTab === 'ranking'} onClick={() => setActiveTab('ranking')}>
              Ranking
            </TabButton>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadHorses();
              void loadRanking();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-4 py-2 text-label-sm font-bold text-primary transition-colors hover:border-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {activeTab === 'horses' ? (
          <HorseTable
            horses={filteredHorses}
            isLoading={isLoading}
            onView={(horse) => void handleViewHorse(horse)}
            onEdit={openEditModal}
            onDelete={(horse) => void handleDelete(horse)}
          />
        ) : (
          <RankingTable rankedHorses={rankedHorses} isLoading={isRankingLoading} />
        )}
      </div>

      {isFormOpen && (
        <HorseFormModal
          selectedHorse={selectedHorse}
          formData={formData}
          formErrors={formErrors}
          horseOwners={horseOwners}
          isOwnersLoading={isOwnersLoading}
          ownerLoadError={ownerLoadError}
          isSaving={isSaving}
          onClose={closeFormModal}
          onSubmit={handleSubmit}
          onChange={handleFieldChange}
          onReloadOwners={() => void loadHorseOwners()}
        />
      )}

      {viewingHorse && (
        <HorseDetailModal
          horse={viewingHorse}
          isLoading={isDetailLoading}
          onClose={() => setViewingHorse(null)}
        />
      )}
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
  <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/70 p-4 xl:min-h-[92px]">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-3xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md border px-4 py-2 text-label-sm font-bold transition-colors ${
      active
        ? 'border-primary bg-primary text-on-primary shadow-sm'
        : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary'
    }`}
  >
    {children}
  </button>
);

const HorseTable = ({
  horses,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: {
  horses: Horse[];
  isLoading: boolean;
  onView: (horse: Horse) => void;
  onEdit: (horse: Horse) => void;
  onDelete: (horse: Horse) => void;
}) => (
  <div className="glass-panel overflow-hidden rounded-lg">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Horse</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Physical</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Rank</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Record</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Owner Info</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {!isLoading && horses.map((horse) => (
            <tr key={getHorseKey(horse)} className="transition-colors hover:bg-surface-container-lowest">
              <td className="px-5 py-4">
                <div className="flex min-w-[260px] items-center gap-3">
                  <img
                    src={getHorseImage(horse)}
                    alt={horse.name}
                    onError={(event) => {
                      event.currentTarget.src = fallbackHorseImage;
                    }}
                    className="h-14 w-14 rounded-md border border-outline-variant object-cover"
                  />
                  <div>
                    <p className="text-body-sm font-bold text-primary">{horse.name}</p>
                    <p className="mt-1 text-label-sm font-semibold text-outline">{getDisplayId(horse)}</p>
                    <p className="mt-1 text-label-sm text-on-surface-variant">{horse.breed}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="grid gap-1 text-body-sm text-on-surface-variant">
                  <span>{horse.age} years</span>
                  <span>{horse.weightKg} kg</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="text-body-sm font-bold text-primary">{horse.rankGroup}</p>
                <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{formatNumber(horse.rankingPoints)} pts</p>
              </td>
              <td className="px-5 py-4">
                <p className="text-body-sm font-bold text-primary">{formatNumber(horse.totalWins)}</p>
                <p className="mt-1 text-label-sm text-on-surface-variant">wins</p>
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={horse.status} />
              </td>
              <td className="px-5 py-4">
                <p className="text-body-sm font-bold text-primary">{horse.ownerFullName ?? '-'}</p>
                <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{horse.ownerStableName ?? horse.ownerEmail ?? '-'}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-2">
                  <IconButton label={`View details for ${horse.name}`} onClick={() => onView(horse)}>
                    <Eye className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Edit ${horse.name}`} onClick={() => onEdit(horse)}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Delete ${horse.name}`} onClick={() => onDelete(horse)} danger>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {(isLoading || horses.length === 0) && (
      <EmptyState
        title={isLoading ? 'Loading horses' : 'No horses found'}
        description={isLoading ? 'Fetching horse records from the API.' : 'No horse records match the current filters.'}
      />
    )}
  </div>
);

const RankingTable = ({ rankedHorses, isLoading }: { rankedHorses: RankedHorse[]; isLoading: boolean }) => (
  <div className="glass-panel overflow-hidden rounded-lg">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left">
        <thead className="border-b border-outline-variant bg-surface-container">
          <tr>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Rank</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Horse</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Group</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Score</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Owner</th>
            <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {!isLoading && rankedHorses.map((horse, index) => (
            <tr key={`${horse.rank ?? index + 1}-${getHorseKey(horse)}`} className="transition-colors hover:bg-surface-container-lowest">
              <td className="px-5 py-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-body-sm font-extrabold text-primary">
                  {horse.rank ?? index + 1}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getHorseImage(horse)}
                    alt={horse.name}
                    onError={(event) => {
                      event.currentTarget.src = fallbackHorseImage;
                    }}
                    className="h-11 w-11 rounded-md border border-outline-variant object-cover"
                  />
                  <div>
                    <p className="text-body-sm font-bold text-primary">{horse.name}</p>
                    <p className="mt-1 text-label-sm font-semibold text-outline">{getDisplayId(horse)} / {horse.breed}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-body-sm font-bold text-primary">{horse.rankGroup}</td>
              <td className="px-5 py-4">
                <p className="text-body-sm font-bold text-primary">{formatNumber(horse.rankingPoints)} pts</p>
                <p className="mt-1 text-label-sm text-on-surface-variant">{formatNumber(horse.totalWins)} wins</p>
              </td>
              <td className="px-5 py-4 text-body-sm font-medium text-on-surface-variant">{horse.ownerStableName ?? horse.ownerFullName ?? '-'}</td>
              <td className="px-5 py-4">
                <StatusBadge status={horse.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {(isLoading || rankedHorses.length === 0) && (
      <EmptyState
        title={isLoading ? 'Loading ranking' : 'No ranking data'}
        description={isLoading ? 'Fetching leaderboard records from the API.' : 'The ranking endpoint returned no horses.'}
      />
    )}
  </div>
);

const HorseFormModal = ({
  selectedHorse,
  formData,
  formErrors,
  horseOwners,
  isOwnersLoading,
  ownerLoadError,
  isSaving,
  onClose,
  onSubmit,
  onChange,
  onReloadOwners,
}: {
  selectedHorse: Horse | null;
  formData: AdminHorseFormData;
  formErrors: HorseFormErrors;
  horseOwners: HorseOwner[];
  isOwnersLoading: boolean;
  ownerLoadError: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: <K extends keyof AdminHorseFormData>(field: K, value: AdminHorseFormData[K]) => void;
  onReloadOwners: () => void;
}) => (
  <Modal title={selectedHorse ? 'Edit horse' : 'Create horse'} subtitle={selectedHorse ? getDisplayId(selectedHorse) : 'New horse'} onClose={onClose}>
    <form onSubmit={onSubmit} className="grid gap-6 p-6 lg:grid-cols-[260px_1fr]">
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <img
          src={formData.avatarUrl.trim() || fallbackHorseImage}
          alt={formData.name || 'Horse preview'}
          onError={(event) => {
            event.currentTarget.src = fallbackHorseImage;
          }}
          className="aspect-square w-full rounded-md border border-outline-variant object-cover"
        />
        <p className="mt-3 text-label-sm font-semibold text-on-surface-variant">Preview updates as the avatar URL changes.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {!selectedHorse && (
            <div className="md:col-span-2">
              <Field label="Horse Owner" error={formErrors.ownerId}>
                <select
                  value={formData.ownerId}
                  onChange={(event) => onChange('ownerId', event.target.value ? Number(event.target.value) : '')}
                  disabled={isOwnersLoading}
                  className={inputClassName}
                >
                  <option value="">{isOwnersLoading ? 'Loading horse owners...' : 'Select horse owner'}</option>
                  {horseOwners.map((owner) => (
                    <option key={owner.userId} value={owner.userId}>
                      {getOwnerLabel(owner)}{owner.email ? ` - ${owner.email}` : ''}
                    </option>
                  ))}
                </select>
                {ownerLoadError && (
                  <div className="mt-3 flex flex-col gap-3 rounded-md border border-error/30 bg-error-container/20 px-3 py-2 text-label-sm font-semibold text-error sm:flex-row sm:items-center sm:justify-between">
                    <span>{ownerLoadError}</span>
                    <button
                      type="button"
                      onClick={onReloadOwners}
                      className="rounded-md border border-error/40 px-3 py-1 text-label-sm font-bold transition-colors hover:border-error"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </Field>
            </div>
          )}
          <Field label="Name" error={formErrors.name}>
            <input type="text" value={formData.name} onChange={(event) => onChange('name', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Breed" error={formErrors.breed}>
            <input type="text" value={formData.breed} onChange={(event) => onChange('breed', event.target.value)} className={inputClassName} />
          </Field>
          <Field label="Age" error={formErrors.age}>
            <input type="number" min="1" value={formData.age || ''} onChange={(event) => onChange('age', Number(event.target.value))} className={inputClassName} />
          </Field>
          <Field label="Weight (kg)" error={formErrors.weightKg}>
            <input type="number" min="1" step="0.1" value={formData.weightKg || ''} onChange={(event) => onChange('weightKg', Number(event.target.value))} className={inputClassName} />
          </Field>
          {selectedHorse && (
            <>
              <Field label="Rank Group" error={formErrors.rankGroup}>
                <input type="text" value={formData.rankGroup} onChange={(event) => onChange('rankGroup', event.target.value)} className={inputClassName} />
              </Field>
              <Field label="Ranking Points (pts)" error={formErrors.rankingPoints}>
                <input type="number" min="0" value={formData.rankingPoints} onChange={(event) => onChange('rankingPoints', Number(event.target.value))} className={inputClassName} />
              </Field>
              <Field label="Total Wins" error={formErrors.totalWins}>
                <input type="number" min="0" value={formData.totalWins} onChange={(event) => onChange('totalWins', Number(event.target.value))} className={inputClassName} />
              </Field>
            </>
          )}
          <Field label="Status" error={formErrors.status}>
            <input type="text" value={formData.status} onChange={(event) => onChange('status', event.target.value)} className={inputClassName} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Avatar URL" error={formErrors.avatarUrl}>
              <input type="url" value={formData.avatarUrl} onChange={(event) => onChange('avatarUrl', event.target.value)} className={inputClassName} />
            </Field>
          </div>
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
            disabled={isSaving}
            className="rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-all hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : selectedHorse ? 'Save Changes' : 'Create Horse'}
          </button>
        </div>
      </div>
    </form>
  </Modal>
);

const HorseDetailModal = ({ horse, isLoading, onClose }: { horse: Horse; isLoading: boolean; onClose: () => void }) => (
  <Modal title={horse.name} subtitle={getDisplayId(horse)} onClose={onClose}>
    <div className="p-6">
      <div className="mb-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <img
          src={getHorseImage(horse)}
          alt={horse.name}
          onError={(event) => {
            event.currentTarget.src = fallbackHorseImage;
          }}
          className="h-72 w-full rounded-lg border border-outline-variant object-cover"
        />
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <DetailItem icon={<Gauge className="h-4 w-4" />} label="Rank Group" value={horse.rankGroup} />
          <DetailItem icon={<Medal className="h-4 w-4" />} label="Ranking Points" value={formatNumber(horse.rankingPoints)} />
          <DetailItem icon={<Trophy className="h-4 w-4" />} label="Total Wins" value={formatNumber(horse.totalWins)} />
          <DetailItem icon={<Weight className="h-4 w-4" />} label="Weight" value={`${horse.weightKg} kg`} />
          <DetailItem icon={<Award className="h-4 w-4" />} label="Breed" value={horse.breed} />
          <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Status" value={horse.status} />
        </div>
      </div>

      {isLoading && (
        <div className="mb-6 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
          Loading latest horse details...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailItem icon={<UserRound className="h-4 w-4" />} label="Owner" value={horse.ownerFullName ?? '-'} />
        <DetailItem icon={<UserRound className="h-4 w-4" />} label="Stable" value={horse.ownerStableName ?? '-'} />
        <DetailItem icon={<Phone className="h-4 w-4" />} label="Owner Phone" value={horse.ownerPhone ?? '-'} />
        <DetailItem icon={<UserRound className="h-4 w-4" />} label="Owner Email" value={horse.ownerEmail ?? '-'} />
        <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="License Number" value={horse.ownerLicenseNumber ?? '-'} />
        <DetailItem icon={<Award className="h-4 w-4" />} label="Registered At" value={formatDate(horse.registeredAt)} />
      </div>
    </div>
  </Modal>
);

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(status)}`}>
    {status || '-'}
  </span>
);

const StatusBanner = ({ tone, text }: Notice) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'success' ? 'border-secondary/30 bg-secondary-container/30 text-secondary' : 'border-error/30 bg-error-container/20 text-error'}`}>
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

const IconButton = ({ label, onClick, children, danger = false }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-9 w-9 items-center justify-center rounded-md border bg-surface-container-low text-on-surface-variant transition-colors ${
      danger ? 'border-error/30 hover:border-error hover:text-error' : 'border-outline-variant hover:border-primary hover:text-primary'
    }`}
    aria-label={label}
    title={label}
  >
    {children}
  </button>
);

const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 px-4 py-8">
    <div className="mx-auto max-w-5xl rounded-lg border border-outline-variant bg-surface-container shadow-xl">
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

const DetailItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-md border border-outline-variant bg-surface-container-lowest/60 p-4">
    <div className="mb-2 flex items-center gap-2 text-outline">
      {icon}
      <p className="text-label-sm font-bold uppercase tracking-wider">{label}</p>
    </div>
    <p className="break-words text-body-sm font-semibold text-primary">{value}</p>
  </div>
);

export default AdminHorseManagementPage;

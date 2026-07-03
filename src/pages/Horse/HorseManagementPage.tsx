import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Activity, Eye, Filter, Gauge, Pencil, Plus, Search, Trash2, Trophy, X } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { HorseService } from '../../services/HorseService';
import type { Horse, HorseFormData } from '../../types/horse';
import type { UserProfile } from '../../types/user';

// Animation variants
const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const revealUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

type HorseFormErrors = Partial<Record<keyof HorseFormData, string>>;

const emptyFormData: HorseFormData = {
  name: '',
  breed: '',
  age: 0,
  weightKg: 0,
  rankGroup: '',
  rankingPoints: 0,
  avatarUrl: '',
  totalWins: 0,
  status: 'active',
};

const statusOptions = ['active', 'inactive'];
const fallbackHorseImage =
  'https://picsum.photos/300/300?random=horse';

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusClassName = (status: string) => {
  if (status.toLowerCase() === 'active') {
    return 'bg-secondary/10 text-secondary';
  }

  return 'bg-surface-container-highest text-on-surface-variant';
};

const validateHorseForm = (data: HorseFormData) => {
  const errors: HorseFormErrors = {};

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

  if (!data.rankGroup.trim()) {
    errors.rankGroup = 'Rank group is required.';
  }

  return errors;
};

const toFormData = (horse: Horse): HorseFormData => ({
  name: horse.name,
  breed: horse.breed,
  age: horse.age,
  weightKg: horse.weightKg,
  rankGroup: horse.rankGroup,
  rankingPoints: horse.rankingPoints,
  avatarUrl: horse.avatarUrl,
  totalWins: horse.totalWins,
  status: horse.status,
});

const HorseManagementPage = () => {
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [horses, setHorses] = useState<Horse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [viewingHorse, setViewingHorse] = useState<Horse | null>(null);
  const [formData, setFormData] = useState<HorseFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<HorseFormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHorses = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const currentProfile = profile ?? await authService.getCurrentUser();
      setProfile(currentProfile);
      setHorses(await HorseService.getOwnerHorses(currentProfile));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to load horses.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHorses();
  }, []);

  const filteredHorses = horses.filter((horse) => {
    const query = searchTerm.toLowerCase().trim();
    const values = [
      horse.id,
      horse.name,
      horse.breed,
      horse.rankGroup,
      horse.ownerFullName,
      horse.ownerStableName,
      horse.ownerEmail,
    ];
    const matchesSearch = !query || values.some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'All' || horse.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const activeHorseCount = horses.filter((horse) => horse.status.toLowerCase() === 'active').length;
  const totalWins = horses.reduce((total, horse) => total + Number(horse.totalWins || 0), 0);
  const topRating = horses.reduce((max, horse) => Math.max(max, Number(horse.rankingPoints || 0)), 0);

  const openCreateModal = () => {
    setSelectedHorse(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (horse: Horse) => {
    setSelectedHorse(horse);
    setFormData(toFormData(horse));
    setFormErrors({});
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedHorse(null);
    setFormErrors({});
  };

  const handleFieldChange = (field: keyof HorseFormData, value: string | number) => {
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

    const errors = validateHorseForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        ...formData,
        avatarUrl: formData.avatarUrl || fallbackHorseImage,
        age: Number(formData.age),
        weightKg: Number(formData.weightKg),
        rankingPoints: Number(formData.rankingPoints),
        totalWins: Number(formData.totalWins),
      };

      if (selectedHorse) {
        const updatedHorse = await HorseService.updateHorse(selectedHorse.horseId, payload);
        setHorses((current) =>
          current.map((horse) => (horse.horseId === selectedHorse.horseId ? updatedHorse : horse)),
        );
      } else {
        const newHorse = await HorseService.createHorse(payload);
        setHorses((current) => [newHorse, ...current]);
      }

      closeFormModal();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to save horse.');
      setErrorMessage(
        message === 'Request failed with status 403.'
          ? 'You need to sign in with a Horse Owner account to create, update, or delete horses.'
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (horse: Horse) => {
    const confirmed = window.confirm(`Delete "${horse.name}" from the horse list?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage('');

    try {
      await HorseService.deleteHorse(horse.horseId);
      setHorses((current) => current.filter((item) => item.horseId !== horse.horseId));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to delete horse.'));
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <motion.div 
          className="glass-panel mb-6 rounded-2xl p-6"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <motion.div variants={revealUp}>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Horse Owner Dashboard</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">Stable command center</h1>
              <p className="max-w-2xl text-body-md text-on-surface-variant">
                Manage horse records using fields stored in the database.
              </p>
            </motion.div>

            <motion.div 
              className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[560px] xl:grid-cols-4"
              variants={revealContainer}
            >
              <motion.div variants={revealUp}>
                <MetricCard icon={<Activity className="h-4 w-4" />} label="Total" value={String(horses.length).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Gauge className="h-4 w-4" />} label="Active" value={String(activeHorseCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Trophy className="h-4 w-4" />} label="Wins" value={String(totalWins)} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Filter className="h-4 w-4" />} label="Top points" value={String(topRating)} />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.div 
            className="glass-panel flex-1 rounded-xl p-4"
            variants={revealUp}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by horse, breed, owner, stable..."
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 pl-10 text-body-sm transition-colors focus:border-primary focus:outline-none"
                >
                  <option value="All">All statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
          <motion.button
            type="button"
            onClick={openCreateModal}
            className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-body-sm font-extrabold text-on-primary transition-all"
            variants={revealUp}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" />
            Register Horse
          </motion.button>
        </motion.div>

        {errorMessage && (
          <motion.div 
            className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error"
            initial="hidden"
            animate="visible"
            variants={revealUp}
          >
            {errorMessage}
          </motion.div>
        )}

        <motion.div 
          className="glass-panel overflow-hidden rounded-xl"
          initial="hidden"
          animate="visible"
          variants={revealUp}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Horse ID</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Photo</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Horse</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Breed</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Age</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Weight</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Rank</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Points</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Owner</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isLoading && filteredHorses.map((horse, index) => (
                  <motion.tr 
                    key={horse.horseId} 
                    className="hover:bg-surface-container-lowest transition-colors"
                    variants={revealUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                  >
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{horse.id}</td>
                    <td className="px-5 py-4">
                      <img src={horse.avatarUrl || fallbackHorseImage} alt={horse.name} className="w-12 h-12 rounded-md object-cover border border-outline-variant" />
                    </td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{horse.name}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.breed}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.age}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.weightKg} kg</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.rankGroup}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.rankingPoints}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.ownerFullName ?? '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(horse.status)}`}>
                        {horse.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton label={`View details for ${horse.name}`} onClick={() => setViewingHorse(horse)}>
                          <Eye className="w-4 h-4" />
                        </IconButton>
                        <IconButton label={`Edit ${horse.name}`} onClick={() => openEditModal(horse)}>
                          <Pencil className="w-4 h-4" />
                        </IconButton>
                        <IconButton label={`Delete ${horse.name}`} onClick={() => void handleDelete(horse)}>
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {(isLoading || filteredHorses.length === 0) && (
            <motion.div 
              className="px-6 py-16 text-center"
              variants={revealUp}
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-surface-container flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-outline" />
              </div>
              <h3 className="text-body-lg font-bold text-primary mb-2">
                {isLoading ? 'Loading horses' : 'No horse data'}
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {isLoading ? 'Fetching records from the server.' : 'No horses match the current search keyword or status filter.'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {isFormOpen && (
        <Modal title={selectedHorse ? 'Update Horse Information' : 'Register Horse'} subtitle={selectedHorse?.id ?? 'New Horse'} onClose={closeFormModal}>
          <motion.form 
            onSubmit={handleSubmit} 
            className="p-6 space-y-8"
            initial="hidden"
            animate="visible"
            variants={revealContainer}
          >
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-5" variants={revealContainer}>
              <motion.div variants={revealUp}>
                <Field label="Horse Name" error={formErrors.name}>
                  <input type="text" value={formData.name} onChange={(event) => handleFieldChange('name', event.target.value)} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Breed" error={formErrors.breed}>
                  <input type="text" value={formData.breed} onChange={(event) => handleFieldChange('breed', event.target.value)} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Age" error={formErrors.age}>
                  <input type="number" min="0" value={formData.age || ''} onChange={(event) => handleFieldChange('age', Number(event.target.value))} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Weight (kg)" error={formErrors.weightKg}>
                  <input type="number" min="0" step="0.1" value={formData.weightKg || ''} onChange={(event) => handleFieldChange('weightKg', Number(event.target.value))} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Rank Group" error={formErrors.rankGroup}>
                  <input type="text" value={formData.rankGroup} onChange={(event) => handleFieldChange('rankGroup', event.target.value)} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Ranking Points">
                  <input type="number" min="0" value={formData.rankingPoints} onChange={(event) => handleFieldChange('rankingPoints', Number(event.target.value))} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Total Wins">
                  <input type="number" min="0" value={formData.totalWins} onChange={(event) => handleFieldChange('totalWins', Number(event.target.value))} className={inputClassName} />
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Status">
                  <select value={formData.status} onChange={(event) => handleFieldChange('status', event.target.value)} className={inputClassName}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>
              </motion.div>
              <motion.div variants={revealUp}>
                <Field label="Avatar URL">
                  <input type="url" value={formData.avatarUrl} onChange={(event) => handleFieldChange('avatarUrl', event.target.value)} className={inputClassName} />
                </Field>
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant"
              variants={revealUp}
            >
              <motion.button 
                type="button" 
                onClick={closeFormModal} 
                className="px-6 py-3 rounded-md border border-outline-variant text-body-sm font-bold text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button 
                type="submit" 
                disabled={isSaving} 
                className="px-6 py-3 rounded-md bg-secondary text-white text-body-sm font-bold hover:bg-opacity-90 transition-all disabled:opacity-70"
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? 'Saving...' : selectedHorse ? 'Save Changes' : 'Add New Horse'}
              </motion.button>
            </motion.div>
          </motion.form>
        </Modal>
      )}

      {viewingHorse && (
        <Modal title={viewingHorse.name} subtitle={viewingHorse.id} onClose={() => setViewingHorse(null)}>
          <motion.div 
            className="p-6"
            initial="hidden"
            animate="visible"
            variants={revealContainer}
          >
            <motion.img 
              src={viewingHorse.avatarUrl || fallbackHorseImage} 
              alt={viewingHorse.name} 
              className="w-full h-64 object-cover rounded-lg border border-outline-variant mb-6"
              variants={revealUp}
            />
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" variants={revealContainer}>
              <motion.div variants={revealUp}>
                <DetailItem label="Breed" value={viewingHorse.breed} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Age" value={`${viewingHorse.age}`} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Weight" value={`${viewingHorse.weightKg} kg`} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Rank Group" value={viewingHorse.rankGroup} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Ranking Points" value={`${viewingHorse.rankingPoints}`} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Total Wins" value={`${viewingHorse.totalWins}`} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Owner" value={viewingHorse.ownerFullName ?? '-'} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Stable" value={viewingHorse.ownerStableName ?? '-'} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Owner Email" value={viewingHorse.ownerEmail ?? '-'} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Owner Phone" value={viewingHorse.ownerPhone ?? '-'} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Status" value={viewingHorse.status} />
              </motion.div>
              <motion.div variants={revealUp}>
                <DetailItem label="Registered At" value={formatDate(viewingHorse.registeredAt)} />
              </motion.div>
            </motion.div>
          </motion.div>
        </Modal>
      )}
    </div>
  );
};

const inputClassName =
  'w-full bg-surface-container-low border border-outline-variant rounded-md py-3 px-4 text-body-sm focus:outline-none focus:border-primary transition-colors';

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const IconButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-9 h-9 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
    aria-label={label}
  >
    {children}
  </button>
);

const Modal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-[60] bg-black/50 px-4 py-8 overflow-y-auto">
    <div className="max-w-4xl mx-auto bg-white rounded-lg border border-outline-variant shadow-xl">
      <div className="flex items-start justify-between gap-6 p-6 border-b border-outline-variant">
        <div>
          <p className="text-label-sm text-outline uppercase tracking-widest font-bold mb-2">{subtitle}</p>
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="block text-label-sm text-outline uppercase tracking-wider font-bold">{label}</span>
    {children}
    {error && <span className="block text-label-md text-error">{error}</span>}
  </label>
);

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-surface-container-low border border-outline-variant rounded-md p-4">
    <p className="text-label-sm text-outline uppercase tracking-wider font-bold mb-1">{label}</p>
    <p className="text-body-sm text-primary font-semibold">{value}</p>
  </div>
);

export default HorseManagementPage;

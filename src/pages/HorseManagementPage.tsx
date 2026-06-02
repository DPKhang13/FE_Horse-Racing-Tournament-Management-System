import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Eye,
  Filter,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { HorseService } from '../services/HorseService';
import type { Horse, HorseFormData, HorseGender, HorseStatus, TrainingLevel } from '../types/horse';

type HorseFormErrors = Partial<Record<keyof HorseFormData, string>>;

const statusOptions: HorseStatus[] = ['Active', 'Inactive', 'In Treatment'];
const genderOptions: HorseGender[] = ['Male', 'Female'];
const trainingLevelOptions: TrainingLevel[] = ['Basic', 'Intermediate', 'Advanced', 'Elite'];

const emptyFormData: HorseFormData = {
  imageUrl: '',
  name: '',
  breed: '',
  birthDate: '',
  gender: 'Male',
  color: '',
  weight: 0,
  height: 0,
  microchipId: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  healthStatus: '',
  vaccinationDate: '',
  trainingLevel: 'Basic',
  notes: '',
  status: 'Active',
};

const fallbackHorseImage = 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=300';

const getAge = (birthDate: string) => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isNaN(age) ? '-' : age;
};

const getStatusClassName = (status: HorseStatus) => {
  if (status === 'Active') {
    return 'bg-secondary/10 text-secondary';
  }

  if (status === 'In Treatment') {
    return 'bg-tertiary/10 text-tertiary';
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

  if (!data.birthDate) {
    errors.birthDate = 'Birth date is required.';
  }

  if (!data.gender) {
    errors.gender = 'Gender is required.';
  }

  if (!data.ownerName.trim()) {
    errors.ownerName = 'Owner name is required.';
  }

  if (!data.ownerPhone.trim()) {
    errors.ownerPhone = 'Phone number is required.';
  }

  if (data.ownerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail)) {
    errors.ownerEmail = 'Email format is invalid.';
  }

  if (Number(data.height) <= 0) {
    errors.height = 'Height must be greater than 0.';
  }

  if (Number(data.weight) <= 0) {
    errors.weight = 'Weight must be greater than 0.';
  }

  return errors;
};

const HorseManagementPage = () => {
  const [horses, setHorses] = useState<Horse[]>(() => HorseService.getHorses());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | HorseStatus>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [viewingHorse, setViewingHorse] = useState<Horse | null>(null);
  const [formData, setFormData] = useState<HorseFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<HorseFormErrors>({});

  const filteredHorses = horses.filter((horse) => {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const matchesSearch = [horse.id, horse.name, horse.breed, horse.ownerName, horse.microchipId]
      .some((value) => value.toLowerCase().includes(normalizedSearchTerm));
    const matchesStatus = statusFilter === 'All' || horse.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setSelectedHorse(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (horse: Horse) => {
    const editableHorse: HorseFormData = {
      imageUrl: horse.imageUrl,
      name: horse.name,
      breed: horse.breed,
      birthDate: horse.birthDate,
      gender: horse.gender,
      color: horse.color,
      weight: horse.weight,
      height: horse.height,
      microchipId: horse.microchipId,
      ownerName: horse.ownerName,
      ownerPhone: horse.ownerPhone,
      ownerEmail: horse.ownerEmail,
      healthStatus: horse.healthStatus,
      vaccinationDate: horse.vaccinationDate,
      trainingLevel: horse.trainingLevel,
      notes: horse.notes,
      status: horse.status,
    };

    setSelectedHorse(horse);
    setFormData(editableHorse);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setSelectedHorse(null);
    setFormErrors({});
  };

  const handleFieldChange = (field: keyof HorseFormData, value: string | number) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (formErrors[field]) {
      setFormErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleFieldChange('imageUrl', String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateHorseForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const horsePayload = {
      ...formData,
      imageUrl: formData.imageUrl || fallbackHorseImage,
      status: formData.status ?? 'Active',
      weight: Number(formData.weight),
      height: Number(formData.height),
    };

    if (selectedHorse) {
      const updatedHorse = HorseService.updateHorse({
        ...horsePayload,
        id: selectedHorse.id,
      });

      setHorses((current) => current.map((horse) => (horse.id === updatedHorse.id ? updatedHorse : horse)));
    } else {
      const newHorse = HorseService.createHorse(horsePayload, horses);
      setHorses((current) => [newHorse, ...current]);
    }

    closeFormModal();
  };

  const handleDelete = (horse: Horse) => {
    const confirmed = window.confirm(`Delete "${horse.name}" from the horse list?`);

    if (confirmed) {
      setHorses((current) => current.filter((item) => item.id !== horse.id));
    }
  };

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-label-sm text-outline uppercase tracking-widest font-bold mb-3">Horse Registry</p>
            <h1 className="text-headline-lg font-bold text-primary mb-2">Horse Management</h1>
            <p className="text-body-md text-on-surface-variant">
              Manage horse profiles, owner information, health records, and training status.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-md text-body-sm font-semibold hover:bg-opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Horse
          </button>
        </div>

        <div className="bg-white border border-outline-variant rounded-lg p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by Horse ID, name, breed, owner..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'All' | HorseStatus)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-colors"
              >
                <option value="All">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-surface-container border-b border-outline-variant">
                <tr>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Horse ID</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Photo</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Horse Name</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Breed</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Age</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Gender</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Color</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Owner</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredHorses.map((horse) => (
                  <tr key={horse.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{horse.id}</td>
                    <td className="px-5 py-4">
                      <img src={horse.imageUrl} alt={horse.name} className="w-12 h-12 rounded-md object-cover border border-outline-variant" />
                    </td>
                    <td className="px-5 py-4 text-body-sm font-bold text-primary">{horse.name}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.breed}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{getAge(horse.birthDate)}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.gender}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.color || '-'}</td>
                    <td className="px-5 py-4 text-body-sm text-on-surface-variant font-medium">{horse.ownerName}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(horse.status)}`}>
                        {horse.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingHorse(horse)}
                          className="w-9 h-9 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                          aria-label={`View details for ${horse.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(horse)}
                          className="w-9 h-9 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors"
                          aria-label={`Edit ${horse.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(horse)}
                          className="w-9 h-9 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error transition-colors"
                          aria-label={`Delete ${horse.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredHorses.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-surface-container flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-outline" />
              </div>
              <h3 className="text-body-lg font-bold text-primary mb-2">No horse data</h3>
              <p className="text-body-sm text-on-surface-variant">
                No horses match the current search keyword or status filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-lg border border-outline-variant shadow-xl">
            <div className="flex items-start justify-between gap-6 p-6 border-b border-outline-variant">
              <div>
                <p className="text-label-sm text-outline uppercase tracking-widest font-bold mb-2">
                  {selectedHorse ? selectedHorse.id : 'New Horse'}
                </p>
                <h2 className="text-headline-md font-bold text-primary">
                  {selectedHorse ? 'Update Horse Information' : 'Register Horse'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="w-10 h-10 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              <div>
                <h3 className="text-body-md font-bold text-primary mb-4">Horse Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Horse Name" error={formErrors.name}>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Breed" error={formErrors.breed}>
                    <input
                      type="text"
                      value={formData.breed}
                      onChange={(event) => handleFieldChange('breed', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Birth Date" error={formErrors.birthDate}>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(event) => handleFieldChange('birthDate', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Gender" error={formErrors.gender}>
                    <select
                      value={formData.gender}
                      onChange={(event) => handleFieldChange('gender', event.target.value)}
                      className={inputClassName}
                    >
                      {genderOptions.map((gender) => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Color">
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(event) => handleFieldChange('color', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Microchip ID">
                    <input
                      type="text"
                      value={formData.microchipId}
                      onChange={(event) => handleFieldChange('microchipId', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Weight (kg)" error={formErrors.weight}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weight || ''}
                      onChange={(event) => handleFieldChange('weight', Number(event.target.value))}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Height (cm)" error={formErrors.height}>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.height || ''}
                      onChange={(event) => handleFieldChange('height', Number(event.target.value))}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={formData.status}
                      onChange={(event) => handleFieldChange('status', event.target.value)}
                      className={inputClassName}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Training Level">
                    <select
                      value={formData.trainingLevel}
                      onChange={(event) => handleFieldChange('trainingLevel', event.target.value)}
                      className={inputClassName}
                    >
                      {trainingLevelOptions.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div>
                <h3 className="text-body-md font-bold text-primary mb-4">Owner and Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Owner Name" error={formErrors.ownerName}>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(event) => handleFieldChange('ownerName', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Phone Number" error={formErrors.ownerPhone}>
                    <input
                      type="tel"
                      value={formData.ownerPhone}
                      onChange={(event) => handleFieldChange('ownerPhone', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Email" error={formErrors.ownerEmail}>
                    <input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(event) => handleFieldChange('ownerEmail', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Vaccination Date">
                    <input
                      type="date"
                      value={formData.vaccinationDate}
                      onChange={(event) => handleFieldChange('vaccinationDate', event.target.value)}
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Health Status">
                    <textarea
                      value={formData.healthStatus}
                      onChange={(event) => handleFieldChange('healthStatus', event.target.value)}
                      className={`${inputClassName} min-h-24 resize-y`}
                    />
                  </Field>
                  <Field label="Notes">
                    <textarea
                      value={formData.notes}
                      onChange={(event) => handleFieldChange('notes', event.target.value)}
                      className={`${inputClassName} min-h-24 resize-y`}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <h3 className="text-body-md font-bold text-primary mb-4">Upload Horse Photo</h3>
                <label className="flex flex-col sm:flex-row items-center gap-4 border border-dashed border-outline-variant bg-surface-container-low rounded-lg p-5 cursor-pointer hover:border-primary transition-colors">
                  <div className="w-24 h-24 rounded-md overflow-hidden bg-white border border-outline-variant flex items-center justify-center shrink-0">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Horse preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="w-8 h-8 text-outline" />
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-body-sm font-bold text-primary mb-1">Choose an image from your device</p>
                    <p className="text-label-md text-on-surface-variant">The image will be displayed in the horse list table.</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="px-6 py-3 rounded-md border border-outline-variant text-body-sm font-bold text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-md bg-secondary text-white text-body-sm font-bold hover:bg-opacity-90 transition-all"
                >
                  {selectedHorse ? 'Save Changes' : 'Add New Horse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingHorse && (
        <div className="fixed inset-0 z-[60] bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto bg-white rounded-lg border border-outline-variant shadow-xl">
            <div className="flex items-start justify-between gap-6 p-6 border-b border-outline-variant">
              <div>
                <p className="text-label-sm text-outline uppercase tracking-widest font-bold mb-2">{viewingHorse.id}</p>
                <h2 className="text-headline-md font-bold text-primary">{viewingHorse.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingHorse(null)}
                className="w-10 h-10 rounded-md border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <img src={viewingHorse.imageUrl} alt={viewingHorse.name} className="w-full h-64 object-cover rounded-lg border border-outline-variant mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailItem label="Breed" value={viewingHorse.breed} />
                <DetailItem label="Age" value={`${getAge(viewingHorse.birthDate)}`} />
                <DetailItem label="Gender" value={viewingHorse.gender} />
                <DetailItem label="Color" value={viewingHorse.color || '-'} />
                <DetailItem label="Weight" value={`${viewingHorse.weight} kg`} />
                <DetailItem label="Height" value={`${viewingHorse.height} cm`} />
                <DetailItem label="Microchip ID" value={viewingHorse.microchipId || '-'} />
                <DetailItem label="Owner" value={viewingHorse.ownerName} />
                <DetailItem label="Phone Number" value={viewingHorse.ownerPhone} />
                <DetailItem label="Email" value={viewingHorse.ownerEmail || '-'} />
                <DetailItem label="Status" value={viewingHorse.status} />
                <DetailItem label="Training Level" value={viewingHorse.trainingLevel} />
                <DetailItem label="Vaccination Date" value={viewingHorse.vaccinationDate || '-'} />
                <DetailItem label="Health Status" value={viewingHorse.healthStatus || '-'} />
                <DetailItem label="Notes" value={viewingHorse.notes || '-'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputClassName = 'w-full bg-surface-container-low border border-outline-variant rounded-md py-3 px-4 text-body-sm focus:outline-none focus:border-primary transition-colors';

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
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

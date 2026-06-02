export type HorseGender = 'Male' | 'Female';

export type HorseStatus = 'Active' | 'Inactive' | 'In Treatment';

export type TrainingLevel = 'Basic' | 'Intermediate' | 'Advanced' | 'Elite';

export type Horse = {
  id: string;
  imageUrl: string;
  name: string;
  breed: string;
  birthDate: string;
  gender: HorseGender;
  color: string;
  weight: number;
  height: number;
  microchipId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  healthStatus: string;
  vaccinationDate: string;
  trainingLevel: TrainingLevel;
  notes: string;
  status: HorseStatus;
};

export type HorseFormData = Omit<Horse, 'id' | 'status'> & {
  status?: HorseStatus;
};

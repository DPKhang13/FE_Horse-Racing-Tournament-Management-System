import { mockHorses } from '../mocks/horses';
import type { Horse } from '../types/horse';

const createHorseId = (horses: Horse[]) => {
  const maxId = horses.reduce((max, horse) => {
    const numericId = Number(horse.id.replace('HRS-', ''));
    return Number.isNaN(numericId) ? max : Math.max(max, numericId);
  }, 1000);

  return `HRS-${maxId + 1}`;
};

export const HorseService = {
  getHorses: (): Horse[] => [...mockHorses],

  createHorse: (horse: Omit<Horse, 'id'>, currentHorses: Horse[]): Horse => ({
    ...horse,
    id: createHorseId(currentHorses),
  }),

  updateHorse: (horse: Horse): Horse => horse,
};

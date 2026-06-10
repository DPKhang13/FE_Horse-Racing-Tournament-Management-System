import {
  mockRaceResultListItems,
  mockRaceResultSummaries,
  mockRankingBoards,
  tournamentFilterOptions,
} from '../mocks/raceResults';
import type {
  RaceResultFilters,
  RaceResultListItem,
  RaceResultSummary,
  RankingBoard,
  RankingCategory,
} from '../types/raceResult';

const normalizeSearch = (value: string) => value.trim().toLowerCase();

export const raceResultService = {
  getRaceResultList: (filters: RaceResultFilters = {}): RaceResultListItem[] => {
    const { search = '', status = 'all', tournament = 'All Tournaments' } = filters;
    const query = normalizeSearch(search);

    return mockRaceResultListItems.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.raceName.toLowerCase().includes(query) ||
        item.tournamentName.toLowerCase().includes(query) ||
        item.track.toLowerCase().includes(query) ||
        item.topFinishers.some(
          (finisher) =>
            finisher.horseName.toLowerCase().includes(query) ||
            finisher.jockeyName.toLowerCase().includes(query),
        );

      const matchesStatus = status === 'all' || item.status === status;
      const matchesTournament =
        tournament === 'All Tournaments' || item.tournamentName === tournament;

      return matchesSearch && matchesStatus && matchesTournament;
    });
  },

  getRaceResultById: (id: string): RaceResultSummary | undefined =>
    mockRaceResultSummaries.find((result) => result.id === id),

  getRankingBoard: (category: RankingCategory): RankingBoard | undefined =>
    mockRankingBoards.find((board) => board.category === category),

  getTournamentFilterOptions: (): string[] => [...tournamentFilterOptions],
};

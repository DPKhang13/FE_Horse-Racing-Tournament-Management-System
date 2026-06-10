import { useMemo, useState } from 'react';
import { Filter, Search, Trophy } from 'lucide-react';
import { raceResultService } from '../../services/raceResultService';
import type { RaceResultStatus } from '../../types/raceResult';
import RaceResultCard from './components/RaceResultCard';
import ResultNav from './components/ResultNav';

type StatusFilter = RaceResultStatus | 'all';

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'published', label: 'Published' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'draft', label: 'Draft' },
];

const RaceResultList = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [tournament, setTournament] = useState('All Tournaments');

  const tournamentOptions = raceResultService.getTournamentFilterOptions();

  const results = useMemo(
    () => raceResultService.getRaceResultList({ search, status, tournament }),
    [search, status, tournament],
  );

  const publishedCount = results.filter((item) => item.status === 'published').length;

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-label-md text-secondary uppercase tracking-widest mb-2">Result Screen</p>
              <h1 className="text-headline-lg font-bold text-primary mb-2">Race Results</h1>
              <p className="text-body-md text-on-surface-variant max-w-2xl">
                Comprehensive historical data, finish positions, and prize distributions from recent tournaments.
              </p>
            </div>
            <ResultNav />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Races', value: results.length.toString(), accent: 'text-primary' },
              { label: 'Published', value: publishedCount.toString(), accent: 'text-secondary' },
              { label: 'Tournaments', value: (tournamentOptions.length - 1).toString(), accent: 'text-tertiary' },
            ].map((stat) => (
              <article
                key={stat.label}
                className="rounded-lg border border-outline-variant bg-white p-5"
              >
                <p className="text-label-sm text-outline uppercase tracking-wider">{stat.label}</p>
                <p className={`mt-2 text-headline-md font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by race, horse, or jockey..."
              className="w-full bg-white border border-outline-variant rounded-md py-2.5 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-outline" />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="bg-white border border-outline-variant rounded-md py-2.5 px-4 text-body-sm focus:outline-none focus:border-primary"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={tournament}
              onChange={(event) => setTournament(event.target.value)}
              className="bg-white border border-outline-variant rounded-md py-2.5 px-4 text-body-sm focus:outline-none focus:border-primary"
            >
              {tournamentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-lg border border-outline-variant bg-white p-12 text-center">
            <Trophy className="w-10 h-10 text-outline mx-auto mb-4" />
            <h2 className="text-headline-md font-bold text-primary mb-2">No results found</h2>
            <p className="text-body-md text-on-surface-variant">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {results.map((result) => (
              <RaceResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RaceResultList;

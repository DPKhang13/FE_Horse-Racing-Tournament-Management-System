import { useMemo } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { raceResultService } from '../../services/raceResultService';
import PrizeBreakdown from './components/PrizeBreakdown';
import RaceResultTable from './components/RaceResultTable';
import ResultStatusChip from './components/ResultStatusChip';
import RankBadge from './components/RankBadge';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPublishedAt = (dateString?: string) => {
  if (!dateString) {
    return null;
  }

  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RaceResultDetail = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const result = useMemo(
    () => (resultId ? raceResultService.getRaceResultById(resultId) : undefined),
    [resultId],
  );

  const podium = useMemo(
    () =>
      result?.entries
        .filter((entry) => entry.finishPosition !== null && entry.finishPosition <= 3)
        .sort((a, b) => (a.finishPosition ?? 0) - (b.finishPosition ?? 0)) ?? [],
    [result],
  );

  if (!result) {
    return (
      <div className="bg-surface min-h-screen py-12">
        <div className="max-w-container mx-auto px-4 md:px-margin-desktop text-center">
          <Trophy className="w-12 h-12 text-outline mx-auto mb-4" />
          <h1 className="text-headline-lg font-bold text-primary mb-2">Result not found</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            The race result you are looking for does not exist or has been removed.
          </p>
          <Link
            to="/results"
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-md text-body-sm font-semibold hover:bg-opacity-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Link>
        </div>
      </div>
    );
  }

  const publishedLabel = formatPublishedAt(result.publishedAt);

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <Link
          to="/results"
          className="inline-flex items-center gap-2 text-body-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Link>

        <div className="bg-primary-container rounded-lg p-6 md:p-8 text-white mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-label-md text-on-primary-container uppercase tracking-widest">
                  R{result.raceNumber} • {result.grade}
                </span>
                <ResultStatusChip status={result.status} />
              </div>
              <h1 className="text-headline-lg font-bold mb-3">{result.raceName}</h1>
              <p className="text-body-md text-on-primary-container mb-4">{result.tournamentName}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-on-primary-container/90">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(result.date)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {result.track}, {result.location}
                </span>
              </div>
            </div>

            <div className="shrink-0 space-y-3">
              <div className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-label-sm text-on-primary-container uppercase tracking-wider">Winner</p>
                <p className="text-body-lg font-bold">{result.winnerHorse}</p>
                <p className="text-body-sm text-on-primary-container">{result.winnerJockey}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-4 py-3">
                <p className="text-label-sm text-on-primary-container uppercase tracking-wider">Finish Time</p>
                <p className="text-body-lg font-bold tabular-nums">{result.winnerTime}</p>
              </div>
              {publishedLabel && (
                <p className="text-label-sm text-on-primary-container uppercase tracking-wider">
                  Published {publishedLabel}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
            {[
              { label: 'Distance', value: result.distance },
              { label: 'Surface', value: result.trackType },
              { label: 'Prize Pool', value: result.totalPrizePool },
              { label: 'Runners', value: result.entries.length.toString() },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-label-sm text-on-primary-container uppercase tracking-wider">{item.label}</p>
                <p className="text-body-sm font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {podium.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-md font-bold text-primary mb-4">Podium</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {podium.map((entry) => (
                <article
                  key={entry.id}
                  className="bg-white border border-outline-variant rounded-lg p-5 hover:border-secondary transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <RankBadge rank={entry.finishPosition as number} />
                    <div>
                      <h3 className="text-body-lg font-bold text-primary">{entry.horseName}</h3>
                      <p className="text-body-sm text-on-surface-variant">{entry.jockeyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="text-on-surface-variant tabular-nums">{entry.finishTime}</span>
                    <span className="font-bold text-secondary tabular-nums">{entry.prizeAmount ?? '-'}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <section className="bg-white border border-outline-variant rounded-lg overflow-hidden">
            <div className="p-6 border-b border-outline-variant">
              <p className="text-label-md text-secondary uppercase tracking-widest mb-1">Full Standings</p>
              <h2 className="text-headline-md font-bold text-primary">Race Result Table</h2>
            </div>
            <RaceResultTable entries={result.entries} />
          </section>

          <PrizeBreakdown
            distributions={result.prizeDistributions}
            totalPrizePool={result.totalPrizePool}
          />
        </div>
      </div>
    </div>
  );
};

export default RaceResultDetail;

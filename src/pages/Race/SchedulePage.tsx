import { useEffect, useMemo, useState } from 'react';
import { Calendar, Filter, MapPin } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiClient';
import { scheduleService, type RaceScheduleItem } from '../../services/scheduleService';

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
}).format(new Date(value));

const formatTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

const SchedulePage = () => {
  const [schedules, setSchedules] = useState<RaceScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [onlyToday, setOnlyToday] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSchedules = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await scheduleService.getRaceSchedule();

        if (isMounted) {
          setSchedules(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, 'Unable to load race schedule.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSchedules();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleSchedules = useMemo(() => {
    if (!onlyToday) {
      return schedules;
    }

    const today = new Date().toDateString();
    return schedules.filter((race) => new Date(race.scheduledAt).toDateString() === today);
  }, [onlyToday, schedules]);

  return (
    <div className="bg-surface min-h-screen py-12">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-headline-lg font-bold text-primary mb-2">Race Schedule</h1>
            <p className="text-body-md text-on-surface-variant">Stay updated with the upcoming elite horse racing events worldwide.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded-md text-body-sm font-medium hover:bg-surface-container transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button
              type="button"
              onClick={() => setOnlyToday((current) => !current)}
              className="bg-primary text-on-primary px-6 py-2 rounded-md text-body-sm font-semibold hover:bg-opacity-90 transition-all"
            >
              {onlyToday ? 'All Races' : "Today's Races"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-lg border border-outline-variant bg-white p-6 text-body-sm font-semibold text-on-surface-variant">
            Loading race schedule...
          </div>
        ) : (
          <div className="space-y-6">
            {visibleSchedules.map((race) => (
              <div key={race.raceId} className="bg-white border border-outline-variant rounded-lg p-6 hover:border-secondary transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center min-w-[80px]">
                      <p className="text-label-sm text-outline uppercase tracking-widest mb-1">Time</p>
                      <p className="text-headline-md font-bold text-primary">{formatTime(race.scheduledAt)}</p>
                    </div>
                    <div className="w-px h-12 bg-outline-variant hidden md:block" />
                    <div>
                      <div className="flex items-center gap-2 text-on-surface-variant mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-body-sm font-medium">{formatDate(race.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <MapPin className="w-4 h-4" />
                        <span className="text-body-sm font-medium">{race.tournamentName}, {race.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-body-lg font-bold text-primary">{race.raceName}</h3>
                      <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        {race.rankGroup}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2 text-label-md text-outline">
                        <span className="font-bold uppercase tracking-wider">Distance:</span>
                        <span className="text-on-surface-variant font-semibold">{race.distanceM}m</span>
                      </div>
                      <div className="flex items-center gap-2 text-label-md text-outline">
                        <span className="font-bold uppercase tracking-wider">Surface:</span>
                        <span className="text-on-surface-variant font-semibold">{race.trackType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-label-md text-outline">
                        <span className="font-bold uppercase tracking-wider">Prize:</span>
                        <span className="text-secondary font-bold">{scheduleService.formatCurrency(race.prizePool)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button className="flex-1 lg:flex-none bg-white border border-primary text-primary px-6 py-2.5 rounded-md text-body-sm font-bold hover:bg-surface-container transition-all">
                      Race Details
                    </button>
                    <button className="flex-1 lg:flex-none bg-secondary text-white px-6 py-2.5 rounded-md text-body-sm font-bold hover:bg-opacity-90 transition-all">
                      Place Bet
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {visibleSchedules.length === 0 && (
              <div className="rounded-lg border border-outline-variant bg-white p-8 text-center text-body-sm font-semibold text-on-surface-variant">
                No races found for this view.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;

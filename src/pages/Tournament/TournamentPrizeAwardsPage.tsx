import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  MapPin,
  Medal,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import type { PrizeAwardResponse, PrizeAwardStatus, Tournament } from '../../types/tournament';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};

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

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(amount);

const sortAwards = (items: PrizeAwardResponse[]) => [...items].sort((left, right) => left.finishPosition - right.finishPosition);

const getAwardedAtLabel = (award: PrizeAwardResponse) => (
  award.status === 'awarded' ? formatDateTime(award.awardedAt) : 'Not awarded yet'
);

const TournamentPrizeAwardsPage = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [awards, setAwards] = useState<PrizeAwardResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [markingAwardId, setMarkingAwardId] = useState<number | null>(null);
  const [pendingAward, setPendingAward] = useState<PrizeAwardResponse | null>(null);
  const [isAnnounceConfirmationOpen, setIsAnnounceConfirmationOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useToastNotifications([notice]);

  const loadPage = useCallback(async () => {
    if (!tournamentId) {
      setNotice({ tone: 'error', text: 'Tournament ID is required.' });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotice(null);

    try {
      const [tournamentData, awardData] = await Promise.all([
        tournamentService.getTournamentById(tournamentId),
        tournamentService.getPrizeAwards(tournamentId),
      ]);

      setTournament(tournamentData);
      setAwards(sortAwards(awardData));
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to load prize awards.') });
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    const loadTimeout = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => {
      window.clearTimeout(loadTimeout);
    };
  }, [loadPage]);

  const announcedCount = useMemo(
    () => awards.filter((award) => award.status === 'announced').length,
    [awards],
  );
  const awardedCount = useMemo(
    () => awards.filter((award) => award.status === 'awarded').length,
    [awards],
  );
  const hasAwards = awards.length > 0;
  const canAnnounce = tournament?.status === 'Completed' && !hasAwards;

  const handleAnnouncePrizes = async () => {
    if (!tournamentId) {
      return;
    }

    setIsAnnouncing(true);
    setNotice(null);

    try {
      const nextAwards = await tournamentService.awardPrizes(tournamentId);
      setAwards(sortAwards(nextAwards));
      setNotice({ tone: 'success', text: 'Prize recipients announced successfully.' });
      setIsAnnounceConfirmationOpen(false);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to announce prize recipients.') });
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleMarkAwarded = async () => {
    if (!tournamentId || !pendingAward) {
      return;
    }

    setMarkingAwardId(pendingAward.awardId);
    setNotice(null);

    try {
      const updatedAward = await tournamentService.markPrizeAwarded(tournamentId, pendingAward.awardId);
      setAwards((current) => sortAwards(current.map((award) => (
        award.awardId === updatedAward.awardId ? updatedAward : award
      ))));
      setNotice({ tone: 'success', text: `${pendingAward.prizeName} marked as awarded.` });
      setPendingAward(null);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Unable to mark this prize as awarded.') });
    } finally {
      setMarkingAwardId(null);
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
              <Link
                to="/tournaments"
                className="mb-4 inline-flex items-center gap-2 text-label-sm font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Tournament Management
              </Link>
              <p className="mb-3 text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Prize Awards</p>
              <h1 className="font-display mb-2 text-headline-lg font-extrabold text-primary">
                {tournament?.tournamentName ?? 'Tournament Prize Awards'}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-outline" />
                  {tournament ? `${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}` : 'Tournament dates'}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-outline" />
                  {tournament?.location ?? 'Tournament location'}
                </span>
              </div>
            </motion.div>

            <motion.div
              className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-4"
              variants={revealContainer}
            >
              <motion.div variants={revealUp}>
                <MetricCard icon={<Trophy className="h-4 w-4" />} label="Recipients" value={String(awards.length).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<Clock3 className="h-4 w-4" />} label="Announced" value={String(announcedCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Awarded" value={String(awardedCount).padStart(2, '0')} />
              </motion.div>
              <motion.div variants={revealUp}>
                <button
                  type="button"
                  onClick={() => setIsAnnounceConfirmationOpen(true)}
                  disabled={!canAnnounce || isLoading || isAnnouncing}
                  title={
                    hasAwards
                      ? 'Prize recipients have already been announced'
                      : tournament?.status !== 'Completed'
                        ? 'Tournament must be completed before announcing prize recipients'
                        : 'Announce prize recipients'
                  }
                  className="gold-gradient flex min-h-[88px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-body-sm font-extrabold text-on-primary transition-all disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isAnnouncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Medal className="h-4 w-4" />}
                  {hasAwards ? 'Recipients Announced' : 'Announce Recipients'}
                </button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {notice?.tone === 'error' && <StatusBanner tone="error" text={notice.text} />}

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Award Recipients</p>
            <h2 className="font-display mt-1 text-title-large font-bold text-primary">Podium Awards</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadPage()}
            disabled={isLoading || isAnnouncing || markingAwardId !== null}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh prize awards"
            title="Refresh prize awards"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <EmptyState title="Loading prize awards" description="Fetching prize recipients." />
        ) : awards.length === 0 ? (
          <EmptyState
            title={tournament?.status === 'Completed' ? 'No prize recipients announced' : 'Prize awards unavailable'}
            description={tournament?.status === 'Completed' ? 'No award records are available for this tournament.' : 'The tournament has not been completed.'}
          />
        ) : (
          <>
            <div className="glass-panel hidden overflow-hidden rounded-xl lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left">
                  <thead className="border-b border-outline-variant bg-surface-container">
                    <tr>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Place</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Recipient</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Prize</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Race Result</th>
                      <th className="px-5 py-4 text-right text-label-sm uppercase tracking-wider text-outline">Amount</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Status</th>
                      <th className="px-5 py-4 text-label-sm uppercase tracking-wider text-outline">Awarded At</th>
                      <th className="px-5 py-4 text-right text-label-sm uppercase tracking-wider text-outline">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {awards.map((award, index) => (
                      <motion.tr
                        key={award.awardId}
                        className="transition-colors hover:bg-surface-container-lowest"
                        initial="hidden"
                        animate="visible"
                        variants={revealUp}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="px-5 py-4"><PlaceBadge position={award.finishPosition} /></td>
                        <td className="px-5 py-4">
                          <p className="text-body-sm font-bold text-primary">{award.horseName}</p>
                          <p className="mt-1 text-label-sm text-on-surface-variant">{award.ownerFullName}</p>
                        </td>
                        <td className="px-5 py-4 text-body-sm font-semibold text-primary">{award.prizeName}</td>
                        <td className="px-5 py-4 text-body-sm text-on-surface-variant">Race #{award.raceId} / Result #{award.resultId}</td>
                        <td className="px-5 py-4 text-right text-body-sm font-bold text-primary tabular-nums">{formatCurrency(award.amount)}</td>
                        <td className="px-5 py-4"><AwardStatusBadge status={award.status} /></td>
                        <td className="px-5 py-4 text-body-sm text-on-surface-variant">{getAwardedAtLabel(award)}</td>
                        <td className="px-5 py-4 text-right">
                          <MarkAwardedButton
                            award={award}
                            isMarking={markingAwardId === award.awardId}
                            onClick={() => setPendingAward(award)}
                          />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 lg:hidden">
              {awards.map((award, index) => (
                <motion.div key={award.awardId} initial="hidden" animate="visible" variants={revealUp} transition={{ delay: index * 0.05 }}>
                  <AwardCard award={award} isMarking={markingAwardId === award.awardId} onMarkAwarded={() => setPendingAward(award)} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {isAnnounceConfirmationOpen && (
        <ConfirmationModal
          title="Announce Prize Recipients"
          question="Announce the top three prize recipients?"
          description="The recipients will be recorded with an Announced status."
          confirmLabel="Announce Recipients"
          isProcessing={isAnnouncing}
          onClose={() => setIsAnnounceConfirmationOpen(false)}
          onConfirm={() => void handleAnnouncePrizes()}
        />
      )}

      {pendingAward && (
        <ConfirmationModal
          title="Mark Prize as Awarded"
          question={`Confirm that ${pendingAward.prizeName} has been awarded?`}
          description={`This records the external payout for ${pendingAward.horseName}.`}
          confirmLabel="Mark as Awarded"
          isProcessing={markingAwardId === pendingAward.awardId}
          onClose={() => setPendingAward(null)}
          onConfirm={() => void handleMarkAwarded()}
        />
      )}
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
    <div className="mb-3 flex items-center justify-between text-on-surface-variant">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <p className="font-display truncate text-2xl font-extrabold text-on-surface">{value}</p>
  </div>
);

const StatusBanner = ({ tone, text }: { tone: 'error'; text: string }) => (
  <div className={`mb-6 rounded-md border px-4 py-3 text-body-sm font-semibold ${tone === 'error' ? 'border-error/30 bg-error-container/20 text-error' : ''}`}>
    {text}
  </div>
);

const PlaceBadge = ({ position }: { position: number }) => {
  const style = position === 1
    ? 'bg-secondary/15 text-secondary'
    : position === 2
      ? 'bg-primary/10 text-primary'
      : 'bg-surface-container-highest text-on-surface-variant';

  return (
    <span className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-body-sm font-extrabold ${style}`}>
      {position === 1 && <Trophy className="h-4 w-4" />}
      {position}
    </span>
  );
};

const AwardStatusBadge = ({ status }: { status: PrizeAwardStatus }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
    status === 'awarded' ? 'bg-secondary/15 text-secondary' : 'bg-primary/10 text-primary'
  }`}>
    {status}
  </span>
);

const MarkAwardedButton = ({
  award,
  isMarking,
  onClick,
}: {
  award: PrizeAwardResponse;
  isMarking: boolean;
  onClick: () => void;
}) => {
  if (award.status === 'awarded') {
    return <span className="inline-flex items-center gap-1.5 text-label-sm font-bold text-secondary"><CheckCircle2 className="h-4 w-4" /> Awarded</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isMarking}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-secondary/50 px-3 py-2 text-label-sm font-bold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isMarking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Mark Awarded
    </button>
  );
};

const AwardCard = ({
  award,
  isMarking,
  onMarkAwarded,
}: {
  award: PrizeAwardResponse;
  isMarking: boolean;
  onMarkAwarded: () => void;
}) => (
  <article className="glass-panel rounded-xl p-5">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <PlaceBadge position={award.finishPosition} />
        <div className="min-w-0">
          <p className="truncate text-body-lg font-bold text-primary">{award.horseName}</p>
          <p className="mt-1 truncate text-body-sm text-on-surface-variant">{award.ownerFullName}</p>
        </div>
      </div>
      <AwardStatusBadge status={award.status} />
    </div>
    <div className="grid gap-3 text-body-sm text-on-surface-variant">
      <AwardDetail label="Prize" value={award.prizeName} />
      <AwardDetail label="Amount" value={formatCurrency(award.amount)} valueClassName="font-bold text-primary tabular-nums" />
      <AwardDetail label="Race Result" value={`Race #${award.raceId} / Result #${award.resultId}`} />
      <AwardDetail label="Awarded At" value={getAwardedAtLabel(award)} />
    </div>
    {award.status === 'announced' && (
      <div className="mt-5 border-t border-outline-variant pt-4">
        <MarkAwardedButton award={award} isMarking={isMarking} onClick={onMarkAwarded} />
      </div>
    )}
  </article>
);

const AwardDetail = ({ label, value, valueClassName = '' }: { label: string; value: string; valueClassName?: string }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="shrink-0 font-bold uppercase tracking-wider text-outline">{label}</span>
    <span className={`min-w-0 text-right ${valueClassName}`}>{value}</span>
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="glass-panel rounded-xl px-6 py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-container">
      <CircleDollarSign className="h-6 w-6 text-outline" />
    </div>
    <h3 className="mb-2 text-body-lg font-bold text-primary">{title}</h3>
    <p className="text-body-sm text-on-surface-variant">{description}</p>
  </div>
);

const ConfirmationModal = ({
  title,
  question,
  description,
  confirmLabel,
  isProcessing,
  onClose,
  onConfirm,
}: {
  title: string;
  question: string;
  description: string;
  confirmLabel: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 p-4" role="presentation">
    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="prize-award-confirmation-title">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
        <div className="min-w-0">
          <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-secondary">Prize Awards</p>
          <h2 id="prize-award-confirmation-title" className="mt-1 font-display text-title-large font-bold text-primary">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close confirmation"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 px-6 py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
            <Medal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-body-lg font-bold text-on-surface">{question}</h3>
            <p className="mt-2 text-body-sm leading-6 text-on-surface-variant">{description}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant px-6 py-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="rounded-md border border-outline-variant px-6 py-3 text-body-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-body-sm font-bold text-on-secondary transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isProcessing ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default TournamentPrizeAwardsPage;

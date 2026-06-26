import { useEffect, useMemo, useState } from 'react';
import { Globe2, MessageCircle, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { tournamentService } from '../../services/tournamentService';
import type { Tournament, TournamentParticipant } from '../../types/tournament';

const heroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAMECLOWNrDaYZayptmiktWx0wBNF3DYXYJFdqOmb7f0lbXELzFaizKIcqgCq655F9mfHQjMB4vV33zITEW68yWnSuVEElxHx5KKUrWfVL4ic11vvHju-2VZM7SItLPqX0z9udU8nLv8BQn-tI0WX8QXMYGBOo7h94yX5vlu8dOnTsd4GyzD93O_OBwAU1AG5ZCrCV8J9UMrVtaOB5KBBuol1OhNNGNy9VI8w9B0GDqcbDMR1kHiIAkYp73T3-E2huQ5Tsu20hvvvjc';

const fallbackWinners = [
  {
    rank: 1,
    horse: 'Apex Legend',
    jockey: 'S. Martinez',
    time: '2:14.32',
    payout: '$450,000',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdZpD8K9lXUMOt7rzPyRRR5X6ZPzlqsngsIvNGFUqGlwlVpcq_0T35W66pROAVwq0fENeFYRtem4nYOY12qNT_QbydExUJJUKNkpDMH3lykT2Yw66w_WZRZN8zKhRSJO6OY-6YJ4vK7RXbEVTPETt-qeES_V5SIMmS8ZjP3DkiO_pEqflgDQWJu_HiMvoN8c-MXvKF16eko0x1Ot_L6JNnHG9fFgqZauczxthYb8Ax532oBO2zBAupTDXAQcnRw7qKaKwumQxsz7-v',
    avatarClass: 'border-primary',
    badgeClass: 'bg-primary text-on-primary',
    silkClass: 'border-primary bg-[repeating-linear-gradient(45deg,#f2ca50,#f2ca50_4px,#3c2f00_4px,#3c2f00_8px)]',
  },
  {
    rank: 2,
    horse: 'Ghost Runner',
    jockey: 'M. Thompson',
    time: '2:14.58',
    payout: '$180,000',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAzyG1ccRnSF94-iAkNoHXWUYZztRFaQZPmsxrISCnTm6pdqJIP_8KjFB7AIj6iPU7EMq5gRUd1PuBk56zrXc_wAGe_ykihqpz6KqBb1Yp2zgu8Dr09n6iPsgPX1jcsctYOjWfOUo4XDPUE0Ag_KE59QgkC_B9hNaXs5CrofPtiSFR8kgrBN7ucRpThawjHEoJh8MhNaLufNAdkuAqxd-vN0ixch8wSBW5OstU-IB6w_wGTVwuAIWpB8SmcR16uVaRCGg4r6Jos77v-',
    avatarClass: 'border-outline-variant',
    badgeClass: 'bg-on-surface-variant/30 text-on-surface',
    silkClass: 'border-secondary bg-secondary-container',
  },
  {
    rank: 3,
    horse: 'Black Velvet',
    jockey: 'L. Richards',
    time: '2:15.01',
    payout: '$75,000',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwtfGwXw2Q6Mp31MK2E2SDi9ridHJoyl2h-nHT7xEqb8SRS9qagx9t9Ft5fvbv6pKgxVkno2ZKI0ZXKSLq7vhMlyEd6YIRiVB1z1UUPYosIvABHrtrg6cq7fYs-ga3WHA885fgIFn9QbkaMO0s4DNS3Xmj8lMM7GBjUvJiRN56pJZukHBz0sY2SGMYR2q_R0ZWim3HqXkU99uoHpGqWLJJlHj1wAzw47YWtyTLSEBR20in2ekZmYiCRLcKH5SIb35fgG7jHACzKeEa',
    avatarClass: 'border-outline-variant/30',
    badgeClass: 'bg-on-surface-variant/20 text-on-surface-variant',
    silkClass: 'border-error bg-tertiary-container',
  },
];

const fallbackJockeys = [
  {
    rank: 1,
    name: 'S. Martinez',
    wins: 42,
    losses: 18,
    winRate: '70%',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBdZpD8K9lXUMOt7rzPyRRR5X6ZPzlqsngsIvNGFUqGlwlVpcq_0T35W66pROAVwq0fENeFYRtem4nYOY12qNT_QbydExUJJUKNkpDMH3lykT2Yw66w_WZRZN8zKhRSJO6OY-6YJ4vK7RXbEVTPETt-qeES_V5SIMmS8ZjP3DkiO_pEqflgDQWJu_HiMvoN8c-MXvKF16eko0x1Ot_L6JNnHG9fFgqZauczxthYb8Ax532oBO2zBAupTDXAQcnRw7qKaKwumQxsz7-v',
    avatarClass: 'border-primary',
    badgeClass: 'bg-primary text-on-primary',
  },
  {
    rank: 2,
    name: 'M. Thompson',
    wins: 38,
    losses: 22,
    winRate: '63%',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAzyG1ccRnSF94-iAkNoHXWUYZztRFaQZPmsxrISCnTm6pdqJIP_8KjFB7AIj6iPU7EMq5gRUd1PuBk56zrXc_wAGe_ykihqpz6KqBb1Yp2zgu8Dr09n6iPsgPX1jcsctYOjWfOUo4XDPUE0Ag_KE59QgkC_B9hNaXs5CrofPtiSFR8kgrBN7ucRpThawjHEoJh8MhNaLufNAdkuAqxd-vN0ixch8wSBW5OstU-IB6w_wGTVwuAIWpB8SmcR16uVaRCGg4r6Jos77v-',
    avatarClass: 'border-outline-variant',
    badgeClass: 'bg-on-surface-variant/30 text-on-surface',
  },
  {
    rank: 3,
    name: 'L. Richards',
    wins: 35,
    losses: 25,
    winRate: '58%',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwtfGwXw2Q6Mp31MK2E2SDi9ridHJoyl2h-nHT7xEqb8SRS9qagx9t9Ft5fvbv6pKgxVkno2ZKI0ZXKSLq7vhMlyEd6YIRiVB1z1UUPYosIvABHrtrg6cq7fYs-ga3WHA885fgIFn9QbkaMO0s4DNS3Xmj8lMM7GBjUvJiRN56pJZukHBz0sY2SGMYR2q_R0ZWim3HqXkU99uoHpGqWLJJlHj1wAzw47YWtyTLSEBR20in2ekZmYiCRLcKH5SIb35fgG7jHACzKeEa',
    avatarClass: 'border-outline-variant/30',
    badgeClass: 'bg-on-surface-variant/20 text-on-surface-variant',
  },
];

const footerGroups = [
  {
    title: 'Platform',
    links: ['Race Management', 'Live Odds Engine', 'Stable Dashboards', 'Tote Systems'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Partnerships', 'Press Kit', 'Careers'],
  },
  {
    title: 'Compliance',
    links: ['Privacy Policy', 'Terms of Service', 'Anti-Money Laundering', 'Global Licensing'],
  },
];

const revealUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const viewportReveal = { once: true, amount: 0.18 };

const getTournamentParticipants = (tournament: Tournament | undefined) =>
  tournament?.participants.length ? tournament.participants : [];

const LandingPage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [tournamentError, setTournamentError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadTournaments = async () => {
      try {
        const data = await tournamentService.getAllTournaments(false);

        if (isMounted) {
          setTournaments(data);
          setTournamentError('');
        }
      } catch (error) {
        if (isMounted) {
          setTournaments([]);
          setTournamentError(getApiErrorMessage(error, 'Unable to load tournaments.'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingTournaments(false);
        }
      }
    };

    void loadTournaments();

    return () => {
      isMounted = false;
    };
  }, []);

  const winners = useMemo(() => {
    const completedTournament = tournaments.find((tournament) => tournament.status === 'Completed') ?? tournaments[0];
    const participants = getTournamentParticipants(completedTournament).slice(0, 3);

    if (participants.length === 0) {
      return fallbackWinners;
    }

    return participants.map((participant: TournamentParticipant, index) => ({
      rank: index + 1,
      horse: participant.horseName,
      jockey: participant.jockeyName,
      time: completedTournament?.schedule[index]?.endTime ?? '-',
      payout: index === 0 ? completedTournament?.prize || '-' : '-',
      image: fallbackWinners[index]?.image ?? fallbackWinners[0].image,
      avatarClass: fallbackWinners[index]?.avatarClass ?? 'border-outline-variant',
      badgeClass: fallbackWinners[index]?.badgeClass ?? 'bg-on-surface-variant/30 text-on-surface',
      silkClass: fallbackWinners[index]?.silkClass ?? 'border-primary bg-secondary-container',
    }));
  }, [tournaments]);

  const jockeys = useMemo(() => {
    // For now, use fallback data since we don't have a jockey API yet
    return fallbackJockeys;
  }, []);

  const featuredTournament = useMemo(
    () =>
      tournaments.find((tournament) => tournament.status === 'Ongoing') ??
      tournaments.find((tournament) => tournament.status === 'Upcoming') ??
      tournaments[0],
    [tournaments],
  );

  const featuredParticipants = useMemo(
    () => getTournamentParticipants(featuredTournament).slice(0, 2),
    [featuredTournament],
  );

  return (
    <div className="overflow-x-hidden bg-background text-body-md text-on-surface">
      <section id="home" className="relative flex min-h-screen scroll-mt-24 items-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <img
            className="h-full w-full object-cover opacity-40 blur-[2px]"
            src={heroImage}
            alt="Powerful thoroughbred horses galloping through early morning mist on a turf track"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        </div>

        <motion.div
          className="relative z-10 max-w-5xl px-8 md:px-32"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.span
            className="mb-6 inline-block rounded-full border border-primary px-4 py-1 text-label-md font-semibold uppercase tracking-widest text-primary"
            variants={revealUp}
            transition={{ duration: 0.55 }}
          >
            Global Racing Management
          </motion.span>
          <motion.h1
            className="font-display mb-6 text-5xl font-extrabold leading-[1.1] text-on-surface md:text-[64px]"
            variants={revealUp}
            transition={{ duration: 0.65 }}
          >
            The Pinnacle of <br />
            <span className="text-primary">Horse Racing</span> Management
          </motion.h1>
          <motion.p
            className="mb-10 max-w-2xl text-body-lg leading-7 text-on-surface-variant"
            variants={revealUp}
            transition={{ duration: 0.65 }}
          >
            Experience precision data, lightning-fast tournament logistics, and the ultimate betting excitement. Whether you manage a stable or chase the thrill of the win, HTMS is your elite racing command center.
          </motion.p>
          <motion.div className="flex flex-wrap gap-4" variants={revealUp} transition={{ duration: 0.65 }}>
            <Link to="/login" state={{ mode: 'signup' }} className="gold-gradient rounded-xl px-8 py-4 font-display text-xl font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95">
              Join the Race
            </Link>
            <Link to="/tournaments" className="rounded-xl border border-outline-variant bg-surface-container-highest px-8 py-4 font-display text-xl font-bold text-on-surface transition-colors hover:bg-surface-bright">
              Explore Tournaments
            </Link>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 right-0 hidden p-12 xl:block">
          <motion.div
            className="glass-card w-80 rounded-2xl border-l-4 border-primary p-6 shadow-2xl"
            initial={{ opacity: 0, x: 42, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 150, damping: 18 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center text-label-md font-semibold text-secondary">
                <span className="pulse-live mr-2 h-3 w-3 rounded-full bg-secondary" />
                {featuredTournament?.status === 'Ongoing' ? 'LIVE TOURNAMENT' : 'FEATURED EVENT'}
              </span>
              <span className="text-data-mono font-medium text-on-surface-variant">
                {featuredTournament ? `${featuredTournament.currentParticipants}/${featuredTournament.maximumParticipants}` : '--/--'}
              </span>
            </div>
            {isLoadingTournaments ? (
              <FloatingCardMessage text="Đang tải danh sách tournament..." />
            ) : tournamentError ? (
              <FloatingCardMessage tone="error" text={tournamentError} />
            ) : !featuredTournament ? (
              <FloatingCardMessage text="Chưa có tournament nào được lên lịch." />
            ) : featuredParticipants.length === 0 ? (
              <FloatingCardMessage text="Tournament chưa có ngựa tham gia." />
            ) : (
              <div className="space-y-3">
                {featuredParticipants.map((item, index) => (
                  <motion.div
                    key={item.participantId}
                    className="flex items-center justify-between gap-3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + index * 0.08 }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-primary-container text-on-primary' : 'bg-on-tertiary-container text-on-tertiary'}`}>
                        {item.horseName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate font-bold">{item.horseName}</span>
                    </div>
                    <span className="shrink-0 text-data-mono font-medium text-primary">{item.jockeyName}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section id="tournaments" className="scroll-mt-28 bg-background px-8 py-24 md:px-32">
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={viewportReveal}
          variants={revealUp}
          transition={{ duration: 0.55 }}
        >
          <h2 className="font-display mb-4 text-headline-lg font-bold">Featured Tournaments</h2>
          <p className="mx-auto max-w-xl text-on-surface-variant">
            Explore our most exciting upcoming and ongoing tournaments.
          </p>
        </motion.div>
      </section>

      <section id="jockey" className="scroll-mt-28 bg-surface-container-low px-8 py-24 md:px-32">
        <motion.div
          className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={viewportReveal}
          variants={revealUp}
          transition={{ duration: 0.55 }}
        >
          <div>
            <h2 className="font-display mb-4 text-headline-lg font-bold">Top Jockeys</h2>
            <p className="text-on-surface-variant">
              Discover the most successful jockeys in recent tournaments.
            </p>
          </div>
          <Link to="/results" className="rounded-lg border border-outline-variant px-6 py-2 text-label-md font-semibold text-on-surface transition-all hover:bg-surface-container-highest">
            View All Jockeys
          </Link>
        </motion.div>

        <motion.div
          className="glass-card overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportReveal}
          transition={{ duration: 0.6 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="bg-surface-container-high/50">
                  {['Rank', 'Jockey', 'Wins', 'Losses', 'Win Rate'].map((heading) => (
                    <th key={heading} className="px-8 py-5 text-label-md font-semibold uppercase tracking-widest text-on-surface-variant">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {jockeys.map((jockey, index) => (
                  <motion.tr
                    key={jockey.rank}
                    className="transition-colors hover:bg-surface-container-highest/20"
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.07, duration: 0.42 }}
                    whileHover={{ scale: 1.01, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  >
                    <td className="px-8 py-6">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${jockey.badgeClass}`}>
                        {jockey.rank}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={jockey.image} alt={jockey.name} className={`h-12 w-12 rounded-full border-2 object-cover ${jockey.avatarClass}`} />
                        <span className="font-display text-xl font-semibold text-on-surface">{jockey.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-data-mono font-medium text-primary">{jockey.wins}</td>
                    <td className="px-8 py-6 text-data-mono font-medium text-secondary">{jockey.losses}</td>
                    <td className="px-8 py-6 text-data-mono font-bold text-primary">{jockey.winRate}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      <section id="horse" className="scroll-mt-28 bg-background px-8 py-24 md:px-32">
        <motion.div
          className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          initial="hidden"
          whileInView="visible"
          viewport={viewportReveal}
          variants={revealUp}
          transition={{ duration: 0.55 }}
        >
          <div>
            <h2 className="font-display mb-4 text-headline-lg font-bold">Top Horses</h2>
            <p className="text-on-surface-variant">
              Discover the most successful horses in recent tournaments.
            </p>
          </div>
          <Link to="/results" className="rounded-lg border border-outline-variant px-6 py-2 text-label-md font-semibold text-on-surface transition-all hover:bg-surface-container-highest">
            View All Horses
          </Link>
        </motion.div>

        <motion.div
          className="glass-card overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportReveal}
          transition={{ duration: 0.6 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="bg-surface-container-high/50">
                  {['Rank', 'Horse', 'Jockey / Silks', 'Time', 'Payout'].map((heading) => (
                    <th key={heading} className="px-8 py-5 text-label-md font-semibold uppercase tracking-widest text-on-surface-variant">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {winners.map((winner, index) => (
                  <motion.tr
                    key={winner.rank}
                    className="transition-colors hover:bg-surface-container-highest/20"
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.07, duration: 0.42 }}
                    whileHover={{ scale: 1.01, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  >
                    <td className="px-8 py-6">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${winner.badgeClass}`}>
                        {winner.rank}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={winner.image} alt={winner.horse} className={`h-12 w-12 rounded-full border-2 object-cover ${winner.avatarClass}`} />
                        <span className="font-display text-xl font-semibold text-on-surface">{winner.horse}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-6 w-6 rounded-full border-2 ${winner.silkClass}`} />
                        <span>{winner.jockey}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-data-mono font-medium text-secondary">{winner.time}</td>
                    <td className="px-8 py-6 text-data-mono font-medium text-primary">{winner.payout}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      <section className="relative overflow-hidden bg-background px-8 py-24 md:px-32">
        <motion.div
          className="glass-card relative overflow-hidden rounded-[32px] border-primary/30 p-12 text-center md:p-24"
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewportReveal}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full bg-[radial-gradient(#f2ca50_1px,transparent_1px)] bg-[length:40px_40px]" />
          </div>
          <div className="relative z-10">
            <h2 className="font-display mb-8 text-5xl font-extrabold leading-tight">Ready to Elevate Your Race?</h2>
            <p className="mx-auto mb-12 max-w-2xl text-body-lg text-on-surface-variant">
              Join the world's most advanced horse racing ecosystem today. Whether you're managing a stable or betting on glory, HTMS gives you the winning edge.
            </p>
            <div className="flex flex-col justify-center gap-6 md:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                <Link to="/login" state={{ mode: 'signup' }} className="gold-gradient rounded-xl px-10 py-5 font-display text-xl font-bold text-on-primary shadow-2xl transition-transform active:scale-95">
                  Create Operator Account
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                <Link to="/login" state={{ mode: 'signup' }} className="rounded-xl border border-outline-variant bg-surface-container-highest px-10 py-5 font-display text-xl font-bold text-on-surface transition-colors hover:bg-surface-bright">
                  Register as Spectator
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest px-8 pb-10 pt-20 md:px-32">
        <motion.div
          className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={viewportReveal}
          variants={revealContainer}
        >
          <motion.div variants={revealUp}>
            <div className="font-display mb-6 text-xl font-semibold text-primary">HTMS</div>
            <p className="mb-6 text-body-sm text-on-surface-variant">
              Redefining the standards of high-stakes sportsmanship through precision technology and elite tournament management since 2024.
            </p>
            <div className="flex gap-4">
              {[Globe2, MessageCircle, Share2].map((Icon, index) => (
                <motion.button
                  key={index}
                  className="text-on-surface-variant transition-colors hover:text-primary"
                  aria-label="Social link"
                  whileHover={{ y: -2, scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {footerGroups.map((group, index) => (
            <motion.div key={group.title} variants={revealUp} transition={{ delay: index * 0.1 }}>
              <h4 className="mb-6 text-label-md font-semibold uppercase tracking-widest text-on-surface">{group.title}</h4>
              <ul className="space-y-4 text-body-sm text-on-surface-variant">
                {group.links.map((link) => (
                  <motion.li key={link} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
                    <a className="transition-colors hover:text-primary" href="#">
                      {link}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col items-center justify-between gap-6 border-t border-outline-variant/20 pt-10 md:flex-row"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportReveal}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <span className="rounded border border-error px-2 py-0.5 text-label-md font-bold text-error">18+</span>
            <p className="text-label-md font-semibold uppercase tracking-tight text-on-surface-variant">
              Gamble Responsibly. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
            </p>
          </div>
          <p className="text-label-md text-on-surface-variant">© 2024 HTMS GLOBAL SYSTEMS. ALL RIGHTS RESERVED.</p>
        </motion.div>
      </footer>
    </div>
  );
};

const FloatingCardMessage = ({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) => (
  <div className={`rounded-lg border px-3 py-4 text-body-sm font-semibold ${
    tone === 'error'
      ? 'border-error/30 bg-error-container/20 text-error'
      : 'border-outline-variant/40 bg-surface-container-lowest/60 text-on-surface-variant'
  }`}
  >
    {text}
  </div>
);

export default LandingPage;

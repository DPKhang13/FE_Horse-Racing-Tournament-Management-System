import { Shield, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  {
    title: 'Tournament Operations',
    description: 'Create tournaments, manage race schedules, assign referees, and publish certified results.',
    icon: Trophy,
  },
  {
    title: 'Role-Based Workspace',
    description: 'Admin, horse owner, jockey, referee, and spectator each see only the tools for their role.',
    icon: Users,
  },
  {
    title: 'Secure Account Flow',
    description: 'Sign up, verify email, sign in, and continue directly to the matching dashboard.',
    icon: Shield,
  },
];

const Hero = () => {
  return (
    <main className="racing-grid min-h-[calc(100vh-73px)] bg-surface">
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-[1440px] flex-col justify-center gap-10 px-4 py-16 md:px-8">
        <div className="max-w-4xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-secondary">Horse Tournament Management System</p>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-primary md:text-7xl">
            Manage horse racing tournaments in one secure dashboard.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-on-surface-variant">
            HTMS helps organizers, horse owners, jockeys, referees, and spectators follow the same tournament data from registration to final result.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              state={{ mode: 'login' }}
              className="inline-flex items-center justify-center rounded-xl border border-outline-variant/60 bg-surface-container-low/70 px-7 py-4 text-sm font-extrabold text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              Login
            </Link>
            <Link
              to="/login"
              state={{ mode: 'signup' }}
              className="gold-gradient inline-flex items-center justify-center rounded-xl px-7 py-4 text-sm font-extrabold text-on-primary transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="glass-panel rounded-2xl p-6">
              <item.icon className="mb-5 h-7 w-7 text-primary" />
              <h2 className="font-display text-xl font-bold text-on-surface">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Hero;

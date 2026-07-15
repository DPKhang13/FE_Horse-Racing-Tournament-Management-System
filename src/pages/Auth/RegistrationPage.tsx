import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Gavel, Medal, Shield, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppLogo } from '../../components/ui';

type RegistrationRole = 'horse_owner' | 'jockey' | 'race_referee' | 'spectator';

// Animation variants
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

const roles: Array<{
  id: RegistrationRole;
  title: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    id: 'horse_owner',
    title: 'Horse Owner',
    description: 'Manage your stable, horse records, race entries, and jockey invitations.',
    icon: UserRound,
  },
  {
    id: 'jockey',
    title: 'Jockey',
    description: 'Track invitations, assignments, race schedule, and professional performance.',
    icon: Medal,
  },
  {
    id: 'race_referee',
    title: 'Referee',
    description: 'Control race results, certify outcomes, and monitor tournament integrity.',
    icon: Gavel,
  },
  {
    id: 'spectator',
    title: 'Spectator',
    description: 'Follow schedules, results, rankings, wallet activity, and predictions.',
    icon: Eye,
  },
];

const RegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; fullName?: string; phone?: string } | null;
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>('spectator');
  const [displayName, setDisplayName] = useState(state?.fullName ?? '');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [organization, setOrganization] = useState('');

  const selectedRoleMeta = useMemo(() => roles.find((role) => role.id === selectedRole) ?? roles[3], [selectedRole]);
  const progressWidth = step === 1 ? '50%' : '100%';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/login', {
      replace: true,
      state: {
        mode: 'login',
        email: state?.email,
      },
    });
  };

  return (
    <main className="racing-grid min-h-screen bg-surface text-on-surface">
      <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6">
        <Link to="/" aria-label="HTMS home"><AppLogo /></Link>
        <Link to="/login" state={{ mode: 'login' }} className="inline-flex h-9 items-center rounded-md border border-line-strong bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink">
          Login
        </Link>
      </header>

      <section className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 pb-12 pt-28 md:px-8">
        <motion.div 
          className="w-full"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.div className="mb-10" variants={revealUp}>
            <div className="mb-4 flex justify-between px-1">
              <span className={`text-label-md font-bold ${step === 1 ? 'text-primary' : 'text-on-surface-variant'}`}>01 Role</span>
              <span className={`text-label-md font-bold ${step === 2 ? 'text-primary' : 'text-on-surface-variant'}`}>02 Identity</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: progressWidth }} />
            </div>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {step === 1 ? (
              <motion.section variants={revealContainer}>
                <motion.div className="mb-10 text-center" variants={revealUp}>
                  <h1 className="font-display text-4xl font-extrabold text-on-surface md:text-5xl">Select Your Arena</h1>
                  <p className="mt-3 text-on-surface-variant">Choose the workspace you want to complete after email verification.</p>
                  {state?.email && <p className="mt-2 text-label-md font-bold text-secondary">{state.email}</p>}
                </motion.div>

                <motion.div className="grid grid-cols-1 gap-4 md:grid-cols-2" variants={revealContainer}>
                  {roles.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;

                    return (
                      <motion.button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`relative min-h-[180px] rounded-lg border bg-white p-6 text-left shadow-sm transition-all hover:border-primary/60 hover:shadow-md ${
                          isSelected ? 'border-primary ring-2 ring-primary/15' : 'border-line'
                        }`}
                        variants={revealUp}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isSelected && <CheckCircle2 className="absolute right-5 top-5 h-5 w-5 text-primary" />}
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h2 className="font-display text-xl font-bold text-on-surface">{role.title}</h2>
                        <p className="mt-3 text-sm leading-6 text-on-surface-variant">{role.description}</p>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.section>
            ) : (
              <motion.section variants={revealContainer}>
                <motion.div className="mb-10 text-center" variants={revealUp}>
                  <h1 className="font-display text-4xl font-extrabold text-on-surface">Verify Identity</h1>
                  <p className="mt-3 text-on-surface-variant">Complete your {selectedRoleMeta.title.toLowerCase()} profile details.</p>
                </motion.div>

                <motion.div className="mx-auto max-w-xl space-y-6 rounded-lg border border-line bg-white p-8 shadow-sm" variants={revealUp}>
                  <RegistrationInput label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your professional display name" />
                  <RegistrationInput label="License number" value={licenseNumber} onChange={setLicenseNumber} placeholder="Optional license or credential ID" />
                  <RegistrationInput label={selectedRole === 'horse_owner' ? 'Stable name' : 'Organization'} value={organization} onChange={setOrganization} placeholder="Stable, team, venue, or organization" />

                  <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest/70 p-4">
                    <div className="flex items-center gap-3 text-secondary">
                      <Shield className="h-5 w-5" />
                      <span className="text-label-md font-bold uppercase tracking-[0.16em]">Account verified</span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Your email verification is complete. Sign in to continue to your dashboard.
                    </p>
                  </div>
                </motion.div>
              </motion.section>
            )}

            <motion.div className="mx-auto mt-12 flex max-w-xl items-center justify-between" variants={revealUp}>
              <motion.button
                type="button"
                onClick={() => setStep(1)}
                className={`inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 px-6 py-3 text-label-md font-bold text-on-surface-variant transition-all hover:bg-surface-container-highest ${
                  step === 1 ? 'invisible' : ''
                }`}
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </motion.button>
              {step === 1 ? (
                <motion.button
                  type="button"
                  onClick={() => setStep(2)}
                  className="gold-gradient inline-flex items-center gap-2 rounded-lg px-8 py-3 text-label-md font-extrabold text-on-primary"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <motion.button 
                  type="submit" 
                  className="gold-gradient inline-flex items-center gap-2 rounded-lg px-8 py-3 text-label-md font-extrabold text-on-primary"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue to Login
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}
            </motion.div>
          </form>
        </motion.div>
      </section>
    </main>
  );
};

const RegistrationInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <label className="grid gap-2">
    <span className="text-label-md font-bold text-on-surface-variant">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-md border border-line-strong bg-white px-4 py-3 text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </label>
);

export default RegistrationPage;

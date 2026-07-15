import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Lock, Mail, Phone, Shield, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService } from '../../services/authService';
import { getDefaultRouteForRole } from '../../utils/permissions';
import heroImage from '../../assets/hero.png';

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

type AuthMode = 'login' | 'signup' | 'verify';
const DEFAULT_SIGNUP_ROLE = 'spectator';

const AuthPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const state = location.state as { mode?: 'login' | 'signup'; email?: string } | null;
    const mode = state?.mode;

    if (mode) {
      const timeoutId = window.setTimeout(() => {
        setActiveTab(mode);
        if (state?.email) {
          setEmail(state.email);
        }
        setErrorMessage('');
        setSuccessMessage('');
        setOtp('');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [location.key, location.state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (activeTab === 'login') {
        const loginResult = await authService.login({
          usernameOrEmail: email,
          password,
        });
        const profile = loginResult.userProfile ?? await authService.getCurrentUser();
        navigate(getDefaultRouteForRole(profile.roleType), { replace: true });
        return;
      }

      if (activeTab === 'verify') {
        const verifiedEmail = verificationEmail || email;
        await authService.verifyOtp({
          email: verifiedEmail,
          otp,
        });
        navigate('/registration', {
          replace: true,
          state: {
            email: verifiedEmail,
            fullName,
            phone,
          },
        });
        setOtp('');
        return;
      }

      // Validate password and confirm password match
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }

      const normalizedEmail = email.trim();
      setEmail(normalizedEmail);
      setVerificationEmail(normalizedEmail);

      await authService.register({
        username,
        email: normalizedEmail,
        password,
        fullName,
        phone,
        roleType: DEFAULT_SIGNUP_ROLE,
      });

      setSuccessMessage('Account created. Enter the verification code sent to your email.');
      setActiveTab('verify');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Authentication request failed.');
      setErrorMessage(
        message === 'Internal server error'
          ? 'Login failed because the backend returned an internal server error. Please check the backend log for the real exception.'
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authService.resendOtp({ email: verificationEmail || email });
      setSuccessMessage('A new verification code has been sent to your email.');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Could not resend verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (mode: 'login' | 'signup') => {
    setActiveTab(mode);
    setErrorMessage('');
    setSuccessMessage('');
    setOtp('');
    setConfirmPassword('');
  };

  return (
    <div className="racing-grid grid min-h-screen bg-canvas text-on-surface lg:grid-cols-2">
      <div className="auth-visual relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-slate-950/55" />

        <motion.div 
          className="relative z-10"
          initial="hidden"
          animate="visible"
          variants={revealContainer}
        >
          <motion.div variants={revealUp} transition={{ duration: 0.55 }}>
            <Link to="/" className="font-display mb-16 block text-2xl font-extrabold tracking-tight text-primary">
              HTMS
            </Link>
          </motion.div>
          <motion.p 
            variants={revealUp} 
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mb-3 text-label-md font-bold uppercase tracking-[0.18em] text-secondary"
          >
            Premium Management
          </motion.p>
          <motion.h1 
            variants={revealUp} 
            transition={{ duration: 0.65, delay: 0.15 }}
            className="font-display mb-6 max-w-md text-headline-xl font-extrabold leading-tight text-on-surface"
          >
            Tournament System Access
          </motion.h1>
          <motion.p 
            variants={revealUp} 
            transition={{ duration: 0.65, delay: 0.2 }}
            className="max-w-sm text-body-lg text-on-surface-variant"
          >
            High-stakes horse racing management with verified roles, race operations, and real-time tournament data.
          </motion.p>
          <motion.div 
            variants={revealUp} 
            transition={{ duration: 0.65, delay: 0.25 }}
            className="mt-8 grid max-w-sm grid-cols-2 gap-4"
          >
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="glass-panel rounded-xl p-4"
            >
              <p className="font-display text-headline-md text-primary">24/7</p>
              <p className="text-label-md text-on-surface-variant">Race Monitoring</p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="glass-panel rounded-xl p-4"
            >
              <p className="font-display text-headline-md text-primary">1.2ms</p>
              <p className="text-label-md text-on-surface-variant">Data Latency</p>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4 }}
        >
          <p className="mb-6 text-label-sm uppercase tracking-widest text-on-surface-variant">Trusted circuits</p>
          <div className="flex items-center gap-8 text-on-surface-variant/70">
            <span className="font-bold text-xl">ASCOT</span>
            <span className="font-bold text-xl">CHURCHILL</span>
            <span className="font-bold text-xl">MEYDAN</span>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={heroImage}
            alt="Racing background"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 md:p-12">
        <motion.div 
          className="relative w-full max-w-md overflow-hidden rounded-lg border border-line bg-white p-7 shadow-xl shadow-slate-200/70 md:p-10"
          initial={{ opacity: 0, x: 42, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 18 }}
        >
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <motion.div 
            className="mb-10"
            initial="hidden"
            animate="visible"
            variants={revealContainer}
          >
            <motion.h2 
              variants={revealUp}
              transition={{ duration: 0.55 }}
              className="font-display mb-2 text-headline-lg font-extrabold text-on-surface"
            >
              {activeTab === 'login' ? 'Welcome Back' : activeTab === 'signup' ? 'Create Account' : 'Verify Account'}
            </motion.h2>
            <motion.p 
              variants={revealUp}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-body-sm text-on-surface-variant"
            >
              {activeTab === 'login'
                ? 'Sign in to your racing dashboard'
                : activeTab === 'signup'
                  ? 'Create your professional racing account'
                  : 'Enter the code sent to your email address'}
            </motion.p>
          </motion.div>

          <motion.div 
            className="mb-8 flex border-b border-outline-variant/40"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          >
            <motion.button
              type="button"
              onClick={() => switchTab('login')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-6 pb-4 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Log In
            </motion.button>
            <motion.button
              type="button"
              onClick={() => switchTab('signup')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`px-6 pb-4 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Create Account
            </motion.button>
          </motion.div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-body-sm font-semibold text-error"
              >
                {errorMessage}
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 rounded-lg border border-secondary/40 bg-secondary-container/25 px-4 py-3 text-body-sm font-semibold text-secondary"
              >
                {successMessage}
              </motion.div>
            )}

            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-6 transition-all duration-300"
              initial="hidden"
              animate="visible"
              variants={revealContainer}
            >
              {activeTab === 'verify' ? (
                <>
                  <motion.div variants={revealUp} transition={{ duration: 0.5 }}>
                    <AuthField label="Email Address" icon={<Mail className={iconClassName} />}>
                      <input
                        type="email"
                        value={verificationEmail || email}
                        onChange={(event) => {
                          setVerificationEmail(event.target.value);
                          setEmail(event.target.value);
                        }}
                        placeholder="name@company.com"
                        required
                        className={inputClassName}
                      />
                    </AuthField>
                  </motion.div>

                  <motion.div variants={revealUp} transition={{ duration: 0.5, delay: 0.08 }}>
                    <AuthField label="Verification Code" icon={<Shield className={iconClassName} />}>
                      <input
                        type="text"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="Enter OTP code"
                        required
                        className={inputClassName}
                      />
                    </AuthField>
                  </motion.div>

                  <motion.button
                    variants={revealUp}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmitting}
                    className={primaryButtonClassName}
                  >
                    {isSubmitting ? 'Please wait...' : 'Verify Account'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    variants={revealUp}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    type="button"
                    onClick={handleResendOtp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmitting || !(verificationEmail || email)}
                    className="w-full rounded-xl border border-outline-variant/60 py-3 font-bold text-on-surface transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend verification code
                  </motion.button>
                </>
              ) : (
                <>
                  {activeTab === 'signup' && (
                    <>
                      <motion.div variants={revealUp} transition={{ duration: 0.5 }}>
                        <AuthField label="Full Name" icon={<User className={iconClassName} />}>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            placeholder="Enter your full name"
                            required
                            className={inputClassName}
                          />
                        </AuthField>
                      </motion.div>

                      <motion.div variants={revealUp} transition={{ duration: 0.5, delay: 0.08 }}>
                        <AuthField label="Username" icon={<User className={iconClassName} />}>
                          <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="Choose a username"
                            minLength={3}
                            required
                            className={inputClassName}
                          />
                        </AuthField>
                      </motion.div>
                    </>
                  )}

                  <motion.div variants={revealUp} transition={{ duration: 0.5, delay: activeTab === 'signup' ? 0.15 : 0 }}>
                    <AuthField label="Email Address" icon={<Mail className={iconClassName} />}>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@company.com"
                        required
                        className={inputClassName}
                      />
                    </AuthField>
                  </motion.div>

                  {activeTab === 'signup' && (
                    <motion.div variants={revealUp} transition={{ duration: 0.5, delay: 0.2 }}>
                      <AuthField label="Phone Number" icon={<Phone className={iconClassName} />}>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="0900000000"
                          required
                          className={inputClassName}
                        />
                      </AuthField>
                    </motion.div>
                  )}

                  <motion.div variants={revealUp} transition={{ duration: 0.5, delay: activeTab === 'signup' ? 0.25 : 0.08 }}>
                    <AuthField label="Password" icon={<Lock className={iconClassName} />}>
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        minLength={6}
                        required
                        className={inputClassName}
                      />
                    </AuthField>
                  </motion.div>

                  {activeTab === 'signup' && (
                    <motion.div variants={revealUp} transition={{ duration: 0.5, delay: 0.3 }}>
                      <AuthField label="Confirm Password" icon={<Lock className={iconClassName} />}>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Confirm Password"
                          minLength={6}
                          required
                          className={inputClassName}
                        />
                      </AuthField>
                    </motion.div>
                  )}

                  <motion.button
                    variants={revealUp}
                    transition={{ duration: 0.5, delay: activeTab === 'signup' ? 0.3 : 0.15 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={isSubmitting}
                    className={primaryButtonClassName}
                  >
                    {isSubmitting ? 'Please wait...' : activeTab === 'login' ? 'Secure Access' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </>
              )}
            </motion.form>
          </motion.div>


        </motion.div>
      </div>
    </div>
  );
};

const iconClassName = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70';
const inputClassName =
  'h-11 w-full rounded-md border border-line-strong bg-white py-3 pl-10 pr-4 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const primaryButtonClassName =
  'gold-gradient flex h-11 w-full items-center justify-center gap-2 rounded-md font-extrabold text-on-primary shadow-sm shadow-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-70';

const AuthField = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) => (
  <label className="space-y-2 block">
    <span className="text-label-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
    <div className="relative">
      {icon}
      {children}
    </div>
  </label>
);

export default AuthPage;

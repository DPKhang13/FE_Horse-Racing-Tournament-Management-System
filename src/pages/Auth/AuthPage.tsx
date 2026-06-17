import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Lock, Mail, Phone, Shield, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { authService, type RegisterRequest } from '../../services/authService';
import { getDefaultRouteForRole } from '../../utils/permissions';

type SignupRole = RegisterRequest['roleType'];
type AuthMode = 'login' | 'signup' | 'verify';

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
  const [otp, setOtp] = useState('');
  const [roleType, setRoleType] = useState<SignupRole>('spectator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const mode = (location.state as { mode?: 'login' | 'signup' })?.mode;

    if (mode) {
      const timeoutId = window.setTimeout(() => {
        setActiveTab(mode);
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
        await authService.verifyOtp({
          email: verificationEmail || email,
          otp,
        });
        setSuccessMessage('Email verified. Please sign in with your credentials.');
        setActiveTab('login');
        setOtp('');
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
        roleType,
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
  };

  return (
    <div className="racing-grid flex min-h-screen bg-surface text-on-surface">
      <div className="relative hidden overflow-hidden border-r border-outline-variant/30 bg-surface-container-low p-16 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,202,80,0.14),transparent_34rem)]" />

        <div className="relative z-10">
          <Link to="/" className="font-display mb-16 block text-2xl font-extrabold tracking-tight text-primary">
            HTMS
          </Link>
          <p className="mb-3 text-label-md font-bold uppercase tracking-[0.18em] text-secondary">Premium Management</p>
          <h1 className="font-display mb-6 max-w-md text-headline-xl font-extrabold leading-tight text-on-surface">
            Tournament System Access
          </h1>
          <p className="max-w-sm text-body-lg text-on-surface-variant">
            High-stakes horse racing management with verified roles, race operations, and real-time tournament data.
          </p>
          <div className="mt-8 grid max-w-sm grid-cols-2 gap-4">
            <div className="glass-panel rounded-xl p-4">
              <p className="font-display text-headline-md text-primary">24/7</p>
              <p className="text-label-md text-on-surface-variant">Race Monitoring</p>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <p className="font-display text-headline-md text-primary">1.2ms</p>
              <p className="text-label-md text-on-surface-variant">Data Latency</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="mb-6 text-label-sm uppercase tracking-widest text-on-surface-variant">Trusted circuits</p>
          <div className="flex items-center gap-8 text-on-surface-variant/70">
            <span className="font-bold text-xl">ASCOT</span>
            <span className="font-bold text-xl">CHURCHILL</span>
            <span className="font-bold text-xl">MEYDAN</span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-full overflow-hidden opacity-25">
          <img
            src="https://images.unsplash.com/photo-1599408162165-8b753ca992aa?auto=format&fit=crop&q=80&w=1000"
            alt="Racing background"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-6 md:p-12 lg:w-1/2">
        <div className="glass-panel relative w-full max-w-md overflow-hidden rounded-2xl p-7 shadow-2xl md:p-10">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="mb-10">
            <h2 className="font-display mb-2 text-headline-lg font-extrabold text-on-surface">
              {activeTab === 'login' ? 'Welcome Back' : activeTab === 'signup' ? 'Create Account' : 'Verify Account'}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {activeTab === 'login'
                ? 'Sign in to your racing dashboard'
                : activeTab === 'signup'
                  ? 'Create your professional racing account'
                  : 'Enter the code sent to your email address'}
            </p>
          </div>

          <div className="mb-8 flex border-b border-outline-variant/40">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`px-6 pb-4 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`px-6 pb-4 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-error/40 bg-error-container/25 px-4 py-3 text-body-sm font-semibold text-error">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-lg border border-secondary/40 bg-secondary-container/25 px-4 py-3 text-body-sm font-semibold text-secondary">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            {activeTab === 'verify' ? (
              <>
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

                <button
                  disabled={isSubmitting}
                  className={primaryButtonClassName}
                >
                  {isSubmitting ? 'Please wait...' : 'Verify Account'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting || !(verificationEmail || email)}
                  className="w-full rounded-xl border border-outline-variant/60 py-3 font-bold text-on-surface transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend verification code
                </button>
              </>
            ) : (
              <>
                {activeTab === 'signup' && (
                  <>
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
                  </>
                )}

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

                {activeTab === 'signup' && (
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
                )}

                <AuthField label="Security Password" icon={<Lock className={iconClassName} />}>
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

                {activeTab === 'signup' && (
                  <label className="space-y-2 block">
                    <span className="text-label-sm text-outline uppercase tracking-wider font-bold">Account Type</span>
                    <select
                      value={roleType}
                      onChange={(event) => setRoleType(event.target.value as SignupRole)}
                      className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface transition-all focus:border-primary focus:outline-none"
                    >
                      <option value="spectator">Spectator</option>
                      <option value="horse_owner">Horse Owner</option>
                      <option value="jockey">Jockey</option>
                      <option value="race_referee">Race Referee</option>
                    </select>
                  </label>
                )}

                <button disabled={isSubmitting} className={primaryButtonClassName}>
                  {isSubmitting ? 'Please wait...' : activeTab === 'login' ? 'Secure Access' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </form>

          <div className="mt-12 flex flex-col items-center gap-6 border-t border-outline-variant/40 pt-8">
            <div className="flex items-center gap-2 text-secondary text-label-sm font-bold">
              <Shield className="w-4 h-4" />
              <span className="uppercase tracking-widest">256-bit AES Encrypted Data</span>
            </div>
            <p className="text-center text-[10px] leading-relaxed text-outline">
              By accessing this terminal, you agree to our{' '}
              <a href="#" className="underline">Professional Terms of Service</a> and{' '}
              <a href="#" className="underline">Institutional Privacy Protocol</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const iconClassName = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70';
const inputClassName =
  'w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg py-3 pl-10 pr-4 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-all';
const primaryButtonClassName =
  'gold-gradient w-full py-4 rounded-xl font-extrabold text-on-primary flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed';

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

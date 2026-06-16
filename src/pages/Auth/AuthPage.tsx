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
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-container p-16 flex-col justify-between">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="text-2xl font-bold text-white tracking-tight mb-16 block">
            Horace
          </Link>
          <h1 className="text-white text-headline-xl font-bold max-w-md leading-tight mb-6">
            Precision Intelligence for the Sporting Elite
          </h1>
          <p className="text-on-primary-container text-body-lg max-w-sm">
            Access institutional-grade racing data and advanced performance analytics in one secure environment.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-label-sm uppercase tracking-widest mb-6">
            Trusted by industry leaders
          </p>
          <div className="flex items-center gap-8 opacity-50 grayscale brightness-200">
            <span className="font-bold text-xl">ASCOT</span>
            <span className="font-bold text-xl">CHURCHILL</span>
            <span className="font-bold text-xl">MEYDAN</span>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-full h-1/2 overflow-hidden opacity-30 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1599408162165-8b753ca992aa?auto=format&fit=crop&q=80&w=1000"
            alt="Racing background"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-headline-lg font-bold text-primary mb-2">
              {activeTab === 'login' ? 'Welcome Back' : activeTab === 'signup' ? 'Join the Elite' : 'Verify Account'}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {activeTab === 'login'
                ? 'Sign in to your racing dashboard'
                : activeTab === 'signup'
                  ? 'Create your professional racing account'
                  : 'Enter the code sent to your email address'}
            </p>
          </div>

          <div className="flex border-b border-outline-variant mb-8">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`pb-4 px-6 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`pb-4 px-6 text-body-sm font-bold transition-all border-b-2 ${
                activeTab === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-outline hover:text-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-md border border-secondary/30 bg-secondary-container/30 px-4 py-3 text-body-sm font-semibold text-secondary">
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
                  className="w-full border border-outline-variant text-primary py-3 rounded-md font-bold hover:bg-surface-container transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                      className="w-full bg-surface-container-low border border-outline-variant rounded-md py-3 px-4 text-body-sm focus:outline-none focus:border-primary transition-all"
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

          <div className="mt-12 pt-8 border-t border-outline-variant flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 text-secondary text-label-sm font-bold">
              <Shield className="w-4 h-4" />
              <span className="uppercase tracking-widest">256-bit AES Encrypted Data</span>
            </div>
            <p className="text-[10px] text-outline text-center leading-relaxed">
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

const iconClassName = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline';
const inputClassName =
  'w-full bg-surface-container-low border border-outline-variant rounded-md py-3 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-all';
const primaryButtonClassName =
  'w-full bg-secondary text-white py-4 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg shadow-secondary/20 disabled:opacity-70 disabled:cursor-not-allowed';

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
    <span className="text-label-sm text-outline uppercase tracking-wider font-bold">{label}</span>
    <div className="relative">
      {icon}
      {children}
    </div>
  </label>
);

export default AuthPage;

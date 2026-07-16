import { useEffect, useState } from 'react';
import { 
  User, 
  Wallet, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings,
  LogOut,
  CreditCard,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../../services/apiClient';
import { authService } from '../../services/authService';
import type { UserProfile } from '../../types/user';
import { PageHeader, PageShell } from '../../components/ui';

const guestUser: UserProfile = {
  id: 'guest',
  fullName: 'Guest',
  email: '',
  role: 'Guest',
  joinedDate: new Date().toISOString(),
  status: 'Active',
};

const UserProfilePage = () => {
  const [user, setUser] = useState<UserProfile>(guestUser);
  const [isLoading, setIsLoading] = useState(Boolean(getAccessToken()));
  const [errorMessage, setErrorMessage] = useState('');
  const isLoggedIn = user.role !== 'Guest';

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!getAccessToken()) {
        setUser(guestUser);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const profile = await authService.getCurrentUser();

        if (isMounted) {
          setUser(profile);
        }
      } catch (error) {
        if (isMounted) {
          setUser(guestUser);
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load profile.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setUser(guestUser);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Personal information, wallet, and account activity."
        icon={User}
      />
        
        {errorMessage && (
          <div className="mb-8 rounded-md border border-error/30 bg-error-container/20 px-4 py-3 text-body-sm font-semibold text-error">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="mb-8 rounded-md border border-outline-variant bg-white px-4 py-3 text-body-sm font-semibold text-on-surface-variant">
            Loading profile...
          </div>
        )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          
          {/* Left Column: Profile Card */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
              <div className="relative h-24 bg-panel">
                <div className="absolute -bottom-12 left-8">
                  <div className="w-24 h-24 rounded-xl border-4 border-white overflow-hidden bg-surface-container-highest">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16 pb-8 px-8">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-headline-md font-bold text-primary">{user.fullName}</h1>
                  {isLoggedIn && <ShieldCheck className="w-5 h-5 text-secondary" />}
                </div>
                <p className="text-body-sm text-on-surface-variant mb-6">
                  {isLoggedIn ? `Member since ${new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Welcome to Horace'}
                </p>

                {isLoggedIn ? (
                  <div className="space-y-4 pt-4 border-t border-outline-variant">
                    <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.address && (
                      <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
                        <MapPin className="w-4 h-4" />
                        <span>{user.address}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-outline-variant">
                    <p className="text-body-sm text-on-surface-variant mb-6 leading-relaxed">
                      Sign up for a professional account to access institutional-grade racing data, 
                      manage your portfolio, and track performance analytics.
                    </p>
                    <Link 
                      to="/login" 
                      state={{ mode: 'signup' }}
                      className="w-full bg-primary text-on-primary py-3 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all mb-3"
                    >
                      Sign Up for Free
                      <Plus className="w-4 h-4" />
                    </Link>
                    <Link 
                      to="/login" 
                      state={{ mode: 'login' }}
                      className="w-full border border-outline text-primary py-3 rounded-md font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-all"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {isLoggedIn && (
              <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                <h3 className="text-label-sm text-outline uppercase tracking-wider font-bold mb-4">Account Settings</h3>
                <nav className="space-y-1">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-surface-container transition-colors text-body-sm font-semibold text-primary">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-surface-container transition-colors text-body-sm font-semibold text-primary">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment Methods</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-3 rounded-md hover:bg-error-container/10 transition-colors text-body-sm font-semibold text-error"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </div>
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Right Column: Wallet & Details */}
          <div className="space-y-4">
            
            {/* Wallet Section */}
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-5 h-5 text-secondary" />
                    <h2 className="text-headline-sm font-bold text-primary">Digital Wallet</h2>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">Manage your racing funds and transaction history</p>
                </div>
                {isLoggedIn && (
                  <div className="flex gap-3">
                    <button className="bg-secondary text-on-secondary px-6 py-2 rounded-md text-label-sm font-bold hover:bg-opacity-90 transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Deposit
                    </button>
                    <button className="border border-outline-variant text-primary px-6 py-2 rounded-md text-label-sm font-bold hover:bg-surface-container transition-all">
                      Withdraw
                    </button>
                  </div>
                )}
              </div>

              {isLoggedIn ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
                    <p className="text-label-sm text-outline uppercase tracking-wider font-bold mb-2">Available Balance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-headline-lg font-bold text-primary">
                        ${user.wallet?.balance.toLocaleString()}
                      </span>
                      <span className="text-body-md text-outline font-medium">{user.wallet?.currency}</span>
                    </div>
                  </div>
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
                    <p className="text-label-sm text-outline uppercase tracking-wider font-bold mb-2">Total Predictions</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-headline-lg font-bold text-primary">128</span>
                      <span className="text-body-md text-secondary font-bold">+12%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm border border-outline-variant">
                    <Wallet className="w-8 h-8 text-outline" />
                  </div>
                  <h3 className="text-title-medium font-bold text-primary mb-2">Wallet Access Restricted</h3>
                  <p className="text-body-sm text-on-surface-variant max-w-xs mb-6">
                    Sign in to view your balance, make deposits, and manage your racing transactions.
                  </p>
                  <Link 
                    to="/login" 
                    className="text-secondary text-body-sm font-bold hover:underline"
                  >
                    Login to access wallet
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Activity / Benefits */}
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-title-large font-bold text-primary mb-6">
                {isLoggedIn ? 'Recent Activity' : 'Why join Horace?'}
              </h2>
              
              {isLoggedIn ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between pb-6 border-b border-outline-variant last:border-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 2 ? 'bg-error-container/10 text-error' : 'bg-secondary-container/10 text-secondary'}`}>
                          {i === 2 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-body-sm font-bold text-primary">
                            {i === 1 ? 'Deposit via Bank Transfer' : i === 2 ? 'Prediction: Kentucky Derby' : 'Reward: Triple Crown Bonus'}
                          </p>
                          <p className="text-label-sm text-outline">
                            {i === 1 ? 'June 08, 2026 • 10:45 AM' : i === 2 ? 'June 07, 2026 • 04:20 PM' : 'June 05, 2026 • 09:00 AM'}
                          </p>
                        </div>
                      </div>
                      <p className={`text-body-sm font-bold ${i === 2 ? 'text-error' : 'text-secondary'}`}>
                        {i === 2 ? '- $500.00' : '+ $2,500.00'}
                      </p>
                    </div>
                  ))}
                  <button className="w-full text-center text-label-sm font-bold text-secondary hover:underline pt-4">
                    View All Activity
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-primary-container/5 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-body-md font-bold text-primary mb-1">Race Scheduling</h4>
                      <p className="text-body-sm text-on-surface-variant">Stay updated with real-time tournament schedules and events.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-primary-container/5 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-body-md font-bold text-primary mb-1">Secure Transactions</h4>
                      <p className="text-body-sm text-on-surface-variant">Institutional-grade security for all your financial operations.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-primary-container/5 flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-body-md font-bold text-primary mb-1">Live Tracking</h4>
                      <p className="text-body-sm text-on-surface-variant">Track horse performance and race results as they happen.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-primary-container/5 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-body-md font-bold text-primary mb-1">Advanced Analytics</h4>
                      <p className="text-body-sm text-on-surface-variant">Deep insights and predictive modeling for better outcomes.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </PageShell>
  );
};

export default UserProfilePage;

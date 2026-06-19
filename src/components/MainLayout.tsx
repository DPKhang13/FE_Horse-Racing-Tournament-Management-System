import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, LogOut, Shield, Trophy, User } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/apiClient';
import { authService } from '../services/authService';
import { canAccessRole, getDefaultRouteForRole, navigationItems } from '../utils/permissions';
import type { UserProfile } from '../types/user';

const MainLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());

  useEffect(() => {
    const syncAuthState = () => {
      setIsAuthenticated(Boolean(getAccessToken()));
      setProfile(authService.getStoredUserProfile());
    };

    window.addEventListener('auth-changed', syncAuthState);
    window.addEventListener('storage', syncAuthState);

    if (getAccessToken() && !authService.getStoredUserProfile()) {
      void authService.getCurrentUser().then(setProfile).catch(() => setProfile(undefined));
    }

    return () => {
      window.removeEventListener('auth-changed', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const visibleNavigationItems = useMemo(
    () =>
      navigationItems.filter((item) => (
        item.to !== '/' &&
        item.requiresAuth &&
        isAuthenticated &&
        canAccessRole(profile?.roleType, item.allowedRoles)
      )),
    [isAuthenticated, profile?.roleType],
  );

  const currentPageLabel = useMemo(() => {
    const match = visibleNavigationItems.find((item) => (
      location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`))
    ));

    if (match) {
      return match.label;
    }

    if (location.pathname === '/profile') {
      return 'Profile';
    }

    return 'Dashboard';
  }, [location.pathname, visibleNavigationItems]);

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setProfile(undefined);
    navigate('/login', { replace: true, state: { mode: 'login' } });
  };

  if (isLanding) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <LandingTopBar isAuthenticated={isAuthenticated} profile={profile} />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="border-b border-outline-variant/30 bg-surface-container-low p-4 shadow-lg shadow-black/10 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <Link to="/" className="mb-6 flex items-center gap-3 px-2">
          <span className="gold-gradient flex h-10 w-10 items-center justify-center rounded-lg shadow-lg shadow-primary/10">
            <Trophy className="h-5 w-5 text-on-primary" />
          </span>
          <span>
            <span className="font-display block text-xl font-extrabold text-primary">HTMS</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Pro Manager
            </span>
          </span>
        </Link>

        <div className="flex flex-col lg:min-h-[calc(100vh-112px)]">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {visibleNavigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-all lg:w-full ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-primary'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 flex shrink-0 gap-2 border-t border-outline-variant/30 pt-4 lg:mt-auto lg:block lg:space-y-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant transition-all hover:bg-surface-container-highest hover:text-primary lg:w-full"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-on-surface-variant transition-all hover:bg-error-container/20 hover:text-error lg:w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface-container-low/90 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-xl font-extrabold text-primary">{currentPageLabel}</h1>

            <div className="flex items-center gap-3">
              <Link to="/notifications" className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {isAuthenticated && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />}
              </Link>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

const landingNavItems = ['Home', 'Schedules', 'Live Odds', 'Rankings'];

const LandingTopBar = ({
  isAuthenticated,
  profile,
}: {
  isAuthenticated: boolean;
  profile?: UserProfile;
}) => {
  const dashboardRoute = profile?.roleType === 'spectator'
    ? '/spectator-dashboard'
    : getDefaultRouteForRole(profile?.roleType);

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/40 bg-surface-container-low/80 px-4 py-4 shadow-lg shadow-black/10 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="gold-gradient flex h-9 w-9 items-center justify-center rounded-lg shadow-lg shadow-primary/10">
            <Trophy className="h-5 w-5 text-on-primary" />
          </span>
          <span className="font-display text-xl font-extrabold text-primary">HTMS</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {landingNavItems.map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:text-primary"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden rounded-full border border-secondary/40 bg-secondary-container/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-secondary sm:inline-flex">
                Logged in
              </span>
              <Link
                to={dashboardRoute}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                aria-label="Open dashboard"
              >
                <User className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ mode: 'login' }}
                className="rounded-lg border border-outline-variant/50 px-5 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                Login
              </Link>
              <Link
                to="/login"
                state={{ mode: 'signup' }}
                className="gold-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-extrabold text-on-primary transition-all"
              >
                <Shield className="h-4 w-4" />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default MainLayout;

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, LogIn, LogOut, Trophy, User } from 'lucide-react';
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

const landingNavItems = [
  { label: 'Tournaments', to: '#tournaments' },
  { label: 'Jockey', to: '#jockey' },
  { label: 'Horse', to: '#horse' },
];

const landingSectionIds = ['#home', ...landingNavItems.map((item) => item.to)];
const landingSectionThresholds = [0.45, 0.6, 0.75, 0.9];

const scrollToLandingSection = (selector: string) => {
  const section = document.querySelector(selector) as HTMLElement | null;
  if (!section) {
    return;
  }

  const headerOffset = 110;
  const top = window.scrollY + section.getBoundingClientRect().top - headerOffset;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  });
  window.history.replaceState(null, '', selector);
};

const LandingTopBar = ({
  isAuthenticated,
  profile,
}: {
  isAuthenticated: boolean;
  profile?: UserProfile;
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('#home');
  const dashboardRoute = profile?.roleType === 'spectator'
    ? '/spectator-dashboard'
    : getDefaultRouteForRole(profile?.roleType);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const sections = landingSectionIds
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const visibleRatios = new Map<string, number>();
    const updateActiveSection = () => {
      const bestMatch = Array.from(visibleRatios.entries())
        .sort((left, right) => right[1] - left[1])[0];

      if (bestMatch && bestMatch[1] >= 0.45) {
        setActiveSection(bestMatch[0]);
        return;
      }

      if (window.scrollY < 120) {
        setActiveSection('#home');
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = `#${entry.target.id}`;
          if (entry.isIntersecting) {
            visibleRatios.set(key, entry.intersectionRatio);
          } else {
            visibleRatios.delete(key);
          }
        });

        updateActiveSection();
      },
      {
        threshold: landingSectionThresholds,
        rootMargin: '-96px 0px -12% 0px',
      },
    );

    sections.forEach((section) => observer.observe(section));
    updateActiveSection();

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="fixed left-0 top-0 z-[100] flex w-full pointer-events-none justify-center transition-all duration-400 ease-in-out">
      <header
        className={`
          pointer-events-auto flex w-full items-center justify-between transition-all duration-400 ease-in-out
          ${isScrolled
            ? 'mt-4 h-14 max-w-[95%] rounded-full border border-outline-variant/40 bg-surface-container-low/75 px-5 shadow-2xl shadow-black/30 backdrop-blur-2xl md:px-7 lg:max-w-5xl'
            : 'mt-0 h-16 max-w-full rounded-[0px] border-b border-outline-variant/30 bg-surface-container-low/80 px-8 shadow-sm backdrop-blur-md md:px-32'
          }
        `}
      >
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setActiveSection('#home');
            scrollToLandingSection('#home');
          }}
          className={`font-display font-bold text-primary transition-all ${isScrolled ? 'text-lg' : 'text-xl'}`}
        >
          HTMS
        </a>

        <nav className={`hidden items-center transition-all md:flex ${isScrolled ? 'space-x-5' : 'space-x-8'}`}>
          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                navigate(dashboardRoute);
              } else {
                navigate('/login', { state: { mode: 'login' } });
              }
            }}
            className="text-label-md font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Dashboard
          </button>
          {landingNavItems.map((item) => (
            <a
              key={item.label}
              href={item.to}
              onClick={(event) => {
                event.preventDefault();
                setActiveSection(item.to);
                scrollToLandingSection(item.to);
              }}
              className={`text-label-md font-semibold transition-colors ${
                item.to === activeSection
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Bell className="h-5 w-5 text-on-surface-variant" />
              <Link
                to={dashboardRoute}
                className="gold-gradient rounded-lg px-6 py-2 text-label-md font-bold text-on-primary transition-transform active:scale-95"
                aria-label="Open dashboard"
              >
                Join the Race
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ mode: 'login' }}
                className={`inline-flex items-center justify-center rounded-lg font-bold text-on-surface-variant transition-all hover:bg-surface-container-highest/50 hover:text-primary ${
                  isScrolled ? 'h-10 w-10 rounded-full p-0' : 'px-5 py-2 text-sm'
                }`}
                aria-label="Login"
                title="Login"
              >
                {isScrolled ? <LogIn className="h-5 w-5" /> : 'Login'}
              </Link>
              <Link
                to="/login"
                state={{ mode: 'signup' }}
                className={`gold-gradient rounded-lg text-label-md font-bold text-on-primary transition-all active:scale-95 ${
                  isScrolled ? 'px-4 py-2' : 'px-6 py-2'
                }`}
              >
                Join the Race
              </Link>
            </>
          )}
        </div>
      </header>
    </div>
  );
};

export default MainLayout;

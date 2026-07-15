import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Flag,
  Home,
  LogIn,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/apiClient';
import { authService } from '../services/authService';
import { canAccessRole, getDefaultRouteForRole, navigationItems } from '../utils/permissions';
import type { UserProfile } from '../types/user';
import { AppLogo, Badge, IconButton } from './ui';
import { cn } from '../utils/cn';

const routeIcons: Array<[string, LucideIcon]> = [
  ['/owner-dashboard', Home],
  ['/spectator-dashboard', Home],
  ['/admin-ops', ShieldCheck],
  ['/tournaments', Trophy],
  ['/admin/schedule', CalendarDays],
  ['/schedule', CalendarDays],
  ['/admin/races', Flag],
  ['/race-control', Target],
  ['/registrations', ClipboardList],
  ['/jockey-assignments', Users],
  ['/horses', Trophy],
  ['/results', Flag],
  ['/prediction', Target],
  ['/tracking', ClipboardList],
  ['/wallet', Wallet],
  ['/admin/users', Users],
  ['/admin', Settings],
];

const getRouteIcon = (path: string) => routeIcons.find(([prefix]) => path.startsWith(prefix))?.[1] ?? ChevronRight;

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  horse_owner: 'Horse Owner',
  jockey: 'Jockey',
  spectator: 'Spectator',
  race_referee: 'Race Referee',
};

const MainLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

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
    () => navigationItems.filter((item) => (
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

    if (match) return match.label;
    if (location.pathname === '/profile') return 'Profile';
    if (location.pathname === '/notifications') return 'Notifications';
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
      <div className="min-h-screen bg-canvas text-ink">
        <LandingTopBar isAuthenticated={isAuthenticated} profile={profile} />
        {children}
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-panel text-white">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/" aria-label="HTMS home"><AppLogo dark /></Link>
        <IconButton
          icon={X}
          label="Close navigation"
          onClick={() => setIsMobileNavigationOpen(false)}
          className="border-transparent bg-transparent text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
        />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase text-slate-500">Workspace</p>
        {visibleNavigationItems.map((item) => {
          const Icon = getRouteIcon(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileNavigationOpen(false)}
              className={({ isActive }) => cn(
                'group relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500" /> : null}
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          to="/profile"
          onClick={() => setIsMobileNavigationOpen(false)}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-white">{profile?.fullName || 'Profile'}</span>
            <span className="block truncate text-[11px] text-slate-400">{roleLabels[profile?.roleType ?? ''] ?? profile?.roleType ?? 'HTMS member'}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 h-full w-full bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setIsMobileNavigationOpen(false)}
          />
          <aside className="animate-fade absolute inset-y-0 left-0 w-72 max-w-[84vw] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <IconButton
            icon={Menu}
            label="Open navigation"
            onClick={() => setIsMobileNavigationOpen(true)}
            className="lg:hidden"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-ink">HTMS</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <Badge tone="emerald">{roleLabels[profile?.roleType ?? ''] ?? profile?.roleType ?? 'Member'}</Badge>
              <ChevronRight className="hidden h-3.5 w-3.5 text-slate-300 sm:block" />
              <span className="hidden truncate font-medium text-slate-500 sm:block">{currentPageLabel}</span>
            </div>
          </div>
          <Link
            to="/notifications"
            className="relative grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {isAuthenticated ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
          </Link>
          <Link
            to="/profile"
            className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 transition-colors hover:bg-emerald-100"
            aria-label="Open profile"
            title="Profile"
          >
            <User className="h-[18px] w-[18px]" />
          </Link>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
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
  if (!section) return;

  const headerOffset = 92;
  const top = window.scrollY + section.getBoundingClientRect().top - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = landingSectionIds
      .map((selector) => document.querySelector(selector) as HTMLElement | null)
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const visibleRatios = new Map<string, number>();
    const updateActiveSection = () => {
      const bestMatch = Array.from(visibleRatios.entries()).sort((left, right) => right[1] - left[1])[0];
      if (bestMatch && bestMatch[1] >= 0.45) {
        setActiveSection(bestMatch[0]);
      } else if (window.scrollY < 120) {
        setActiveSection('#home');
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = `#${entry.target.id}`;
          if (entry.isIntersecting) visibleRatios.set(key, entry.intersectionRatio);
          else visibleRatios.delete(key);
        });
        updateActiveSection();
      },
      { threshold: landingSectionThresholds, rootMargin: '-84px 0px -12% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    updateActiveSection();
    return () => observer.disconnect();
  }, []);

  const openDashboard = () => {
    if (isAuthenticated) navigate(dashboardRoute);
    else navigate('/login', { state: { mode: 'login' } });
  };

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[100] flex w-full justify-center px-0 transition-all duration-300 sm:px-3">
      <header
        className={cn(
          'pointer-events-auto flex w-full items-center justify-between border transition-all duration-300',
          isScrolled
            ? 'mt-3 h-14 max-w-5xl rounded-lg border-line bg-white/95 px-3 shadow-lg shadow-slate-950/10 backdrop-blur-xl sm:px-5'
            : 'mt-0 h-16 max-w-full rounded-none border-x-0 border-t-0 border-white/15 bg-slate-950/10 px-4 backdrop-blur-md sm:px-8 lg:px-12',
        )}
      >
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            setActiveSection('#home');
            scrollToLandingSection('#home');
          }}
          className="shrink-0"
          aria-label="HTMS home"
        >
          <AppLogo dark={!isScrolled} compact={false} />
        </a>

        <nav className={cn('hidden items-center md:flex', isScrolled ? 'gap-5' : 'gap-8')}>
          <button
            type="button"
            onClick={openDashboard}
            className={cn('text-xs font-semibold transition-colors', isScrolled ? 'text-slate-600 hover:text-emerald-600' : 'text-white/90 hover:text-emerald-300')}
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
              className={cn(
                'text-xs font-semibold transition-colors',
                item.to === activeSection
                  ? 'text-emerald-500'
                  : isScrolled
                    ? 'text-slate-600 hover:text-emerald-600'
                    : 'text-white/90 hover:text-emerald-300',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className={cn('grid h-9 w-9 place-items-center rounded-md transition-colors', isScrolled ? 'text-slate-500 hover:bg-slate-100 hover:text-ink' : 'text-white/85 hover:bg-white/10 hover:text-white')}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/profile"
                className={cn('grid h-9 w-9 place-items-center rounded-full border transition-colors', isScrolled ? 'border-line-strong text-slate-600 hover:border-emerald-500 hover:text-emerald-600' : 'border-white/25 text-white hover:border-emerald-400 hover:text-emerald-300')}
                aria-label="Open profile"
                title="Profile"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ mode: 'login' }}
                className={cn(
                  'inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors sm:px-4',
                  isScrolled ? 'text-slate-600 hover:bg-slate-100 hover:text-ink' : 'text-white hover:bg-white/10',
                )}
                aria-label="Login"
                title="Login"
              >
                <LogIn className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Login</span>
              </Link>
              <Link
                to="/login"
                state={{ mode: 'signup' }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 sm:px-4"
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

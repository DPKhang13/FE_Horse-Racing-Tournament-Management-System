import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, BadgeDollarSign, Bell, CalendarDays, ChevronDown, CircleDollarSign, ClipboardList, Flag, Gauge, LogIn, LogOut, Medal, Send, ShieldCheck, Target, Trophy, User, UserRound, Users, WalletCards } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/apiClient';
import { authService } from '../services/authService';
import { canAccessRole, getDefaultRouteForRole, navigationItems, type NavigationItem } from '../utils/permissions';
import type { UserProfile, UserRoleType } from '../types/user';

const MainLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [profile, setProfile] = useState<UserProfile | undefined>(() => authService.getStoredUserProfile());
  const isRoleWorkspace = Boolean(isAuthenticated && profile?.roleType);
  const isAdminWorkspace = profile?.roleType === 'admin' && (
    location.pathname === '/admin-ops'
    || location.pathname.startsWith('/admin/')
    || location.pathname === '/tournaments'
    || location.pathname.startsWith('/tournaments/')
    || location.pathname === '/notifications'
    || location.pathname === '/profile'
  );
  const workspaceClassName = `${isRoleWorkspace ? 'role-workspace' : ''} ${isAdminWorkspace ? 'admin-workspace' : ''}`.trim();

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
    <div className={`min-h-screen bg-surface text-on-surface lg:grid lg:grid-cols-[256px_minmax(0,1fr)] ${workspaceClassName}`}>
      <motion.aside
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="border-b border-outline-variant/30 bg-surface-container-low p-4 shadow-lg shadow-black/10 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r"
      >
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
          {isRoleWorkspace && profile?.roleType ? (
            <RoleSidebarNavigation items={visibleNavigationItems} pathname={location.pathname} roleType={profile.roleType} />
          ) : (
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
          )}

          <div className="mt-4 flex shrink-0 gap-2 border-t border-outline-variant/30 pt-4 lg:mt-auto lg:block lg:space-y-2">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `role-sidebar-link group relative flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all duration-300 lg:w-full ${
                  isActive
                    ? 'border-primary/65 text-primary shadow-sm shadow-primary/10'
                    : 'border-transparent text-on-surface-variant hover:text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`role-sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
                    isActive
                      ? 'border-primary/50 text-primary shadow-[0_0_18px_rgba(242,202,80,0.16)]'
                      : 'border-outline-variant/30 text-outline group-hover:text-primary'
                  }`}>
                    <User className="h-4 w-4" />
                  </span>
                  Profile
                </>
              )}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="role-sidebar-link group flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant transition-all duration-300 hover:text-error lg:w-full"
            >
              <span className="role-sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant/30 text-outline transition-all duration-300 group-hover:border-error/35 group-hover:text-error">
                <LogOut className="h-4 w-4" />
              </span>
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      <main className="min-w-0">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-40 border-b border-outline-variant/40 bg-surface-container-low/90 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-xl md:px-8"
        >
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-xl font-extrabold text-primary">{currentPageLabel}</h1>

            <div className="flex items-center gap-3">
              <Link to="/notifications" className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {isAuthenticated && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />}
              </Link>
            </div>
          </div>
        </motion.header>

        {isRoleWorkspace ? (
          <motion.div
            key={location.pathname}
            className="admin-route-motion"
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        ) : children}
      </main>
    </div>
  );
};


type RoleNavigationGroup = {
  id: string;
  title: string;
  items: NavigationItem[];
};

const roleGroupOrder: Record<UserRoleType, string[]> = {
  admin: ['overview', 'competition', 'finance', 'registry', 'system'],
  horse_owner: ['overview', 'racing', 'stable', 'system'],
  jockey: ['overview', 'racing', 'system'],
  race_referee: ['overview', 'officiating', 'racing', 'system'],
  spectator: ['overview', 'wagering', 'racing', 'system'],
};

const roleGroupTitles: Record<UserRoleType, Record<string, string>> = {
  admin: {
    overview: 'Overview',
    competition: 'Competition',
    finance: 'Finance & Bets',
    registry: 'Registry',
    system: 'System',
  },
  horse_owner: {
    overview: 'Overview',
    racing: 'Racing',
    stable: 'Stable',
    system: 'System',
  },
  jockey: {
    overview: 'Overview',
    racing: 'Racing',
    system: 'System',
  },
  race_referee: {
    overview: 'Overview',
    officiating: 'Officiating',
    racing: 'Racing',
    system: 'System',
  },
  spectator: {
    overview: 'Overview',
    wagering: 'Wagering',
    racing: 'Racing',
    system: 'System',
  },
};

const getRoleGroupId = (roleType: UserRoleType, item: NavigationItem) => {
  if (item.to.includes('dashboard')) return 'overview';
  if (item.to === '/notifications') return 'system';

  if (roleType === 'admin') {
    if (item.to === '/tournaments' || item.to === '/admin/schedule' || item.to === '/admin/races' || item.to === '/admin/race-results') return 'competition';
    if (item.to === '/admin/prize-awards' || item.to === '/admin/bets' || item.to === '/admin/withdrawals') return 'finance';
    if (item.to === '/admin/users' || item.to === '/admin/horses' || item.to === '/admin/registrations' || item.to === '/admin/race-registrations') return 'registry';
    return 'system';
  }

  if (roleType === 'horse_owner') {
    if (item.to === '/horses') return 'stable';
    if (item.to === '/schedule' || item.to === '/registrations' || item.to === '/owner/invitations' || item.to === '/results') return 'racing';
    return 'system';
  }

  if (roleType === 'jockey') {
    if (item.to === '/jockey/schedule' || item.to === '/jockey/invitations' || item.to === '/results') return 'racing';
    return 'system';
  }

  if (roleType === 'race_referee') {
    if (item.to === '/race-control') return 'officiating';
    if (item.to === '/results') return 'racing';
    return 'system';
  }

  if (item.to === '/prediction' || item.to === '/wallet') return 'wagering';
  if (item.to === '/results' || item.to === '/tracking') return 'racing';
  return 'system';
};

const roleNavigationIcons: Record<string, ReactNode> = {
  '/admin-ops': <Gauge className="h-4 w-4" />,
  '/owner-dashboard': <Gauge className="h-4 w-4" />,
  '/jockey-dashboard': <Gauge className="h-4 w-4" />,
  '/referee-dashboard': <ShieldCheck className="h-4 w-4" />,
  '/spectator-dashboard': <Gauge className="h-4 w-4" />,
  '/tournaments': <Trophy className="h-4 w-4" />,
  '/admin/schedule': <CalendarDays className="h-4 w-4" />,
  '/admin/races': <Flag className="h-4 w-4" />,
  '/admin/race-results': <Medal className="h-4 w-4" />,
  '/admin/prize-awards': <CircleDollarSign className="h-4 w-4" />,
  '/admin/bets': <BadgeDollarSign className="h-4 w-4" />,
  '/admin/withdrawals': <WalletCards className="h-4 w-4" />,
  '/admin/users': <Users className="h-4 w-4" />,
  '/admin/horses': <UserRound className="h-4 w-4" />,
  '/admin/registrations': <ClipboardList className="h-4 w-4" />,
  '/admin/race-registrations': <ClipboardList className="h-4 w-4" />,
  '/race-control': <ShieldCheck className="h-4 w-4" />,
  '/schedule': <CalendarDays className="h-4 w-4" />,
  '/registrations': <ClipboardList className="h-4 w-4" />,
  '/owner/invitations': <Send className="h-4 w-4" />,
  '/jockey/schedule': <CalendarDays className="h-4 w-4" />,
  '/jockey/invitations': <Send className="h-4 w-4" />,
  '/prediction': <Target className="h-4 w-4" />,
  '/wallet': <WalletCards className="h-4 w-4" />,
  '/results': <Medal className="h-4 w-4" />,
  '/horses': <UserRound className="h-4 w-4" />,
  '/tracking': <Activity className="h-4 w-4" />,
  '/notifications': <Bell className="h-4 w-4" />,
};

const isNavigationItemActive = (pathname: string, item: NavigationItem) => (
  pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`))
);

const buildRoleNavigationGroups = (items: NavigationItem[], roleType: UserRoleType): RoleNavigationGroup[] => {
  const groups = new Map<string, NavigationItem[]>();

  items.forEach((item) => {
    const groupId = getRoleGroupId(roleType, item);
    groups.set(groupId, [...(groups.get(groupId) ?? []), item]);
  });

  return roleGroupOrder[roleType]
    .filter((groupId) => groups.has(groupId))
    .map((groupId) => ({ id: groupId, title: roleGroupTitles[roleType][groupId] ?? groupId, items: groups.get(groupId) ?? [] }));
};

const RoleSidebarNavigation = ({ items, pathname, roleType }: { items: NavigationItem[]; pathname: string; roleType: UserRoleType }) => {
  const groups = useMemo(() => buildRoleNavigationGroups(items, roleType), [items, roleType]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    overview: true,
    competition: true,
    finance: true,
    registry: true,
    racing: true,
    stable: true,
    officiating: true,
    wagering: true,
    system: true,
  }));

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const activeGroup = groups.find((group) => group.items.some((item) => isNavigationItemActive(pathname, item)));

      if (activeGroup) {
        setOpenGroups((current) => ({ ...current, [activeGroup.id]: true }));
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [groups, pathname]);

  return (
    <nav className="space-y-4 pb-1" aria-label="Role navigation">
      {groups.map((group, groupIndex) => {
        const isOpen = openGroups[group.id] ?? true;
        const isActiveGroup = group.items.some((item) => isNavigationItemActive(pathname, item));

        return (
          <motion.section
            key={group.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groupIndex * 0.035, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="role-sidebar-group"
          >
            <button
              type="button"
              onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !(current[group.id] ?? true) }))}
              className="role-sidebar-group-trigger flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-[10px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant transition-colors hover:text-primary"
              aria-expanded={isOpen}
            >
              <span className="truncate">{group.title}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : isActiveGroup ? 'text-primary' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 py-1">
                    {group.items.map((item, itemIndex) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `role-sidebar-link group relative flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all duration-300 ${
                            isActive
                              ? 'border-primary/65 text-primary shadow-sm shadow-primary/10'
                              : 'border-transparent text-on-surface-variant hover:text-primary'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.span
                                layoutId={`role-sidebar-active-rail-${roleType}`}
                                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_16px_rgba(242,202,80,0.45)]"
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                              />
                            )}
                            <motion.span
                              initial={false}
                              animate={{ scale: isActive ? 1.06 : 1, x: isActive ? 2 : 0 }}
                              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                              className={`role-sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${
                                isActive
                                  ? 'border-primary/50 text-primary shadow-[0_0_18px_rgba(242,202,80,0.16)]'
                                  : 'border-outline-variant/30 text-outline group-hover:text-primary'
                              }`}
                            >
                              {roleNavigationIcons[item.to] ?? <ClipboardList className="h-4 w-4" />}
                            </motion.span>
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: itemIndex * 0.025, duration: 0.18 }}
                              className="truncate"
                            >
                              {item.label}
                            </motion.span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}
    </nav>
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
      setIsScrolled(window.scrollY > 20);
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
    <div className="navbar-motion-always navbar-transition fixed left-0 top-0 z-[100] flex w-full justify-center pointer-events-none">
      <header
        id="home"
        data-purpose="navigation-bar"
        className={`
          navbar-transition pointer-events-auto flex w-full items-center justify-between
          ${isScrolled
            ? 'mt-4 max-w-[95%] rounded-[999px] border border-outline-variant/40 bg-surface-container-low/75 px-6 py-1.5 shadow-lg shadow-black/30 backdrop-blur-sm lg:max-w-5xl lg:px-8'
            : 'mt-0 max-w-full rounded-[0px] border-b border-outline-variant/30 bg-surface-container-low/80 px-12 py-4 shadow-sm backdrop-blur-md'
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
          className={`navbar-transition-slow font-display font-bold text-primary ${isScrolled ? 'text-lg' : 'text-xl'}`}
        >
          HTMS
        </a>

        <nav className="hidden items-center gap-4 md:flex lg:gap-6 xl:gap-8">
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
                to="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface transition-colors hover:border-primary hover:text-primary"
                aria-label="Open profile"
                title="Profile"
              >
                <User className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                state={{ mode: 'login' }}
                className={`navbar-transition-slow inline-flex items-center justify-center rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-primary ${
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
                className={`navbar-transition-slow gold-gradient rounded-lg text-label-md font-bold text-on-primary active:scale-95 ${
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

import { useEffect, useState } from 'react';
import { Search, Bell, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { getAccessToken } from '../services/apiClient';
import { authService } from '../services/authService';
import { canAccessRole, navigationItems } from '../utils/permissions';
import type { UserProfile } from '../types/user';

const Header = () => {
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

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setProfile(undefined);
  };

  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!item.requiresAuth) {
      return true;
    }

    return isAuthenticated && canAccessRole(profile?.roleType, item.allowedRoles);
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-outline-variant">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold text-primary tracking-tight">Horace</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {visibleNavigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input
              type="text"
              placeholder="Search horses, jockeys..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2 pl-10 pr-4 text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <Link to="/profile" className="text-on-surface-variant hover:text-primary transition-colors">
            <User className="w-5 h-5" />
          </Link>
          <div className="w-px h-6 bg-outline-variant mx-2 hidden sm:block" />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-body-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              Log Out
            </button>
          ) : (
            <>
              <Link
                to="/login"
                state={{ mode: 'login' }}
                className="text-body-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/login"
                state={{ mode: 'signup' }}
                className="bg-primary text-on-primary px-6 py-2 rounded-md text-body-sm font-semibold hover:bg-opacity-90 transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

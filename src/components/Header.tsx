import { Search, Bell, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-outline-variant">
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop h-20 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold text-primary tracking-tight">Horace</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Home
          </NavLink>
          <NavLink 
            to="/schedule" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Schedule
          </NavLink>
          <NavLink 
            to="/prediction" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Prediction
          </NavLink>
          <NavLink 
            to="/results" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Results
          </NavLink>
          <NavLink 
            to="/horses" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Horses
          </NavLink>
          <NavLink 
            to="/tracking" 
            className={({ isActive }) => 
              `text-body-sm font-semibold transition-colors pb-1 border-b-2 ${isActive ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`
            }
          >
            Tracking
          </NavLink>
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
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <User className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-outline-variant mx-2 hidden sm:block" />
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
        </div>
      </div>
    </header>
  );
};

export default Header;

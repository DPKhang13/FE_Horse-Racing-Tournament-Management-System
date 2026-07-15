import { ArrowRight, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLogo } from './ui';

const Header = () => (
  <header className="sticky top-0 z-50 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
      <Link to="/" aria-label="HTMS home"><AppLogo /></Link>
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          state={{ mode: 'login' }}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-ink sm:px-4"
        >
          <LogIn className="h-4 w-4" />
          Login
        </Link>
        <Link
          to="/login"
          state={{ mode: 'signup' }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 sm:px-4"
        >
          Sign Up
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </header>
);

export default Header;

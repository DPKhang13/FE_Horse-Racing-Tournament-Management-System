import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="sticky top-0 z-50 border-b border-outline-variant/40 bg-surface-container-low/70 px-4 py-4 backdrop-blur-xl md:px-8">
    <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
      <Link to="/" className="font-display text-xl font-extrabold text-primary">HTMS</Link>
      <div className="flex items-center gap-3">
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
      </div>
    </div>
  </header>
);

export default Header;

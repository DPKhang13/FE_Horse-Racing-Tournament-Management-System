import { NavLink } from 'react-router-dom';

const ResultNav = () => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-body-sm font-semibold transition-colors ${
      isActive
        ? 'bg-primary text-on-primary'
        : 'bg-white border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary'
    }`;

  return (
    <nav className="flex flex-wrap gap-3" aria-label="Result section navigation">
      <NavLink to="/results" end className={linkClass}>
        Race Results
      </NavLink>
      <NavLink to="/results/rankings" className={linkClass}>
        Rankings
      </NavLink>
    </nav>
  );
};

export default ResultNav;

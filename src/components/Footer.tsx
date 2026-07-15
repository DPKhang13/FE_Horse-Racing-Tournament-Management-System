import { Globe, Share2, ShieldCheck } from 'lucide-react';
import { AppLogo } from './ui';

const Footer = () => {
  return (
    <footer className="border-t border-line bg-white text-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div>
            <AppLogo />
            <p className="mt-3 text-xs text-slate-500">(c) 2026 Horse Tournament Management System.</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <a href="#" className="text-xs text-slate-500 transition-colors hover:text-ink">Terms</a>
            <a href="#" className="text-xs text-slate-500 transition-colors hover:text-ink">Privacy</a>
            <a href="#" className="text-xs text-slate-500 transition-colors hover:text-ink">Responsible Gaming</a>
            <a href="#" className="text-xs text-slate-500 transition-colors hover:text-ink">Support</a>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold uppercase text-emerald-700 ring-1 ring-emerald-600/20 sm:inline-flex">
              <ShieldCheck className="h-4 w-4" />
              Secure Feed
            </span>
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink" aria-label="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink" aria-label="Language">
              <Globe className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

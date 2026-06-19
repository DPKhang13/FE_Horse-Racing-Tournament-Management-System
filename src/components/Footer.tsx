import { Globe, Share2, ShieldCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-outline-variant/40 bg-surface-container-low text-on-surface">
      <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div>
            <span className="font-display mb-2 block text-xl font-extrabold text-primary">HTMS</span>
            <p className="text-label-md text-on-surface-variant">(c) 2026 Horse Tournament Management System.</p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-primary">Terms</a>
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-primary">Privacy</a>
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-primary">Responsible Gaming</a>
            <a href="#" className="text-label-md text-on-surface-variant transition-colors hover:text-primary">Support</a>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 rounded-full border border-outline-variant/40 px-3 py-2 text-label-md font-bold uppercase tracking-[0.12em] text-secondary sm:inline-flex">
              <ShieldCheck className="h-4 w-4" />
              Secure Feed
            </span>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant transition-colors hover:border-primary hover:text-primary" aria-label="Share">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant transition-colors hover:border-primary hover:text-primary" aria-label="Language">
              <Globe className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { Share2, Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary-container text-white">
      {/* Bottom Footer */}
      <div className="max-w-container mx-auto px-4 md:px-margin-desktop py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <span className="text-xl font-bold tracking-tight block mb-2">Horace</span>
            <p className="text-label-md text-on-primary-container">© 2026 Horace Racing. All rights reserved.</p>
          </div>
          
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <a href="#" className="text-label-md text-on-primary-container hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-label-md text-on-primary-container hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-label-md text-on-primary-container hover:text-white transition-colors">Responsible Gaming</a>
            <a href="#" className="text-label-md text-on-primary-container hover:text-white transition-colors">Contact Support</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <Globe className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
